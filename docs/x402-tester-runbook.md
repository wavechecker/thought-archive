# Testing PatientGuide x402 Preview

> Humans will always read for free. Machines can test structured access.

---

## A. What this is

PatientGuide.io is a public health information site. Human-readable guides at `/guides/*` and `/posts/*` are free, publicly accessible, and always will be.

The `/api/x402/` namespace exposes a separate layer of **structured Patient Support Objects (PSOs)** for agents, apps, and developers. These endpoints return HTTP 402 and require a valid x402 payment to unlock structured JSON.

- **Testnet/Devnet only.** No mainnet payments are live.
- **Not a human paywall.** No public health guide is gated.
- **Educational patient-support data only.** Not a diagnosis, treatment plan, or emergency triage tool.
- **Rails: Base Sepolia and Solana Devnet.**

If you're building an x402 client, Base Sepolia integration, Solana Devnet integration, or testing HTTP 402 structured-access flows — this preview is for you.

---

## B. Live object types

Three Patient Support Object types are live on both rails:

| Type | Description |
|------|-------------|
| `guide-brief` | Short structured overview of a health guide — title, slug, summary, key points |
| `red-flags` | Structured urgent-warning signals — symptoms or signs that warrant immediate medical attention |
| `visit-prep` | Appointment preparation checklist — what to track, what to bring, questions to ask, when to seek urgent help |

All three are educational structured data. None constitute diagnosis, treatment, or triage.

---

## C. Rails and price

### Base Sepolia (EVM)

| Field | Value |
|-------|-------|
| Network | `eip155:84532` |
| Asset | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |
| payTo | `0x28C58Bc26Cd14b7f378937ED18081dA1A2976220` |
| Price | 0.001 USDC |
| maxAmountRequired | `1000` |
| extra | `{"name":"USDC","version":"2"}` |

Base Sepolia endpoints follow the pattern: `https://patientguide.io/api/x402/{type}?slug={slug}`

### Solana Devnet (SVM)

| Field | Value |
|-------|-------|
| Network | `solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1` |
| Mint/Asset | `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` |
| payTo | `DBti9QNp9BwZCDDnw5BEQfqLrUXZvFyTTDpPDYC2AUpS` |
| Price | 0.001 USDC |
| maxAmountRequired | `1000` |
| extra.feePayer | present in descriptor |

Solana Devnet endpoints follow the pattern: `https://patientguide.io/api/x402/solana/{type}?slug={slug}`

---

## D. Unpaid curl checks

Run these to verify the 402 gate is live and inspect the descriptor shape. No payment required.

```sh
# Base Sepolia — guide-brief
curl -i "https://patientguide.io/api/x402/guide-brief?slug=hypertension"

# Base Sepolia — red-flags
curl -i "https://patientguide.io/api/x402/red-flags?slug=hypertension"

# Base Sepolia — visit-prep
curl -i "https://patientguide.io/api/x402/visit-prep?slug=hypertension"

# Solana Devnet — visit-prep
curl -i "https://patientguide.io/api/x402/solana/visit-prep?slug=hypertension"
```

**Expected unpaid response for all endpoints:**

- HTTP status: `402`
- `x402Version`: `2`
- `scheme`: `exact`
- `maxAmountRequired`: `"1000"`
- `resource` field exactly matches the URL you called
- Rail-specific `network`, `asset`/mint, and `payTo` as listed in section C

The `resource` URL binding is intentional — it is scoped to the specific endpoint and slug called.

---

## E. Method guard check

Only GET is supported. Other methods return 405 before any payment evaluation.

```sh
curl -i -X POST "https://patientguide.io/api/x402/visit-prep?slug=hypertension"
```

**Expected:**

- HTTP status: `405`
- `Allow: GET` header
- Body: `{"error":"method_not_allowed"}`
- No payment requirements in the response

---

## F. Supported slugs

### red-flags and visit-prep

The following slugs are supported on both rails:

- `hypertension`
- `stroke`
- `early-warning-signs-of-a-heart-attack`
- `atrial-fibrillation`
- `type-1-diabetes`
- `asthma`
- `sepsis`
- `depression`

Note: use `early-warning-signs-of-a-heart-attack` exactly — a generic `heart-attack` slug is not supported and returns 404.

Unsupported slugs return 404 after successful payment verification. This is expected behavior for slugs outside the curated set.

### guide-brief

`guide-brief` is live on both rails. The curated static slug set for guide-brief may be narrower than the red-flags/visit-prep set. Use `hypertension` as the safe verified test slug.

---

## G. Feedback

Please report issues, observations, and compatibility notes via:

- **GitHub Issues:** https://github.com/wavechecker/thought-archive/issues/new/choose
  Use the **x402 Preview Feedback** template.
- **Contact page:** https://patientguide.io/contact

When filing feedback, include as much of the following as is relevant:

- Endpoint URL tested
- Rail (Base Sepolia / Solana Devnet)
- Object type (`guide-brief` / `red-flags` / `visit-prep`)
- Client or tool used
- Summary of unpaid 402 response received
- Whether a paid test was attempted (yes/no)
- Expected vs actual behavior
- Error logs or response body
- Transaction hash or signature (if applicable and non-sensitive)
- Environment or runtime

**Never include private keys, seed phrases, keypair files, or sensitive personal health information in any issue or message.**

---

## H. Safety

**Key safety rules for testers:**

- Never paste private keys into issues, chat, commits, logs, or forms.
- Never paste seed phrases.
- Never upload keypair files.
- Do not use a funded mainnet wallet for testing. Use a purpose-generated disposable burner funded only with testnet/devnet assets.
- Do not send sensitive personal health information.
- Do not send medical histories or patient-identifying details.
- Do not treat returned objects as diagnosis, treatment, or emergency triage. These are educational structured data for developers.
- Mainnet is not live — do not attempt to pay on mainnet.

If you encounter symptoms or a medical emergency, contact your local emergency services or a licensed medical professional. PatientGuide structured objects are not a substitute for professional medical care.
