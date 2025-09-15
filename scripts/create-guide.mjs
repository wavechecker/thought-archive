#!/usr/bin/env node
/**
 * create-guide.mjs
 * Scaffold a new guide with JSON-LD-ready frontmatter for patientguide.io
 *
 * Usage:
 *   node scripts/create-guide.mjs "Sepsis" [en|es] [optional-custom-slug] --category "Infectious Diseases" --tags sepsis,infection --draft false --updateDate --force
 */

import fs from "node:fs";
import path from "node:path";

// -------------------- config enums --------------------
const VALID_CATEGORIES = [
  "General",
  "Heart & Circulation",
  "Diabetes",
  "Infectious Diseases",
  "Vaccination",
  "Men's Health",
  "Women's Health",
  "Mental Health",
  "Cancer",
  "Neurology",
  "Emergencies",
  "Child & Adolescent Health",
  "End of Life",
  "General Health"
];

// -------------------- arg parsing --------------------
const [, , titleArg, langArg = "en", slugArg, ...rest] = process.argv;

if (!titleArg || titleArg.startsWith("--")) {
  console.error('Usage: node scripts/create-guide.mjs "Title here" [en|es] [optional-custom-slug] --category "Category Name" [--tags a,b,c] [--draft true|false] [--updateDate] [--force]');
  process.exit(1);
}

const flags = {};
for (let i = 0; i < rest.length; i++) {
  const v = rest[i];
  if (v?.startsWith("--")) {
    const key = v.replace(/^--/, "");
    const next = rest[i + 1];
    if (next && !next.startsWith("--")) {
      flags[key] = next;
      i++;
    } else {
      flags[key] = true; // boolean flag (e.g., --updateDate, --force)
    }
  }
}

const title = titleArg.trim();
const lang = (langArg || "en").toLowerCase();
if (!["en", "es"].includes(lang)) {
  console.error('Language must be "en" or "es".');
  process.exit(1);
}

// simple slugify
const slugify = (s) => s
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "")
  .slice(0, 80);

const slug = slugArg ? slugify(slugArg) : slugify(title);

// Dates: YYYY-MM-DD
const today = new Date().toISOString().slice(0, 10);

// Flags
let category = typeof flags.category === "string" ? flags.category : "General";
if (!VALID_CATEGORIES.includes(category)) {
  console.error(`\x1b[31mInvalid category:\x1b[0m "${category}"
Allowed categories are:
${VALID_CATEGORIES.map(c => `- ${c}`).join("\n")}`);
  process.exit(1);
}

const tags = typeof flags.tags === "string" && flags.tags.trim()
  ? flags.tags.split(",").map(s => s.trim()).filter(Boolean)
  : [];
const draft = typeof flags.draft === "string" ? flags.draft.toLowerCase() === "true" : true; // default true
const includeUpdated = !!flags.updateDate;
const force = !!flags.force;

// -------------------- file paths --------------------
const dir = path.join("src", "content", "guides");
const fname = `${slug}.${lang}.md`;
const file = path.join(dir, fname);

if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
if (fs.existsSync(file) && !force) {
  console.error(`File already exists: ${file}\nUse --force to overwrite.`);
  process.exit(1);
}

// -------------------- template --------------------
const frontmatter = `---
title: "${title}"
description: "TODO: One-sentence factual summary."
category: "${category}"
lang: ${lang}
slug: ${slug}
publishDate: "${today}"${includeUpdated ? `
updatedDate: "${today}"` : ""}
draft: ${draft}
tags: [${tags.map(t => `"${t}"`).join(", ")}]

# JSON-LD inputs (used by GuideLayout.astro)
schema:
  medicalCondition:
    name: "${title}"
    description: "TODO: Concise clinical definition."
    alternateName: []
    riskFactors:
      - "TODO risk factor #1"
      - "TODO risk factor #2"
    symptoms:
      - "TODO symptom #1"
      - "TODO symptom #2"
    possibleComplication:
      - "TODO complication #1"
    contagious: false
    sameAs:
      - "https://www.who.int/"
      - "https://medlineplus.gov/"

faq:
  - q: "What is ${title.toLowerCase()}?"
    a: "TODO: Plain-language answer (1–2 sentences)."
  - q: "When should I seek emergency care?"
    a: "TODO: Clear red-flags + call emergency services if present."
---

## Intro
Concise definition + why it matters.

## Key Points
- Bullet, answer-first summary.
- Keep it scannable.

## Background
What it is / context.

## Causes or Mechanisms
What drives it / why it happens.

## Diagnosis / Treatment / Options
How it’s found + managed.

## Risks / Benefits / Prognosis
What to weigh, what to expect.

## FAQ
**Q: Example?**  
A: Keep this body FAQ if you like; frontmatter \`faq\` feeds JSON-LD.

## Further Reading
- [External neutral source #1](https://)
- [External neutral source #2](https://)

## Related Guides
- [/guides/example](/guides/example)
`;

// -------------------- write --------------------
fs.writeFileSync(file, frontmatter, "utf8");
console.log(`Created: ${file}`);
