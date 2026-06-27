# PatientGuide x402 Worker

> **Status: Base Sepolia testnet active. Base mainnet code-ready (not deployed). Solana Devnet rail added (not deployed).**
> No real funds are involved in testnet or Solana Devnet operation.
> Base mainnet (`eip155:8453`) requires explicit secrets + deploy step.
> Solana mainnet is NOT supported in this build (requires CDP API keys).

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
2. Signs a USDC transfer authorisation without broadcasting it to the chain.
   (EVM: EIP-3009 `transferWithAuthorization`. Solana: SVM-native signing via `@x402/svm`.)
3. Re-sends the request with the signed authorisation in an `X-PAYMENT` header.
4. The server verifies and settles the payment via a **facilitator** (`x402.org/facilitator`),
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

| CAIP-2 identifier | Chain | Status |
|---|---|---|
| `eip155:84532` | Base Sepolia testnet | ✅ active (default) |
| `eip155:8453` | Base mainnet | code-ready — not deployed |
| `solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1` | Solana Devnet | code-ready — not deployed |
| `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp` | Solana mainnet | ❌ NOT supported (requires CDP) |

The EVM path enforces mode/network consistency at runtime — a mismatch returns `503 x402_mode_network_mismatch`.
The Solana Devnet endpoint is hard-coded to Devnet; Solana mainnet is blocked at code level.

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
| `/api/x402/ping` | Cloudflare Worker | x402 gated (EVM) |
| `/api/x402/guide-brief` | Cloudflare Worker → Netlify fn | x402 gated (EVM) |
| `/api/x402/solana/guide-brief` | Cloudflare Worker → Netlify fn | x402 gated (Solana Devnet) |

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

# Solana Devnet endpoint — requires X402_SOLANA_RECEIVING_ADDRESS + X402_SOLANA_FEE_PAYER
# X402_SOLANA_FEE_PAYER: GET https://www.x402.org/facilitator/supported → signers["solana:*"][0]
curl -i "https://patientguide.io/api/x402/solana/guide-brief?slug=hypertension"

# Origin bypass check — should return 403
curl -i "https://patientguide.io/.netlify/functions/x402-guide-brief?slug=hypertension"
```

---

## Environment variables reference

### EVM (Base) rail

| Variable | Where | Description |
|---|---|---|
| `X402_MODE` | `wrangler.toml [vars]` or secret | `"testnet"` (default) or `"mainnet"`. Unknown values fail closed. |
| `X402_NETWORK` | `wrangler.toml [vars]` or secret | CAIP-2 chain. Must match `X402_MODE`: testnet→`eip155:84532`, mainnet→`eip155:8453`. |
| `X402_PRICE_USDC` | `wrangler.toml [vars]` or secret | Price per request in decimal USDC. Mainnet capped at 0.01 without override. |
| `X402_RECEIVING_ADDRESS` | Wrangler secret | Receiving wallet (EVM). Testnet: any Sepolia address. Mainnet: `0x21Eacb…8561`. |
| `X402_FACILITATOR_URL` | Wrangler secret | `https://x402.org/facilitator` (shared by EVM and Solana rails) |
| `PATIENTGUIDE_ORIGIN` | Wrangler secret | `https://patientguide.io` — used to canonicalize x402 resource URLs |
| `X402_WORKER_SECRET` | Wrangler secret + Netlify env | Shared secret for Worker→origin auth; prevents direct origin bypass |
| `X402_ALLOW_HIGHER_MAINNET_PRICE` | Wrangler secret (optional) | Set `"true"` to allow mainnet price above 0.01 USDC. Do not set for the micro-test. |

### Solana Devnet rail

| Variable | Where | Description |
|---|---|---|
| `X402_SOLANA_RECEIVING_ADDRESS` | Wrangler secret | **Required.** Base58 Solana public key of your devnet receiver. If absent → `503 x402_solana_not_configured`. |
| `X402_SOLANA_FEE_PAYER` | Wrangler secret | **Required.** Base58 public key of the x402.org/facilitator Solana fee-payer address. Required by `@x402/svm` — the client reads `extra.feePayer` from the 402 response to build its transaction. The facilitator validates it belongs to its own key pool. Source: `GET https://www.x402.org/facilitator/supported` → `signers["solana:*"][0]`. If absent → `503 x402_solana_fee_payer_not_configured`. Rotate if the facilitator rotates its Solana key pool. |
| `X402_SOLANA_PRICE_USDC` | `wrangler.toml [vars]` or secret (optional) | Price per request in decimal USDC. Defaults to `"0.001"` when absent. |

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

---

## Part 4 — Solana Devnet rail

> **Status: code-ready, not yet deployed.**
> Adds `/api/x402/solana/guide-brief` as a second payment rail on Solana Devnet.
> No real monetary value. Solana mainnet requires CDP API keys and is blocked at code level.

### Why a separate endpoint

The Solana endpoint lives at `/api/x402/solana/guide-brief` (not the same path as the
EVM endpoint) to keep each rail independently testable and deployable. A single endpoint
with multiple `accepts` entries is a future optimisation once both rails are proven.

### Solana Devnet config values

| Field | Value |
|---|---|
| Network (CAIP-2) | `solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1` |
| USDC mint | `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` (Circle devnet) |
| USDC decimals | 6 (same as EVM USDC) |
| Price default | `0.001` USDC = `1000` atomic units |
| Facilitator | `https://x402.org/facilitator` (shared with EVM rail, no API key needed for devnet) |
| Solana mainnet | `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp` — NOT enabled |

### What the Worker does

The Worker produces a standard x402 `402` response with Solana Devnet payment requirements.
The `X-PAYMENT` header from the client is passed to the facilitator unchanged. The Worker
never parses the Solana payment payload — all network-specific verification and on-chain
settlement is handled by `x402.org/facilitator`.

The Netlify origin function (`x402-guide-brief`) is network-agnostic; the same function
serves both EVM and Solana paid responses.

### To deploy Solana Devnet rail

```bash
cd cloudflare/x402-worker

# Create a Solana devnet receiver wallet (e.g. solana-keygen new)
# and provide its base58 public key:
wrangler secret put X402_SOLANA_RECEIVING_ADDRESS
# → paste base58 Solana public key

# Facilitator fee-payer address — required by @x402/svm.
# Source: GET https://www.x402.org/facilitator/supported → signers["solana:*"][0]
wrangler secret put X402_SOLANA_FEE_PAYER
# → paste base58 fee-payer public key from the facilitator supported endpoint

# X402_FACILITATOR_URL must already be set (shared with EVM rail)
# Then deploy:
npm run deploy
```

### To verify

```bash
# Should return 402 with Solana Devnet network and devnet USDC mint
curl -i "https://patientguide.io/api/x402/solana/guide-brief?slug=hypertension"
```

Confirm the `accepts[0]` in the response body:
- `network`: `solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1`
- `asset`: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`
- `payTo`: your Solana devnet receiver public key
- `maxAmountRequired`: `1000` (0.001 USDC)
- `extra.feePayer`: the x402.org/facilitator fee-payer address you set in `X402_SOLANA_FEE_PAYER`

### Solana Devnet buyer test client

A Solana test script is a **follow-up task** — it requires Solana-specific signing
(`@x402/svm` or `@solana/web3.js`) which is fundamentally different from the EVM
EIP-3009 flow. The existing `scripts/test-x402-paid-request.mjs` is EVM-only and
cannot be used for Solana.

**What a Solana buyer test would need:**
- A Solana keypair (ed25519, not secp256k1) — generated with `solana-keygen new`
- Devnet SOL for fees (Solana Devnet faucet: `solana airdrop 1`)
- Devnet USDC — mint from [faucet.circle.com](https://faucet.circle.com/) → "Solana Devnet"
- `@x402/svm` package for Solana payment payload construction
- Guards equivalent to the EVM script (expected network, mint, receiver, max price)

**Mainnet Solana note:** Solana mainnet requires a Coinbase CDP API key to use the CDP
facilitator (`https://api.cdp.coinbase.com/platform/v2/x402`). This is a separate PR.

### Facilitator support matrix

| Network | Facilitator | API key required |
|---|---|---|
| Base Sepolia (`eip155:84532`) | `x402.org/facilitator` | No |
| Base mainnet (`eip155:8453`) | `x402.org/facilitator` (verify) or CDP | TBD |
| Solana Devnet | `x402.org/facilitator` | No |
| Solana mainnet | `api.cdp.coinbase.com/platform/v2/x402` | Yes (CDP) |
