#!/usr/bin/env node
/**
 * preflight.mjs
 * Content preflight pipeline for patientguide.io
 *
 * Runs all content checks and reports findings by severity:
 *   ❌ errors   — hard failures; must be fixed before publishing
 *   ⚠️  warnings — quality issues; do not block publishing
 *   🔧 autofixes — safe structural fixes; applied with --fix
 *
 * Usage:
 *   node scripts/content/preflight.mjs                        (check all)
 *   node scripts/content/preflight.mjs --fix                  (check + apply autofixes)
 *   node scripts/content/preflight.mjs --collection guides    (guides only)
 *   node scripts/content/preflight.mjs --collection posts     (posts only)
 *   node scripts/content/preflight.mjs --file src/content/guides/foo.md  (single file)
 *
 * Exit codes:
 *   0 — no hard errors
 *   1 — one or more hard errors found
 *
 * npm scripts:
 *   npm run content:check
 *   npm run content:fix
 */

import { join, isAbsolute, relative } from "path";
import { fileURLToPath } from "url";
import { globSync } from "glob";

import { checkFrontmatter }    from "./check-frontmatter.mjs";
import { checkLinks }          from "./check-links.mjs";
import { checkFaq }            from "./check-faq.mjs";
import { checkSchemaPatterns } from "./check-schema-patterns.mjs";

const __dirname  = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT  = join(__dirname, "..", "..");
const CONTENT_ROOT = join(REPO_ROOT, "src", "content");

// ---------------------------------------------------------------------------
// CLI flags
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const FIX  = args.includes("--fix");

const collectionFlagIdx = args.findIndex((a) => a === "--collection");
const collectionArg = collectionFlagIdx !== -1 ? args[collectionFlagIdx + 1] : "all";
const COLLECTIONS = collectionArg === "all" ? ["guides", "posts"] : [collectionArg];

const fileFlagIdx = args.findIndex((a) => a === "--file");
const targetFile  = fileFlagIdx !== -1 ? args[fileFlagIdx + 1] : null;

// ---------------------------------------------------------------------------
// Collect files
// ---------------------------------------------------------------------------
let files;
let header;

if (targetFile) {
  const absPath = isAbsolute(targetFile) ? targetFile : join(process.cwd(), targetFile);
  const norm = absPath.replace(/\\/g, "/");
  const collection = norm.includes("/guides/") ? "guides"
    : norm.includes("/posts/")  ? "posts"
    : "guides";
  files  = [{ filePath: absPath, collection }];
  header = `\n🔍  Preflight (new file)  ·  ${relative(REPO_ROOT, absPath).replace(/\\/g, "/")}`;
} else {
  files = [];
  for (const col of COLLECTIONS) {
    const dir = join(CONTENT_ROOT, col);
    for (const f of globSync(`${dir}/**/*.{md,mdx}`, { nodir: true })) {
      files.push({ filePath: f, collection: col });
    }
  }
  header = `\n🔍  Preflight  ·  ${files.length} files  ·  [${COLLECTIONS.join(", ")}]${FIX ? "  ·  --fix" : ""}`;
}

// ---------------------------------------------------------------------------
// Run checks
// ---------------------------------------------------------------------------
console.log(header);
console.log("─".repeat(60));

const allFindings = [
  ...checkFrontmatter(files),
  ...checkLinks(files),
  ...checkFaq(files),
  ...checkSchemaPatterns(files, { fix: FIX }),
];

// ---------------------------------------------------------------------------
// Separate by severity
// ---------------------------------------------------------------------------
const errors    = allFindings.filter((f) => f.type === "error");
const warnings  = allFindings.filter((f) => f.type === "warning");
const autofixes = allFindings.filter((f) => f.type === "autofix");

// ---------------------------------------------------------------------------
// Print helpers
// ---------------------------------------------------------------------------
function printSection(label, icon, items) {
  if (items.length === 0) return;
  console.log(`\n${icon}  ${label} (${items.length})`);
  console.log("─".repeat(60));
  for (const f of items) {
    const loc = f.line != null ? `[line ${String(f.line).padStart(4)}]  ` : "            ";
    console.log(`  ${loc}${f.file}`);
    // Handle multi-line messages (e.g. "Valid values: …")
    const msgLines = f.message.split("\n");
    for (const ml of msgLines) console.log(`             ${ml}`);
    console.log();
  }
}

printSection("ERRORS",    "❌", errors);
printSection("WARNINGS",  "⚠️ ", warnings);
printSection("AUTOFIXES", "🔧", autofixes);

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log("═".repeat(60));
console.log(`  ❌  Errors    : ${errors.length}`);
console.log(`  ⚠️   Warnings  : ${warnings.length}`);
console.log(
  `  🔧  Autofixes : ${autofixes.length}${
    autofixes.length > 0 && !FIX ? "  (run --fix to apply)" : FIX ? "  ✓ applied" : ""
  }`
);
console.log("═".repeat(60));

if (errors.length > 0) {
  console.log("\n  Preflight FAILED — resolve errors before publishing.\n");
  process.exit(1);
} else {
  console.log(
    `\n  Preflight PASSED${warnings.length > 0 ? " (with warnings)" : ""}.\n`
  );
  process.exit(0);
}
