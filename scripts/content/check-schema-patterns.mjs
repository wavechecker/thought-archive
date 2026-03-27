/**
 * check-schema-patterns.mjs
 * Checks for trailing-slash and trailing-hash hygiene on internal links.
 *
 * Autofixes (safe, non-breaking):
 *   - Trailing slash:  [text](/guides/foo/)  →  [text](/guides/foo)
 *   - Trailing hash:   [text](/guides/foo#)  →  [text](/guides/foo)
 *
 * Why: astro.config.ts sets `trailingSlash: "never"`. Links with trailing
 * slashes cause a redirect on every click and may affect crawl budget.
 * Trailing hashes (#) with nothing after them serve no purpose.
 *
 * Usage:
 *   node scripts/content/check-schema-patterns.mjs          (check only)
 *   node scripts/content/check-schema-patterns.mjs --fix    (apply autofixes)
 */

import { readFileSync, writeFileSync } from "fs";
import { join, relative } from "path";
import { fileURLToPath } from "url";
import { globSync } from "glob";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");

// ---------------------------------------------------------------------------
// Patterns
// ---------------------------------------------------------------------------

// Matches an internal link URL with a trailing slash before the closing ")"
// e.g. [text](/guides/foo/) or [text](/posts/bar/)
const RE_TRAILING_SLASH = /(\]\(\/(?:guides|posts|resources)\/[a-z0-9][a-z0-9/-]*)\/(\))/g;

// Matches an internal link URL with a bare trailing hash (no fragment after #)
// e.g. [text](/guides/foo#)
const RE_TRAILING_HASH = /(\]\(\/(?:guides|posts|resources)\/[a-z0-9][a-z0-9/-]*)#(\))/g;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns the character index where the document body begins (after frontmatter). */
function bodyStart(content) {
  if (!content.startsWith("---")) return 0;
  const closeDelim = content.indexOf("\n---", 3);
  if (closeDelim === -1) return 0;
  const afterDelim = content.indexOf("\n", closeDelim + 1);
  return afterDelim === -1 ? content.length : afterDelim + 1;
}

/** Returns 1-based line number for a character offset in `content`. */
function lineOf(content, index) {
  return content.slice(0, index).split("\n").length;
}

// ---------------------------------------------------------------------------
// Core check — exported for use by preflight.mjs
// ---------------------------------------------------------------------------
export function checkSchemaPatterns(files, { fix = false } = {}) {
  const findings = [];

  for (const { filePath } of files) {
    const raw = readFileSync(filePath, "utf8");
    const rel = relative(REPO_ROOT, filePath).replace(/\\/g, "/");
    const start = bodyStart(raw);
    const body = raw.slice(start);

    // Reset lastIndex before each matchAll call (global regex state)
    RE_TRAILING_SLASH.lastIndex = 0;
    RE_TRAILING_HASH.lastIndex = 0;

    const slashMatches = [...body.matchAll(RE_TRAILING_SLASH)];
    const hashMatches = [...body.matchAll(RE_TRAILING_HASH)];

    for (const m of slashMatches) {
      const absIndex = start + m.index;
      findings.push({
        type: "autofix",
        file: rel,
        line: lineOf(raw, absIndex),
        message: `Trailing slash in internal link → "${m[1].replace("](", "")}/" should be "${m[1].replace("](", "")}"`,
      });
    }

    for (const m of hashMatches) {
      const absIndex = start + m.index;
      findings.push({
        type: "autofix",
        file: rel,
        line: lineOf(raw, absIndex),
        message: `Trailing hash in internal link — bare "#" with no fragment`,
      });
    }

    // Apply autofixes when --fix is passed
    if (fix && (slashMatches.length > 0 || hashMatches.length > 0)) {
      RE_TRAILING_SLASH.lastIndex = 0;
      RE_TRAILING_HASH.lastIndex = 0;
      const fixed = body
        .replace(RE_TRAILING_SLASH, "$1$2")
        .replace(RE_TRAILING_HASH, "$1$2");
      writeFileSync(filePath, raw.slice(0, start) + fixed, "utf8");
    }
  }

  return findings;
}

// ---------------------------------------------------------------------------
// Standalone runner
// ---------------------------------------------------------------------------
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const fix = process.argv.includes("--fix");
  const CONTENT_ROOT = join(REPO_ROOT, "src", "content");
  const files = [];
  for (const col of ["guides", "posts"]) {
    const dir = join(CONTENT_ROOT, col);
    for (const f of globSync(`${dir}/**/*.{md,mdx}`, { nodir: true })) {
      files.push({ filePath: f, collection: col });
    }
  }
  const findings = checkSchemaPatterns(files, { fix });
  console.log(`Schema pattern findings: ${findings.length}${fix ? " (autofixes applied)" : ""}`);
  for (const f of findings) {
    console.log(`  [AUTOFIX] [line ${f.line}] ${f.file}\n    ${f.message}`);
  }
  process.exit(0); // autofixes are never blocking
}
