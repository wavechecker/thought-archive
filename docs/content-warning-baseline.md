# Content Warning Baseline

As of 2026-06-11, `npm run content:check` passes with 0 errors and approximately 13 warnings.

These remaining warnings are intentional. They are all "No FAQ items in frontmatter" warnings and should not be treated as breakage.

The remaining files generally fall into three groups:

1. Pure navigation hubs where FAQ frontmatter would be artificial.
2. Pages that already provide FAQPage schema through inline JSON-LD or SchemaFAQ components.
3. Thin/stub pages that should be expanded in future content sprints before FAQ frontmatter is added.

Do not add generic FAQ filler purely to reach zero warnings. If a remaining file is expanded into a substantive patient guide later, add useful `faq:` frontmatter as part of that content update.

> **Note (2026-06-11):** 8 draft stubs were removed in the `chore/stub-and-draft-cleanup` sprint, reducing the intentional warning count from 21 to 13. Removed files: `heart-health-hub.mdx`, `transient-ischemic-attack-tia.mdx`, `natural-testosterone-guide.mdx`, `erectile-dysfunction.md`, `mental-health-crisis.md`, `sunscreen-basics.md`, `sunscreen-skin-protection.md`, `lifespan-vs-healthspan.mdx`. All had 301 redirects to canonical guides.

> **Note (2026-06-11):** `infectious-disease-hub.mdx` was removed in the `chore/infectious-disease-hub-merge` sprint. Useful FAQ content and guide sections (Key Points, Start Here, Vector/Animal/Rodent-Borne, Long COVID, Post-Viral Syndromes) were ported into the canonical hub `infectious-diseases.mdx`. A 301 redirect from `/guides/infectious-disease-hub` to `/guides/infectious-diseases` was already in place. Warning count remains 13.

---

## Classified file list

### Group 1 — Pure navigation hubs

These pages use `hubKey` in frontmatter and serve as category landing pages linking out to
substantive guides. Adding FAQ frontmatter would produce artificial filler.

| File | Hub |
|------|-----|
| `src/content/guides/vaccination.md` | Vaccination |
| `src/content/guides/testing-and-screening.md` | Testing & Screening |
| `src/content/guides/sexual-health.md` | Sexual Health |
| `src/content/guides/mental-health.md` | Mental Health |
| `src/content/guides/emergencies.md` | Emergencies |

> **Note (2026-06-08):** `src/content/guides/palliative-care.md` was removed from this group in the palliative care expansion sprint. It has been expanded into a substantive patient-facing guide with `faq:` frontmatter and no longer belongs in the intentional warning baseline.

> **Note (2026-06-11):** `src/content/guides/mental-health-crisis.md` was removed from this group in the stub cleanup sprint. It was a draft hub with a redirect to `/guides/mental-health`.

### Group 2 — Existing FAQPage schema via inline JSON-LD or SchemaFAQ component

These pages already emit FAQPage structured data through inline `<script type="application/ld+json">`,
`jsonld:` frontmatter blocks, or an imported `SchemaFAQ` component. Adding `faq:` frontmatter would
create duplicate schema output.

| File | Schema mechanism |
|------|-----------------|
| `src/content/guides/why-combination-vaccines-exist.mdx` | Inline FAQPage JSON-LD |
| `src/content/guides/voluntary-assisted-dying-global-overview.md` | `jsonld:` frontmatter FAQPage |
| `src/content/guides/voluntary-assisted-dying-australia-access.md` | `jsonld:` frontmatter FAQPage |
| `src/content/guides/vad-australia-families-guide.md` | `jsonld:` frontmatter FAQPage |
| `src/content/guides/azelastine-nasal-spray-covid-prevention.md` | `jsonld:` frontmatter FAQPage |
| `src/content/guides/creatine-guide.mdx` | `<SchemaFAQ>` component |
| `src/content/guides/how-to-evaluate-medical-claims-age-of-ai.mdx` | Inline FAQPage JSON-LD |
| `src/content/guides/intrinsic-vs-extrinsic-mortality.mdx` | Inline FAQPage JSON-LD |

> **Note (2026-06-11):** `src/content/guides/lifespan-vs-healthspan.mdx` was removed from this group in the stub cleanup sprint. It was `draft: true` with a redirect to `/guides/healthspan-vs-lifespan`.

### Group 3 — Thin/stub pages

These pages are unfinished drafts or pages that need FAQ content before it can be meaningfully added.

| File | Topic |
|------|-------|
| (none remaining) | — |

> **Note (2026-06-11):** All files previously in this group were removed in the stub cleanup sprint. `transient-ischemic-attack-tia.mdx`, `heart-health-hub.mdx`, `sunscreen-skin-protection.md`, `sunscreen-basics.md`, `natural-testosterone-guide.mdx`, and `erectile-dysfunction.md` were all `draft: true` with canonical replacements and 301 redirects.
