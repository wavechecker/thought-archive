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
import yaml from "js-yaml";

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
const GLOB = flags.get("glob") || "src/content/guides";

// ---- utils ----
const isIsoDate = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
const toIsoDate = (s) => {
  if (!s) return new Date().toISOString().slice(0, 10);
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(String(s));
  return m ? m[1] : new Date().toISOString().slice(0, 10);
};

function collectMdFiles(root) {
  const files = [];
  function walk(p) {
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      for (const name of fs.readdirSync(p)) walk(path.join(p, name));
    } else if (stat.isFile() && p.toLowerCase().endsWith(".md")) {
      files.push(p);
    }
  }
  walk(root);
  return files;
}

function ensure(obj, key, fallback) {
  if (obj[key] === undefined) obj[key] = fallback;
  return obj[key];
}

// ---- main ----
const ROOT = path.resolve(GLOB);
const inputs = fs.existsSync(ROOT)
  ? (fs.statSync(ROOT).isDirectory() ? collectMdFiles(ROOT) : [ROOT])
  : [];

if (!inputs.length) {
  console.error(`No Markdown files found at: ${GLOB}`);
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

  // Title
  if (!data.title) {
    data.title = path.basename(file, ".md").replace(/[-_]/g, " ").replace(/\s+/g, " ").trim();
    touched = true;
  }

  // Description
  if (!data.description) { data.description = "TODO: One-sentence factual summary."; touched = true; }

  // Category
  if (!data.category) { data.category = DEFAULT_CATEGORY; touched = true; }

  // Dates
  if (!data.publishDate) { data.publishDate = new Date().toISOString().slice(0, 10); touched = true; }
  else if (!isIsoDate(data.publishDate)) { data.publishDate = toIsoDate(data.publishDate); touched = true; }

  if (ADD_UPDATED) { data.updatedDate = toIsoDate(data.updatedDate || data.publishDate); touched = true; }

  // Draft
  if (typeof data.draft !== "boolean") { data.draft = true; touched = true; }

  // Tags
  if (!Array.isArray(data.tags)) { data.tags = []; touched = true; }

  // schema.medicalCondition
  if (!data.schema || !data.schema.medicalCondition) {
    const t = data.title || "";
    ensure(data, "schema", {});
    data.schema.medicalCondition = {
      name: t,
      description: "TODO: Concise clinical definition.",
      alternateName: [],
      riskFactors: ["TODO risk factor #1"],
      symptoms: ["TODO symptom #1"],
      possibleComplication: ["TODO complication #1"],
      contagious: false,
      sameAs: ["https://www.who.int/", "https://medlineplus.gov/"]
    };
    touched = true;
  }

  // faq
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
