# x402 Observability Checklist

Lightweight monitoring reference for after external tester posts go live.

---

## A. What to monitor

### Request counts

- `/api/x402/*` total request count
- 402 responses by endpoint type (`guide-brief`, `red-flags`, `visit-prep`)
- 402 responses by rail (Base Sepolia vs Solana Devnet)
- 405 method-guard responses
- 400 responses (invalid or missing slug parameter)
- 404 responses (unsupported slug — after payment verification)
- Paid success count (200), if visible in Worker logs
- Non-2xx origin responses after successful payment (Worker upstream errors)

### Traffic pattern

- Top user agents
- Top countries
- Top paths within `/api/x402/*`
- Client error breakdown: 402 vs 404 vs 405 vs 400

### Free-tier integrity

- Confirm public guide routes (`/guides/*`, `/posts/*`, `/`, `/robots.txt`, `/sitemap.xml`, `/llms.txt`, `/structured-access`, `/contact`) return non-402 status codes
- Any unexpected 402 on public human routes is a critical incident

---

## B. Where to check

| Source | What to check |
|--------|---------------|
| Cloudflare Analytics | Request counts, status code distribution, top paths, countries, user agents |
| Cloudflare Worker logs | Paid success events, origin errors, error logs after payment |
| Netlify function logs | Relevant only if Netlify functions are in the request path |
| GitHub Issues | Tester-filed feedback, descriptor issues, compatibility reports |
| `/contact` submissions | Direct tester messages via hello@patientguide.io |

Cloudflare is the primary signal source for traffic data. Worker logs are the primary signal for post-payment errors.

---

## C. After posting to Reddit

Record the following for each post:

| Field | Record |
|-------|--------|
| Post URL | |
| Subreddit | |
| Timestamp (UTC) | |
| Baseline `/api/x402/*` request count before posting | |
| Traffic at +1h | |
| Traffic at +6h | |
| Traffic at +24h | |
| GitHub Issues opened | |
| `/contact` messages received | |
| Endpoint errors observed | |
| Useful comments or objections | |

This baseline helps distinguish organic traffic from tester traffic and informs follow-up decisions.

---

## D. Safety and privacy

- Never ask testers to provide private keys, seed phrases, or keypair files.
- Never ask for sensitive health information.
- Do not encourage mainnet testing — mainnet is not live.
- If a tester shares a transaction hash or signature as part of a bug report, that is acceptable context. Do not actively solicit it unless it is directly relevant to diagnosing a reported issue.
- Do not log or store any tester-provided health information, even if offered.

---

## E. Follow-up triage

Classify incoming feedback into one of these buckets:

| Category | Description |
|----------|-------------|
| `descriptor-issue` | Malformed or unexpected 402 descriptor field |
| `client-compat` | x402 client parsing failure or unexpected behavior |
| `solana-issue` | Solana Devnet-specific: feePayer, SPL mint, ATA, network |
| `base-issue` | Base Sepolia-specific: EIP-712 signing, asset, network |
| `docs-copy` | Missing information, unclear wording, wrong example |
| `product-confusion` | Misunderstanding of what the service is or does |
| `medical-safety` | Concern about health data framing or safety |
| `spam-noise` | Irrelevant or low-signal |

For `descriptor-issue` and `client-compat` reports: collect the raw 402 response body and client/library version before responding. These are the highest-value technical reports.

For `medical-safety` concerns: respond calmly and factually, referencing the disclaimer and the fact that human guides are free and no patient data is collected. See `docs/x402-reddit-tester-posts.md` for prepared defensive replies.
