import fs from "node:fs"; import path from "node:path";

const [, , titleArg, langArg="en", slugArg] = process.argv;
if (!titleArg) {
  console.error('Usage: node scripts/create-guide.mjs "Title here" [en|es] [optional-custom-slug]');
  process.exit(1);
}

const title = titleArg.trim();
const lang = (langArg || "en").toLowerCase();
if (!["en","es"].includes(lang)) {
  console.error('Language must be "en" or "es".'); process.exit(1);
}

// simple slugify
const slugify = (s) => s.normalize("NFKD")
  .replace(/[\u0300-\u036f]/g,"")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g,"-")
  .replace(/^-+|-+$/g,"")
  .slice(0,80);

const slug = slugArg ? slugify(slugArg) : slugify(title);
const now = new Date().toISOString();

const dir = path.join("src","content","guides");
const fname = `${slug}.${lang}.md`;
const file = path.join(dir, fname);

if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
if (fs.existsSync(file)) {
  console.error(`File already exists: ${file}`); process.exit(1);
}

const tpl = `---
title: ${title}
lang: ${lang}
slug: ${slug}
publishDate: ${now}
updatedDate: ${now}
draft: false
tags: []
---

# ${title}

_Write an intro paragraph here. Replace this placeholder before publishing._
`;

fs.writeFileSync(file, tpl, "utf8");
console.log(`Created: ${file}`);
