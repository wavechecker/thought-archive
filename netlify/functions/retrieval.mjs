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
  "much","now","only","some","too","very",
  // Generic nouns that are too vague to serve as high-signal filter hits in
  // short 2-term queries (e.g. "weight loss" should not pass on "loss" alone).
  "loss",
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
  /\b(seizure|convuls|fitting|fit and)\b/i,
  /\bsevere (bleeding|hemorrhage|haemorrhage)\b/i,
  /\boverdose\b/i,
  /\b(2[1-9][0-9]|[3-9][0-9]{2})\/\d{2,3}\b/,
];

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
  if (URGENT_PATTERNS.some((p) => p.test(question))) return "urgent";
  if (MEDICATION_PATTERNS.some((p) => p.test(question))) return "medication";
  if (PERSONAL_SYMPTOM_PATTERNS.some((p) => p.test(question))) return "personal-symptom";
  return "informational";
}

// ---------------------------------------------------------------------------
// Tokenisation
// ---------------------------------------------------------------------------

export function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t));
}

// ---------------------------------------------------------------------------
// Scoring — word-boundary-aware matching
// ---------------------------------------------------------------------------

// Cache compiled regexes; rebuilt only once per unique term per process lifetime.
const _regexCache = new Map();

function termRegex(term) {
  if (!_regexCache.has(term)) {
    const esc = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Negative lookbehind: the term must not be immediately preceded by [a-z0-9].
    // No positive lookahead, so plurals and inflected forms still match
    // (e.g. query term "antidepressant" hits document token "antidepressants").
    _regexCache.set(term, new RegExp(`(?<![a-z0-9])${esc}`, "i"));
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
//   - the item's raw score is very high (≥ 15), indicating a strong overall match
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
    if (item.score >= 15) return true; // already strongly grounded
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
