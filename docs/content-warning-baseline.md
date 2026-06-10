# Content Warning Baseline

As of 2026-06-08, `npm run content:check` passes with 0 errors and approximately 21 warnings.

These remaining warnings are intentional. They are all "No FAQ items in frontmatter" warnings and should not be treated as breakage.

The remaining files generally fall into three groups:

1. Pure navigation hubs where FAQ frontmatter would be artificial.
2. Pages that already provide FAQPage schema through inline JSON-LD or SchemaFAQ components.
3. Thin/stub pages that should be expanded in future content sprints before FAQ frontmatter is added.

Do not add generic FAQ filler purely to reach zero warnings. If a remaining file is expanded into a substantive patient guide later, add useful `faq:` frontmatter as part of that content update.

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
| `src/content/guides/mental-health-crisis.md` | Mental Health (draft hub) |
| `src/content/guides/emergencies.md` | Emergencies |

> **Note (2026-06-08):** `src/content/guides/palliative-care.md` was removed from this group in the palliative care expansion sprint. It has been expanded into a substantive patient-facing guide with `faq:` frontmatter and no longer belongs in the intentional warning baseline.

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
| `src/content/guides/lifespan-vs-healthspan.mdx` | Inline FAQPage JSON-LD |

### Group 3 — Thin/stub pages (all `draft: true`)

These pages are unfinished drafts. They should be expanded into full patient guides before FAQ
frontmatter is added. Forcing in FAQ items now would produce low-quality content.

| File | Topic |
|------|-------|
| `src/content/guides/transient-ischemic-attack-tia.mdx` | TIA / mini-stroke |
| `src/content/guides/heart-health-hub.mdx` | Heart health hub (stub) |
| `src/content/guides/sunscreen-skin-protection.md` | Sunscreen and UV protection |
| `src/content/guides/sunscreen-basics.md` | Sunscreen basics |
| `src/content/guides/natural-testosterone-guide.mdx` | Natural testosterone optimisation |
| `src/content/guides/erectile-dysfunction.md` | Erectile dysfunction |
