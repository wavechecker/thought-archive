/**
 * fix-nonclickable-links.mjs
 *
 * Reads link-audit.json and link-mappings.json, then patches every
 * flagged line in src/content/guides and src/content/posts so that
 * all "Further Reading" and "Related Guides" bullets become proper
 * Markdown links.
 *
 * Rules:
 *   - internal-path  → [ResolvedTitle](/guides/foo)
 *   - domain-in-parens → check link-mappings → [label](url) or TODO prefix
 *   - bare-url with label+url → [label](url)  (URL already explicit in text)
 *   - bare-url only URL → check link-mappings → [label](url) or TODO prefix
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { globSync } from "glob";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------
const __dirname = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");
const CONTENT_ROOT = join(REPO_ROOT, "src", "content");
const REPORTS_DIR = join(__dirname, "reports");

// ---------------------------------------------------------------------------
// Load data files
// ---------------------------------------------------------------------------
const audit = JSON.parse(
  readFileSync(join(REPORTS_DIR, "link-audit.json"), "utf8")
);
const linkMappings = JSON.parse(
  readFileSync(join(__dirname, "link-mappings.json"), "utf8")
);

// ---------------------------------------------------------------------------
// Build title map  /guides/<slug> → title  and  /posts/<slug> → title
// Uses frontmatter `slug` field when present, otherwise the filename stem.
// ---------------------------------------------------------------------------
function parseFrontmatterTitle(content) {
  const match = content.match(/^---[\r\n]([\s\S]*?)[\r\n]---/);
  if (!match) return {};
  const yaml = match[1];
  // Extract title and slug via simple line-by-line parsing (YAML values may be quoted)
  let title = null;
  let slug = null;
  for (const line of yaml.split(/\r?\n/)) {
    const tMatch = line.match(/^title:\s*"?([^"]+)"?\s*$/);
    if (tMatch) title = tMatch[1].replace(/^["']|["']$/g, "").trim();
    const sMatch = line.match(/^slug:\s*"?([^"]+)"?\s*$/);
    if (sMatch) slug = sMatch[1].replace(/^["']|["']$/g, "").trim();
  }
  return { title, slug };
}

const titleMap = {}; // "/guides/foo" → "Title"

for (const col of ["guides", "posts"]) {
  const dir = join(CONTENT_ROOT, col);
  const files = globSync(`${dir}/**/*.{md,mdx}`, { nodir: true });
  for (const f of files) {
    const content = readFileSync(f, "utf8");
    const { title, slug } = parseFrontmatterTitle(content);
    // Derive stem from filename
    const stem = f.replace(/\\/g, "/").split("/").pop().replace(/\.(md|mdx)$/, "");
    const resolvedSlug = slug || stem;
    if (title) {
      titleMap[`/${col}/${resolvedSlug}`] = title;
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Try to extract { label, url } from a bare-url line that has "label: URL"
 *  or "label — URL" or "label — label — URL" patterns.
 *  Returns null if the content is ONLY a URL (no label).
 */
function tryExtractLabelAndUrl(stripped) {
  const idx = stripped.indexOf("https://");
  if (idx === -1) return null;

  const url = stripped.slice(idx).trim();
  const before = stripped.slice(0, idx);

  // Trim common separators from the end of the label part:
  // colon, space, em-dash (—, –), regular dash
  const label = before.replace(/[\s:–—\-]+$/u, "").trim();

  if (!label) return null; // pure URL line
  return { label, url };
}

/** Strip trailing domain parenthesis from a domain-in-parens label.
 *  "NHS — diabetes (nhs.uk)" → "NHS — diabetes"
 */
function stripDomainParens(text) {
  return text.replace(/\s*\([^)]*\)\s*$/, "").trim();
}

/** Compute the fixed replacement line (or null to leave unchanged). */
function computeFix(finding, currentLine) {
  // Already a proper Markdown link → skip
  if (currentLine.includes("](")) return null;

  // Isolate list marker + indentation  e.g. "- " or "  - "
  const markerMatch = currentLine.match(/^(\s*[-*+]\s)/);
  if (!markerMatch) return null;
  const marker = markerMatch[1];

  const afterMarker = currentLine.slice(marker.length);
  const stripped = afterMarker.trimEnd();
  const trailing = afterMarker.slice(stripped.length); // trailing whitespace / line breaks

  // ---- A) Related Guides / internal-path --------------------------------
  if (
    finding.section === "Related Guides" &&
    finding.classification === "internal-path"
  ) {
    const path = stripped.trim();
    const title = titleMap[path];
    const displayText = title || path; // fallback: use path as text
    return `${marker}[${displayText}](${path})${trailing}`;
  }

  // ---- B) Further Reading / bare-url ------------------------------------
  if (finding.classification === "bare-url") {
    // Sub-case 1: line has an explicit label + URL
    const extracted = tryExtractLabelAndUrl(stripped);
    if (extracted) {
      return `${marker}[${extracted.label}](${extracted.url})${trailing}`;
    }

    // Sub-case 2: bare URL only — check link-mappings first
    for (const mapping of linkMappings.contains) {
      if (stripped.includes(mapping.match)) {
        return `${marker}[${mapping.match}](${mapping.url})${trailing}`;
      }
    }

    // No mapping → TODO prefix
    return `${marker}TODO: ${stripped}${trailing}`;
  }

  // ---- C) Further Reading / domain-in-parens ----------------------------
  if (finding.classification === "domain-in-parens") {
    // Try link-mappings (substring containment on the full line text)
    for (const mapping of linkMappings.contains) {
      if (stripped.includes(mapping.match)) {
        const label = stripDomainParens(stripped);
        return `${marker}[${label}](${mapping.url})${trailing}`;
      }
    }

    // No mapping → TODO prefix
    return `${marker}TODO: ${stripped}${trailing}`;
  }

  return null; // unknown classification — leave unchanged
}

// ---------------------------------------------------------------------------
// Group findings by file and apply fixes
// ---------------------------------------------------------------------------
const findingsByFile = {};
for (const f of audit.findings) {
  if (!findingsByFile[f.filePath]) findingsByFile[f.filePath] = [];
  findingsByFile[f.filePath].push(f);
}

const stats = {
  filesModified: 0,
  linesConverted: 0,
  linesTodo: 0,
  linesSkipped: 0,
  details: [],
};

for (const [relPath, fileFindings] of Object.entries(findingsByFile)) {
  const absPath = join(REPO_ROOT, relPath);
  const content = readFileSync(absPath, "utf8");
  const lines = content.split("\n");
  let fileChanged = false;

  for (const finding of fileFindings) {
    const lineIdx = finding.lineNumber - 1;
    if (lineIdx < 0 || lineIdx >= lines.length) {
      console.warn(`  WARN: line ${finding.lineNumber} out of range in ${relPath}`);
      stats.linesSkipped++;
      continue;
    }

    const currentLine = lines[lineIdx];

    // Sanity-check: stored line should appear in the current line
    // (trim both to guard against trailing-whitespace drift)
    if (!currentLine.includes(finding.line.trim().replace(/^[-*+]\s*/, ""))) {
      console.warn(
        `  WARN: line ${finding.lineNumber} content mismatch in ${relPath}\n` +
          `    expected: ${finding.line}\n` +
          `    actual  : ${currentLine}`
      );
      stats.linesSkipped++;
      continue;
    }

    const fixed = computeFix(finding, currentLine);

    if (fixed === null) {
      stats.linesSkipped++;
      continue;
    }

    const isTodo = fixed.includes("TODO:");
    lines[lineIdx] = fixed;
    fileChanged = true;

    if (isTodo) {
      stats.linesTodo++;
      stats.details.push({ file: relPath, line: finding.lineNumber, action: "TODO", text: fixed.trim() });
    } else {
      stats.linesConverted++;
      stats.details.push({ file: relPath, line: finding.lineNumber, action: "converted", text: fixed.trim() });
    }
  }

  if (fileChanged) {
    writeFileSync(absPath, lines.join("\n"), "utf8");
    stats.filesModified++;
  }
}

// ---------------------------------------------------------------------------
// Console report
// ---------------------------------------------------------------------------
console.log("\n========================================");
console.log("  fix-nonclickable-links — Results");
console.log("========================================");
console.log(`Files modified  : ${stats.filesModified}`);
console.log(`Lines converted : ${stats.linesConverted}`);
console.log(`Lines → TODO    : ${stats.linesTodo}`);
console.log(`Lines skipped   : ${stats.linesSkipped}`);

console.log("\nConverted lines:");
for (const d of stats.details.filter((d) => d.action === "converted")) {
  console.log(`  [${d.file}:${d.line}] ${d.text}`);
}

console.log("\nTODO lines:");
for (const d of stats.details.filter((d) => d.action === "TODO")) {
  console.log(`  [${d.file}:${d.line}] ${d.text}`);
}
console.log("========================================\n");
