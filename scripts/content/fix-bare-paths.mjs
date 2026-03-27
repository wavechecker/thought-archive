#!/usr/bin/env node
/**
 * fix-bare-paths.mjs
 * Conservative autofix: replace bare internal paths in PROSE with proper Markdown links.
 * Skips: JSON-LD, HTML/JSX attributes, unknown slugs, paths to non-existent files.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../');
const DRY_RUN = !process.argv.includes('--fix');

// ── Build slug → title map ────────────────────────────────────────────────────
function extractTitle(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    // Match title in frontmatter (handles quotes and multiline '>-' block scalars)
    const m = content.match(/^---[\s\S]*?^title:\s*["']?(.+?)["']?\s*$/m);
    if (!m) return null;
    const val = m[1].trim();
    if (val === '>-' || val === '>' || val === '|') return null; // block scalar
    return val;
  } catch { return null; }
}

function buildTitleMap() {
  const map = {};
  for (const [dir, prefix] of [
    ['src/content/guides', '/guides/'],
    ['src/content/posts', '/posts/'],
  ]) {
    const fullDir = path.join(ROOT, dir);
    if (!fs.existsSync(fullDir)) continue;
    for (const f of fs.readdirSync(fullDir)) {
      if (!/\.(md|mdx)$/.test(f)) continue;
      const slug = f.replace(/\.(md|mdx)$/, '');
      const title = extractTitle(path.join(fullDir, f));
      if (title) map[prefix + slug] = title;
    }
  }
  return map;
}

// ── Prose-safe bare path regex ────────────────────────────────────────────────
// Negative lookbehind excludes: alphanumeric, ., (, /, ", = (JSON/HTML attr chars)
// This prevents matching paths inside: href="...", "item": "...", canonicalPath="...", etc.
const BARE_PATH_RE = /(?<![a-zA-Z0-9."=(/])\/(guides|posts)\/([a-z0-9][a-z0-9-]*)/g;

// Lines to skip: those that appear to be in structured-data context
function isStructuredDataLine(line) {
  return (
    /"item"\s*:/.test(line) ||       // JSON-LD ListItem
    /"@id"\s*:/.test(line) ||        // JSON-LD @id
    /href\s*=\s*"/.test(line) ||     // HTML href
    /url\s*:\s*"/.test(line) ||      // JSX/JS url prop
    /canonicalPath\s*=/.test(line) || // MDX canonicalPath
    /\bitem\s*=/.test(line) ||       // JSX item=
    /"mainEntityOfPage"/.test(line)  // JSON-LD mainEntityOfPage
  );
}

// ── Process a single file ─────────────────────────────────────────────────────
function processFile(filePath, titleMap) {
  const rel = path.relative(ROOT, filePath).replace(/\\/g, '/');
  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split('\n');

  // Skip frontmatter
  let inFrontmatter = false;
  let frontmatterDone = false;
  let fmDelimiters = 0;

  // Track fenced code blocks
  let inCodeBlock = false;

  const fixes = [];
  const skipped = [];

  const newLines = lines.map((line, i) => {
    const lineNum = i + 1;

    // Frontmatter detection
    if (lineNum === 1 && line.trim() === '---') { inFrontmatter = true; fmDelimiters = 1; return line; }
    if (inFrontmatter) {
      if (line.trim() === '---' && fmDelimiters === 1) { inFrontmatter = false; frontmatterDone = true; fmDelimiters = 2; }
      return line;
    }
    if (!frontmatterDone && fmDelimiters < 2) return line;

    // Code block detection
    if (/^```|^~~~/.test(line.trim())) { inCodeBlock = !inCodeBlock; return line; }
    if (inCodeBlock) return line;

    // Skip structured-data lines
    if (isStructuredDataLine(line)) {
      // Check if line actually has a bare path
      if (BARE_PATH_RE.test(line)) {
        BARE_PATH_RE.lastIndex = 0;
        skipped.push({ lineNum, line: line.trim(), reason: 'structured-data' });
      }
      return line;
    }

    // Find all bare paths in this prose line
    BARE_PATH_RE.lastIndex = 0;
    let newLine = line;
    let hasMatch = false;
    let match;
    BARE_PATH_RE.lastIndex = 0;

    while ((match = BARE_PATH_RE.exec(line)) !== null) {
      const fullPath = '/' + match[1] + '/' + match[2];
      const title = titleMap[fullPath];

      if (!title) {
        skipped.push({ lineNum, fullPath, reason: 'no-title (missing file or unknown slug)' });
        continue;
      }

      hasMatch = true;
      fixes.push({ lineNum, from: fullPath, to: `[${title}](${fullPath})` });
    }

    if (hasMatch) {
      // Pass 1: Handle [/guides/slug] bracket pattern → [Title](/guides/slug)
      // Also consumes a trailing (/guides/slug) href when the label was already
      // a bare path, e.g. [/guides/foo](/guides/foo) → [Title](/guides/foo)
      // Without this, Pass 2 would leave an orphaned (/guides/foo) after the link.
      const BRACKETED_RE = /\[\/(guides|posts)\/([a-z0-9][a-z0-9-]*)\](?:\(\/(?:guides|posts)\/[a-z0-9][a-z0-9-]*\))?/g;
      newLine = newLine.replace(BRACKETED_RE, (match, collection, slug) => {
        const fullPath = '/' + collection + '/' + slug;
        const title = titleMap[fullPath];
        if (!title) return match;
        return `[${title}](${fullPath})`;
      });

      // Pass 2: Handle remaining plain bare paths in prose (not in attributes)
      BARE_PATH_RE.lastIndex = 0;
      newLine = newLine.replace(BARE_PATH_RE, (match, collection, slug) => {
        const fullPath = '/' + collection + '/' + slug;
        const title = titleMap[fullPath];
        if (!title) return match; // leave as-is if no title
        return `[${title}](${fullPath})`;
      });
    }

    return newLine;
  });

  if (fixes.length === 0) return { rel, fixes, skipped, changed: false };

  if (!DRY_RUN) {
    fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
  }

  return { rel, fixes, skipped, changed: true, newContent: newLines.join('\n') };
}

// ── Main ──────────────────────────────────────────────────────────────────────
const titleMap = buildTitleMap();

const contentFiles = [
  ...fs.readdirSync(path.join(ROOT, 'src/content/guides')).map(f => path.join(ROOT, 'src/content/guides', f)),
  ...fs.readdirSync(path.join(ROOT, 'src/content/posts')).map(f => path.join(ROOT, 'src/content/posts', f)),
].filter(f => /\.(md|mdx)$/.test(f));

let totalFixes = 0;
let totalSkipped = 0;
let changedFiles = [];
const allSkipped = [];

for (const filePath of contentFiles) {
  const result = processFile(filePath, titleMap);
  if (result.fixes.length > 0 || result.skipped.length > 0) {
    if (result.fixes.length > 0) {
      console.log(`\n✅ ${result.rel}`);
      for (const f of result.fixes) {
        console.log(`   [line ${String(f.lineNum).padStart(4)}]  ${f.from}  →  ${f.to}`);
      }
      totalFixes += result.fixes.length;
      if (result.changed) changedFiles.push(result.rel);
    }
    if (result.skipped.length > 0) {
      for (const s of result.skipped) {
        allSkipped.push({ file: result.rel, ...s });
      }
      totalSkipped += result.skipped.length;
    }
  }
}

console.log('\n' + '─'.repeat(70));
console.log(`\n📊 Summary:`);
console.log(`   Fixes applied : ${totalFixes}  (${DRY_RUN ? 'DRY RUN — no files written' : 'written to disk'})`);
console.log(`   Files changed : ${changedFiles.length}`);
console.log(`   Skipped       : ${totalSkipped}`);

if (changedFiles.length) {
  console.log('\n📝 Changed files:');
  for (const f of changedFiles) console.log('   ' + f);
}

if (allSkipped.length) {
  console.log('\n⚠️  Skipped (manual review needed):');
  const byReason = {};
  for (const s of allSkipped) {
    const key = s.reason;
    if (!byReason[key]) byReason[key] = [];
    byReason[key].push(s);
  }
  for (const [reason, items] of Object.entries(byReason)) {
    console.log(`\n  [${reason}]`);
    for (const s of items) {
      if (s.fullPath) {
        console.log(`    ${s.file}:${s.lineNum}  ${s.fullPath}`);
      } else {
        console.log(`    ${s.file}:${s.lineNum}  "${s.line?.slice(0, 80)}"`);
      }
    }
  }
}

if (DRY_RUN) {
  console.log('\n💡 Run with --fix to apply changes.');
}
