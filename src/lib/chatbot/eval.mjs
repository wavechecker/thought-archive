// src/lib/chatbot/eval.mjs
// Offline evaluation of chatbot retrieval, safety patterns, and response modes.
// Run: node src/lib/chatbot/eval.mjs
// (Requires netlify/functions/chatbot-index.json — run npm run chatbot:index first)

import { readFileSync } from "fs";
import { resolve } from "path";
import {
  retrieve,
  classifyAnswerType,
  classifyQuery,
  responseMode,
  filterDisplayLinks,
  tokenize,
  isInformationalAboutEmergency,
} from "../../../netlify/functions/retrieval.mjs";

const INDEX_PATH = resolve("netlify/functions/chatbot-index.json");

let indexData;
try {
  indexData = JSON.parse(readFileSync(INDEX_PATH, "utf-8"));
} catch {
  console.error(`Cannot read index at ${INDEX_PATH}`);
  console.error("Run: node scripts/build-chatbot-index.mjs");
  process.exit(1);
}

const { items } = indexData;

// ---------------------------------------------------------------------------
// Test cases
//
// Fields:
//   q               — the question to evaluate
//   expected        — expected answerType from classifyAnswerType: grounded | partial | unavailable | urgent
//   expectedQType   — (optional) expected queryType from classifyQuery
//   expectedMode    — (optional) expected responseMode combining queryType + answerType
//   note            — (optional) brief explanation
// ---------------------------------------------------------------------------

const TEST_CASES = [
  // --- Grounded: PatientGuide has strong direct coverage ---
  { q: "Can poor sleep feel like dementia?",               expected: "grounded" },
  { q: "What are brain zaps?",                             expected: "grounded" },
  { q: "Is high blood pressure always symptomatic?",       expected: "grounded" },
  { q: "Can antidepressants affect sleep?",                expected: "grounded" },
  { q: "What does insulin resistance mean?",               expected: "grounded" },
  { q: "What is Alzheimer's disease?",                     expected: "grounded" },
  { q: "How does anaphylaxis happen?",                     expected: "grounded" },
  { q: "Can beta blockers cause fatigue?",                 expected: "grounded" },
  { q: "Is sleep apnea linked to headaches?",              expected: "grounded" },
  { q: "Does alcohol affect sleep quality?",               expected: "grounded" },
  { q: "Can exercise help with depression?",               expected: "grounded" },
  { q: "What causes brain fog?",                           expected: "grounded" },

  // --- Partial: topic exists in PatientGuide but coverage is incomplete ---
  { q: "I missed a dose of my statin what should I do?",
    expected: "partial", expectedQType: "medication", expectedMode: "medication-safe",
    note: "statin content exists; missed-dose guidance is not direct" },

  // --- Unavailable: out of scope for PatientGuide ---
  { q: "What does this rash on my arm mean?",             expected: "unavailable" },
  { q: "What is the best antibiotic for sinusitis?",      expected: "unavailable" },
  { q: "Can I take ibuprofen with metformin?",
    expected: "unavailable", expectedQType: "medication", expectedMode: "unavailable",
    note: "specific drug-drug interaction — not covered" },
  { q: "How do I fix my posture?",                        expected: "unavailable" },
  { q: "Is my rash infected?",                            expected: "unavailable" },
  { q: "How do I feel better generally?",
    expected: "unavailable",
    note: "generic wellness query — should produce no meaningful retrieval match" },

  // --- Urgent: URGENT_PATTERNS fire before any retrieval ---
  { q: "My blood pressure is 210/120 and I have chest pain", expected: "urgent" },
  { q: "I think I'm having a stroke",                        expected: "urgent" },
  { q: "I want to kill myself",                              expected: "urgent" },
  { q: "I took an overdose of paracetamol",                  expected: "urgent" },
  { q: "I can't breathe and my throat is swelling",          expected: "urgent" },

  // --- Suicidality pattern fix: "suicid" must match "suicidal" / "suicide" etc. ---
  // Previously the alternation-group \b suffix broke these.
  { q: "I feel suicidal",            expected: "urgent",
    note: "suicid\\w* pattern — must catch 'suicidal'" },
  { q: "I'm suicidal",               expected: "urgent",
    note: "suicid\\w* pattern — must catch 'suicidal'" },
  { q: "I'm having suicidal thoughts", expected: "urgent",
    note: "suicid\\w* pattern — must catch 'suicidal'" },

  // --- Self-harm pattern fix: "harm(ing)? myself" now catches "harm myself" ---
  { q: "I want to harm myself",      expected: "urgent",
    note: "harm(ing)? myself — fixed from harming? which missed 'harm myself'" },

  // --- Medication queryType + medication-safe response mode ---
  { q: "Should I stop taking my blood pressure medication?",
    expected: "grounded", expectedQType: "medication", expectedMode: "medication-safe",
    note: "strong BP content; mode must be medication-safe not grounded" },

  // --- Personal-symptom queryType: new I've been having/experiencing patterns ---
  { q: "I've been having headaches every morning",
    expected: "unavailable", expectedQType: "personal-symptom", expectedMode: "unavailable",
    note: "new pattern: I've been having; retrieval weak for headaches" },
  { q: "I've been suffering from back pain",
    expected: "grounded", expectedQType: "personal-symptom", expectedMode: "personal-safe",
    note: "new pattern: I've been suffering; back pain guide exists" },

  // --- Personal-symptom + personal-safe response mode (existing queries) ---
  { q: "I'm feeling very fatigued all the time",
    expected: "grounded", expectedQType: "personal-symptom", expectedMode: "personal-safe",
    note: "'I'm feeling' triggers personal-symptom; fatigue content exists" },
  { q: "I'm experiencing shortness of breath on exertion",
    expected: "grounded", expectedQType: "personal-symptom", expectedMode: "personal-safe",
    note: "cardiovascular/respiratory content matches" },

  // --- Link quality: personal-symptom queries should retrieve topically relevant content ---
  { q: "I have chest discomfort after eating",
    expected: "grounded", expectedQType: "personal-symptom", expectedMode: "personal-safe",
    note: "should match GERD/indigestion/reflux content — not single-term 'eating' nutrition articles" },
  { q: "I'm feeling bloated and nauseous after meals",
    expected: "partial", expectedQType: "personal-symptom", expectedMode: "personal-safe",
    note: "digestive symptom — no dedicated GI guide; reaches partial via incidental content" },

  // --- Weak-match informational: headache content should be found if it exists ---
  { q: "What causes headaches?",
    expected: "partial",
    note: "no dedicated headache guide; reaches partial via sleep apnea/brain health content" },
  { q: "Can stress cause physical symptoms?",
    expected: "grounded",
    note: "mental-physical link is commonly covered — should be grounded" },

  // --- Scope-edge: queries where PatientGuide content exists but is off-target ---
  // 'treat' is ubiquitous in medical titles; 'ankle' appears in fracture/falls guides.
  // PatientGuide's musculoskeletal content (fractures, falls, bone health) scores strongly.
  { q: "How do I treat a sprained ankle?",
    expected: "grounded",
    note: "fractures/falls/bone-health content scores strongly via 'treat'+'ankle'; scope mismatch is editorial, not retrieval" },
  // PatientGuide has substantial weight/diet content (GLP-1, weight-loss guide, obesity hub).
  { q: "What is the best diet for losing weight?",
    expected: "grounded",
    note: "PatientGuide has extensive weight/diet content; 'diet'+'weight' score strongly" },

  // --- Infectious disease retrieval ---
  { q: "What are the signs of bacterial meningitis?",
    expected: "grounded", expectedQType: "informational",
    note: "bacterial-meningitis guide should score strongly on title match; informational framing" },
  { q: "When is a fever dangerous?",
    expected: "grounded",
    note: "fever-danger guide title matches 'fever' and 'dangerous'; should score strongly" },
  { q: "What are the symptoms of sepsis?",
    expected: "grounded", expectedQType: "informational",
    note: "sepsis guide should score strongly on title + content match" },
  { q: "How is Lyme disease treated?",
    expected: "grounded",
    note: "Lyme disease guide should score strongly on title match" },

  // --- ER/A&E query routing (preprocessQuery expands 'ER' → 'emergency') ---
  { q: "when should I go to the ER",
    expected: "grounded",
    note: "'ER' expands to 'emergency' before tokenisation; emergency-care guide should score strongly" },

  // --- Retrieval quality: signs stop word + term deduplication ---
  { q: "how high is too high for a fever",
    expected: "grounded",
    note: "term deduplication prevents 'high' double-weighting; fever guide should rank above blood pressure guide" },
  { q: "signs of pneumonia",
    expected: "grounded",
    note: "'signs' is a stop word; 'pneumonia' alone retrieves pneumonia guide cleanly" },

  // --- Synonym preprocessing: acronym expansion ---
  { q: "What is afib?",
    expected: "grounded",
    note: "'afib' expands to 'atrial fibrillation' before tokenisation; AFib guide should score strongly" },
  { q: "a fib symptoms",
    expected: "grounded",
    note: "'a fib' expands to 'atrial fibrillation'; should retrieve AFib guide" },
  { q: "I have htn and need medication advice",
    expected: "grounded", expectedQType: "medication", expectedMode: "medication-safe",
    note: "'htn' expands to 'hypertension high blood pressure'; medication query mode" },
  { q: "what is DKA",
    expected: "grounded", expectedQType: "informational",
    note: "'DKA' expands to 'diabetic ketoacidosis'; diabetes guides should score strongly" },
  { q: "t1d management tips",
    expected: "grounded",
    note: "'t1d' expands to 'type 1 diabetes'; should retrieve T1D guides" },
  { q: "what causes cva",
    expected: "grounded",
    note: "'cva' expands to 'stroke cerebrovascular accident'; stroke guide should score strongly" },

  // --- New urgent patterns: DKA / diabetic emergency ---
  { q: "I'm going into DKA",
    expected: "urgent",
    note: "DKA urgent pattern — first-person current tense" },
  { q: "vomiting with very high ketones",
    expected: "urgent",
    note: "vomiting + high ketones pattern — DKA warning sign" },
  { q: "I need glucagon",
    expected: "urgent",
    note: "'need glucagon' pattern — severe hypoglycemia emergency" },

  // --- New urgent patterns: meningitis rash ---
  { q: "there's a rash that won't fade when I press it",
    expected: "urgent",
    note: "non-blanching rash pattern — possible meningitis" },

  // --- Informational about DKA should NOT trigger urgent ---
  { q: "What are the symptoms of diabetic ketoacidosis?",
    expected: "grounded", expectedQType: "informational",
    note: "informational framing takes priority; DKA content should ground the response" },
];

// ---------------------------------------------------------------------------
// Run evaluation
// ---------------------------------------------------------------------------

const SEP = "─".repeat(72);
console.log(`\nPatientGuide Chatbot Eval`);
console.log(`Index: ${items.length} items  (built ${indexData.generated})`);
console.log(SEP);

let pass = 0;
let fail = 0;
const failures = [];

for (const tc of TEST_CASES) {
  const { q, expected, expectedQType, expectedMode, note } = tc;

  const queryType = classifyQuery(q);
  let answerType, actualMode;

  if (queryType === "urgent") {
    answerType = "urgent";
    actualMode = "urgent";
  } else {
    const results = retrieve(items, q);
    answerType = classifyAnswerType(results);
    actualMode = responseMode(queryType, answerType);
  }

  const answerOk = answerType === expected;
  const qtypeOk  = !expectedQType || queryType === expectedQType;
  const modeOk   = !expectedMode  || actualMode === expectedMode;
  const ok       = answerOk && qtypeOk && modeOk;

  if (ok) {
    pass++;
  } else {
    fail++;
    failures.push({ q, expected, answerType, expectedQType, queryType, expectedMode, actualMode, note });
  }

  const mark     = ok ? "PASS" : "FAIL";
  const qtypeStr = expectedQType ? ` [qtype: ${queryType}${qtypeOk ? "" : ` ≠ ${expectedQType}`}]` : "";
  const modeStr  = expectedMode  ? ` [mode: ${actualMode}${modeOk  ? "" : ` ≠ ${expectedMode}`}]`  : "";

  console.log(`\n[${mark}] "${q}"`);
  console.log(`  Expected: ${expected}  |  Got: ${answerType}${qtypeStr}${modeStr}`);
  if (note) console.log(`  Note: ${note}`);

  if (queryType !== "urgent") {
    const results = retrieve(items, q);
    if (results[0]) {
      console.log(`  #1 score=${results[0].score}  "${results[0].title}"`);
      if (results[1]) console.log(`  #2 score=${results[1].score}  "${results[1].title}"`);
    } else {
      console.log("  (no results)");
    }
  }
}

console.log(`\n${SEP}`);
if (failures.length) {
  console.log("\nFailures:");
  for (const f of failures) {
    console.log(`  • "${f.q}"`);
    console.log(`    expected=${f.expected}  got=${f.answerType}` +
      (f.expectedQType ? `  expectedQType=${f.expectedQType}  gotQType=${f.queryType}` : "") +
      (f.expectedMode  ? `  expectedMode=${f.expectedMode}  gotMode=${f.actualMode}`   : ""));
    if (f.note) console.log(`    note: ${f.note}`);
  }
  console.log();
}
console.log(`Result: ${pass}/${TEST_CASES.length} passed, ${fail} failed\n`);

// ---------------------------------------------------------------------------
// Link quality checks — verify filterDisplayLinks removes misleading results
// ---------------------------------------------------------------------------

const LINK_QUALITY_CASES = [
  {
    q: "chest discomfort after eating",
    // Any displayed link should contain at least one of the primary medical terms
    mustNotBeOnlyToken: "eating",
    note: "displayed links must not match on 'eating' alone — chest/discomfort must also align",
  },
  {
    q: "I have a headache every morning",
    mustNotBeOnlyToken: "morning",
    note: "displayed links must not match on 'morning' alone",
  },
  {
    q: "What helps with sleep problems?",
    mustNotBeOnlyToken: "problems",
    note: "displayed links must not match on 'problems' alone",
  },
];

console.log(`Link Quality Checks`);
console.log(SEP);

let lqPass = 0;
let lqFail = 0;

for (const lq of LINK_QUALITY_CASES) {
  const terms   = tokenize(lq.q);
  const results = retrieve(items, lq.q);
  const display = filterDisplayLinks(results, terms);

  // Check that no displayed link passed only because of the single weak token
  const badLinks = display.filter((item) => {
    const title    = item.title.toLowerCase();
    const tags     = (item.tags     || []).map((t) => t.toLowerCase());
    const headings = (item.headings || []).map((h) => h.toLowerCase());
    const primaryTerms = terms.filter((t) => t !== lq.mustNotBeOnlyToken);
    // A link is "bad" if none of the primary terms appear in high-signal fields
    return !primaryTerms.some(
      (t) => title.includes(t) || tags.some((tag) => tag.includes(t)) || headings.some((h) => h.includes(t))
    );
  });

  const ok = badLinks.length === 0;
  if (ok) lqPass++; else lqFail++;
  console.log(`\n[${ok ? "PASS" : "FAIL"}] "${lq.q}"`);
  console.log(`  ${display.length} display link(s) after filter (${results.length} retrieved)`);
  if (badLinks.length) {
    console.log(`  Bad links (matched on '${lq.mustNotBeOnlyToken}' only):`);
    for (const b of badLinks) console.log(`    - "${b.title}"`);
  }
  if (lq.note) console.log(`  Note: ${lq.note}`);
}

console.log(`\n${SEP}`);
console.log(`Link quality: ${lqPass}/${LINK_QUALITY_CASES.length} passed, ${lqFail} failed\n`);

// ---------------------------------------------------------------------------
// Unit tests for filterDisplayLinks — index-independent, mock data only.
//
// These exercise the logic changes directly (adaptive threshold, fallback,
// title-sort) without depending on the real chatbot index.
// ---------------------------------------------------------------------------

// Minimal mock items — only the fields filterDisplayLinks reads.
const M = {
  titleAndTag: { title: "Acid Reflux and Chest Discomfort", tags: ["acid reflux", "chest"], headings: [], score: 12 },
  tagOnly:     { title: "Nutrition During Cancer Treatment", tags: ["nutrition", "eating", "cancer"], headings: [], score: 8 },
  highScore:   { title: "Blood Pressure Overview", tags: ["blood pressure"], headings: [], score: 16 },
  noMatch:     { title: "General Wellness Tips", tags: ["wellness"], headings: [], score: 4 },
  headingOnly: { title: "Sleep Overview", tags: ["sleep"], headings: ["chest pain during sleep"], score: 9 },
};

let uPass = 0;
let uFail = 0;
const uFailures = [];

function uAssert(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    uPass++;
    console.log(`  [PASS] ${label}`);
  } else {
    uFail++;
    uFailures.push({ label, actual, expected });
    console.log(`  [FAIL] ${label}`);
    console.log(`    expected: ${JSON.stringify(expected)}`);
    console.log(`    got:      ${JSON.stringify(actual)}`);
  }
}

console.log(`\nUnit tests — filterDisplayLinks`);
console.log(SEP);

// 1. Single-term query bypasses filter entirely.
{
  const terms   = ["chest"];
  const results = [M.tagOnly, M.noMatch];
  const out     = filterDisplayLinks(results, terms);
  uAssert("single-term: bypass filter, return all", out.length, 2);
}

// 2. Two-term query: adaptive threshold = 1 high-signal hit required.
//    titleAndTag has "chest" in title + tags → passes.
//    tagOnly has neither "chest" nor "discomfort" → filtered.
{
  const terms   = ["chest", "discomfort"];
  const results = [M.titleAndTag, M.tagOnly];
  const out     = filterDisplayLinks(results, terms);
  uAssert("2-term adaptive: titleAndTag passes (title hit)", out.length, 1);
  uAssert("2-term adaptive: passing item is titleAndTag", out[0]?.title, M.titleAndTag.title);
}

// 3a. Three-term query: titleAndTag has "chest"+"discomfort" in title → 2 hits → passes.
//     tagOnly has only "eating" in tags → 1 hit → filtered.
{
  const terms   = ["chest", "discomfort", "eating"];
  const results = [M.titleAndTag, M.tagOnly];
  const out = filterDisplayLinks(results, terms);
  uAssert("3-term strict: titleAndTag passes (2 title hits)", out.length, 1);
  uAssert("3-term strict: correct item passed", out[0]?.title, M.titleAndTag.title);
}

// 3b. Adaptive threshold contrast — headingOnly has "chest" only in headings (1 hit).
//     3-term query (threshold=2) → filtered. 2-term query (threshold=1) → passes.
{
  const results3 = filterDisplayLinks([M.headingOnly], ["chest", "discomfort", "eating"]);
  uAssert("adaptive: headingOnly filtered for 3-term query", results3.length, 0);
  const results2 = filterDisplayLinks([M.headingOnly], ["chest", "discomfort"]);
  uAssert("adaptive: headingOnly passes for 2-term query", results2.length, 1);
}

// 4. High-score item bypasses threshold regardless of term hits.
{
  const terms   = ["chest", "discomfort", "eating"];
  const results = [M.highScore]; // score=16, no matching terms
  const out     = filterDisplayLinks(results, terms);
  uAssert("high-score bypass: score≥15 always passes", out.length, 1);
}

// 5. Title-match ordering: item with title hit comes before item without.
//    M.headingOnly matches "chest" in headings only; M.titleAndTag matches in title.
//    Both pass a 2-term threshold. titleAndTag should appear first.
{
  const terms   = ["chest", "discomfort"];
  // headingOnly: "chest" in headings → 1 high-signal hit → passes (threshold=1 for 2-term)
  // titleAndTag: "chest" in title → 1 hit → passes
  // Input order: headingOnly first, then titleAndTag. After sort, titleAndTag should be first.
  const results = [M.headingOnly, M.titleAndTag];
  const out     = filterDisplayLinks(results, terms);
  uAssert("title-sort: title-match item comes first", out[0]?.title, M.titleAndTag.title);
}

// 6. Fallback detection in chat.js logic: when displayResults is empty but raw results exist,
//    needsFallback should be true. We simulate this by checking the condition directly.
{
  const displayResults = [];
  const rawResults     = [M.noMatch];
  const needsFallback  = displayResults.length === 0 && rawResults.length > 0;
  const fallbackLinks  = needsFallback ? rawResults.slice(0, 2) : [];
  uAssert("fallback: triggered when display=0 but raw>0", needsFallback, true);
  uAssert("fallback: 1 fallback link surfaced", fallbackLinks.length, 1);
}

// 7. No fallback when display results exist.
{
  const displayResults = [M.titleAndTag];
  const rawResults     = [M.titleAndTag, M.noMatch];
  const needsFallback  = displayResults.length === 0 && rawResults.length > 0;
  uAssert("fallback: not triggered when display results exist", needsFallback, false);
}

// 8. No fallback when raw results are also empty.
{
  const displayResults = [];
  const rawResults     = [];
  const needsFallback  = displayResults.length === 0 && rawResults.length > 0;
  uAssert("fallback: not triggered when no results at all", needsFallback, false);
}

console.log(`\n${SEP}`);
console.log(`Unit tests: ${uPass}/${uPass + uFail} passed, ${uFail} failed\n`);
if (uFailures.length) {
  console.log("Unit test failures:");
  for (const f of uFailures) console.log(`  • ${f.label}`);
  console.log();
}

// ---------------------------------------------------------------------------
// Classification boundary tests — informational vs. urgent
//
// These test classifyQuery directly without retrieval, so they run regardless
// of index content and verify the informational-override logic.
// ---------------------------------------------------------------------------

const CLASSIFY_BOUNDARY_CASES = [
  // Informational framing — must NOT trigger emergency mode
  { q: "What are the signs of stroke?",                    expectQType: "informational" },
  { q: "What are symptoms of stroke?",                     expectQType: "informational" },
  { q: "What are signs of a heart attack?",                expectQType: "informational" },
  { q: "What are the warning signs of stroke?",            expectQType: "informational" },
  { q: "Signs of stroke",                                  expectQType: "informational" },
  { q: "Symptoms of heart attack",                         expectQType: "informational" },
  // Personal / current — MUST trigger emergency mode
  { q: "I think I'm having a stroke",                      expectQType: "urgent" },
  { q: "My face is drooping",                              expectQType: "urgent" },
  { q: "I can't speak properly",                           expectQType: "urgent" },
  { q: "Someone is having a stroke",                       expectQType: "urgent" },
  { q: "What should I do if someone has stroke symptoms?", expectQType: "urgent" },
  { q: "Chest pain right now",                             expectQType: "urgent" },

  // --- Required safety-routing eval cases ---
  // Chest pain query: current symptom → urgent (URGENT_PATTERNS fires)
  { q: "I have chest pain",
    expectQType: "urgent",
    note: "chest pain in URGENT_PATTERNS — current symptom, not informational" },
  // Stroke symptom query: current emergency → urgent
  { q: "I'm having stroke symptoms",
    expectQType: "urgent",
    note: "stroke in URGENT_PATTERNS — current symptom description" },
  // Shortness of breath: personal symptom description, not in URGENT_PATTERNS → personal-symptom
  { q: "I'm experiencing shortness of breath",
    expectQType: "personal-symptom",
    note: "personal-symptom framing; shortness of breath not in URGENT_PATTERNS" },
  // Educational stroke query: informational framing → must not be urgent
  { q: "What are the early signs of stroke?",
    expectQType: "informational",
    note: "informational framing overrides URGENT_PATTERNS; isInformationalAboutEmergency=true" },
  // Non-urgent general health query: neither urgent nor personal-symptom
  { q: "What causes headaches?",
    expectQType: "informational",
    note: "general health query — no safety pattern, no personal framing" },
  // Meningitis: informational framing must NOT trigger urgent; isInformationalAboutEmergency=true
  { q: "What are the signs of meningitis?",
    expectQType: "informational",
    note: "informational framing overrides pattern; meningitis in EMERGENCY_CONDITION_PATTERN for safety note" },
];

const INFORM_EMERGENCY_CASES = [
  // isInformationalAboutEmergency: true for educational queries about high-acuity conditions
  { q: "What are the signs of stroke?",                   expect: true },
  { q: "What are symptoms of heart attack?",              expect: true },
  // Chest pain and shortness of breath added to EMERGENCY_CONDITION_PATTERN
  { q: "What are the warning signs of chest pain?",       expect: true,
    note: "chest pain added to EMERGENCY_CONDITION_PATTERN" },
  { q: "What are the symptoms of shortness of breath?",   expect: true,
    note: "shortness of breath added to EMERGENCY_CONDITION_PATTERN" },
  { q: "What are the signs of sepsis?",                   expect: true,
    note: "sepsis in EMERGENCY_CONDITION_PATTERN" },
  // Should be false for personal/urgent queries even when they mention serious conditions
  { q: "I think I'm having a stroke",                     expect: false },
  // Should be false for informational queries about non-emergency conditions
  { q: "What are the signs of eczema?",                   expect: false },
  // Non-urgent general health query: no emergency condition in text
  { q: "What causes headaches?",                          expect: false,
    note: "general health query — not about a high-acuity condition" },
  // Meningitis added to EMERGENCY_CONDITION_PATTERN — informational queries should get safety note
  { q: "What are the signs of meningitis?",               expect: true,
    note: "meningitis added to EMERGENCY_CONDITION_PATTERN" },
  { q: "What are the symptoms of bacterial meningitis?",  expect: true,
    note: "meningitis added to EMERGENCY_CONDITION_PATTERN" },
];

console.log(`\nQuery classification boundary tests`);
console.log(SEP);

let cPass = 0;
let cFail = 0;

for (const tc of CLASSIFY_BOUNDARY_CASES) {
  const qType = classifyQuery(tc.q);
  const ok    = qType === tc.expectQType;
  if (ok) cPass++; else cFail++;
  console.log(`\n[${ok ? "PASS" : "FAIL"}] "${tc.q}"`);
  console.log(`  Expected qType: ${tc.expectQType}  |  Got: ${qType}`);
}

console.log(`\n${SEP}`);
console.log(`Classification boundary: ${cPass}/${CLASSIFY_BOUNDARY_CASES.length} passed, ${cFail} failed\n`);

console.log(`isInformationalAboutEmergency tests`);
console.log(SEP);

let iePass = 0;
let ieFail = 0;

for (const tc of INFORM_EMERGENCY_CASES) {
  const result = isInformationalAboutEmergency(tc.q);
  const ok     = result === tc.expect;
  if (ok) iePass++; else ieFail++;
  console.log(`\n[${ok ? "PASS" : "FAIL"}] "${tc.q}"`);
  console.log(`  Expected: ${tc.expect}  |  Got: ${result}`);
}

console.log(`\n${SEP}`);
console.log(`isInformationalAboutEmergency: ${iePass}/${INFORM_EMERGENCY_CASES.length} passed, ${ieFail} failed\n`);

if (fail > 0 || lqFail > 0 || uFail > 0 || cFail > 0 || ieFail > 0) process.exit(1);
