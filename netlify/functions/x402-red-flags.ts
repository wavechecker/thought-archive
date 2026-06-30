/**
 * x402 red-flags — paid structured urgent-care signals endpoint.
 *
 * Called by the Cloudflare x402 Worker AFTER a valid testnet payment is
 * verified AND settled. Not intended for direct browser or curl access.
 *
 * SAFETY: X402_WORKER_SECRET must match the Worker secret. Absent or
 * mismatched secret returns 403. Missing secret in production returns 500.
 *
 * Data source: curated static map in this file (hypertension only for preview).
 * Educational content only — not a diagnosis or emergency triage tool.
 *
 * TESTNET/DEVNET ONLY — Base Sepolia (eip155:84532) and Solana Devnet.
 */

import type { Handler, HandlerEvent } from "@netlify/functions";

interface RedFlag {
  signal: string;
  whyItMatters: string;
  suggestedAction: string;
}

interface RedFlagsEntry {
  slug: string;
  title: string;
  type: "red_flags";
  redFlags: RedFlag[];
  disclaimer: string;
}

// Curated static map — add slugs only when content has been reviewed.
// Sources: broadly accepted urgent-care signals from clinical literature.
// This is educational information, not a diagnosis or triage tool.
const RED_FLAGS: Record<string, RedFlagsEntry> = {
  hypertension: {
    slug: "hypertension",
    title: "Hypertension",
    type: "red_flags",
    redFlags: [
      {
        signal: "Chest pain, pressure, or tightness",
        whyItMatters:
          "Can indicate a heart attack or another urgent cardiovascular problem.",
        suggestedAction: "Seek urgent medical care immediately.",
      },
      {
        signal:
          "Severe headache with confusion, weakness, vision changes, or trouble speaking",
        whyItMatters:
          "Can suggest stroke, hypertensive emergency, or another serious neurological problem.",
        suggestedAction: "Seek emergency care immediately.",
      },
      {
        signal: "Shortness of breath, fainting, or severe dizziness",
        whyItMatters:
          "Can occur with heart, lung, or blood pressure emergencies.",
        suggestedAction: "Seek urgent medical care.",
      },
    ],
    disclaimer:
      "Educational information only. Not a diagnosis, emergency triage tool, or substitute for professional medical care. If symptoms are severe, sudden, or concerning, seek urgent medical help.",
  },
};

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,99}$/;

const isLocalDev = process.env.CONTEXT === "dev" || !process.env.NETLIFY;

function json(status: number, body: unknown, extra?: Record<string, string>): ReturnType<Handler> {
  return {
    statusCode: status,
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...extra },
  };
}

export const handler: Handler = async (event: HandlerEvent) => {
  // ── Secret enforcement ──────────────────────────────────────────────────
  const expectedSecret = process.env.X402_WORKER_SECRET;

  if (!expectedSecret) {
    if (!isLocalDev) {
      return json(500, { error: "x402_origin_not_configured" });
    }
  } else {
    const provided = event.headers["x-worker-secret"];
    if (provided !== expectedSecret) {
      return json(403, { error: "forbidden" });
    }
  }

  // ── Slug validation ─────────────────────────────────────────────────────
  const slug = event.queryStringParameters?.slug ?? null;

  if (!slug) {
    return json(400, { error: "missing_slug" });
  }

  if (!SLUG_RE.test(slug)) {
    return json(400, { error: "invalid_slug" });
  }

  // ── Red-flags lookup ────────────────────────────────────────────────────
  const entry = RED_FLAGS[slug];

  if (!entry) {
    return json(404, { error: "guide_not_found" });
  }

  return json(200, entry);
};
