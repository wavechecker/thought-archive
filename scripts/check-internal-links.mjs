#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const guidesDir = path.join(process.cwd(), "src", "content", "guides");
const files = fs.readdirSync(guidesDir).filter(f => f.endsWith(".md"));

const slugs = new Set(files.map(f => f.replace(/\.en\.md$|\.md$/,"")));
const missing = [];

for (const f of files) {
  const p = path.join(guidesDir, f);
  const text = fs.readFileSync(p, "utf8");
  const links = [...text.matchAll(/\]\((\/guides\/[a-z0-9\-]+\/)\)/g)].map(m => m[1]);
  for (const url of links) {
    const slug = url.replace(/^\/guides\/|\/$/g,"");
    if (!slugs.has(slug)) missing.push({ file: f, url, slug });
  }
}

if (!missing.length) {
  console.log("✅ No missing internal guide links found.");
  process.exit(0);
}
console.log("⚠️ Missing internal targets:");
for (const m of missing) console.log(`- In ${m.file} → ${m.url}`);
process.exit(1);
