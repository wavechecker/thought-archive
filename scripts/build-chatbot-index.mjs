// scripts/build-chatbot-index.mjs
// Builds the PatientGuide content index used by the chatbot Netlify Function.
// Run: node scripts/build-chatbot-index.mjs
// Output: netlify/functions/chatbot-index.json

import { readdir, readFile, writeFile, mkdir } from "fs/promises";
import { join, resolve } from "path";
import { existsSync } from "fs";
import matter from "gray-matter";

const ROOT = resolve(".");
const OUTPUT = join(ROOT, "netlify/functions/chatbot-index.json");

const SOURCES = [
  { dir: join(ROOT, "src/content/guides"), type: "guide", urlPrefix: "/guides" },
  { dir: join(ROOT, "src/content/posts"), type: "post", urlPrefix: "/posts" },
];

function stripMarkdown(text) {
  return text
    .replace(/^import\s+.*$/gm, "")
    .replace(/<[A-Z][A-Za-z0-9.]*[^>]*\/>/g, "")
    .replace(/<[A-Z][A-Za-z0-9.]*[^>]*>[\s\S]*?<\/[A-Z][A-Za-z0-9.]*>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_`~]/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractHeadings(rawContent) {
  return rawContent
    .split("\n")
    .filter((l) => /^#{1,3}\s+/.test(l))
    .map((l) => l.replace(/^#{1,3}\s+/, "").trim())
    .slice(0, 12);
}

async function processFile(filePath, type, urlPrefix) {
  const raw = await readFile(filePath, "utf-8");
  let fm, content;

  try {
    const parsed = matter(raw);
    fm = parsed.data;
    content = parsed.content;
  } catch {
    return null;
  }

  if (fm.draft === true) return null;

  const filename = filePath.split(/[\\/]/).pop().replace(/\.(mdx?|md)$/, "");
  const slug = fm.slug || filename;
  const url = `${urlPrefix}/${slug}`;

  const plainText = stripMarkdown(content);
  const excerpt = plainText.slice(0, 500).replace(/\s+/g, " ").trim();
  const headings = extractHeadings(content);

  const faq = (fm.faq || [])
    .filter((f) => f && f.q)
    .map((f) => ({
      q: String(f.q).trim(),
      a: String(f.a || "").slice(0, 250).trim(),
    }))
    .slice(0, 10);

  return {
    id: `${type}/${slug}`,
    type,
    title: String(fm.title || "").trim(),
    description: String(fm.description || "").trim(),
    url,
    category: String(fm.category || "").trim(),
    tags: Array.isArray(fm.tags) ? fm.tags.map(String) : [],
    headings,
    faq,
    excerpt,
  };
}

async function main() {
  const items = [];

  for (const { dir, type, urlPrefix } of SOURCES) {
    if (!existsSync(dir)) {
      console.warn(`Skipping missing directory: ${dir}`);
      continue;
    }

    const files = await readdir(dir);
    let count = 0;

    for (const file of files) {
      if (!/\.(mdx?|md)$/.test(file)) continue;
      const item = await processFile(join(dir, file), type, urlPrefix);
      if (item && item.title) {
        items.push(item);
        count++;
      }
    }

    console.log(`Indexed ${count} ${type}s`);
  }

  await mkdir(join(ROOT, "netlify/functions"), { recursive: true });

  const index = {
    generated: new Date().toISOString(),
    count: items.length,
    items,
  };

  await writeFile(OUTPUT, JSON.stringify(index, null, 2));
  console.log(`✓ Chatbot index: ${items.length} items → netlify/functions/chatbot-index.json`);
}

main().catch((err) => {
  console.error("build-chatbot-index failed:", err.message);
  process.exit(1);
});
