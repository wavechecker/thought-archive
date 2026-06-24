// scripts/build-x402-guide-briefs.mjs
// Builds the guide brief index used by the x402 Netlify function.
// Run: node scripts/build-x402-guide-briefs.mjs
// Output: netlify/functions/x402-guide-briefs.json
//
// Included in the prebuild step so every Netlify deploy has current data.
// Only non-draft guides are included.

import { readdir, readFile, writeFile } from "fs/promises";
import { join, resolve } from "path";
import matter from "gray-matter";

const ROOT = resolve(".");
const GUIDES_DIR = join(ROOT, "src/content/guides");
const OUTPUT = join(ROOT, "netlify/functions/x402-guide-briefs.json");
const CANONICAL_BASE = "https://patientguide.io";

// Split content into sections on ## headings.
// Returns the body of the first section whose title matches headingName (case-insensitive).
function extractSection(content, headingName) {
  const lines = content.split("\n");
  let inSection = false;
  const result = [];

  for (const line of lines) {
    if (/^##\s+/.test(line)) {
      if (inSection) break;
      const title = line.replace(/^##\s+/, "").trim();
      if (title.toLowerCase() === headingName.toLowerCase()) {
        inSection = true;
      }
    } else if (inSection) {
      result.push(line);
    }
  }

  return result.join("\n").trim();
}

function extractKeyPoints(content, fmKeyPoints) {
  if (Array.isArray(fmKeyPoints) && fmKeyPoints.length > 0) {
    return fmKeyPoints;
  }
  const section = extractSection(content, "Key Points");
  if (!section) return [];
  return section
    .split("\n")
    .map((line) => line.replace(/^[-*+]\s+/, "").trim())
    .filter((line) => line.length > 0 && !line.startsWith("#") && line !== "---");
}

function extractRelatedGuides(content) {
  const section = extractSection(content, "Related Guides");
  if (!section) return [];
  const guides = [];
  const re = /\[([^\]]+)\]\(\/guides\/([a-z0-9][a-z0-9-]*)\)/g;
  let m;
  while ((m = re.exec(section)) !== null) {
    guides.push({
      title: m[1].trim(),
      slug: m[2],
      url: `${CANONICAL_BASE}/guides/${m[2]}`,
    });
  }
  return guides;
}

const files = (await readdir(GUIDES_DIR)).filter((f) => /\.(md|mdx)$/.test(f));
const briefs = {};
let skipped = 0;

for (const file of files) {
  const filePath = join(GUIDES_DIR, file);
  // Strip BOM that Windows editors may prepend
  const raw = (await readFile(filePath, "utf-8")).replace(/^﻿/, "");

  let fm, content;
  try {
    const parsed = matter(raw);
    fm = parsed.data;
    content = parsed.content;
  } catch {
    skipped++;
    continue;
  }

  if (fm.draft === true) {
    skipped++;
    continue;
  }

  const slug = (typeof fm.slug === "string" && fm.slug) || file.replace(/\.(md|mdx)$/, "");

  briefs[slug] = {
    slug,
    title: fm.title ?? slug,
    description: fm.description ?? null,
    category: fm.category ?? null,
    publishDate: fm.publishDate ?? null,
    updatedDate: fm.updatedDate ?? null,
    tags: Array.isArray(fm.tags) ? fm.tags : [],
    keyPoints: extractKeyPoints(content, fm.keyPoints),
    relatedGuides: extractRelatedGuides(content),
    canonicalUrl: `${CANONICAL_BASE}/guides/${slug}`,
  };
}

await writeFile(OUTPUT, JSON.stringify(briefs, null, 2), "utf-8");
console.log(
  `x402-guide-briefs.json: ${Object.keys(briefs).length} guides (${skipped} skipped)`
);
