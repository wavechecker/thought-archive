# x402 Payment Status & Runbook

> Humans will always read for free. Machines can test structured access.

## Current positioning

PatientGuide human-readable pages (`/guides`, `/posts`, `/ask`) remain publicly free with no gating. The `/api/x402/` namespace exposes structured machine endpoints that return HTTP 402 and require a valid x402 payment to unlock the JSON body. No public human-facing page is gated.

---

## What is verified

| Item | Status |
|------|--------|
| Base Sepolia `exact` rail — end-to-end paid guide JSON | ✅ verified |
| Solana Devnet 402 response includes `feePayer` | ✅ verified |
| Solana Devnet paid request client (`scripts/test-x402-solana-paid-request.mjs`) | ✅ exists |
| Public `/guides` and `/posts` routes remain free | ✅ confirmed |
| Base mainnet payments | ❌ not enabled |
| Solana mainnet payments | ❌ not enabled |

---

## What is not yet production

- **Mainnet payments are not live.** No Base mainnet facilitator or auth path is enabled.
- **Solana mainnet is blocked.** Devnet only.
- **No public human-facing guide is gated.** The `/api/x402/` endpoints are the only paid surface.
- **Solana Devnet end-to-end confirmation** (buyer → facilitator → paid JSON) has not been fully confirmed in a live run at the same level as Base Sepolia.

---

## Verified endpoints

### Base Sepolia (EVM exact)

```
https://patientguide.io/api/x402/guide-brief?slug=hypertension
```

Payment requirements (from live 402 response):

| Field | Value |
|-------|-------|
| `x402Version` | `2` |
| `scheme` | `exact` |
| `network` | `eip155:84532` |
| `asset` | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |
| `payTo` | `0x28C58Bc26Cd14b7f378937ED18081dA1A2976220` |
| `maxAmountRequired` | `1000` (0.001 USDC) |
| `extra` | `{"name":"USDC","version":"2"}` |

### Solana Devnet

```
https://patientguide.io/api/x402/solana/guide-brief?slug=hypertension
```

Payment requirements (from 402 response):

| Field | Value |
|-------|-------|
| `network` | `solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1` |
| `asset` (mint) | `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` |
| `payTo` | `DBti9QNp9BwZCDDnw5BEQfqLrUXZvFyTTDpPDYC2AUpS` |
| `feePayer` | included (x402 Solana requirement) |

---

## How to run the Base Sepolia buyer test safely

**Script:** `scripts/test-x402-paid-request.mjs`

### Prerequisites

1. Generate a disposable burner wallet — never use a wallet holding real funds.
2. Fund the burner with Base Sepolia ETH (coinbase.com/faucets/base-ethereum-goerli-faucet).
3. Fund the burner with Base Sepolia USDC (faucet.circle.com → select Base Sepolia).

### Run

```sh
export BUYER_PRIVATE_KEY=0x<disposable-burner-key>
export X402_EXPECTED_NETWORK=eip155:84532
export X402_EXPECTED_ASSET=0x036CbD53842c5426634e7929541eC2318f3dCF7e
export X402_EXPECTED_PAYTO=0x28C58Bc26Cd14b7f378937ED18081dA1A2976220
export X402_MAX_USDC=0.001

node scripts/test-x402-paid-request.mjs
```

The four guard env vars (`X402_EXPECTED_NETWORK`, `X402_EXPECTED_ASSET`, `X402_EXPECTED_PAYTO`, `X402_MAX_USDC`) cause the script to abort before signing if the endpoint returns unexpected values. Always set them.

---

## How to run the Solana Devnet buyer test safely

**Script:** `scripts/test-x402-solana-paid-request.mjs`

### Prerequisites

1. Generate a disposable Devnet-only Solana keypair (JSON file).
2. Fund it with Devnet SOL (`solana airdrop`) and Devnet USDC (faucet.circle.com → Solana Devnet).
3. Ensure the receiver ATA exists for the payTo address and the Devnet USDC mint (see script header for setup commands).

### Run

```sh
export X402_SOLANA_BUYER_KEYPAIR_PATH=/tmp/x402-buyer.json
export X402_EXPECTED_SOLANA_NETWORK=solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1
export X402_EXPECTED_SOLANA_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
export X402_EXPECTED_SOLANA_PAYTO=DBti9QNp9BwZCDDnw5BEQfqLrUXZvFyTTDpPDYC2AUpS
export X402_SOLANA_MAX_USDC=0.01

node scripts/test-x402-solana-paid-request.mjs
```

---

## Known hazards

- **Never use your main wallet private key** as `BUYER_PRIVATE_KEY` or `X402_SOLANA_BUYER_KEYPAIR_PATH`. Always use a purpose-generated disposable burner.
- **The burner wallet `0x4B6376dbA6A33aB96E6F133ADB6dbb36ef38Ea68` is compromised** — it was exposed in a chat session. Do not reuse it. Do not fund it on mainnet.
- **Do not claim mainnet is live.** Mainnet facilitator auth is not enabled and has not been tested.
- **Do not gate `/guides` or `/posts`.** Only `/api/x402/` endpoints are the paid surface.
- **Do not guess x402 payload shapes.** Use the official `@x402/evm` / `@x402/svm` packages or the verified spec. The v1 → v2 payload shape change (field renames, `validAfter` must be `"0"`) was a real breaking difference.
- **Do not paste private keys into chat, commits, logs, or `.env` files.** Set them only in your local shell session.

---

## Next candidate work

These are identified next steps — none are implemented yet:

1. **Solana Devnet end-to-end confirmation** — run a full buyer → facilitator → paid JSON cycle at the same level of confidence as Base Sepolia, and document the result here.
2. **Base mainnet facilitator/auth investigation** — determine what is required to enable the Base mainnet rail (facilitator registration, auth configuration) without enabling live payments prematurely.
3. **"upto" or batch-style payments** — evaluate only after confirming facilitator support and official spec coverage. Do not implement speculatively.
4. **Structured endpoint expansion** — identify which additional guide slugs or resource types make sense beyond `guide-brief` before expanding the `/api/x402/` surface.
