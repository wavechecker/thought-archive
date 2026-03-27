/**
 * check-links.mjs
 * Detects bare (non-clickable) internal links in the document body.
 *
 * Hard errors:
 *   - /guides/... or /posts/... appearing outside of a proper [text](url) link
 *     Examples that fail:
 *       [/guides/foo]                  ← text is the path, no URL
 *       👉 Read more: /guides/foo      ← bare path in prose
 *       - /guides/foo                  ← bare path in a list item
 *     Examples that pass:
 *       [Some Title](/guides/foo)      ← proper link
 *       [foo](/posts/bar)              ← proper link
 *
 * Note: "Further Reading" / "Related Guides" sections are already covered by
 *   scripts/content-linking/audit-nonclickable-links.mjs — this script checks
 *   the full body so bare paths in prose are also caught.
 *
 * Usage (standalone):
 *   node scripts/content/check-links.mjs
 */

import { readFileSync } from "fs";
import { join, relative } from "path";
import { fileURLToPath } from "url";
import { globSync } from "glob";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns the line index (0-based) of the first body line after frontmatter. */
function bodyStartLine(lines) {
  if (lines[0]?.trimEnd() !== "---") return 0;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i]?.trimEnd() === "---") return i + 1;
  }
  return 0;
}

/**
 * Returns true if the line is inside a fenced code block boundary.
 * Tracked externally via the `inFence` flag passed in/out.
 */
function isFenceDelimiter(line) {
  return /^(`{3,}|~{3,})/.test(line.trimStart());
}

// ---------------------------------------------------------------------------
// Core check — exported for use by preflight.mjs
// ---------------------------------------------------------------------------
export function checkLinks(files) {
  const findings = [];

  for (const { filePath } of files) {
    const raw = readFileSync(filePath, "utf8");
    const lines = raw.split("\n");
    const startLine = bodyStartLine(lines);
    const rel = relative(REPO_ROOT, filePath).replace(/\\/g, "/");

    let inCodeFence = false;

    for (let i = startLine; i < lines.length; i++) {
      const line = lines[i];

      // Track fenced code blocks so we skip their content
      if (isFenceDelimiter(line)) {
        inCodeFence = !inCodeFence;
        continue;
      }
      if (inCodeFence) continue;

      // Find all occurrences of /guides/... or /posts/... in this line.
      // We use a global regex and check each match's context.
      //
      // Regex explained — negative lookbehind (?<![a-zA-Z0-9."'(/]):
      //   a-zA-Z0-9.   hostname chars  — skips https://patientguide.io/guides/foo
      //   (            open-paren      — skips [text](/guides/foo)  (proper link)
      //   /            slash           — skips paths already mid-segment
      //   " and '      quote chars     — skips paths inside attribute/field values:
      //                                    "item": "/guides/foo"       (JSON-LD)
      //                                    href="/guides/foo"          (HTML attr)
      //                                    url: "/guides/ai-in-health" (JSX prop)
      //                                    canonicalPath="/guides/foo" (JSX prop)
      //                                    "@id": "/posts/foo"         (JSON-LD)
      //
      // Still caught (not preceded by any of the above):
      //   [/guides/foo]              ← "[" before /  — real error
      //   👉 Read more: /guides/foo  ← " " before /  — real error
      //   - /guides/foo              ← " " before /  — real error
      const re = /(?<![a-zA-Z0-9."'(/])\/(guides|posts)\/([a-z0-9][a-z0-9-]*)/g;
      let m;
      while ((m = re.exec(line)) !== null) {
        const path = m[0]; // e.g. "/guides/foo"
        findings.push({
          type: "error",
          file: rel,
          line: i + 1,
          message: `Bare internal path "${path}" — wrap in a Markdown link: [Page Title](${path})`,
        });
      }
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
  const findings = checkLinks(files);
  console.log(`Bare internal link findings: ${findings.length}`);
  for (const f of findings) {
    console.log(`  [line ${f.line}] ${f.file}\n    ${f.message}`);
  }
  process.exit(findings.length > 0 ? 1 : 0);
}
