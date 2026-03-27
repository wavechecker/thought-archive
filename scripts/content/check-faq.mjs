/**
 * check-faq.mjs
 * Checks FAQ presence and minimum coverage in guides.
 *
 * Warnings (not hard errors — missing FAQ doesn't block publish):
 *   - Guide has no `faq` frontmatter array (or empty array)
 *   - Guide has fewer than 2 FAQ items
 *
 * FAQ items feed the JSON-LD FAQPage schema rendered by GuideLayout.astro,
 * so coverage matters for structured data quality.
 *
 * Usage (standalone):
 *   node scripts/content/check-faq.mjs
 */

import { readFileSync } from "fs";
import { join, relative } from "path";
import { fileURLToPath } from "url";
import matter from "gray-matter";
import { globSync } from "glob";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");

const MIN_FAQ_ITEMS = 2;

// ---------------------------------------------------------------------------
// Core check — exported for use by preflight.mjs
// ---------------------------------------------------------------------------
export function checkFaq(files) {
  const findings = [];

  for (const { filePath, collection } of files) {
    // FAQ is only expected on guides
    if (collection !== "guides") continue;

    const raw = readFileSync(filePath, "utf8");
    const rel = relative(REPO_ROOT, filePath).replace(/\\/g, "/");
    let fm;
    try {
      fm = matter(raw).data;
    } catch {
      continue; // YAML errors are already reported by check-frontmatter
    }

    const faq = fm.faq;

    if (!faq || !Array.isArray(faq) || faq.length === 0) {
      findings.push({
        type: "warning",
        file: rel,
        line: null,
        message:
          "No FAQ items in frontmatter — faq: [] feeds JSON-LD FAQPage schema in GuideLayout.astro",
      });
    } else if (faq.length < MIN_FAQ_ITEMS) {
      findings.push({
        type: "warning",
        file: rel,
        line: null,
        message: `Only ${faq.length} FAQ item — recommend at least ${MIN_FAQ_ITEMS} for FAQPage schema coverage`,
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
  for (const f of globSync(
    join(CONTENT_ROOT, "guides/**/*.{md,mdx}"),
    { nodir: true }
  )) {
    files.push({ filePath: f, collection: "guides" });
  }
  const findings = checkFaq(files);
  console.log(`FAQ findings: ${findings.length}`);
  for (const f of findings) {
    console.log(`  [WARNING] ${f.file}\n    ${f.message}`);
  }
  process.exit(0); // FAQ issues are warnings — never block
}
