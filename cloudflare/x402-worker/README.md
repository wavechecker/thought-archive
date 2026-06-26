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
| `/api/x402/ping` | Cloudflare Worker | x402 gated |
| `/api/x402/guide-brief` | Cloudflare Worker → Netlify fn | x402 gated |

---

## Part 3 — Guarded Base mainnet micro-test

> **Status: code-ready, not yet deployed.**
> The Worker now supports an explicit mode switch. Mainnet requires setting
> secrets via `wrangler secret put` and deploying — see below.

### Mode switch overview

| Var | Testnet | Mainnet micro-test |
|---|---|---|
| `X402_MODE` | `testnet` (default) | `mainnet` |
| `X402_NETWORK` | `eip155:84532` | `eip155:8453` |
| `X402_PRICE_USDC` | `0.001` | `0.001` |
| `X402_RECEIVING_ADDRESS` | testnet wallet | `0x21Eacb622931926616C9a458648E7BA02A198561` |
| USDC asset | Base Sepolia USDC | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |

**Native Base mainnet USDC verified via:** Uniswap default token list, CoinGecko Base
token list, and EIP-55 checksum — `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`.

Do NOT use:
- USDT or any non-USDC token
- L2 Standard Bridged USDC (different contract)
- Ethereum mainnet USDC
- Base Sepolia USDC contract in mainnet mode

### Guard behaviour

The Worker enforces all of the following at runtime, returning `503` if any fails:

| Check | Error code |
|---|---|
| `X402_MODE` is missing or unknown | `x402_invalid_mode` |
| `X402_NETWORK` does not match `X402_MODE` | `x402_mode_network_mismatch` |
| Any required env var is absent | `x402_not_configured` |
| Mainnet price > 0.01 USDC without override | `x402_mainnet_price_cap_exceeded` |

Mainnet is **never** inferred from the network value alone. Both `X402_MODE=mainnet`
AND `X402_NETWORK=eip155:8453` must be set together. Mismatch fails closed.

### Mainnet price cap

In mainnet mode, `X402_PRICE_USDC` above `0.01` causes `503 x402_mainnet_price_cap_exceeded`
unless `X402_ALLOW_HIGHER_MAINNET_PRICE=true` is also set.

For the micro-test, set `X402_PRICE_USDC=0.001` and do **not** set
`X402_ALLOW_HIGHER_MAINNET_PRICE`.

### Wallet rules

| Wallet | Role | Needs funding | Private key used? |
|---|---|---|---|
| Buyer `0x4B0116EEb712b02a93dB8F5d3FFBa9e1C71407dD` | Signs EIP-3009 auth | Yes — small Base ETH + small Base USDC | Yes — locally only |
| Receiver `0x21Eacb622931926616C9a458648E7BA02A198561` | Receives USDC after settlement | No — starts blank | **Never** |

The receiver wallet only needs to exist as an address. Do not fund it. Do not use its
private key anywhere. It receives the USDC payment from the facilitator after settlement.

### To deploy mainnet micro-test

> **Wait for explicit instruction before deploying.**

When ready, set mainnet secrets (do NOT commit these values):

```bash
cd cloudflare/x402-worker

# These override wrangler.toml [vars] at runtime
wrangler secret put X402_MODE              # mainnet
wrangler secret put X402_NETWORK           # eip155:8453
wrangler secret put X402_RECEIVING_ADDRESS # 0x21Eacb622931926616C9a458648E7BA02A198561
wrangler secret put X402_PRICE_USDC        # 0.001
wrangler secret put X402_FACILITATOR_URL   # https://x402.org/facilitator
wrangler secret put PATIENTGUIDE_ORIGIN    # https://patientguide.io
wrangler secret put X402_WORKER_SECRET     # (same value as Netlify)

# Then deploy
npm run deploy
```

To revert to testnet: set `X402_MODE=testnet` and `X402_NETWORK=eip155:84532` via
`wrangler secret put`, then redeploy. No code changes needed.

### Public routes remain free

Enabling mainnet mode does **not** affect public routes. `/guides/*`, `/posts/*`, and
all other public Astro pages remain completely free and unaffected. Only `/api/x402/*`
is gated, and only after payment is verified and settled.

### Direct origin protection remains intact

The Netlify function `/.netlify/functions/x402-guide-brief` continues to require
`X-Worker-Secret` and returns `403` for direct access regardless of mode.

---

## Files

| Path | Purpose |
|---|---|
| `cloudflare/x402-worker/src/index.ts` | Worker entry point — x402 gate + mode switch |
| `cloudflare/x402-worker/wrangler.toml` | Cloudflare Worker config (testnet defaults) |
| `netlify/functions/x402-guide-brief.ts` | Paid guide brief origin endpoint |
| `netlify/functions/x402-guide-briefs.json` | Pre-built guide brief data (gitignored — built at deploy time) |
| `scripts/build-x402-guide-briefs.mjs` | Build script that generates x402-guide-briefs.json |
| `scripts/test-x402-paid-request.mjs` | Local buyer test client (testnet + mainnet) |

---

## Setup and deployment

### 1. Install dependencies

```bash
cd cloudflare/x402-worker
npm install
```

### 2. Configure Worker secrets (testnet)

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
| `X402_MODE` | `wrangler.toml [vars]` or secret | `"testnet"` (default) or `"mainnet"`. Unknown values fail closed. |
| `X402_NETWORK` | `wrangler.toml [vars]` or secret | CAIP-2 chain. Must match `X402_MODE`: testnet→`eip155:84532`, mainnet→`eip155:8453`. |
| `X402_PRICE_USDC` | `wrangler.toml [vars]` or secret | Price per request in decimal USDC. Mainnet capped at 0.01 without override. |
| `X402_RECEIVING_ADDRESS` | Wrangler secret | Receiving wallet. Testnet: any Sepolia address. Mainnet micro-test: `0x21Eacb…8561`. |
| `X402_FACILITATOR_URL` | Wrangler secret | `https://x402.org/facilitator` |
| `PATIENTGUIDE_ORIGIN` | Wrangler secret | `https://patientguide.io` — used to canonicalize x402 resource URLs |
| `X402_WORKER_SECRET` | Wrangler secret + Netlify env | Shared secret for Worker→origin auth; prevents direct origin bypass |
| `X402_ALLOW_HIGHER_MAINNET_PRICE` | Wrangler secret (optional) | Set `"true"` to allow mainnet price above 0.01 USDC. Do not set for the micro-test. |

---

## Local buyer test client

`scripts/test-x402-paid-request.mjs` works for both testnet and mainnet.

### Required

```bash
export BUYER_PRIVATE_KEY=0x<disposable-wallet-private-key>
```

Use a **disposable** wallet. Never use a wallet that holds real funds you care about.
The script never prints the private key.

### Optional validation guards (strongly recommended for mainnet)

```bash
export X402_EXPECTED_NETWORK=eip155:8453   # abort before signing if network differs
export X402_EXPECTED_PAYTO=0x21Eacb...     # abort before signing if payTo differs
export X402_EXPECTED_ASSET=0x833589...     # abort before signing if asset differs
export X402_MAX_USDC=0.001                 # abort before signing if price exceeds this
```

### Testnet run

```bash
export BUYER_PRIVATE_KEY=0x<disposable-sepolia-key>
export X402_EXPECTED_NETWORK=eip155:84532
export X402_MAX_USDC=0.01

node scripts/test-x402-paid-request.mjs
```

Fund buyer with Base Sepolia test USDC: [faucet.circle.com](https://faucet.circle.com/) → Base Sepolia.

### Mainnet micro-test run

```bash
export BUYER_PRIVATE_KEY=0x<disposable-base-mainnet-key>
export X402_EXPECTED_NETWORK=eip155:8453
export X402_EXPECTED_PAYTO=0x21Eacb622931926616C9a458648E7BA02A198561
export X402_EXPECTED_ASSET=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
export X402_MAX_USDC=0.001

node scripts/test-x402-paid-request.mjs
```

**Real USDC is spent.** Fund buyer with small Base mainnet ETH + small Base mainnet USDC.
The receiver wallet (`0x21Eacb…8561`) does not need prior funding — it receives the
USDC payment after the facilitator settles on-chain.

### Security rules

- Use a **disposable** wallet. Never use a wallet with real funds you care about.
- Set `BUYER_PRIVATE_KEY` **only in your local shell**. Never in `.env` files.
- The receiver private key is **never used** — it is only an address.
- The script never prints the private key.
- `.env.local` and `*.local` are gitignored.
- Do not use Base Sepolia USDC settings on mainnet.
- Do not use Ethereum mainnet USDC for Base payments.
- Do not use USDT.

### Protocol notes

The Worker uses x402 version 1 with CAIP-2 network IDs. The `X-PAYMENT` header value
is `base64(JSON.stringify(paymentPayload))`. Payment signing is EIP-712
`TransferWithAuthorization` (EIP-3009) — the buyer signs an off-chain authorisation;
no on-chain transaction is sent from the buyer. The facilitator at `x402.org` handles
chain settlement after verifying the signature.
