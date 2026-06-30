# x402 Payment Status & Runbook

> Humans will always read for free. Machines can test structured access.

## Current positioning

PatientGuide human-readable pages (`/guides`, `/posts`, `/ask`) remain publicly free with no gating. The `/api/x402/` namespace exposes structured machine endpoints that return HTTP 402 and require a valid x402 payment to unlock the JSON body. No public human-facing page is gated.

---

## What is verified

| Item | Status |
|------|--------|
| Base Sepolia `exact` rail — end-to-end paid guide JSON | ✅ verified |
| Solana Devnet `exact` rail — end-to-end paid guide JSON | ✅ verified |
| Public `/guides` and `/posts` routes remain free | ✅ confirmed |
| Base mainnet payments | ❌ not enabled |
| Solana mainnet payments | ❌ not enabled |

---

## What is not yet production

- **Mainnet payments are not live.** No Base mainnet facilitator or auth path is enabled.
- **Solana mainnet is blocked.** Devnet only.
- **No public human-facing guide is gated.** The `/api/x402/` endpoints are the only paid surface.
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

### Solana Devnet (SVM exact) — verified end-to-end

```
https://patientguide.io/api/x402/solana/guide-brief?slug=hypertension
```

Payment requirements (from live 402 response):

| Field | Value |
|-------|-------|
| `x402Version` | `2` |
| `scheme` | `exact` |
| `network` | `solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1` |
| `asset` (mint) | `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` |
| `payTo` | `DBti9QNp9BwZCDDnw5BEQfqLrUXZvFyTTDpPDYC2AUpS` |
| `maxAmountRequired` | `1000` (0.001 USDC) |
| `extra.feePayer` | `CKPKJWNdJEqa81x7CkZ14BVPiY6y16Sxs7owznqtWYp5` |

#### End-to-end proof

| Field | Value |
|-------|-------|
| Paid HTTP status | `200` |
| Paid JSON returned | yes |
| Returned title | `Hypertension: Symptoms, Causes, Diagnosis, Treatment, and Home Blood Pressure Monitoring` |
| Returned slug | `hypertension` |
| Settlement txHash | `3nRfo9Uuo5ixxNBkGSPrCc1UEpqGhAVvRPJAgnwLbQVntDMuyknnxJ6SiKUs6RJ4hKcZXzY567DSNsVkJzEhu699` |
| Network confirmed | `solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1` |
| Buyer (disposable Devnet key) | `7FpeGwUqsw98yp3B7AC5enDjdYDHgZ1kiSUZ15xFiK4z` |

No private key or keypair material is committed. The buyer keypair file is local-only and git-ignored.

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

## Preview endpoints (implemented, not yet deployed)

### Base Sepolia (EVM) — red-flags

```
https://patientguide.io/api/x402/red-flags?slug=hypertension
```

Expected payment requirements (mirrors guide-brief rail):

| Field | Value |
|-------|-------|
| `x402Version` | `2` |
| `scheme` | `exact` |
| `network` | `eip155:84532` |
| `asset` | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |
| `payTo` | `0x28C58Bc26Cd14b7f378937ED18081dA1A2976220` |
| `maxAmountRequired` | `1000` (0.001 USDC) |
| `extra` | `{"name":"USDC","version":"2"}` |

Expected paid JSON shape: `{ slug, title, type: "red_flags", redFlags: [...], disclaimer }`.

**Supported slugs (preview — testnet/devnet only):**
`hypertension`, `stroke`, `atrial-fibrillation`, `type-1-diabetes`, `asthma`, `sepsis`, `depression`

Unsupported slugs return 404 after successful payment — consistent with guide-brief behavior.
Public human-readable guides remain free; no guide page is gated.

Manual 402 check (unpaid):
```sh
curl -i "https://patientguide.io/api/x402/red-flags?slug=hypertension"
```

### Solana Devnet (SVM) — red-flags

```
https://patientguide.io/api/x402/solana/red-flags?slug=hypertension
```

Expected payment requirements (mirrors solana/guide-brief rail):

| Field | Value |
|-------|-------|
| `x402Version` | `2` |
| `scheme` | `exact` |
| `network` | `solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1` |
| `asset` (mint) | `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` |
| `payTo` | `DBti9QNp9BwZCDDnw5BEQfqLrUXZvFyTTDpPDYC2AUpS` |
| `maxAmountRequired` | `1000` (0.001 USDC) |
| `extra.feePayer` | present (same as solana/guide-brief) |

Supported slugs mirror the Base Sepolia list above. Unsupported slugs return 404 after payment.

Manual 402 check (unpaid):
```sh
curl -i "https://patientguide.io/api/x402/solana/red-flags?slug=hypertension"
```

---

## Next candidate work

These are identified next steps — none are implemented yet:

1. **Deploy red-flags endpoints** — deploy Worker and Netlify after PR is merged and verified.
2. **Expand red-flags slugs further** — 7 priority slugs now supported in preview. Additional slugs can be added to the curated static map in `x402-red-flags.ts` after content review. Do not add slugs speculatively.
3. **Base mainnet facilitator/auth investigation** — determine what is required to enable the Base mainnet rail (facilitator registration, auth configuration) without enabling live payments prematurely.
4. **"upto" or batch-style payments** — evaluate only after confirming facilitator support and official spec coverage. Do not implement speculatively.
