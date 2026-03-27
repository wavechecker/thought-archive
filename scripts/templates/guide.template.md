---
# ─────────────────────────────────────────────────────────────────────────────
# PatientGuide.io — Canonical Guide Template  v1
# Copy → rename to your-guide-slug.md → fill placeholders → set draft: false
# ─────────────────────────────────────────────────────────────────────────────

title: "Your Guide Title"
description: "One-to-two sentence factual summary. Aim for 120–155 characters for good SEO."

# Required. Must be exactly one of the 18 valid values:
#   Emergencies | Infectious Diseases | Vaccination | Heart & Circulation
#   Women's Health | Diabetes | Cancer | Neurology | Mental Health
#   General Health | End of Life | Child & Adolescent Health
#   Obesity & Metabolic Health Hub | Men's Health | Aging & Longevity
#   Guide Hubs | Respiratory | AI in Health
category: "General Health"

publishDate: "YYYY-MM-DD"
# updatedDate: "YYYY-MM-DD"    # Uncomment when revising a published guide

draft: true
tags: []

# slug: your-guide-slug        # Only needed if the desired URL differs from the filename

# ── Structured data ────────────────────────────────────────────────────────────
# Used by GuideLayout.astro to emit JSON-LD for this guide.
# Recommended for clinical / condition guides.
# Remove the entire `schema:` block for commentary or editorial guides.
schema:
  medicalCondition:
    name: "Your Guide Title"
    description: "Clinical or scientific definition in one sentence."
    alternateName: []
    riskFactors:
      - "TODO: primary risk factor"
    symptoms:
      - "TODO: key symptom or presenting feature"
    possibleComplication:
      - "TODO: main complication"
    contagious: false
    sameAs:
      - "https://www.who.int/"
      - "https://medlineplus.gov/"

# ── FAQ frontmatter ────────────────────────────────────────────────────────────
# These q/a pairs feed the FAQPage JSON-LD schema via GuideLayout.astro.
# They should match the FAQ section in the body below.
# Minimum 2 for a valid FAQPage; 5 is the house standard.
faq:
  - q: "What is [topic]?"
    a: "Plain-language definition in one to two sentences."
  - q: "When should I see a doctor?"
    a: "The key warning signs and thresholds for seeking medical advice."
  - q: "How is [topic] treated or managed?"
    a: "Brief overview of the main treatment or management options."
  - q: "Is [topic] preventable?"
    a: "Risk-reduction strategies, or an honest answer if prevention is limited."
  - q: "When should I call emergency services?"
    a: "Specific red flags that require immediate emergency care."
---

## Intro

One or two paragraphs. Explain what this guide covers and why it matters. Lead with the most useful information — avoid preamble.

---

## Key Points

- Lead with the single most important takeaway.
- Each bullet should be scannable and standalone.
- Use **bold** for key terms on first use.
- Aim for 4–8 bullets.

---

## Background

What is this condition, drug, or topic? Provide the foundational context a reader needs before the detail sections.

---

## [Section — Causes / Risk Factors / Mechanisms]

<!-- Replace this heading with something topic-specific.
     Examples: "Causes", "How It Works", "Who Is at Risk", "Mechanisms" -->

Content here.

---

## [Section — Symptoms / Diagnosis / How It Presents]

<!-- Examples: "Symptoms", "How It Presents", "Diagnosis", "What to Expect" -->

Content here.

---

## [Section — Treatment / Management / Prevention]

<!-- Examples: "Treatment", "Management", "What to Do", "Prevention" -->

Content here.

---

## [Section — Risks, Benefits, and Prognosis]

<!-- Examples: "Risks and Benefits", "Prognosis", "What to Expect", "Evidence" -->

Use a table here if comparing treatment options or trade-offs.

---

## FAQ

**Q: What is [topic]?**
A: Plain-language definition.

**Q: When should I see a doctor?**
A: Key warning signs and when to seek care.

**Q: How is [topic] treated or managed?**
A: Brief overview of main treatment options.

**Q: Is [topic] preventable?**
A: Risk-reduction strategies, or honest answer if not preventable.

**Q: When should I call emergency services?**
A: Specific red flags requiring immediate action.

---

## Further Reading

<!-- External sources only. Format: [Display Text](https://full-url.com/path) -->
- [Source Name — brief description](https://source-url.example.com/path)
- [Source Name — brief description](https://source-url.example.com/path)

---

## Related Guides

<!-- Internal links only. Format: [Page Title](/guides/slug) — no trailing slash. -->
- [Related Guide Title](/guides/related-guide-slug)
- [Related Guide Title](/guides/related-guide-slug)
- [Category Hub](/guides/category-hub-slug)

---

## References

<!-- Optional. For peer-reviewed citations.
     Format: Author(s) (Year). *Title.* Journal. [https://doi.org/...](https://doi.org/...) -->

---

⚠️ *Educational only — not a substitute for professional medical advice.*
