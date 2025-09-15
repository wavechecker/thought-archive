#!/usr/bin/env node
// validate-jsonld.mjs — scan built HTML for JSON-LD blocks & types
//
// Usage:
//   node scripts/validate-jsonld.mjs
//   node scripts/validate-jsonld.mjs --require Article FAQ
//   node scripts/validate-jsonld.mjs --fail-on-missing --require MedicalCondition FAQ
//
// Notes:
// - Looks under ./dist by default (Astro's build output).
// - Reports pages missing JSON-LD or missing specific @type entries.
// - Exits 1 if --fail-on-missing and any required types are missing.

import fs from "node:fs";
import path from "node:path";

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

const DIST_DIR = "dist";
const REQUIRE = (flags.get("require") || "").toString().split(/\s+/).filter(Boolean);
const FAIL = !!flags.get("fail-on-missing");

function collectHtmlFiles(root) {
  const files = [];
  function walk(p) {
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      for (const name of fs.readdirSync(p)) walk(path.join(p, name));
    } else if (st.isFile() && p.endsWith(".html")) {
      files.push(p);
    }
  }
  walk(root);
  return files;
}

function extractJsonLd(html) {
  const scripts = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const raw = m[1].trim();
    // Some sites include multiple JSON objects separated—try to parse robustly
    try {
      // If it's an array, great; if it's an object, wrap it
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) scripts.push(...parsed);
      else scripts.push(parsed);
    } catch {
      // Try line-by-line fallback (rare)
      try {
        const safe = raw.replace(/<\/?[^>]+(>|$)/g, "");
        const parsed = JSON.parse(safe);
        if (Array.isArray(parsed)) scripts.push(...parsed);
        else scripts.push(parsed);
      } catch {
        scripts.push({ __parseError: true, __raw: raw.slice(0, 120) + "..." });
      }
    }
  }
  return scripts;
}

function asArray(x) { return Array.isArray(x) ? x : (x != null ? [x] : []); }
function typesFrom(obj) { return asArray(obj["@type"]).map(String); }

if (!fs.existsSync(DIST_DIR)) {
  console.error(`❌ Build folder not found: ${DIST_DIR}\nRun: npm run build`);
  process.exit(1);
}

const files = collectHtmlFiles(DIST_DIR);
let pagesWithLd = 0;
let totalLdBlocks = 0;
let failures = 0;

console.log(`Scanning ${files.length} HTML files in "${DIST_DIR}"...\n`);

for (const file of files) {
  const html = fs.readFileSync(file, "utf8");
  const blocks = extractJsonLd(html);
  totalLdBlocks += blocks.length;
  const allTypes = new Set(blocks.flatMap(typesFrom));

  const rel = file.replace(/^dist[\\/]/, "");
  const hasAny = blocks.length > 0;
  if (hasAny) pagesWithLd++;

  // Determine missing required types (if any were requested)
  const missing = [];
  for (const t of REQUIRE) {
    // Map friendly names to expected schema types
    const wanted =
      t.toLowerCase() === "article" ? "Article" :
      t.toLowerCase() === "faq" ? "FAQPage" :
      t; // pass-through for MedicalCondition, MedicalDevice, etc.

    if (![...allTypes].some(x => x.toLowerCase() === wanted.toLowerCase())) {
      missing.push(wanted);
    }
  }

  const status =
    !hasAny ? "NO-LD" :
    missing.length ? `MISSING: ${missing.join(", ")}` :
    "OK";

  const typeList = [...allTypes].join(", ") || "—";
  console.log(`${status.padEnd(16)}  ${rel}  [types: ${typeList}]`);

  if ((!hasAny || missing.length) && FAIL) failures++;
}

console.log(`\nSummary: ${pagesWithLd}/${files.length} pages have JSON-LD, ${totalLdBlocks} JSON-LD block(s) total.`);
if (FAIL && failures) {
  console.error(`❌ ${failures} page(s) failed required-type check.`);
  process.exit(1);
} else if (FAIL) {
  console.log("✅ All pages satisfy required types.");
}
