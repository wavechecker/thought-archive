# x402 Reddit Tester Posts

Reusable draft copy for Reddit and similar communities when reaching out for x402 testnet/devnet feedback.

---

## A. Posting principles

- Ask for **technical sanity checks**, not promotion.
- Lead with x402, Base Sepolia, Solana Devnet, testnet, devnet — not the health topic.
- Be humble and specific about what you want tested.
- Make clear **this is not mainnet**. Lead with that when relevant.
- Make clear **no human health guide is paywalled**. The paid surface is `/api/x402/*` only.
- Avoid medical advice framing in all posts and replies.
- Ask testers not to include private keys, seed phrases, keypair files, or sensitive health information in any response.
- Direct feedback to GitHub Issues or `/contact`.

---

## B. Primary Reddit post

**Title:**

> Can anyone sanity-check my x402 testnet/devnet endpoints?

**Body:**

---

Hey — I've been building a structured-access layer on top of [PatientGuide.io](https://patientguide.io) using the x402 payment protocol, and I'd appreciate a technical sanity check from anyone working with x402, Base Sepolia, or Solana Devnet clients.

**What it is:**

PatientGuide is a public health information site. Human-readable guides at `/guides/*` are always free. No human content is paywalled.

The `/api/x402/*` namespace exposes structured JSON objects for agents and apps — Patient Support Objects like `guide-brief`, `red-flags`, and `visit-prep`. These are appointment prep checklists, urgent-warning signals, and structured guide summaries. Educational only — not diagnosis or treatment.

**Rails:**

- Base Sepolia (`eip155:84532`) — 0.001 testnet USDC
- Solana Devnet (`solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1`) — 0.001 Devnet USDC

**This is testnet/devnet only. Mainnet is not live.**

**Quick unpaid check (no payment needed):**

```sh
curl -i "https://patientguide.io/api/x402/guide-brief?slug=hypertension"
curl -i "https://patientguide.io/api/x402/red-flags?slug=hypertension"
curl -i "https://patientguide.io/api/x402/visit-prep?slug=hypertension"
curl -i "https://patientguide.io/api/x402/solana/visit-prep?slug=hypertension"
```

Each should return HTTP 402 with:
- `x402Version: 2`
- `scheme: exact`
- `maxAmountRequired: "1000"` (0.001 USDC)
- `resource` matching the exact URL called
- Rail-specific `network`, `asset`/mint, `payTo`

The Solana Devnet descriptor includes `extra.feePayer`.

**What I'm looking for feedback on:**

- Does the descriptor shape look correct to your x402 client?
- Is the `resource` URL binding working as expected?
- Any Base Sepolia or Solana Devnet client compatibility issues?
- Any paid-but-denied edge cases worth knowing about?
- Anything off with the x402 v2 implementation?

**Feedback:**

GitHub Issues: https://github.com/wavechecker/thought-archive/issues/new/choose
Contact: https://patientguide.io/contact

Please don't include private keys, seed phrases, or sensitive health information in any response. Testnet/Devnet burner wallets only.

---

## C. r/base variant

**Title:**

> Sanity check on my Base Sepolia x402 endpoints — descriptor shape and resource binding

**Body:**

---

Building a structured-access API layer on [PatientGuide.io](https://patientguide.io) using x402 and Base Sepolia. Human-readable health guides stay free — the `/api/x402/*` namespace is the machine layer.

**Rail:**

- Base Sepolia (`eip155:84532`)
- Asset: `0x036CbD53842c5426634e7929541eC2318f3dCF7e` (testnet USDC)
- payTo: `0x28C58Bc26Cd14b7f378937ED18081dA1A2976220`
- Scheme: `exact`
- maxAmountRequired: `1000` (0.001 USDC)

**Quick check:**

```sh
curl -i "https://patientguide.io/api/x402/guide-brief?slug=hypertension"
```

Returns HTTP 402 with x402 v2 descriptor. `resource` is bound to the exact URL called.

**Not mainnet. Testnet only.**

Looking for feedback on: descriptor shape correctness, `resource` URL binding, `exact` scheme behavior, Base Sepolia client compatibility.

Feedback: https://github.com/wavechecker/thought-archive/issues/new/choose

---

## D. r/solana variant

**Title:**

> x402 Solana Devnet integration — looking for feedback on descriptor and feePayer field

**Body:**

---

I've got an x402 structured-access endpoint running on Solana Devnet and would appreciate feedback from anyone working with SVM-side x402 clients.

**What:** [PatientGuide.io](https://patientguide.io) — public health guides stay free, `/api/x402/solana/*` is a structured machine layer.

**Devnet only. No mainnet.**

**Rail:**

- Network: `solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1`
- Mint: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` (Devnet USDC)
- payTo: `DBti9QNp9BwZCDDnw5BEQfqLrUXZvFyTTDpPDYC2AUpS`
- maxAmountRequired: `1000` (0.001 USDC)
- Descriptor includes `extra.feePayer`

**Quick check:**

```sh
curl -i "https://patientguide.io/api/x402/solana/visit-prep?slug=hypertension"
```

Returns HTTP 402, x402 v2, Solana Devnet descriptor with `feePayer` in `extra`.

Looking for: feedback on `feePayer` field handling, SPL token mint verification, `resource` URL binding, Devnet client compatibility.

Please don't include private keys or seed phrases in any response.

Feedback: https://github.com/wavechecker/thought-archive/issues/new/choose

---

## E. Short comment reply

For "what is this?" or general curiosity:

---

PatientGuide.io is a public health information site — human-readable guides are always free. The `/api/x402/*` layer exposes structured JSON objects (appointment prep checklists, urgent-warning signals, guide summaries) for agents and apps, gated via x402 on Base Sepolia and Solana Devnet at 0.001 testnet USDC. Testnet/Devnet only. No mainnet. No human health guide is paywalled.

---

## F. Defensive replies

**"Is this a crypto paywall for health info?"**

No. All human-readable health guides at `/guides/*` and `/posts/*` are free and always will be. The x402 payment gate covers only `/api/x402/*` — machine-readable structured JSON endpoints for developers and agents. No patient-facing page is gated, and no payment is required to read any guide.

---

**"Why not just make a normal API?"**

We might. This is specifically an x402 testnet preview — the goal is to explore whether machine-to-machine structured health data access can be decentralized and permissionless for agents without requiring API keys or account registration. It's a technical experiment, not a product decision locked in forever.

---

**"Is this medical advice?"**

No. The structured objects are educational data — appointment prep checklists, urgent-warning signals, and guide summaries. Not diagnosis, treatment recommendations, or emergency triage. The site carries appropriate disclaimers and we're explicit in the docs that these should not be used as substitutes for professional medical care.

---

**"Why x402?"**

We're interested in what agent-native payment protocols make possible for health information infrastructure — permissionless machine access without API key management, account registration, or centralized gatekeeping. x402 on testnet is a low-stakes place to figure out whether the descriptor and payment shape actually work before making stronger claims about the model.

---

**"Can I test without paying?"**

Yes. The unpaid curl checks in the runbook let you verify the 402 gate is live and inspect the descriptor shape without sending any payment. You only need testnet/Devnet funds if you want to test the full paid flow.

---

**"Is mainnet live?"**

No. Base mainnet and Solana mainnet are both disabled. This is testnet/Devnet only. We'll be clear when and if mainnet ever goes live.

---

**"Why health data?"**

Health information is a domain where structured, machine-readable data is genuinely useful for agents — appointment prep, red-flag identification, condition overviews. PatientGuide already has this content in human-readable form. Structuring it for agents while keeping the human layer free is the experiment.

---

**"Are you collecting patient data?"**

No. Testers interact with structured educational data about conditions. No patient records, personal health histories, or identifying information are collected or stored. We ask testers explicitly not to include personal health information in any feedback.
