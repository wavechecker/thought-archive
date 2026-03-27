#!/usr/bin/env node
/**
 * create-post.mjs
 * Scaffold a new post from the canonical template.
 *
 * Usage:
 *   node scripts/create-post.mjs "Title" [slug] [--category "Opinion"] [--tags a,b] [--draft false] [--updateDate] [--force]
 *
 *   slug defaults to slugified title.
 *
 * Examples:
 *   node scripts/create-post.mjs "The Real Cost of GLP-1 Dropout"
 *   node scripts/create-post.mjs "The Real Cost of GLP-1 Dropout" --category "Health & Policy" --tags glp-1,adherence
 *   npm run new:post -- "The Real Cost of GLP-1 Dropout" --category "Opinion"
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

// ---------------------------------------------------------------------------
// Category enum — must match POST_CATEGORY in src/content/config.ts exactly
// ---------------------------------------------------------------------------
const VALID_CATEGORIES = [
  "AI & Society",
  "Health & Policy",
  "Opinion",
  "Posts",
  "Public Health",
  "Relationships",
];

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------
const [, , titleArg, ...argv] = process.argv;

if (!titleArg || titleArg.startsWith("--")) {
  console.error(
    'Usage: node scripts/create-post.mjs "Title" [slug] [--category "Cat"] [--tags a,b] [--draft false] [--updateDate] [--force]'
  );
  process.exit(1);
}

// Pull optional positional slug before flags start
let explicitSlug = null;
let flagStart = 0;
if (argv[0] && !argv[0].startsWith("--")) {
  explicitSlug = argv[0];
  flagStart = 1;
}
const rest = argv.slice(flagStart);

const flags = {};
for (let i = 0; i < rest.length; i++) {
  const v = rest[i];
  if (v?.startsWith("--")) {
    const key = v.replace(/^--/, "");
    const next = rest[i + 1];
    if (next && !next.startsWith("--")) { flags[key] = next; i++; }
    else flags[key] = true;
  }
}

const title = titleArg.trim();

const slugify = (s) =>
  s.normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

const slug  = explicitSlug ? slugify(explicitSlug) : slugify(title);
const today = new Date().toISOString().slice(0, 10);

const category = typeof flags.category === "string" ? flags.category.trim() : null;
if (category && !VALID_CATEGORIES.includes(category)) {
  console.error(`\x1b[31mInvalid category:\x1b[0m "${category}"
Allowed post categories:
${VALID_CATEGORIES.map((c) => `  - ${c}`).join("\n")}`);
  process.exit(1);
}

const tags           = typeof flags.tags === "string" && flags.tags.trim()
  ? flags.tags.split(",").map((s) => s.trim()).filter(Boolean)
  : [];
const draft          = typeof flags.draft === "string" ? flags.draft.toLowerCase() === "true" : true;
const includeUpdated = !!flags.updateDate;
const force          = !!flags.force;

// ---------------------------------------------------------------------------
// File path
// ---------------------------------------------------------------------------
const dir  = path.join("src", "content", "posts");
const file = path.join(dir, `${slug}.md`);

if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
if (fs.existsSync(file) && !force) {
  console.error(`File already exists: ${file}\nUse --force to overwrite.`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Build content from canonical template
// ---------------------------------------------------------------------------
const TEMPLATE = path.join(__dirname, "templates", "post.template.md");
if (!fs.existsSync(TEMPLATE)) {
  console.error(`Template not found: ${TEMPLATE}`);
  process.exit(1);
}

const safeTitle = title.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

let content = fs.readFileSync(TEMPLATE, "utf8");

// Strip the template banner comment block (# ───... / comments / # ───... + blank line)
content = content.replace(
  /^# ─[^\n]*\n(?:# (?!─)[^\n]*\n)*# ─[^\n]*\n\n/m,
  ""
);

// Substitute frontmatter placeholders
content = content
  .replace('title: "Post Title"',       `title: "${safeTitle}"`)
  .replace('publishDate: "YYYY-MM-DD"', `publishDate: "${today}"`)
  .replace(/^draft: true$/m,            `draft: ${draft}`)
  .replace('tags: []',                  tags.length > 0
    ? `tags: [${tags.map((t) => `"${t}"`).join(", ")}]`
    : "tags: []");

// category: optional — uncomment and set the field + remove the helper comment lines
if (category) {
  content = content.replace(
    /^# category: "Opinion"\s+# Optional\. One of:\n(?:# \s+[^\n]*\n)+/m,
    `category: "${category}"\n`
  );
}

// updatedDate: uncomment if --updateDate flag passed
if (includeUpdated) {
  content = content.replace(
    /^# updatedDate: "YYYY-MM-DD".*$/m,
    `updatedDate: "${today}"`
  );
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------
fs.writeFileSync(file, content, "utf8");
console.log(`\n✅  Created: ${file}`);
console.log(`   Title:    ${title}`);
if (category) console.log(`   Category: ${category}`);
console.log(`   Date:     ${today}`);
console.log(`   Draft:    ${draft}\n`);

// ---------------------------------------------------------------------------
// Preflight — run on the new file immediately
// ---------------------------------------------------------------------------
console.log("Running preflight on new file…\n");
const result = spawnSync(
  process.execPath,
  [
    path.join(__dirname, "content", "preflight.mjs"),
    "--file", file,
  ],
  { stdio: "inherit" }
);
process.exit(result.status ?? 0);
