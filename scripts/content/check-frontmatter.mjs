/**
 * check-frontmatter.mjs
 * Validates frontmatter fields for guides and posts.
 *
 * Hard errors:
 *   - guides/posts/resources: missing or unparseable publishDate
 *   - guides: missing category, or category not in GUIDE_CATEGORIES enum
 *   - posts: category present but not in POST_CATEGORIES enum
 *
 * Warnings:
 *   - guides/posts: missing description
 *
 * Usage (standalone):
 *   node scripts/content/check-frontmatter.mjs
 */

import { readFileSync } from "fs";
import { join, relative } from "path";
import { fileURLToPath } from "url";
import matter from "gray-matter";
import { globSync } from "glob";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");

// ---------------------------------------------------------------------------
// Category enums — mirrored from src/content/config.ts
// ---------------------------------------------------------------------------
const GUIDE_CATEGORIES = new Set([
  "Emergencies",
  "Infectious Diseases",
  "Vaccination",
  "Heart & Circulation",
  "Women's Health",
  "Diabetes",
  "Cancer",
  "Neurology",
  "Mental Health",
  "General Health",
  "End of Life",
  "Child & Adolescent Health",
  "Obesity & Metabolic Health Hub",
  "Men's Health",
  "Aging & Longevity",
  "Guide Hubs",
  "Respiratory",
  "AI in Health",
]);

const POST_CATEGORIES = new Set([
  "AI & Society",
  "Health & Policy",
  "Opinion",
  "Posts",
  "Public Health",
  "Relationships",
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function isValidIsoDate(val) {
  if (val instanceof Date) return !Number.isNaN(val.getTime());
  if (typeof val === "string") return !Number.isNaN(Date.parse(val));
  return false;
}

function displayDate(val) {
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  return String(val);
}

// ---------------------------------------------------------------------------
// Core check — exported for use by preflight.mjs
// ---------------------------------------------------------------------------
export function checkFrontmatter(files) {
  const findings = [];

  for (const { filePath, collection } of files) {
    const raw = readFileSync(filePath, "utf8");
    const rel = relative(REPO_ROOT, filePath).replace(/\\/g, "/");
    let fm;
    try {
      fm = matter(raw).data;
    } catch (err) {
      findings.push({
        type: "error",
        file: rel,
        line: 1,
        message: `YAML parse error: ${err.message}`,
      });
      continue;
    }

    // --- publishDate: required for guides, posts, resources ---
    if (
      collection === "guides" ||
      collection === "posts" ||
      collection === "resources"
    ) {
      const pd = fm.publishDate;
      if (pd === undefined || pd === null || pd === "") {
        findings.push({
          type: "error",
          file: rel,
          line: null,
          message: "Missing required field: publishDate",
        });
      } else if (!isValidIsoDate(pd)) {
        findings.push({
          type: "error",
          file: rel,
          line: null,
          message: `Invalid publishDate: "${displayDate(pd)}" — expected ISO YYYY-MM-DD`,
        });
      }
    }

    // --- category: required + enum-locked for guides ---
    if (collection === "guides") {
      if (!fm.category) {
        findings.push({
          type: "error",
          file: rel,
          line: null,
          message: "Missing required field: category",
        });
      } else if (!GUIDE_CATEGORIES.has(fm.category)) {
        findings.push({
          type: "error",
          file: rel,
          line: null,
          message: `Invalid category: "${fm.category}"\n           Valid values: ${[...GUIDE_CATEGORIES].join(", ")}`,
        });
      }
    }

    // --- category: optional but enum-locked for posts ---
    if (
      collection === "posts" &&
      fm.category !== undefined &&
      fm.category !== null
    ) {
      if (!POST_CATEGORIES.has(fm.category)) {
        findings.push({
          type: "error",
          file: rel,
          line: null,
          message: `Invalid category: "${fm.category}"\n           Valid values: ${[...POST_CATEGORIES].join(", ")}`,
        });
      }
    }

    // --- description: warning for guides and posts ---
    if (
      (collection === "guides" || collection === "posts") &&
      !fm.description
    ) {
      findings.push({
        type: "warning",
        file: rel,
        line: null,
        message: "Missing description (recommended for SEO and JSON-LD)",
      });
    }
  }

  return findings;
}

// ---------------------------------------------------------------------------
// Standalone runner
// ---------------------------------------------------------------------------
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const CONTENT_ROOT = join(REPO_ROOT, "src", "content");
  const files = [];
  for (const col of ["guides", "posts"]) {
    const dir = join(CONTENT_ROOT, col);
    for (const f of globSync(`${dir}/**/*.{md,mdx}`, { nodir: true })) {
      files.push({ filePath: f, collection: col });
    }
  }
  const findings = checkFrontmatter(files);
  const errors   = findings.filter((f) => f.type === "error");
  const warnings = findings.filter((f) => f.type === "warning");
  console.log(`Errors: ${errors.length}  Warnings: ${warnings.length}`);
  for (const f of findings) {
    const loc = f.line ? `[line ${f.line}] ` : "";
    console.log(`  [${f.type.toUpperCase()}] ${loc}${f.file}\n    ${f.message}`);
  }
  process.exit(errors.length > 0 ? 1 : 0);
}
