---
title: "KRAS Mutations Explained: Why Some Cancer Targets Are Hard to Treat"
slug: "kras-mutations-explained"
description: >-
  A clear explanation of KRAS mutations — what KRAS is, how mutations lock
  cell-signalling on, why KRAS was historically undruggable, how the science
  shifted, which cancers are affected, and where targeted therapy stands now.
category: "Cancer"
publishDate: "2026-06-05"
draft: false
tags:
  - KRAS
  - RAS
  - molecular biology
  - targeted therapy
  - pancreatic cancer
  - lung cancer
  - colorectal cancer
  - oncology
  - precision medicine
  - drug resistance
faq:
  - q: "What is KRAS?"
    a: >-
      KRAS is a gene that encodes a protein called KRAS (Kirsten RAS), which
      acts as a molecular switch in signalling pathways that control cell
      growth, division, and survival. In its normal state, the KRAS protein
      switches on when a cell receives a growth signal and then switches off
      again. In most pancreatic cancers and many colorectal and lung cancers,
      mutations in the KRAS gene permanently lock this switch in the "on"
      position, continuously telling the cell to divide even when it should not.
  - q: "Which cancers commonly have KRAS mutations?"
    a: >-
      KRAS mutations are most prevalent in pancreatic ductal adenocarcinoma
      (more than 90% of cases), colorectal cancer (approximately 40–50%),
      and lung adenocarcinoma (approximately 25–30%). KRAS mutations also
      occur in some endometrial, ovarian, and other cancers at lower frequencies.
      Across all solid tumours, RAS family mutations are among the most common
      oncogenic alterations identified.
  - q: "Why was KRAS considered 'undruggable'?"
    a: >-
      For several decades after KRAS was identified as an oncogene, researchers
      could not develop effective drugs against it. The KRAS protein binds its
      substrate (GTP) with extremely high affinity — higher than most enzymes
      that have been successfully drugged — and the cellular concentration of
      GTP is very high, making competitive inhibition impractical. The protein's
      surface also lacked the clear binding pockets that drug molecules typically
      need to dock into. Multiple attempts at inhibiting KRAS directly failed,
      and the assumption that it was undruggable became entrenched over decades
      of failed efforts.
  - q: "What changed — how did KRAS become druggable?"
    a: >-
      Two things changed: structural biology and chemical biology. Advances in
      techniques for determining the three-dimensional shape of proteins at atomic
      resolution revealed a binding pocket in the KRAS G12C mutant — a small
      crevice called the switch-II pocket (S-IIP) that is only present when KRAS
      carries a cysteine at position 12. Researchers designed molecules that
      covalently bind this cysteine irreversibly, locking KRAS in its inactive
      state. This led to sotorasib (approved for lung cancer 2021) and adagrasib
      (approved 2022). Separately, newer approaches targeting RAS in its active
      "ON" state — rather than requiring a specific mutation — have expanded the
      druggable space further.
  - q: "Are there approved KRAS-targeting drugs?"
    a: >-
      Yes, for KRAS G12C-mutated non-small cell lung cancer (NSCLC). Sotorasib
      (Lumakras, AMG-510) received FDA approval in May 2021, and adagrasib
      (Krazati, MRTX-849) received FDA approval in December 2022 — both for
      previously treated KRAS G12C-mutated NSCLC. As of June 2026, there is no
      approved KRAS inhibitor for pancreatic cancer, though Phase 3 trial results
      for daraxonrasib published in the NEJM in May 2026 showed a significant
      survival benefit in previously treated metastatic PDAC. Regulatory review
      is ongoing.
  - q: "Does a KRAS mutation mean targeted therapy is available for my cancer?"
    a: >-
      Not necessarily, and it depends heavily on cancer type and the specific
      KRAS mutation subtype. For KRAS G12C-mutated lung cancer, approved drugs
      exist. For pancreatic cancer, KRAS-targeting drugs are still investigational
      (as of June 2026) — daraxonrasib has shown Phase 3 benefit but is not yet
      approved, though expanded access may be available. For colorectal cancer
      with KRAS mutations, approved KRAS inhibitors do not currently exist for
      most patients, and the absence of a KRAS mutation (RAS wild-type status)
      is actually required for anti-EGFR antibodies (cetuximab, panitumumab)
      to work. Always discuss your tumour's specific mutation profile and
      treatment options with your oncologist.
  - q: "What are resistance mechanisms to KRAS inhibitors?"
    a: >-
      Resistance to KRAS G12C inhibitors — and likely to other KRAS-targeting
      drugs — develops through multiple mechanisms. These include secondary
      mutations in KRAS itself (e.g., Y96D, which prevents drug binding),
      amplification of the KRAS gene, mutations in other RAS pathway genes
      (NRAS, BRAF), and activation of bypass signalling pathways (PI3K/AKT,
      MET amplification). Combination strategies pairing KRAS inhibitors with
      SHP2 inhibitors, SOS1 inhibitors, or MEK inhibitors are under investigation
      to prevent or overcome resistance.
---

# KRAS Mutations Explained: Why Some Cancer Targets Are Hard to Treat

One of the most common genetic changes in cancer — the KRAS mutation — went without effective treatment for more than 40 years after it was discovered. Understanding why helps explain how cancer drug development works, why some targets are harder than others, and what the recent KRAS drug approvals actually mean.

---

## The RAS Signalling Pathway

Cells communicate through molecular signals that travel along chains of proteins — signalling pathways. One of the most important pathways for cell growth is the **RAS/MAPK pathway**.

At the centre of this pathway is the RAS protein family, which includes HRAS, NRAS, and KRAS. These proteins act as **molecular switches**:

1. When a growth signal arrives at the cell surface (e.g., a growth factor binds its receptor), the receptor activates a guanine nucleotide exchange factor (GEF), which causes RAS to swap GDP (guanosine diphosphate) for GTP (guanosine triphosphate). This puts RAS in its **active "on" state**.
2. Active RAS then signals downstream through a cascade: RAS → RAF → MEK → ERK. This cascade ultimately reaches the nucleus, where it activates genes that drive the cell to divide and grow.
3. Normally, the RAS protein has an intrinsic enzymatic activity called **GTPase** — it can hydrolyse GTP back to GDP, switching itself off. It does this slowly on its own, and much faster with help from GTPase-activating proteins (GAPs).

This cycle — signal in, RAS turns on, RAS turns off — governs cell proliferation in a controlled way.

---

## How KRAS Mutations Drive Cancer

The most common cancer-associated KRAS mutations are single-letter changes (point mutations) at specific positions in the KRAS protein:

| Mutation | Amino acid change | Main cancers |
|----------|-------------------|--------------|
| G12D | Glycine → Aspartate | Pancreatic, colorectal |
| G12V | Glycine → Valine | Pancreatic, lung |
| G12C | Glycine → Cysteine | Lung (most common here), colorectal |
| G13D | Glycine → Aspartate | Colorectal |
| Q61H/L | Glutamine → Histidine or Leucine | Various |

All of these mutations share a common effect: they **impair KRAS's ability to hydrolyse GTP back to GDP**. The switch gets stuck in the "on" position. KRAS continuously signals the cell to grow and divide, even in the absence of a legitimate growth signal.

This uncontrolled growth signalling is one of the central biological mechanisms driving tumour development and progression.

---

## Which Cancers Are Affected

KRAS mutations are among the most common oncogenic alterations in solid tumours.

| Cancer type | Approximate KRAS mutation frequency |
|-------------|--------------------------------------|
| Pancreatic ductal adenocarcinoma (PDAC) | >90% |
| Colorectal cancer | ~40–50% |
| Lung adenocarcinoma | ~25–30% |
| Endometrial cancer | ~15–20% |
| Ovarian cancer (mucinous subtype) | ~20–30% |
| Biliary tract cancer | ~10–20% |
| Other solid tumours | Varies, generally lower |

Pancreatic cancer has the highest rate of KRAS mutation of any common solid tumour — making KRAS central to essentially any biological understanding of the disease.

---

## Why KRAS Was "Undruggable"

The oncology community spent decades trying to target KRAS directly or indirectly. Most approaches failed, and by the 1990s the idea that KRAS was essentially undruggable had become widely accepted. Several features of the KRAS protein explain why:

### 1. No clear binding pocket

Drug molecules need somewhere to "grab" a target protein — a crevice or pocket on its surface where the drug can lodge and block its function. The surface of KRAS, particularly in its oncogenic mutant forms, was largely smooth. Early structural studies identified no obvious pockets suitable for a small molecule drug.

### 2. Extremely high GTP affinity

KRAS's GTPase domain binds GTP with picomolar affinity — meaning it holds onto GTP exceptionally tightly. Any competitive inhibitor (a drug that tries to block GTP from binding) would need to out-compete the cellular concentration of GTP, which is in the millimolar range. The difference in binding affinity makes competitive inhibition essentially impossible to achieve with a drug.

### 3. The GAP problem

Some strategies tried to activate the GTPase activity of mutant KRAS, hoping to accelerate its self-switching off. But oncogenic mutations at G12 and G13 directly block the binding interface for GAP proteins — the very proteins that normally speed up GTP hydrolysis. The mutations not only impair intrinsic GTPase activity; they also prevent rescue from outside.

### 4. Indirect approaches failed

Because direct KRAS inhibition seemed impossible, researchers targeted downstream proteins in the RAS/MAPK pathway — RAF inhibitors (vemurafenib), MEK inhibitors (trametinib), and farnesyltransferase inhibitors (which block KRAS localisation to the cell membrane). These approaches showed activity in some cancers with different mutations (e.g., BRAF V600E melanoma) but failed in KRAS-mutated tumours, largely because cancer cells found alternative ways to keep the downstream pathway active.

---

## How the Science Shifted

The change came from structural biology and a specific chemical opportunity.

### The KRAS G12C covalent inhibitor story

In 2013, researchers at the University of California San Francisco — notably the Shokat laboratory — published a landmark paper in *Nature* identifying a small binding pocket in the KRAS G12C mutant protein that was not apparent in wild-type KRAS. This pocket, called the **switch-II pocket (S-IIP)**, is located near the nucleotide-binding site and forms transiently when KRAS is in its GDP-bound (inactive) state.

Crucially, the G12C mutation replaces glycine with a **cysteine** — a reactive amino acid with a sulfhydryl group (-SH). This made it possible to design molecules that covalently bond to the cysteine irreversibly, locking the protein in the inactive GDP state and blocking its activation.

This was the chemical insight that made KRAS G12C a genuine drug target:
- The S-IIP pocket provided a binding site
- The cysteine provided a reactive handle for covalent attachment
- Locking KRAS in the GDP state effectively switched it off

From this discovery, two drugs emerged:

| Drug | Trade name | Company | FDA approval |
|------|-----------|---------|-------------|
| Sotorasib (AMG-510) | Lumakras | Amgen | May 2021 (NSCLC, KRAS G12C) |
| Adagrasib (MRTX-849) | Krazati | Mirati/BMS | December 2022 (NSCLC, KRAS G12C) |

Both are approved for previously treated KRAS G12C-mutated non-small cell lung cancer (NSCLC). They confirmed that KRAS could be directly inhibited with clinical benefit.

### Multi-RAS and RAS(ON) inhibitors

KRAS G12C-specific inhibitors only work for the fraction of cancers carrying that particular mutation. G12C is the most common KRAS mutation in lung cancer (~13%), but it is uncommon in pancreatic (~1–2%) and colorectal cancer (~3–5%) — the two other major KRAS-driven cancers.

A different approach targets RAS proteins in their **active "on" (GTP-bound) state**, rather than requiring the drug to catch RAS in its off state waiting to be re-activated. These **RAS(ON) inhibitors** are designed to block RAS signalling across multiple mutation types, including the dominant G12D and G12V variants found in pancreatic cancer.

**Daraxonrasib (RMC-6236)**, developed by Revolution Medicines, is a multi-selective RAS(ON) inhibitor. In May 2026, the Phase 3 **RASolute 302** trial (NCT06625320) reported results in the *New England Journal of Medicine* showing that daraxonrasib reduced the risk of death by 60% (hazard ratio 0.40, p < 0.0001) compared with chemotherapy in patients with previously treated metastatic pancreatic ductal adenocarcinoma — the vast majority of whom had KRAS mutations. As of June 2026, daraxonrasib has not received regulatory approval, but it holds FDA Breakthrough Therapy designation and an expanded access programme has been initiated.

These results represent the first Phase 3 evidence that RAS-targeted therapy can produce meaningful clinical benefit in pancreatic cancer.

See: [Why Scientists Thought Pancreatic Cancer Was 'Undruggable' — And What Changed](/posts/pancreatic-cancer-breakthrough-daraxonrasib-2026)

---

## Current Targeted Therapy Landscape by Cancer Type

### Lung adenocarcinoma (KRAS G12C)
- **Sotorasib** and **adagrasib** are FDA-approved for KRAS G12C-mutated NSCLC after prior therapy
- KRAS G12C is present in approximately 13% of NSCLC — the most common targetable KRAS subtype in lung cancer
- Clinical trials are evaluating combination strategies and earlier lines of therapy

### Pancreatic cancer (KRAS: mostly G12D, G12V)
- No approved KRAS inhibitor as of June 2026
- **Daraxonrasib** showed Phase 3 benefit vs chemotherapy (NEJM May 2026); regulatory review pending
- For patients with BRCA mutations (~5–7%): PARP inhibitors (olaparib) after platinum chemotherapy
- Biomarker testing (NGS + germline) recommended for all patients with advanced disease
- Clinical trials are the most important avenue for accessing KRAS-targeting drugs

### Colorectal cancer (KRAS: mostly G12D, G12V, G13D)
- No approved KRAS inhibitor for RAS-mutated colorectal cancer as of June 2026
- Critically: **absence of RAS mutations** (RAS wild-type) is required for anti-EGFR antibodies (cetuximab, panitumumab) to work. KRAS and NRAS testing is performed routinely to select patients who *can* benefit from anti-EGFR therapy
- KRAS G12C-specific trials are ongoing in colorectal cancer; initial results have been mixed, partly due to feedback reactivation of EGFR signalling in colorectal tumours (different from lung biology)
- Combination approaches (KRAS inhibitor + EGFR antibody) are showing promise in early trials

---

## Resistance Mechanisms

As with most targeted therapies, resistance to KRAS inhibitors develops over time — in most patients, within months. The mechanisms are diverse:

- **On-target secondary mutations** in KRAS that prevent drug binding (e.g., Y96D in KRAS G12C inhibitor-treated patients) or that restore GTP-binding despite the drug
- **RAS pathway amplification** — more KRAS copies, overwhelming inhibitor coverage
- **Bypass pathway activation** — the cancer activates alternative signalling routes (PI3K/AKT/mTOR, MET amplification, RET fusions) that bypass KRAS and maintain proliferative signalling
- **Phenotypic change** — some cells undergo epithelial-to-mesenchymal transition or histological transformation
- **Tumour heterogeneity** — resistant cell subclones may pre-exist before therapy and expand under selective pressure

### Strategies to overcome or prevent resistance

A major area of active research is combining KRAS inhibitors with drugs targeting the pathways most commonly activated in resistance:

- **SHP2 inhibitors** — SHP2 is a phosphatase that feeds signals into RAS; blocking it can reduce RAS activation through multiple upstream inputs
- **SOS1 inhibitors** — SOS1 is the main GEF that loads RAS with GTP; blocking it reduces RAS activation
- **MEK inhibitors** — blocking downstream MEK may reduce bypass signalling
- **EGFR antibodies** — used in colorectal cancer combinations to block a major RAS reactivation signal
- **PROTACs** — targeted protein degraders designed to eliminate RAS protein rather than just inhibit it; still early-stage

---

## Looking Ahead

The KRAS field has moved from "undruggable" to a rapidly expanding area of clinical development in under 15 years — a striking shift driven by structural biology, chemical innovation, and persistent research investment.

Several directions are active:
- **Pan-KRAS inhibitors** targeting multiple mutation subtypes simultaneously
- **Combination trials** pairing RAS(ON) inhibitors with MEK, SHP2, or SOS1 inhibitors to forestall resistance
- **First-line trials** in pancreatic and colorectal cancer — the current approvals and advanced trials are mostly in second-line or later settings
- **RAS in other tumour types** — KRAS mutations in biliary tract, endometrial, and other cancers are being studied

The key scientific question now is not whether KRAS can be targeted, but how to target it durably — across more mutation subtypes, at earlier stages, and in combinations that prevent resistance.

---

## FAQ

**Q: What is KRAS?**
A protein that acts as a molecular switch in signalling pathways controlling cell growth. Mutations in KRAS lock this switch "on," driving uncontrolled cell division. KRAS mutations are present in more than 90% of pancreatic cancers and in large proportions of colorectal and lung adenocarcinomas.

**Q: Which cancers have KRAS mutations?**
Most commonly: pancreatic cancer (>90%), colorectal cancer (~40–50%), and lung adenocarcinoma (~25–30%). The specific mutation subtype varies by cancer type — G12C is most common in lung, while G12D and G12V dominate in pancreatic cancer.

**Q: Why was KRAS called "undruggable"?**
The KRAS protein had no clear binding pocket for small molecule drugs, bound GTP with extremely high affinity (making competitive inhibition impractical), and direct inhibition attempts consistently failed for decades. The term reflected the difficulty of the problem, not a permanent impossibility.

**Q: Are KRAS inhibitors approved?**
Yes, for KRAS G12C-mutated lung cancer: sotorasib (Lumakras, FDA 2021) and adagrasib (Krazati, FDA 2022). No KRAS inhibitor is approved for pancreatic or colorectal cancer as of June 2026, though clinical trials — including Phase 3 data for daraxonrasib in pancreatic cancer — are advancing.

**Q: What is a RAS(ON) inhibitor?**
A drug that targets RAS while it is in its active GTP-bound state, rather than catching it in its inactive state. This approach can target multiple KRAS mutation subtypes, unlike G12C-specific covalent inhibitors which require the specific cysteine residue. Daraxonrasib is an example of a multi-selective RAS(ON) inhibitor.

**Q: Do KRAS mutations affect treatment for colorectal cancer?**
Yes — in an important way. KRAS mutations mean anti-EGFR antibodies (cetuximab, panitumumab) will *not* work. RAS testing is performed routinely in colorectal cancer to determine who *can* benefit from these drugs (only RAS wild-type patients). Approved KRAS inhibitors for RAS-mutated colorectal cancer do not yet exist.

**Q: Does my KRAS mutation mean I have access to targeted therapy?**
It depends on cancer type, the specific mutation subtype, and the current regulatory status of relevant drugs. Discuss your specific mutation profile and available options — including clinical trials — with your oncologist.

---

## Further Reading

- [National Cancer Institute — KRAS Gene](https://www.cancer.gov/publications/dictionaries/cancer-terms/def/kras) — Definition and clinical context.
- [National Cancer Institute — Targeted Cancer Therapies](https://www.cancer.gov/about-cancer/treatment/types/targeted-therapies) — Overview of approved targeted therapies.
- [American Cancer Society — Targeted Drug Therapy](https://www.cancer.org/cancer/managing-cancer/treatment-types/targeted-therapy.html) — Patient-focused explanation of targeted drugs.
- [Cancer Research UK — RAS mutations](https://www.cancerresearchuk.org/about-cancer/cancer-in-general/treatment/targeted-cancer-drugs/types/ras-mutations) — RAS mutations in cancer context.

---

## Related Guides

- [Pancreatic Cancer: Symptoms, Diagnosis, and Treatment](/guides/pancreatic-cancer-overview) — The cancer most defined by KRAS mutations
- [Precision Medicine in Cancer: Biomarkers, Targeted Therapy, and Genetic Testing](/guides/precision-medicine-in-cancer) — The broader precision oncology framework
- [Cancer — Guide Hub](/guides/cancer) — Overview of PatientGuide cancer content
- [Why Scientists Thought Pancreatic Cancer Was 'Undruggable' — And What Changed](/posts/pancreatic-cancer-breakthrough-daraxonrasib-2026) — Phase 3 results for daraxonrasib in full detail

---

*Educational only — not a substitute for professional medical advice.*
