# PatientGuide x402 Testnet Worker

> **Status: TESTNET ONLY — Base Sepolia**
> This worker is a payment-gating experiment using the x402 protocol on Base Sepolia
> testnet USDC. No real funds are involved. Mainnet is not configured.

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

## Architecture for this experiment

```
Browser / curl / x402 client
        │
        │  GET /api/x402/ping
        ▼
┌─────────────────────────────┐
│  Cloudflare Worker          │  ← this project
│  patientguide.io/api/x402/* │
│                             │
│  1. No X-PAYMENT → 402      │
│  2. Verify via facilitator  │
│  3. Settle via facilitator  │
│  4. Proxy to Netlify fn     │
└─────────┬───────────────────┘
          │  GET /.netlify/functions/x402-ping
          │  + X-Worker-Secret header
          ▼
┌─────────────────────────────┐
│  Netlify Function           │
│  netlify/functions/         │
│  x402-ping.ts               │
│                             │
│  Returns { ok, paid, ... }  │
└─────────────────────────────┘
```

**Public routes are untouched.** The Cloudflare route binding in `wrangler.toml`
restricts the Worker exclusively to `patientguide.io/api/x402/*`. All other paths
(`/`, `/guides/*`, `/posts/*`, `/search/*`, `sitemap.xml`, `robots.txt`,
`llms.txt`) continue to be served directly from Netlify.

---

## Files

| Path | Purpose |
|---|---|
| `cloudflare/x402-worker/src/index.ts` | Worker entry point — x402 gate logic |
| `cloudflare/x402-worker/wrangler.toml` | Cloudflare Worker config and route binding |
| `cloudflare/x402-worker/.env.example` | Environment variable template |
| `netlify/functions/x402-ping.ts` | Origin endpoint called after payment clears |

---

## Setup and deployment

### Prerequisites

- Cloudflare account with `patientguide.io` zone
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
# Check https://x402.org or https://docs.cdp.coinbase.com for the current value
wrangler secret put X402_FACILITATOR_URL

# Netlify origin base URL
wrangler secret put PATIENTGUIDE_ORIGIN
# → enter: https://patientguide.io

# Random hex secret shared between the Worker and the Netlify function
# Generate: openssl rand -hex 32
wrangler secret put X402_WORKER_SECRET
```

Set the same `X402_WORKER_SECRET` value as a Netlify environment variable
(`Site settings → Environment variables → Add variable`).

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

Wrangler reads `wrangler.toml` and registers the route binding automatically.

### 5. Configure Cloudflare route (if not auto-registered)

In the Cloudflare dashboard → **Workers & Pages → your worker → Triggers → Routes**:

- Route: `patientguide.io/api/x402/*`
- Zone: `patientguide.io`

### 6. Verify the live endpoint

```bash
# Should return 402 with X-PAYMENT-REQUIRED header
curl -i https://patientguide.io/api/x402/ping

# Expected 402 body (formatted):
# {
#   "x402Version": 1,
#   "accepts": [{ "scheme": "exact", "network": "base-sepolia", ... }],
#   "error": "Payment required ..."
# }
```

---

## How to disable / remove the route

**Temporary disable (keep the Worker, stop receiving traffic):**

In `wrangler.toml`, comment out the `[[routes]]` block:

```toml
# [[routes]]
#   pattern = "patientguide.io/api/x402/*"
#   zone_name = "patientguide.io"
```

Then redeploy:

```bash
npm run deploy
```

**Full removal:**

```bash
wrangler delete
```

This deletes the Worker from Cloudflare entirely. The Netlify function
(`netlify/functions/x402-ping.ts`) can be removed from the codebase separately.
No other Astro/Netlify config needs to change.

---

## Environment variables reference

| Variable | Where | Description |
|---|---|---|
| `X402_NETWORK` | `wrangler.toml [vars]` | Chain identifier — must be `base-sepolia` |
| `X402_PRICE_USDC` | `wrangler.toml [vars]` | Price per request in USDC decimal string |
| `X402_RECEIVING_ADDRESS` | Wrangler secret | Your testnet wallet address |
| `X402_FACILITATOR_URL` | Wrangler secret | CDP/x402 facilitator base URL |
| `PATIENTGUIDE_ORIGIN` | Wrangler secret | `https://patientguide.io` |
| `X402_WORKER_SECRET` | Wrangler secret + Netlify env | Shared secret for Worker→function auth |

---

## Enabling mainnet (NOT for this PR)

To move to mainnet, all of the following changes would be required:
- Set `X402_NETWORK` to `base` (or another mainnet identifier)
- Update `USDC_BASE_SEPOLIA` in `src/index.ts` to the mainnet USDC contract address
- Update `X402_RECEIVING_ADDRESS` to a mainnet wallet
- Update the Cloudflare route in `wrangler.toml`
- A separate PR review with explicit sign-off

This PR intentionally does none of the above.
