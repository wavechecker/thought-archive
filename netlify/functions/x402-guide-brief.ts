/**
 * x402 guide-brief — paid structured guide metadata endpoint.
 *
 * Called by the Cloudflare x402 Worker AFTER a valid testnet payment is
 * verified AND settled. Not intended for direct browser or curl access.
 *
 * SAFETY: X402_WORKER_SECRET must match the Worker secret. Absent or
 * mismatched secret returns 403. Missing secret in production returns 500.
 *
 * Data source: x402-guide-briefs.json — built at deploy time from
 * src/content/guides/ via scripts/build-x402-guide-briefs.mjs.
 *
 * TESTNET ONLY — Base Sepolia (eip155:84532).
 */

import type { Handler, HandlerEvent } from "@netlify/functions";
import { createRequire } from "node:module";

// esbuild inlines the JSON at bundle time — the file does not need to exist
// alongside the deployed function at runtime.
const _require = createRequire(import.meta.url);
const GUIDE_BRIEFS: Record<string, GuideBrief> = _require("./x402-guide-briefs.json");

interface RelatedGuide {
  title: string;
  slug: string;
  url: string;
}

interface GuideBrief {
  slug: string;
  title: string;
  description: string | null;
  category: string | null;
  publishDate: string | null;
  updatedDate: string | null;
  tags: string[];
  keyPoints: string[];
  relatedGuides: RelatedGuide[];
  canonicalUrl: string;
}

// Same allowed-slug pattern used by the Worker.
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,99}$/;

// Local-only bypass: allowed when running `netlify dev` or plain Node locally.
// In all Netlify-deployed contexts (production, branch-deploy, deploy-preview),
// NETLIFY=true and CONTEXT !== "dev", so the bypass does not apply.
const isLocalDev = process.env.CONTEXT === "dev" || !process.env.NETLIFY;

function json(status: number, body: unknown, extra?: Record<string, string>): ReturnType<Handler> {
  return {
    statusCode: status,
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...extra },
  };
}

function getSlug(event: HandlerEvent): string | null {
  return event.queryStringParameters?.slug ?? null;
}

export const handler: Handler = async (event) => {
  // ── Secret enforcement ──────────────────────────────────────────────────
  const expectedSecret = process.env.X402_WORKER_SECRET;

  if (!expectedSecret) {
    if (!isLocalDev) {
      return json(500, { error: "x402_origin_not_configured" });
    }
    // Local dev without a configured secret: skip enforcement.
  } else {
    const provided = event.headers["x-worker-secret"];
    if (provided !== expectedSecret) {
      return json(403, { error: "forbidden" });
    }
  }

  // ── Slug validation ─────────────────────────────────────────────────────
  const slug = getSlug(event);

  if (!slug) {
    return json(400, { error: "missing_slug" });
  }

  if (!SLUG_RE.test(slug)) {
    return json(400, { error: "invalid_slug" });
  }

  // ── Guide lookup ────────────────────────────────────────────────────────
  const brief = GUIDE_BRIEFS[slug];

  if (!brief) {
    return json(404, { error: "guide_not_found" });
  }

  return json(200, brief);
};
