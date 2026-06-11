// netlify/functions/retrieval.mjs
// Shared retrieval logic used by chat.js (production) and eval.mjs (offline eval).
// Any change to scoring, classification, or safety patterns here is reflected in both.

// ---------------------------------------------------------------------------
// Stop words
// ---------------------------------------------------------------------------

export const STOP_WORDS = new Set([
  "a","an","the","is","are","was","were","be","been","being","have","has","had",
  "do","does","did","will","would","could","should","may","might","shall","can",
  "i","me","my","we","our","you","your","he","his","she","her","it","its",
  "they","their","what","which","who","whom","this","that","these","those",
  "am","to","of","in","on","at","by","for","with","about","into","through",
  "from","up","down","out","off","over","under","then","once","as","if","so",
  "and","but","or","nor","not","no","how","why","when","where","feel","does",
  // Extended: content-free words that add scoring noise in medical text
  "all","also","any","both","each","even","few","just","many","more","most",
  "much","now","only","some","too","very","always",
  // Generic nouns that are too vague to serve as high-signal filter hits in
  // short 2-term queries (e.g. "weight loss" should not pass on "loss" alone).
  "loss",
  "mean",
  "means",
  // "signs" is too common in medical content ("Early Signs of X", "Warning Signs")
  // and causes spurious title matches; condition terms carry the specificity.
  "signs",
]);

// ---------------------------------------------------------------------------
// Safety patterns
// ---------------------------------------------------------------------------

export const URGENT_PATTERNS = [
  /\b(stroke|heart attack|cardiac arrest|myocardial infarction)\b/i,
  /\bchest (pain|tightness|pressure)\b/i,
  // "suicid" must be its own pattern — a trailing \b in an alternation group
  // prevents it matching "suicidal" or "suicide" (no word boundary after d+vowel).
  /\bsuicid\w*/i,
  /\b(kill myself|end my life|want to die|take my (own )?life|harm(ing)? myself)\b/i,
  /\b(not breathing|can'?t breathe|stopped breathing|unable to breathe|struggling to breathe)\b/i,
  /\b(unconscious|unresponsive|collapsed|won'?t wake)\b/i,
  /\b(throat (closing|swelling|tightening)|severe allergic reaction|anaphylactic (shock|reaction))\b/i,
  /\bi'?m (having|going into) anaphylaxis\b/i,
  /\b(seizure|convuls(?:e|ed|ion|ions|ing|ive)|fitting|fit and)\b/i,
  /\bsevere (bleeding|hemorrhage|haemorrhage)\b/i,
  /\boverdose\b/i,
  /\b(2[1-9][0-9]|[3-9][0-9]{2})\/\d{2,3}\b/,
  // FAST stroke symptoms described in first person, without the word "stroke"
  /\bface\s+(is\s+|looks?\s+|feels?\s+)?droop(ing|ed|s)?\b/i,
  /\bcan'?t\s+(speak|talk)\s+(properly|suddenly|clearly|at all|anymore|straight)\b/i,
  // Diabetic ketoacidosis (DKA) — high-acuity diabetes emergency
  // Matches first-person/current-tense presentations but not educational "what is DKA" queries
  // (those are caught by INFORMATIONAL_SYMPTOM_PATTERNS first).
  /\bi('?m| am) (going into|having|in) (dka|diabetic ketoacidosis|ketoacidosis)\b/i,
  /\b(vomiting|throwing up).{0,40}(high ketones?|ketones? (are |is )?(high|elevated|over|above))\b/i,
  /\b(high ketones?|ketones? (are |is )?(high|elevated)).{0,40}(vomiting|throwing up|can'?t keep down)\b/i,
  /\bketones? (are |is )?(very high|dangerously high|over [3-9]|over \d{2})\b/i,
  // Severe hypoglycemia — unconscious or unable to treat self
  /\b(not responding|won'?t wake|unconscious).{0,30}(diabetic|low blood sugar|hypoglycemi)\b/i,
  /\b(hypoglycemi|low blood sugar).{0,30}(not responding|won'?t wake|unconscious|need glucagon)\b/i,
  /\bneed (the )?glucagon\b/i,
  // Meningitis — non-blanching rash described in first person (not educational queries)
  /\brash.{0,30}(won'?t|doesn'?t|not) (fade|disappear|go away).{0,30}(press|glass|tumbler)\b/i,
  /\b(glass test|tumbler test).{0,20}rash\b/i,
  /\bmeningitis rash\b/i,
  // Possible ectopic pregnancy rupture
  /\b(severe|sudden) (abdominal|pelvic|stomach|belly) pain.{0,40}(pregnant|pregnancy|period late|missed period)\b/i,
  /\b(pregnant|pregnancy).{0,40}(severe|sudden) (pain|bleeding)\b/i,
];

// Informational framing: "what are the signs/symptoms of X", "signs of X",
// "how is X treated", "what medications for X" etc.
// These are educational queries that mention serious conditions but do NOT describe
// a current emergency. Checked before URGENT_PATTERNS in classifyQuery so that
// "what are the signs of stroke?" or "how is a heart attack treated?" are not
// routed to emergency mode.
const INFORMATIONAL_SYMPTOM_PATTERNS = [
  // Allow one optional adjective between "the" and "signs/symptoms/causes" (e.g. "early", "warning", "first").
  /^\s*what\s+(are|is)\s+(the\s+)?(\w+\s+)?(signs?|symptoms?|causes?|risk\s+factors?)\s+(of|for)\b/i,
  // "What is epilepsy/a seizure?" — definitional queries about these conditions must not route
  // to urgent mode even though URGENT_PATTERNS matches "seizure". This pattern fires first.
  /^\s*what\s+(is|are)\s+(a\s+|an\s+|the\s+)?(?:seizure|convulsion|epilepsy|epileptic\s+fit)s?\b/i,
  // First-aid preparedness queries — "what should I/you do during/after a seizure"
  // "during/after" implies preparedness framing. "if someone" is intentionally excluded —
  // condition-specific queries like "what should I do if someone has stroke symptoms" should
  // still route via URGENT_PATTERNS when the condition is high-acuity.
  /^\s*what\s+should\s+(?:i|you|we|one)\s+do\s+(?:during|after)\b/i,
  /^\s*(warning\s+)?(signs?|symptoms?)\s+(of|for)\s+\w/i,
  // Treatment queries: "how is a heart attack treated", "how are strokes managed"
  // Requires "treated/managed/diagnosed/prevented" anywhere within ~80 chars of the start.
  // Anchored to avoid matching "I had a heart attack, how is that treated now?" (longer preamble).
  /^\s*how\s+(?:is|are)\s+\S.{0,70}\s+(?:treated|managed|diagnosed|prevented)\b/i,
  // "How do you / how do doctors treat X"
  /^\s*how\s+do\s+(?:you|doctors?|hospitals?|they)\s+(?:treat|manage|diagnose|prevent)\b/i,
  // Medication queries about conditions: "what medications are used for X", "what medications after X"
  // Must be followed immediately by "are", "do", or "is" — blocks "what medications should I take for my pain"
  /^\s*what\s+medications?\s+(?:are|do\s+you|is)\b/i,
];

// High-acuity conditions that warrant a safety note even when the query is informational.
// Also used to gate injection of the canonical emergency-care guide link.
const EMERGENCY_CONDITION_PATTERN = /\b(stroke|heart attack|cardiac arrest|myocardial infarction|anaphylaxis|sepsis|septic shock|meningitis|chest pain|chest tightness|shortness of breath|difficulty breathing|diabetic ketoacidosis|dka|severe hypoglycemia|hypoglycaemia|ectopic pregnancy)\b/i;

// Returns true when the query is informational in framing (asking *about* a serious
// condition rather than describing a current emergency), AND mentions an emergency-level
// condition. Used by chat.js to guarantee a "call emergency if happening now" safety note.
export function isInformationalAboutEmergency(question) {
  return (
    INFORMATIONAL_SYMPTOM_PATTERNS.some((p) => p.test(question)) &&
    EMERGENCY_CONDITION_PATTERN.test(question)
  );
}

export const MEDICATION_PATTERNS = [
  /\b(should I take|can I take|stop taking|start taking|change my|reduce my|increase my|miss(ed)? (a |my )?dose)\b/i,
  /\b(my medication|my medicine|my prescription|my tablets?|my pills?)\b/i,
  /\b(drug interaction|medication interaction)\b/i,
];

export const PERSONAL_SYMPTOM_PATTERNS = [
  /\b(I have|I've (got|had)|I am having|I'm (experiencing|feeling|having|getting)|my (symptom|pain|ache))\b/i,
  /\b(what('s| is) wrong with me|do I have|could I have|am I having|is it (serious|normal) that I)\b/i,
  // Catches "I've been having / experiencing / feeling / suffering" which the above misses
  // because "I've been" is not the same as "I have" or "I've got/had".
  /\bI'?ve been (having|experiencing|feeling|suffering|struggling)\b/i,
];

export function classifyQuery(question) {
  // Informational framing ("what are the signs of X") takes priority over URGENT_PATTERNS
  // so that educational queries about serious conditions are not routed to emergency mode.
  if (INFORMATIONAL_SYMPTOM_PATTERNS.some((p) => p.test(question))) return "informational";
  if (URGENT_PATTERNS.some((p) => p.test(question))) return "urgent";
  if (MEDICATION_PATTERNS.some((p) => p.test(question))) return "medication";
  if (PERSONAL_SYMPTOM_PATTERNS.some((p) => p.test(question))) return "personal-symptom";
  return "informational";
}

// ---------------------------------------------------------------------------
// Tokenisation
// ---------------------------------------------------------------------------

// Maps derived/adjective forms to the canonical noun found in PatientGuide content.
// Keeps the list minimal — only add entries that demonstrably improve retrieval.
const NORMALIZATIONS = new Map([
  ["symptomatic",  "symptoms"],
  ["asymptomatic", "symptoms"],
]);

// Expands common medical shorthand before tokenisation so short acronyms
// (e.g. "ER", "A&E", "AFib", "HTN") produce meaningful query terms instead of being filtered.
// Order matters: longer / more-specific patterns are listed first.
function preprocessQuery(text) {
  return text
    // Emergency services shorthand
    .replace(/\bE\.?R\.?\b/gi, "emergency")
    .replace(/\bA&E\b/gi, "emergency")
    // Cardiac — procedures and abbreviations
    .replace(/\ba[\s-]?fib\b/gi, "atrial fibrillation")
    .replace(/\bafib\b/gi, "atrial fibrillation")
    .replace(/\bmi\b(?=\s|$)/gi, "myocardial infarction heart attack")  // guard: "mi" only at word boundary; overbroad alone so paired with heart attack
    .replace(/\bcva\b/gi, "stroke cerebrovascular accident")
    .replace(/\bcabg\b/gi, "coronary artery bypass grafting surgery")
    .replace(/\bpci\b/gi, "percutaneous coronary intervention angioplasty stent")
    // Vascular / claudication — intermittent leg pain on walking
    // Maps plain-English descriptions of claudication to the clinical terms
    // used in the PAD guide (claudication, PAD, peripheral artery disease).
    // Order: more-specific multi-word phrases before bare "claudication".
    .replace(/\bleg\s+pain\s+(?:when|while|during|after|on|with)\s+(?:walking|exercise|exertion|activity)\b/gi,
      "leg pain walking claudication peripheral artery disease PAD circulation")
    .replace(/\bcalf\s+pain\s+(?:when|while|during|after|on|with)\s+(?:walking|exercise|exertion|activity)\b/gi,
      "calf pain walking claudication peripheral artery disease PAD circulation")
    .replace(/\bpain\s+in\s+(?:my\s+)?(?:calf|calves?|leg|legs)\s+(?:when|while|during|after|with)\s+(?:walking|exercise|exertion|activity)\b/gi,
      "leg pain walking claudication peripheral artery disease PAD circulation")
    .replace(/\bleg\s+pain\s+(?:better|goes?\s+away|improves?|relieves?|eases?)\s+(?:with|after|when|at)\s+rest\b/gi,
      "claudication peripheral artery disease PAD leg pain rest")
    .replace(/\bclaudication\b/gi, "claudication peripheral artery disease PAD leg pain walking")
    // Blood pressure / hypertension
    .replace(/\bhtn\b/gi, "hypertension high blood pressure")
    .replace(/\b(?<![a-z])bp(?![a-z])\b/gi, "blood pressure")
    // Diabetes — monitoring
    .replace(/\bt1d\b/gi, "type 1 diabetes")
    .replace(/\bt2d\b/gi, "type 2 diabetes")
    .replace(/\bt1dm\b/gi, "type 1 diabetes")
    .replace(/\bt2dm\b/gi, "type 2 diabetes")
    .replace(/\bdka\b/gi, "DKA diabetic ketoacidosis")  // preserve acronym so guide titles with "DKA" still score
    .replace(/\bcgm\b/gi, "continuous glucose monitor")
    .replace(/\bbgm\b/gi, "blood glucose monitoring")
    // Sleep
    .replace(/\bosa\b/gi, "obstructive sleep apnoea")
    // Women's Health — hormone therapy
    .replace(/\bhrt\b/gi, "hormone replacement therapy hormone therapy")
    .replace(/\bmht\b/gi, "menopausal hormone therapy hormone therapy menopause")
    // Women's Health — PCOS (preserve acronym so PCOS guide title still scores)
    .replace(/\bpcos\b/gi, "PCOS polycystic ovary syndrome")
    // Neurology — MS (safe on a medical platform; context is unambiguous)
    .replace(/\bMS\b/gi, "MS multiple sclerosis")
    // Breast screening — expand common search term to guide terminology
    .replace(/\bmammograms?\b/gi, "mammogram mammography breast screening")
    // US English hot flashes → Australian hot flushes (used throughout menopause content)
    .replace(/\bhot flashes?\b/gi, "hot flushes vasomotor")
    // Men's Health — prostate / urinary
    .replace(/\bBPH\b/gi, "BPH benign prostatic hyperplasia enlarged prostate urinary")
    .replace(/\bLUTS\b/gi, "LUTS lower urinary tract symptoms urinary prostate")
    // Neurology — Parkinson's (only expand unambiguous full-word "PD" in neurological context)
    .replace(/\bPD\b(?=\s+(?:tremor|symptoms?|diagnosis|treatment|exercise|progression|medication|motor|non.motor))/gi, "PD Parkinson's disease")
    // Neurology — tremor synonym expansion (links "shaking" queries to Parkinson's / tremor content)
    .replace(/\b(uncontrolled\s+)?shaking\b/gi, "shaking tremor")
    // Neurology — epilepsy / seizure terminology
    .replace(/\bepilept(?:ic\s+fit|ic\s+seizure)\b/gi, "epileptic seizure epilepsy");
}

export function tokenize(text) {
  return [...new Set(
    preprocessQuery(text)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2 && !STOP_WORDS.has(t))
      .map((t) => NORMALIZATIONS.get(t) ?? t),
  )];
}

// ---------------------------------------------------------------------------
// Scoring — word-boundary-aware matching
// ---------------------------------------------------------------------------

// Cache compiled regexes; rebuilt only once per unique term per process lifetime.
const _regexCache = new Map();

function termRegex(term) {
  if (!_regexCache.has(term)) {
    const esc = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Lookbehind: term must not be immediately preceded by [a-z0-9].
    // Lookahead (?![a-z]{5,}): allows up to 4 trailing letters so common medical
    // inflections still match ("treat"→"treatment" +4, "rest"→"resting" +3,
    // "antidepressant"→"antidepressants" +1) but blocks false prefix matches where
    // the term is a short stem of an unrelated word ("leg" must not hit
    // "Legionnaires" +9 chars or "legionella" +7 chars).
    _regexCache.set(term, new RegExp(`(?<![a-z0-9])${esc}(?![a-z]{5,})`, "i"));
  }
  return _regexCache.get(term);
}

function matches(field, term) {
  return termRegex(term).test(field);
}

export function scoreItem(item, queryTerms) {
  let score = 0;
  const title    = item.title.toLowerCase();
  const desc     = (item.description || "").toLowerCase();
  const excerpt  = (item.excerpt || "").toLowerCase();
  const tags     = (item.tags || []).map((t) => t.toLowerCase());
  const headings = (item.headings || []).map((h) => h.toLowerCase());
  const faqText  = (item.faq || [])
    .map((f) => f.q + " " + (f.a || ""))
    .join(" ")
    .toLowerCase();

  for (const term of queryTerms) {
    if (matches(title, term))                       score += 6;
    if (matches(desc, term))                        score += 3;
    if (tags.some((t) => matches(t, term)))         score += 3;
    if (headings.some((h) => matches(h, term)))     score += 2;
    if (matches(faqText, term))                     score += 2;
    if (matches(excerpt, term))                     score += 1;
  }

  // Extra weight when multiple query terms all appear in the title.
  const titleHits = queryTerms.filter((t) => matches(title, t)).length;
  if (titleHits >= 2) score += titleHits * 2;

  // Extra weight when multiple query terms all appear in the tags (well-tagged content).
  const tagHits = queryTerms.filter((t) => tags.some((tag) => matches(tag, t))).length;
  if (tagHits >= 2) score += tagHits;

  return score;
}

// ---------------------------------------------------------------------------
// Display-link filter — presentation layer, does not affect retrieval scoring.
//
// Prevents keyword-coincidence links (e.g. "eating" matching a cancer nutrition
// article when the query is about chest discomfort after eating).
//
// A result is shown as a link only when:
//   - 2+ distinct query terms appear in title / tags / headings (high-signal fields), OR
//   - the item's raw score is very high (≥ 20), indicating a strong multi-term match
//
// The ≥ 20 threshold is intentionally above the maximum score a single query term
// can accumulate across all fields (title 6 + desc 3 + tags 3 + headings 2 + FAQ 2
// + excerpt 1 = 17), so only items where at least two query terms contributed can
// bypass the high-signal-hit check.
//
// Single-term queries bypass the filter entirely — nothing to cross-check against.
// ---------------------------------------------------------------------------

export function filterDisplayLinks(results, queryTerms) {
  if (!results.length || queryTerms.length <= 1) return results;

  // Adaptive threshold: a 2-term query can satisfy with 1 high-signal hit;
  // 3+ terms require 2. This avoids over-filtering short specific queries
  // (e.g. "acid reflux") while still blocking single-token coincidences in
  // longer ones (e.g. "chest discomfort after eating" → "eating" only).
  const required = queryTerms.length >= 3 ? 2 : 1;

  const filtered = results.filter((item) => {
    if (item.score >= 20) return true; // strong multi-term match
    const title    = item.title.toLowerCase();
    const tags     = (item.tags     || []).map((t) => t.toLowerCase());
    const headings = (item.headings || []).map((h) => h.toLowerCase());
    const highSignalHits = queryTerms.filter((term) =>
      matches(title, term) ||
      tags.some((t) => matches(t, term)) ||
      headings.some((h) => matches(h, term))
    ).length;
    return highSignalHits >= required;
  });

  // Presentation bias: items with a query term in the title appear before
  // items that matched only via tags/headings. Score order is preserved
  // within each group (Array.sort is stable in V8/Node ≥ 11).
  return filtered.sort((a, b) => {
    const aTitle = queryTerms.some((t) => matches(a.title.toLowerCase(), t)) ? 1 : 0;
    const bTitle = queryTerms.some((t) => matches(b.title.toLowerCase(), t)) ? 1 : 0;
    return bTitle - aTitle;
  });
}

// ---------------------------------------------------------------------------
// Retrieval
// ---------------------------------------------------------------------------

// items: array from chatbot-index.json; passed in so both callers control it.
export function retrieve(items, question, topK = 5) {
  const terms = tokenize(question);
  if (!terms.length) return [];
  return items
    .map((item) => ({ ...item, score: scoreItem(item, terms) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

// ---------------------------------------------------------------------------
// Answer-type classification (retrieval confidence only)
// ---------------------------------------------------------------------------

export function classifyAnswerType(results) {
  if (!results.length) return "unavailable";
  const topScore = results[0].score;
  if (topScore >= 15) return "grounded";
  if (topScore >= 11) return "partial";
  return "unavailable";
}

// ---------------------------------------------------------------------------
// Response mode — combines queryType with retrieval confidence.
//
// This is the `type` field sent to the client. It is distinct from answerType
// (which is pure retrieval confidence) so that the UI can present medication
// and personal-symptom queries differently even when retrieval is strong.
//
// Matrix:
//   urgent                          → "urgent"
//   any + unavailable               → "unavailable"
//   medication + grounded/partial   → "medication-safe"
//   personal-symptom + grounded/partial → "personal-safe"
//   informational + grounded        → "grounded"
//   informational + partial         → "partial"
// ---------------------------------------------------------------------------

export function responseMode(queryType, answerType) {
  if (queryType === "urgent")                                    return "urgent";
  if (answerType === "unavailable")                              return "unavailable";
  if (queryType === "medication")                                return "medication-safe";
  if (queryType === "personal-symptom")                         return "personal-safe";
  return answerType; // "grounded" or "partial"
}
