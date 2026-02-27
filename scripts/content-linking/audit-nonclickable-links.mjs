/**
 * audit-nonclickable-links.mjs
 * Scans src/content/guides and src/content/posts for list items
 * inside "## Further Reading" and "## Related Guides" sections that
 * are NOT proper Markdown links [text](href).
 *
 * Outputs:
 *   scripts/content-linking/reports/link-audit.json
 *   scripts/content-linking/reports/link-audit.md
 *   Console summary
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, relative } from "path";
import { fileURLToPath } from "url";
import { globSync } from "glob";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------
const __dirname = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");
const CONTENT_ROOT = join(REPO_ROOT, "src", "content");
const REPORTS_DIR = join(__dirname, "reports");

mkdirSync(REPORTS_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// Section heading patterns
// ---------------------------------------------------------------------------
const SECTION_PATTERNS = [
  { heading: /^##\s+Further Reading\s*$/i,   label: "Further Reading" },
  { heading: /^##\s+Related Guides?\s*$/i,   label: "Related Guides" },
  { heading: /^##\s+Related\s*$/i,           label: "Related Guides" },
];

// ---------------------------------------------------------------------------
// Classification helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if the line is already a Markdown link (contains "](").
 */
function isMarkdownLink(line) {
  return line.includes("](");
}

/**
 * Classify a list-item line from a "Related Guides" section.
 * Returns a classification string or null if it looks clean.
 */
function classifyRelated(line) {
  if (isMarkdownLink(line)) return null;

  const stripped = line.replace(/^[-*+]\s*/, "");

  if (/^\/(guides|posts)\//.test(stripped)) return "internal-path";
  if (/^https?:\/\//i.test(stripped)) return "bare-url";
  if (/\bhttps?:\/\//i.test(stripped)) return "bare-url";

  return null;
}

/**
 * Classify a list-item line from a "Further Reading" section.
 * Returns a classification string or null if it looks clean.
 */
function classifyFurther(line) {
  if (isMarkdownLink(line)) return null;

  const stripped = line.replace(/^[-*+]\s*/, "");

  // bare http/https URL anywhere in the text (not wrapped in [](…))
  if (/https?:\/\//i.test(stripped)) return "bare-url";

  // domain in parentheses: (cdc.gov), (health.gov.au), (who.int), etc.
  if (/\(\s*[a-z0-9-]+\.[a-z]{2,}(?:\.[a-z]{2,})?\s*\)/i.test(stripped))
    return "domain-in-parens";

  // bare www. reference
  if (/\bwww\./i.test(stripped)) return "bare-url";

  // looks like it contains a .gov .org .edu .net .io domain word
  if (
    /\b[a-z0-9-]+\.(gov|org|edu|net|io|com|au|uk|ca|nz)\b/i.test(stripped) &&
    !stripped.startsWith("[")
  )
    return "domain-in-parens";

  return null;
}

// ---------------------------------------------------------------------------
// Parse a single file → array of findings
// ---------------------------------------------------------------------------
function auditFile(filePath, collection) {
  const content = readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  const findings = [];

  let currentSection = null; // "Further Reading" | "Related Guides" | null
  let inFrontmatter = false;
  let frontmatterDone = false;
  let fmDelimCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trimEnd();

    // Skip frontmatter block (--- delimiters)
    if (!frontmatterDone) {
      if (line === "---") {
        fmDelimCount++;
        if (fmDelimCount === 1) { inFrontmatter = true; continue; }
        if (fmDelimCount === 2) { inFrontmatter = false; frontmatterDone = true; continue; }
      }
      if (inFrontmatter) continue;
    }

    // Check for a new ## heading
    if (/^##\s/.test(line)) {
      currentSection = null;
      for (const p of SECTION_PATTERNS) {
        if (p.heading.test(line)) {
          currentSection = p.label;
          break;
        }
      }
      continue;
    }

    // Any deeper heading resets the section
    if (/^#{1,6}\s/.test(line)) {
      currentSection = null;
      continue;
    }

    if (!currentSection) continue;

    // Only care about list items
    if (!/^[-*+]\s/.test(line)) continue;

    let classification = null;
    if (currentSection === "Further Reading") {
      classification = classifyFurther(line);
    } else {
      // Related Guides
      classification = classifyRelated(line);
    }

    if (classification) {
      findings.push({
        filePath: relative(REPO_ROOT, filePath).replace(/\\/g, "/"),
        collection,
        section: currentSection,
        lineNumber: i + 1,
        line: line,
        classification,
      });
    }
  }

  return findings;
}

// ---------------------------------------------------------------------------
// Scan all files
// ---------------------------------------------------------------------------
const COLLECTIONS = ["guides", "posts"];
const allFindings = [];

for (const col of COLLECTIONS) {
  const dir = join(CONTENT_ROOT, col);
  const files = globSync(`${dir}/**/*.{md,mdx}`, { nodir: true });
  for (const f of files) {
    const found = auditFile(f, col);
    allFindings.push(...found);
  }
}

// ---------------------------------------------------------------------------
// Group by file for reporting
// ---------------------------------------------------------------------------
const byFile = {};
for (const f of allFindings) {
  if (!byFile[f.filePath]) byFile[f.filePath] = [];
  byFile[f.filePath].push(f);
}

const affectedFiles = Object.keys(byFile);

// Totals
const totalsBySection = {};
const totalsByCollection = {};
for (const f of allFindings) {
  totalsBySection[f.section] = (totalsBySection[f.section] || 0) + 1;
  totalsByCollection[f.collection] = (totalsByCollection[f.collection] || 0) + 1;
}

// Top files by issue count
const top20 = affectedFiles
  .map((fp) => ({ filePath: fp, count: byFile[fp].length }))
  .sort((a, b) => b.count - a.count)
  .slice(0, 20);

// ---------------------------------------------------------------------------
// A) Write JSON report
// ---------------------------------------------------------------------------
const jsonReport = {
  generatedAt: new Date().toISOString(),
  totalFindings: allFindings.length,
  affectedFiles: affectedFiles.length,
  totalsBySection,
  totalsByCollection,
  findings: allFindings,
};

writeFileSync(
  join(REPORTS_DIR, "link-audit.json"),
  JSON.stringify(jsonReport, null, 2),
  "utf8"
);

// ---------------------------------------------------------------------------
// B) Write Markdown report
// ---------------------------------------------------------------------------
const lines30 = allFindings.slice(0, 30);

let md = `# Non-Clickable Link Audit

Generated: ${new Date().toISOString()}

## Summary

| Metric | Count |
|--------|-------|
| Total findings | ${allFindings.length} |
| Affected files | ${affectedFiles.length} |

### By Section

| Section | Findings |
|---------|---------|
${Object.entries(totalsBySection)
  .sort((a, b) => b[1] - a[1])
  .map(([s, n]) => `| ${s} | ${n} |`)
  .join("\n")}

### By Collection

| Collection | Findings |
|-----------|---------|
${Object.entries(totalsByCollection)
  .sort((a, b) => b[1] - a[1])
  .map(([c, n]) => `| ${c} | ${n} |`)
  .join("\n")}

## Top 20 Files with Most Issues

| File | Issues |
|------|--------|
${top20.map((x) => `| \`${x.filePath}\` | ${x.count} |`).join("\n")}

## First 30 Example Findings

`;

for (const f of lines30) {
  md += `### \`${f.filePath}\` (line ${f.lineNumber})\n`;
  md += `- **Section:** ${f.section}  \n`;
  md += `- **Classification:** ${f.classification}  \n`;
  md += `- **Line:** \`${f.line.trim()}\`\n\n`;
}

writeFileSync(join(REPORTS_DIR, "link-audit.md"), md, "utf8");

// ---------------------------------------------------------------------------
// C) Console summary
// ---------------------------------------------------------------------------
console.log("\n========================================");
console.log("  Non-Clickable Link Audit — Summary");
console.log("========================================");
console.log(`Total affected files : ${affectedFiles.length}`);
console.log(`Total findings       : ${allFindings.length}`);
console.log("\nBreakdown by section:");
for (const [section, count] of Object.entries(totalsBySection).sort(
  (a, b) => b[1] - a[1]
)) {
  console.log(`  ${section.padEnd(20)} ${count}`);
}
console.log("\nBreakdown by collection:");
for (const [col, count] of Object.entries(totalsByCollection).sort(
  (a, b) => b[1] - a[1]
)) {
  console.log(`  ${col.padEnd(20)} ${count}`);
}

// Shingles guide spotlight
const shinglesPath = "src/content/guides/shingles-vaccine-adults.mdx";
const shinglesFindings = allFindings.filter((f) =>
  f.filePath.endsWith("shingles-vaccine-adults.mdx")
);
console.log("\n--- shingles-vaccine-adults.mdx ---");
if (shinglesFindings.length === 0) {
  console.log("  No issues found.");
} else {
  console.log(`  ${shinglesFindings.length} finding(s):`);
  for (const f of shinglesFindings) {
    console.log(`  [line ${f.lineNumber}] [${f.section}] [${f.classification}]`);
    console.log(`    ${f.line.trim()}`);
  }
}

console.log(
  `\nReports written to:\n  scripts/content-linking/reports/link-audit.json\n  scripts/content-linking/reports/link-audit.md`
);
console.log("========================================\n");
