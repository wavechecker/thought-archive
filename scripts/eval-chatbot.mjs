// scripts/eval-chatbot.mjs
// Offline eval for the PatientGuide chatbot retrieval pipeline.
// Run: node scripts/eval-chatbot.mjs
// Tests target queries against the local index without making API calls.

import { createRequire } from "module";
import { resolve } from "path";
import { pathToFileURL } from "url";

const require = createRequire(import.meta.url);
const ROOT = resolve(".");

const {
  retrieve,
  classifyAnswerType,
  classifyQuery,
  filterDisplayLinks,
  tokenize,
} = await import(pathToFileURL(resolve(ROOT, "netlify/functions/retrieval.mjs")).href);

const INDEX_PATH = resolve(ROOT, "netlify/functions/chatbot-index.json");
const index = require(INDEX_PATH);
const items = index.items;

// ---------------------------------------------------------------------------
// Test cases — each has a query, the expected answer type, and the expected
// top-result title fragment (substring match, case-insensitive).
// ---------------------------------------------------------------------------

const CASES = [
  {
    query:        "Can poor sleep feel like dementia?",
    expectType:   "grounded",
    expectTop:    "poor sleep",
  },
  {
    query:        "Is high blood pressure always symptomatic?",
    expectType:   "grounded",
    expectTop:    "high blood pressure",
  },
  {
    query:        "What are common antidepressant side effects?",
    expectType:   "grounded",
    expectTop:    "antidepressant",
  },
  {
    query:        "What does insulin resistance mean?",
    expectType:   "grounded",
    expectTop:    "insulin resistance",
  },
  {
    query:        "What are brain zaps?",
    expectType:   "grounded",
    expectTop:    "brain zap",
  },
];

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

for (const tc of CASES) {
  const terms   = tokenize(tc.query);
  const results = retrieve(items, tc.query);
  const display = filterDisplayLinks(results, terms);
  const type    = classifyAnswerType(results);
  const top     = results[0];

  const typeOk = type === tc.expectType;
  const topOk  = top && top.title.toLowerCase().includes(tc.expectTop.toLowerCase());
  const pass   = typeOk && topOk;

  if (pass) passed++; else failed++;

  const mark = pass ? "✓" : "✗";
  console.log(`\n${mark}  ${tc.query}`);
  console.log(`   tokens:   ${terms.join(", ")}`);
  console.log(`   type:     ${type}${typeOk ? "" : ` (expected ${tc.expectType})`}`);
  console.log(`   #1 score: ${top?.score ?? "—"}  ${top?.title ?? "NO RESULT"}`);
  if (!topOk) console.log(`   expected title to contain: "${tc.expectTop}"`);
  console.log(`   display:  ${display.slice(0, 2).map((r) => r.title).join(" | ") || "NONE"}`);
}

console.log(`\n${passed}/${CASES.length} passed${failed ? `  (${failed} failed)` : ""}`);
if (failed) process.exit(1);
