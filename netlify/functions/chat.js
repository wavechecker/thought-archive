// netlify/functions/chat.js
// PatientGuide chatbot API handler.
// Requires ANTHROPIC_API_KEY environment variable.
//
// MODULE FORMAT NOTE
// This file uses CommonJS syntax (require / exports.handler) even though
// package.json declares "type": "module". It works because @astrojs/netlify
// bundles all Netlify Functions with esbuild at deploy time, which handles
// CJS→ESM interop transparently. The dynamic import() of retrieval.mjs is
// similarly resolved by esbuild at bundle time and is effectively synchronous
// after the cold-start Promise resolves.
//
// Do NOT run this file directly with `node netlify/functions/chat.js` —
// always test via `netlify dev` or a Netlify deploy preview.

"use strict";

const CHATBOT_INDEX = require("./chatbot-index.json");

// Load shared retrieval/safety module once; await in handler (cached Promise).
const _retrievalP = import("./retrieval.mjs");

// ---------------------------------------------------------------------------
// Rate limiting — in-memory sliding window per IP
//
// ⚠ Limitations: state is per-process. Netlify may spin up multiple concurrent
// function instances, each with independent state. Cold starts reset all
// counters. This protects against accidental loops, rapid page refreshes, and
// casual abuse — not against a coordinated distributed attack.
// For stronger protection, add a Netlify WAF rule or Redis-backed counter.
// ---------------------------------------------------------------------------

const _rateMap = new Map();
const RATE_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT     = 15;     // max requests per window per IP
let   _reqCount      = 0;

function getClientIp(headers) {
  // x-nf-client-connection-ip is set by Netlify's edge and cannot be spoofed.
  // x-forwarded-for is a fallback for local netlify dev.
  const ip = headers["x-nf-client-connection-ip"]
    || (headers["x-forwarded-for"] || "").split(",")[0].trim();
  return ip.slice(0, 45) || "unknown"; // 45 chars covers full IPv6
}

function checkRateLimit(ip) {
  const now    = Date.now();
  const cutoff = now - RATE_WINDOW_MS;
  const prev   = (_rateMap.get(ip) || []).filter((t) => t > cutoff);
  prev.push(now);
  _rateMap.set(ip, prev);

  // Prune stale entries every 100 requests to bound memory growth.
  _reqCount++;
  if (_reqCount % 100 === 0) {
    for (const [key, hits] of _rateMap) {
      if (!hits.some((t) => t > cutoff)) _rateMap.delete(key);
    }
  }

  return prev.length > RATE_LIMIT;
}

// ---------------------------------------------------------------------------
// Onward routing helpers
// ---------------------------------------------------------------------------

function onwardRoute(queryType, isUnavailable = false) {
  if (queryType === "medication")       return "pharmacist or GP";
  if (queryType === "personal-symptom") return "GP or clinician";
  if (isUnavailable)                    return "trusted health authority";
  return null;
}

function onwardMessage(queryType, answerType) {
  if (queryType === "medication") {
    return "For questions about specific medications, dosages, or interactions, please speak with a pharmacist or your GP.";
  }
  if (queryType === "personal-symptom") {
    return "For personal symptom assessment, please speak with your GP or a relevant clinician who knows your history.";
  }
  if (answerType === "unavailable") {
    return "PatientGuide does not currently cover this topic well enough to give a reliable answer. For health information, consider the NHS, Mayo Clinic, or CDC — or speak with a clinician.";
  }
  return null;
}

// ---------------------------------------------------------------------------
// Context block for Claude — structured content per retrieved item
// ---------------------------------------------------------------------------

function trimAtWordBoundary(text, maxLen) {
  if (text.length <= maxLen) return text;
  const cut = text.slice(0, maxLen);
  return cut.replace(/\s+\S*$/, "").trim();
}

function buildContextBlock(results) {
  return results
    .map((item, i) => {
      const parts = [`[${i + 1}] ${item.title}`, `URL: ${item.url}`];

      if (item.description) {
        parts.push(`About: ${item.description}`);
      }
      if (item.tags && item.tags.length) {
        parts.push(`Topics: ${item.tags.slice(0, 5).join(", ")}`);
      }
      if (item.headings && item.headings.length) {
        parts.push(`Sections: ${item.headings.slice(0, 6).join(" | ")}`);
      }
      if (item.faq && item.faq.length) {
        const faqLines = item.faq
          .slice(0, 3)
          .map((f) => `  Q: ${f.q}\n  A: ${trimAtWordBoundary(f.a, 220)}`)
          .join("\n");
        parts.push(`FAQs:\n${faqLines}`);
      }
      if (item.excerpt) {
        const trimmed = trimAtWordBoundary(item.excerpt, 380);
        if (trimmed) parts.push(`Excerpt: ${trimmed}`);
      }

      return parts.join("\n");
    })
    .join("\n\n---\n\n");
}

// ---------------------------------------------------------------------------
// System prompt — base + query-type addenda
// ---------------------------------------------------------------------------

const BASE_SYSTEM_PROMPT = `You are PatientGuide's content assistant. Your role is to help users find and understand information published on PatientGuide.

Rules:
- Only answer using the retrieved PatientGuide content provided in <context> tags. Do not use outside medical knowledge to answer health questions.
- Do not diagnose. Do not tell the user what condition they have.
- Do not provide personalised medical advice or tell anyone what treatment they personally need.
- Keep answers concise, calm, and clear. 2–4 sentences maximum.
- Use plain English. Avoid jargon where possible.
- If the retrieved content is partial or limited, say so honestly and briefly.
- If the retrieved content does not adequately address the question, say clearly that PatientGuide does not yet have enough information on this topic.

Respond ONLY with a valid JSON object — no other text, no markdown — using this exact shape:
{"answer":"…","safetyNote":"…or null"}

"answer": 2–4 sentences, plain text, no markdown.
"safetyNote": a brief clinical safety note if genuinely warranted (e.g. when to seek care), otherwise null.`;

const MEDICATION_ADDENDUM = `

SPECIAL INSTRUCTION — MEDICATION QUERY: The user is asking about a specific medication, dosage, or drug interaction. You MUST NOT provide specific medication guidance. Briefly explain any relevant general concept from the retrieved content if applicable, then clearly state that specific medication questions require a pharmacist or GP. Do not attempt to answer the specific medication question itself.`;

const PERSONAL_SYMPTOM_ADDENDUM = `

SPECIAL INSTRUCTION — PERSONAL SYMPTOM QUERY: The user is describing personal symptoms. You MUST NOT interpret their specific symptoms, suggest what condition they might have, or use language like "this could be X". Use the retrieved content only to explain what the general medical topic involves. Do not address or assess the user's individual situation.`;

function buildSystemPrompt(queryType) {
  if (queryType === "medication")       return BASE_SYSTEM_PROMPT + MEDICATION_ADDENDUM;
  if (queryType === "personal-symptom") return BASE_SYSTEM_PROMPT + PERSONAL_SYMPTOM_ADDENDUM;
  return BASE_SYSTEM_PROMPT;
}

// ---------------------------------------------------------------------------
// Claude API call
// ---------------------------------------------------------------------------

async function callClaude(question, results, queryType, apiKey) {
  const contextBlock = buildContextBlock(results);
  const userContent  = `<context>\n${contextBlock}\n</context>\n\nUser question: ${question}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type":      "application/json",
      "x-api-key":         apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model:      "claude-sonnet-4-6",
      max_tokens: 750,
      system:     buildSystemPrompt(queryType),
      messages:   [{ role: "user", content: userContent }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => String(res.status));
    throw new Error(`Anthropic API ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data  = await res.json();
  const raw   = (data.content?.[0]?.text || "").trim();
  const match = raw.match(/\{[\s\S]*\}/);

  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      if (parsed.answer) return parsed;
    } catch {
      // fall through
    }
  }

  // Claude returned non-JSON — fail closed rather than silently degrade.
  console.error("Claude non-JSON response:", raw.slice(0, 400));
  throw new Error("Claude returned unexpected response format");
}

// ---------------------------------------------------------------------------
// Logging — structured JSONL, no raw user text
//
// Raw health questions are not logged to avoid unnecessary PHI exposure.
// Instead we log classification signals and retrieval hits, which are
// sufficient for content-gap analysis and editorial review.
// ---------------------------------------------------------------------------

function logQuery(entry) {
  console.log(
    "CHATBOT_LOG " +
      JSON.stringify({
        ts:           new Date().toISOString(),
        qLen:         entry.qLen   || 0,        // query length for volume analytics
        queryType:    entry.queryType  || "informational",
        answerType:   entry.answerType || null,  // retrieval confidence
        mode:         entry.mode       || null,  // response type sent to client
        topScore:     entry.topScore   || 0,
        topUrls:      (entry.topUrls   || []).slice(0, 3),
        topTitles:    (entry.topTitles || []).slice(0, 3), // content-gap analysis
      })
  );
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

const HEADERS = {
  "Content-Type":  "application/json",
  "Cache-Control": "no-store",
};

exports.handler = async function (event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: HEADERS, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: HEADERS,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  // --- Rate limiting ---
  const ip = getClientIp(event.headers || {});
  if (checkRateLimit(ip)) {
    return {
      statusCode: 429,
      headers: { ...HEADERS, "Retry-After": "60" },
      body: JSON.stringify({
        error: "Too many requests. Please wait a moment before asking again.",
      }),
    };
  }

  // --- Input parsing and validation ---
  let question;
  try {
    const body = JSON.parse(event.body || "{}");
    question = String(body.question || "").trim();
  } catch {
    return {
      statusCode: 400,
      headers: HEADERS,
      body: JSON.stringify({ error: "Invalid request body" }),
    };
  }

  if (!question) {
    return {
      statusCode: 400,
      headers: HEADERS,
      body: JSON.stringify({ error: "Question is required" }),
    };
  }

  if (question.length > 600) {
    return {
      statusCode: 400,
      headers: HEADERS,
      body: JSON.stringify({ error: "Question too long (max 600 characters)" }),
    };
  }

  // --- Load shared module (cached Promise, near-synchronous on warm instances) ---
  const { retrieve, classifyQuery, classifyAnswerType, responseMode, filterDisplayLinks, tokenize } = await _retrievalP;

  // --- Safety classification ---
  const queryType = classifyQuery(question);

  if (queryType === "urgent") {
    logQuery({ qLen: question.length, queryType: "urgent", answerType: "urgent", mode: "urgent" });
    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({
        type:         "urgent",
        answer:       "PatientGuide cannot assess emergencies. If you or someone else may be in danger, please contact emergency services immediately.",
        links:        [],
        safetyNote:   "In a medical emergency do not delay — call 999 (UK), 911 (US), 112 (EU), or your local emergency number now.",
        onwardRoute:  "emergency services",
        onwardMessage:"Call your local emergency number immediately. Do not wait.",
      }),
    };
  }

  // --- Retrieval ---
  const results    = retrieve(CHATBOT_INDEX.items, question);
  const answerType = classifyAnswerType(results);
  const mode       = responseMode(queryType, answerType);
  const topScore   = results[0]?.score || 0;

  // filterDisplayLinks removes keyword-coincidence results. Claude still receives
  // the full `results` context — only the displayed links are affected.
  const queryTerms     = tokenize(question);
  const displayResults = filterDisplayLinks(results, queryTerms);

  // Strong links: passed the display filter (relevant to 2+ query terms).
  const strongLinks = displayResults.slice(0, 3).map((r) => ({ title: r.title, url: r.url }));

  // Fallback links: shown only when the strict filter removed everything but raw
  // results exist. Labeled "Possibly related content" so lower confidence is clear.
  const needsFallback = displayResults.length === 0 && results.length > 0;
  const fallbackLinks = needsFallback
    ? results.slice(0, 2).map((r) => ({ title: r.title, url: r.url }))
    : [];
  const linkNote = needsFallback
    ? "We couldn't find closely matching guides for this question."
    : null;

  const topTitles = results.slice(0, 3).map((r) => r.title);

  if (answerType === "unavailable") {
    // For unavailable, strong links become "related content" (capped at 2).
    // Fallback links are offered when even those are absent.
    const unavailableLinks = strongLinks.slice(0, 2);
    const unavailableAnswer = (unavailableLinks.length || fallbackLinks.length)
      ? "PatientGuide doesn't have a direct answer for this question. You may find these related guides useful, or try rephrasing your question."
      : "PatientGuide does not currently cover this topic. Try rephrasing your question, or consult a trusted health source.";

    logQuery({
      qLen: question.length, queryType, answerType, mode: "unavailable",
      topScore,
      topUrls:   unavailableLinks.map((l) => l.url),
      topTitles: unavailableLinks.map((l) => l.title),
    });
    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({
        type:         "unavailable",
        answer:       unavailableAnswer,
        links:        unavailableLinks,
        fallbackLinks,
        linkNote,
        safetyNote:   null,
        onwardRoute:  onwardRoute(queryType, true),
        onwardMessage:onwardMessage(queryType, answerType),
      }),
    };
  }

  // --- Claude API ---
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY is not set");
    return {
      statusCode: 503,
      headers: HEADERS,
      body: JSON.stringify({ error: "Service temporarily unavailable" }),
    };
  }

  try {
    const claudeResp = await callClaude(question, results, queryType, apiKey);

    logQuery({
      qLen: question.length, queryType, answerType, mode,
      topScore,
      topUrls:   strongLinks.map((l) => l.url),
      topTitles,
    });

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({
        type:         mode,
        answer:       claudeResp.answer || "",
        links:        strongLinks,
        fallbackLinks,
        linkNote,
        safetyNote:   claudeResp.safetyNote || null,
        onwardRoute:  onwardRoute(queryType),
        onwardMessage:onwardMessage(queryType, answerType),
      }),
    };
  } catch (err) {
    console.error("chat handler error:", err.message);
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({ error: "Something went wrong. Please try again." }),
    };
  }
};
