#!/usr/bin/env node
// migrate-guides.mjs
// Dry-run by default; add --write to apply.
// Usage:
//   node scripts/migrate-guides.mjs
//   node scripts/migrate-guides.mjs --write --addUpdated --defaultCategory "Infectious Diseases"
//   node scripts/migrate-guides.mjs --glob "src/content/guides/**/*.md"

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { globbySync } from "globby";

// ---- flags ----
const argv = process.argv.slice(2);
const flags = new Map();
for (let i = 0; i < argv.length; i++) {
  const v = argv[i];
  if (v.startsWith("--")) {
    const key = v.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) { flags.set(key, next); i++; }
    else { flags.set(key, true); }
  }
}

const WRITE = flags.has("write");
const ADD_UPDATED = flags.has("addUpdated");
const DEFAULT_CATEGORY = flags.get("defaultCategory") || "General";
const GLOB = flags.get("glob") || "src/content/guides/**/*.md";

// ---- utils ----
const isIsoDate = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
const toIsoDate = (s) => {
  if (!s) return new Date().toISOString().slice(0, 10);
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(String(s));
  return m ? m[1] : new Date().toISOString().slice(0, 10);
};

// ---- schema chooser ----
function chooseSchemaType(slug, title) {
  const s = `${slug} ${title}`.toLowerCase();

  if (/\b(device|monitor|sensor|glucose\s*monitor|cgm|continuous glucose monitor)\b/.test(s)) {
    return "MedicalDevice";
  }
  if (/\b(cpr|angiography|administration|injection|procedure|how to|how-to|first aid|insulin)\b/.test(s)) {
    return "MedicalProcedure";
  }
  if (/\b(fever|dizziness|shortness of breath|breathlessness|palpitation|palpitations|seizure|bleeding|fatigue|headache)\b/.test(s)) {
    return "MedicalSignOrSymptom";
  }
  if (/\b(hub|overview|checklist|emergencies|preventive health|global|equity|policy|guidelines|vaccination overview|vaccination safety)\b/.test(s)) {
    return null;
  }
  if (/\b(vaccine|vaccination|mrna|mandates)\b/.test(s) && !/\b(measles|tetanus|rabies|influenza|hpv)\b/.test(s)) {
    return null;
  }

  return "MedicalCondition";
}

function ensureSchemaFor(data, filePath) {
  if (!data.schema) data.schema = {};

  if (data.schema.medicalCondition || data.schema.medicalDevice || data.schema.medicalProcedure || data.schema.medicalSignOrSymptom) {
    return false;
  }

  const slug = path.basename(filePath, ".md");
  const title = data.title || slug.replace(/[-_]/g, " ").trim();
  const chosen = chooseSchemaType(slug, title);
  if (!chosen) return false;

  const base = {
    name: title,
    description: "TODO: Concise clinical definition or summary.",
    sameAs: [
      "https://www.who.int/",
      "https://medlineplus.gov/"
    ]
  };

  if (chosen === "MedicalCondition") {
    data.schema.medicalCondition = {
      ...base,
      alternateName: [],
      riskFactors: ["TODO risk factor #1"],
      symptoms: ["TODO symptom #1"],
      possibleComplication: ["TODO complication #1"],
      contagious: false
    };
  } else if (chosen === "MedicalDevice") {
    data.schema.medicalDevice = {
      ...base,
      manufacturer: "TODO",
      model: "TODO"
    };
  } else if (chosen === "MedicalProcedure") {
    data.schema.medicalProcedure = {
      ...base,
      howPerformed: "TODO: Brief description of steps / setting.",
      preparation: "TODO",
      followup: "TODO"
    };
  } else if (chosen === "MedicalSignOrSymptom") {
    data.schema.medicalSignOrSymptom = {
      ...base,
      possibleTreatment: ["TODO"],
      identifyingTest: ["TODO"]
    };
  }

  return true;
}

// ---- main ----
const inputs = globbySync(GLOB, { expandDirectories: false });

if (!inputs.length) {
  console.error(`No Markdown files found for glob: ${GLOB}`);
  process.exit(1);
}

let changed = 0, skipped = 0, scanned = 0;

for (const file of inputs) {
  scanned++;
  const src = fs.readFileSync(file, "utf8");
  const fm = matter(src, { language: "yaml", delimiters: "---" });
  const data = fm.data || {};
  const body = fm.content || "";
  let touched = false;

  // Basic metadata
  if (!data.title) {
    data.title = path.basename(file, ".md").replace(/[-_]/g, " ").replace(/\s+/g, " ").trim();
    touched = true;
  }
  if (!data.description) { data.description = "TODO: One-sentence factual summary."; touched = true; }
  if (!data.category) { data.category = DEFAULT_CATEGORY; touched = true; }
  if (!data.publishDate) { data.publishDate = new Date().toISOString().slice(0, 10); touched = true; }
  else if (!isIsoDate(data.publishDate)) { data.publishDate = toIsoDate(data.publishDate); touched = true; }
  if (ADD_UPDATED) { data.updatedDate = toIsoDate(data.updatedDate || data.publishDate); touched = true; }
  if (typeof data.draft !== "boolean") { data.draft = true; touched = true; }
  if (!Array.isArray(data.tags)) { data.tags = []; touched = true; }

  // NEW: ensure all guides render with GuideLayout.astro
  if (!data.layout) {
    data.layout = "@/layouts/GuideLayout.astro";
    touched = true;
  }

  // Smart schema
  if (ensureSchemaFor(data, file)) touched = true;

  // Minimal FAQ for JSON-LD
  if (!Array.isArray(data.faq)) {
    const t = (data.title || "").toLowerCase();
    data.faq = [
      { q: `What is ${t}?`, a: "TODO: Plain-language answer (1–2 sentences)." },
      { q: "When should I seek emergency care?", a: "TODO: Clear red-flags + call emergency services if present." }
    ];
    touched = true;
  }

  if (!touched) { skipped++; continue; }

  if (WRITE) {
    const bak = file + ".bak";
    if (!fs.existsSync(bak)) fs.writeFileSync(bak, src, "utf8");
    const output = matter.stringify(body.trimStart(), data, { language: "yaml", delimiters: "---" });
    fs.writeFileSync(file, output, "utf8");
  }
  changed++;
}

const note = WRITE ? "updated" : "would update (dry-run)";
console.log(`\nScanned: ${scanned}`);
console.log(`Changed: ${changed} ${note}`);
console.log(`Unchanged: ${skipped}`);
if (!WRITE) {
  console.log('\nDry run complete. Re-run with --write to apply changes.');
  console.log('Optional flags: --addUpdated  --defaultCategory "Infectious Diseases"  --glob "src/content/guides/**/*.md"');
}

