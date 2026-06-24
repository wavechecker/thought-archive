# PatientGuide x402 Testnet Worker

> **Status: TESTNET ONLY — Base Sepolia (`eip155:84532`)**
> This worker is a payment-gating experiment using the x402 protocol on Base Sepolia
> testnet USDC. No real funds are involved. Mainnet (`eip155:8453`) is not configured
> and must not be used in this experiment.

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

## Current deployed architecture (Part 1)

`patientguide.io` is **not** currently configured as a native Cloudflare zone route
for this Worker. Instead, traffic reaches the Worker via a Netlify proxy redirect:

```
Browser / curl / x402 client
        │
        │  GET https://patientguide.io/api/x402/ping
        ▼
┌─────────────────────────────┐
│  Netlify proxy redirect      │
│  /api/x402/*                 │
│  → patientguide-x402-worker  │
│    .wavechecker.workers.dev  │
└─────────┬───────────────────┘
          │  (internal — Worker sees workers.dev hostname)
          ▼
┌─────────────────────────────┐
│  Cloudflare Worker          │  ← this project
│  patientguide-x402-worker   │
│  .wavechecker.workers.dev   │
│                             │
│  1. No X-PAYMENT → 402      │
│     resource canonicalized  │
│     to patientguide.io URL  │
│  2. Verify via facilitator  │
│  3. Settle via facilitator  │
│  4. Return JSON directly    │
│     (Worker-only, no        │
│      Netlify function)      │
└─────────────────────────────┘
```

### Canonical resource URL

Although the Worker is internally reached via `patientguide-x402-worker.wavechecker.workers.dev`,
it canonicalizes the x402 `resource` field to the **public-facing URL**:

```
https://patientguide.io/api/x402/ping
```

This is done using the `PATIENTGUIDE_ORIGIN` secret:

```typescript
const canonicalOrigin = env.PATIENTGUIDE_ORIGIN.replace(/\/+$/, "");
const resource = `${canonicalOrigin}${url.pathname}${url.search}`;
```

Payment proofs are therefore bound to the client-facing URL, not the internal workers.dev hostname.

### Part 1 does not use Netlify build minutes

The `/api/x402/ping` response is returned directly from the Worker after payment
settlement. No Netlify function is called. Deploying or updating this Worker uses
only Wrangler — it does not trigger a Netlify build.

---

## Network identifiers

| Identifier | Chain | Allowed in this experiment |
|---|---|---|
| `eip155:84532` | Base Sepolia testnet | ✅ yes |
| `eip155:8453` | Base mainnet | ❌ NO — do not use |

The Worker enforces `eip155:84532` at runtime. Any other value (including the mainnet
identifier `eip155:8453`) causes the Worker to return `503 x402_network_not_allowed`
and refuse all requests — it fails closed rather than accidentally enabling real payments.

---

## Public routes

Public routes are never touched by this Worker. The Netlify proxy redirect only forwards
`/api/x402/*` to the Worker. All other paths are served directly by Netlify:

| Path | Served by |
|---|---|
| `/` | Netlify (Astro) |
| `/guides/*` | Netlify (Astro) |
| `/posts/*` | Netlify (Astro) |
| `/search/*` | Netlify (Astro) |
| `/sitemap*.xml` | Netlify (Astro) |
| `/robots.txt` | Netlify (Astro) |
| `/llms.txt` | Netlify (Astro) |
| `/api/x402/*` | Cloudflare Worker (this project) |

The Worker also enforces a belt-and-suspenders route guard: any request to a path that
does not start with `/api/x402/` returns `404 not_found`. Within `/api/x402/*`, only
`/api/x402/ping` is intentionally supported — all other sub-paths return `404 not_found`.

---

## Future Part 2 options (paused)

Part 2 would extend x402 to a structured content endpoint. Two options under consideration:

**Option A — Worker-only structured endpoint**
Add a new route (e.g. `/api/x402/content`) entirely within the Worker. No Netlify build
minutes required. Can proceed independently of Netlify quota.

**Option B — Astro/content collections endpoint via Netlify function**
Add a Netlify function backed by Astro content collections. Requires Netlify build
minutes to deploy. Paused until quota resets.

Part 2 remains paused. No mainnet (`eip155:8453`) support is planned.

---

## Files

| Path | Purpose |
|---|---|
| `cloudflare/x402-worker/src/index.ts` | Worker entry point — x402 gate logic |
| `cloudflare/x402-worker/wrangler.toml` | Cloudflare Worker config |

---

## Setup and deployment

### Prerequisites

- Node.js ≥ 18
- Wrangler CLI: `npm install -g wrangler` (or use the local one)
- A Base Sepolia wallet address to receive testnet USDC

### 1. Install dependencies

```bash
cd cloudflare/x402-worker
npm install
```

### 2. Configure secrets

Set each secret via Wrangler (they are stored in Cloudflare, never in this repo):

```bash
# Your Base Sepolia receiving address (public, no private key)
wrangler secret put X402_RECEIVING_ADDRESS

# Official CDP / x402.org facilitator base URL
wrangler secret put X402_FACILITATOR_URL
# → enter: https://x402.org/facilitator

# Canonical public origin
wrangler secret put PATIENTGUIDE_ORIGIN
# → enter: https://patientguide.io
```

### 3. Local development

Copy `.env.example` to `.dev.vars` (Wrangler loads this automatically):

```bash
cp .env.example .dev.vars
# Edit .dev.vars with real testnet values
```

Run the Worker locally:

```bash
npm run dev
# Worker starts at http://localhost:8787
```

Test without payment (should return 402):

```bash
curl -i http://localhost:8787/api/x402/ping
```

### 4. Deploy to Cloudflare

```bash
npm run deploy
```

This uses only Wrangler and does not trigger a Netlify build.

### 5. Verify the live endpoint

```bash
# Should return 402 with X-PAYMENT-REQUIRED header
curl -i https://patientguide.io/api/x402/ping

# Expected 402 body (formatted):
# {
#   "x402Version": 1,
#   "accepts": [{
#     "scheme": "exact",
#     "network": "eip155:84532",
#     "resource": "https://patientguide.io/api/x402/ping",
#     ...
#   }],
#   "error": "Payment required ..."
# }
```

---

## Environment variables reference

| Variable | Where | Description |
|---|---|---|
| `X402_NETWORK` | `wrangler.toml [vars]` | CAIP-2 chain identifier — must be `eip155:84532` (Base Sepolia). `eip155:8453` is mainnet and must not be used. |
| `X402_PRICE_USDC` | `wrangler.toml [vars]` | Price per request in USDC decimal string |
| `X402_RECEIVING_ADDRESS` | Wrangler secret | Base Sepolia testnet wallet address |
| `X402_FACILITATOR_URL` | Wrangler secret | `https://x402.org/facilitator` (testnet, free) |
| `PATIENTGUIDE_ORIGIN` | Wrangler secret | `https://patientguide.io` — used to canonicalize the x402 resource URL |

---

## Enabling mainnet (NOT for this experiment)

To move to mainnet, all of the following changes would be required:
- Set `X402_NETWORK` to `eip155:8453` (Base mainnet CAIP-2 identifier)
- Update `REQUIRED_NETWORK` in `src/index.ts` to `"eip155:8453"`
- Update `USDC_BASE_SEPOLIA` in `src/index.ts` to the mainnet USDC contract address
- Update `X402_RECEIVING_ADDRESS` to a mainnet wallet
- A separate PR review with explicit sign-off

> `eip155:8453` = Base mainnet. Using this value would enable **real** USDC
> payments with real monetary value. This experiment is `eip155:84532` (testnet) only.
