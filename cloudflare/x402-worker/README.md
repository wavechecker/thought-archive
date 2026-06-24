# PatientGuide x402 Testnet Worker

> **Status: TESTNET ONLY — Base Sepolia (`eip155:84532`)**
> This worker is a payment-gating experiment using the x402 protocol on Base Sepolia
> testnet USDC. No real funds are involved. Mainnet (`eip155:8453`) is not configured
> and must not be used in this experiment.

---

## Core principle

**Humans read public guides for free.**
**Machines and agents pay for structured API access.**

`/guides/*` remains completely free and public. The x402 gate only applies to
structured JSON endpoints under `/api/x402/*`, intended for programmatic access.

---

## What is x402?

[x402](https://x402.org) is an open HTTP payment protocol built on top of the
standard `402 Payment Required` status code. A client that wants to access a
gated resource:

1. Makes an initial request → receives a `402` response with a JSON
   `X-PAYMENT-REQUIRED` header describing how to pay (token, amount, address).
2. Signs a USDC transfer authorisation (EIP-3009 `transferWithAuthorization`)
   without broadcasting it to the chain.
3. Re-sends the request with the signed authorisation in an `X-PAYMENT` header.
4. The server verifies and settles the payment via a **facilitator** (Coinbase CDP),
   then returns the protected resource.

The whole flow happens in one HTTP round-trip for the caller.

---

## Current deployed architecture

`patientguide.io` is **not** currently configured as a native Cloudflare zone route
for this Worker. Instead, traffic reaches the Worker via a Netlify proxy redirect:

```
Browser / curl / x402 client
        │
        │  GET https://patientguide.io/api/x402/<path>
        ▼
┌─────────────────────────────┐
│  Netlify proxy redirect     │
│  /api/x402/*                │
│  → patientguide-x402-worker │
│    .wavechecker.workers.dev │
└─────────┬───────────────────┘
          │  (internal — Worker sees workers.dev hostname)
          ▼
┌─────────────────────────────┐
│  Cloudflare Worker          │  ← this project
│                             │
│  1. Route guard             │
│  2. Env validation          │
│  3. No X-PAYMENT → 402      │
│     (canonical resource)    │
│  4. Verify payment          │
│  5. Settle payment          │
│  6. Return response         │
│     (Worker-only or origin) │
└─────────────────────────────┘
```

### Canonical resource URL

Although the Worker is internally reached via `patientguide-x402-worker.wavechecker.workers.dev`,
it canonicalizes the x402 `resource` field to the **public-facing URL**:

```
https://patientguide.io/api/x402/ping
https://patientguide.io/api/x402/guide-brief?slug=hypertension
```

This is done using the `PATIENTGUIDE_ORIGIN` secret:

```typescript
const canonicalOrigin = env.PATIENTGUIDE_ORIGIN.replace(/^﻿/, "").replace(/\/+$/, "");
const resource = `${canonicalOrigin}${url.pathname}?slug=${slug}`;
```

Payment proofs are therefore bound to the client-facing URL, not the internal workers.dev hostname.

### Future clean architecture

When `patientguide.io` moves fully behind Cloudflare as a zone, the Netlify proxy
redirect would be replaced by a native `[[routes]]` binding in `wrangler.toml`:

```toml
[[routes]]
  pattern = "patientguide.io/api/x402/*"
  zone_name = "patientguide.io"
```

No code changes are required — only the routing topology changes.

---

## Endpoints

### `/api/x402/ping` — Worker-only test

A minimal test endpoint to verify the x402 payment gate works end-to-end.
The response is built directly in the Worker — no Netlify function is called.

**No payment:**
```
HTTP 402 Payment Required
X-PAYMENT-REQUIRED: { x402Version, accepts: [{ network, resource, ... }], error }
```

**After valid payment:**
```json
{
  "ok": true,
  "service": "PatientGuide x402 test",
  "paid": true,
  "network": "eip155:84532",
  "networkName": "Base Sepolia",
  "origin": "cloudflare-worker"
}
```

---

### `/api/x402/guide-brief?slug=<slug>` — Paid structured guide metadata

Returns structured metadata from the actual Astro guide content collection.
Intended for machine / agent access to guide data.

**No payment:**
```
HTTP 402 Payment Required
X-PAYMENT-REQUIRED: { x402Version, accepts: [{ network, resource: "https://patientguide.io/api/x402/guide-brief?slug=hypertension", ... }] }
```

**After valid payment:**
```json
{
  "slug": "hypertension",
  "title": "Hypertension: Symptoms, Causes, Diagnosis, Treatment, and Home Blood Pressure Monitoring",
  "description": "An evidence-based guide to high blood pressure...",
  "category": "Heart & Circulation",
  "publishDate": "2026-06-17",
  "updatedDate": "2026-06-17",
  "tags": ["hypertension", "high blood pressure", "..."],
  "keyPoints": ["Hypertension is defined as...", "..."],
  "relatedGuides": [
    { "title": "Cardiovascular Risk Assessment...", "slug": "cardiovascular-risk-assessment", "url": "https://patientguide.io/guides/cardiovascular-risk-assessment" }
  ],
  "canonicalUrl": "https://patientguide.io/guides/hypertension"
}
```

Data source: `netlify/functions/x402-guide-briefs.json` — built at deploy time by
`scripts/build-x402-guide-briefs.mjs` from `src/content/guides/`. Draft guides excluded.

**Flow:**
```
Worker gates payment → settles → proxies to Netlify function
                                 └── reads pre-built guide briefs JSON
                                 └── returns structured metadata
```

---

## Origin bypass protection

The `guide-brief` endpoint has an origin Netlify function. To prevent callers from
hitting it directly and bypassing the payment gate:

- The Worker sets `X-Worker-Secret: <secret>` on all calls to the origin.
- The Netlify function requires this header — returns `403 forbidden` if missing or wrong.
- The secret is stored in both Cloudflare Worker secrets and Netlify environment variables.

Direct access to `/.netlify/functions/x402-guide-brief` without the correct secret returns `403`.

---

## Network identifiers

| Identifier | Chain | Allowed in this experiment |
|---|---|---|
| `eip155:84532` | Base Sepolia testnet | ✅ yes |
| `eip155:8453` | Base mainnet | ❌ NO — do not use |

The Worker enforces `eip155:84532` at runtime. Any other value (including `eip155:8453`)
causes the Worker to return `503 x402_network_not_allowed` — fails closed.

---

## Public routes (untouched)

| Path | Served by | Free? |
|---|---|---|
| `/` | Netlify (Astro) | ✅ yes |
| `/guides/*` | Netlify (Astro) | ✅ yes |
| `/posts/*` | Netlify (Astro) | ✅ yes |
| `/search/*` | Netlify (Astro) | ✅ yes |
| `/sitemap*.xml` | Netlify (Astro) | ✅ yes |
| `/robots.txt` | Netlify (Astro) | ✅ yes |
| `/api/x402/ping` | Cloudflare Worker | x402 gated (testnet) |
| `/api/x402/guide-brief` | Cloudflare Worker → Netlify fn | x402 gated (testnet) |

---

## Part 3 — Mainnet (disabled, not planned)

Part 3 would be moving to mainnet (`eip155:8453`). This is intentionally disabled.
All of the following changes would be required before mainnet:

- Set `X402_NETWORK` to `eip155:8453` in `wrangler.toml`
- Update `REQUIRED_NETWORK` in `src/index.ts` to `"eip155:8453"`
- Update `USDC_BASE_SEPOLIA` to the mainnet USDC contract address
- Update `X402_RECEIVING_ADDRESS` to a mainnet wallet
- A separate PR review with explicit sign-off

> `eip155:8453` = Base mainnet. Using this value would enable **real** USDC
> payments with real monetary value. This experiment is `eip155:84532` (testnet) only.

---

## Files

| Path | Purpose |
|---|---|
| `cloudflare/x402-worker/src/index.ts` | Worker entry point — x402 gate logic |
| `cloudflare/x402-worker/wrangler.toml` | Cloudflare Worker config |
| `netlify/functions/x402-guide-brief.ts` | Paid guide brief origin endpoint |
| `netlify/functions/x402-guide-briefs.json` | Pre-built guide brief data (gitignored — built at deploy time) |
| `scripts/build-x402-guide-briefs.mjs` | Build script that generates x402-guide-briefs.json |

---

## Setup and deployment

### 1. Install dependencies

```bash
cd cloudflare/x402-worker
npm install
```

### 2. Configure Worker secrets

```bash
wrangler secret put X402_RECEIVING_ADDRESS    # Base Sepolia wallet address
wrangler secret put X402_FACILITATOR_URL      # https://x402.org/facilitator
wrangler secret put PATIENTGUIDE_ORIGIN       # https://patientguide.io
wrangler secret put X402_WORKER_SECRET        # openssl rand -hex 32
```

### 3. Configure Netlify environment variable

In Netlify: Site settings → Environment variables:

```
X402_WORKER_SECRET = <same value as the Worker secret>
```

### 4. Deploy Netlify site

```bash
# From repo root — triggers prebuild which generates x402-guide-briefs.json
git push origin main
```

### 5. Deploy Worker

```bash
cd cloudflare/x402-worker
npm run deploy
```

### 6. Verify

```bash
# Should return 402 with canonical resource URL
curl -i "https://patientguide.io/api/x402/ping"
curl -i "https://patientguide.io/api/x402/guide-brief?slug=hypertension"

# Origin bypass check — should return 403
curl -i "https://patientguide.io/.netlify/functions/x402-guide-brief?slug=hypertension"
```

---

## Environment variables reference

| Variable | Where | Description |
|---|---|---|
| `X402_NETWORK` | `wrangler.toml [vars]` | CAIP-2 chain — must be `eip155:84532`. `eip155:8453` is mainnet and must not be used. |
| `X402_PRICE_USDC` | `wrangler.toml [vars]` | Price per request in USDC decimal string |
| `X402_RECEIVING_ADDRESS` | Wrangler secret | Base Sepolia testnet wallet address |
| `X402_FACILITATOR_URL` | Wrangler secret | `https://x402.org/facilitator` |
| `PATIENTGUIDE_ORIGIN` | Wrangler secret | `https://patientguide.io` — used to canonicalize x402 resource URLs |
| `X402_WORKER_SECRET` | Wrangler secret + Netlify env | Shared secret for Worker→origin auth; prevents direct origin bypass |
