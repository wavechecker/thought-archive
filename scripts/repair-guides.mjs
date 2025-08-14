import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const ROOT = "src/content/guides";
const LAYOUT = "@/layouts/GuideLayout.astro";

// Accepts string | Date | undefined; returns Date | undefined (valid only)
function coerceValidDate(v) {
  if (!v) return undefined;
  if (v instanceof Date) {
    const n = +v;
    return isNaN(n) || n < +new Date("1971-01-01") ? undefined : v;
  }
  // v is string: try to parse
  const d = new Date(String(v).trim());
  const n = +d;
  if (isNaN(n) || n < +new Date("1971-01-01")) return undefined;
  return d;
}

function toISO(d) {
  try { return d instanceof Date ? d.toISOString() : undefined; }
  catch { return undefined; }
}

function repairFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  if (!raw.startsWith("---")) return false;

  const fm = matter(raw);

  // 1) Normalize date keys: pubDate/date -> publishDate; updated -> updatedDate
  if (fm.data.pubDate && !fm.data.publishDate) fm.data.publishDate = fm.data.pubDate;
  if (fm.data.date && !fm.data.publishDate) fm.data.publishDate = fm.data.date;
  if (fm.data.updated && !fm.data.updatedDate) fm.data.updatedDate = fm.data.updated;

  delete fm.data.pubDate;
  delete fm.data.date;
  delete fm.data.updated;

  // 2) Coerce/validate dates and store as ISO strings
  const pd = coerceValidDate(fm.data.publishDate);
  const ud = coerceValidDate(fm.data.updatedDate);

  if (pd) fm.data.publishDate = toISO(pd);
  else delete fm.data.publishDate;

  if (ud) fm.data.updatedDate = toISO(ud);
  else delete fm.data.updatedDate;

  // 3) Enforce the safe layout
  fm.data.layout = LAYOUT;

  // 4) Write back only if changed
  const out = matter.stringify(fm.content, fm.data, { lineWidth: 0 });
  if (out !== raw) {
    fs.writeFileSync(filePath, out, "utf8");
    return true;
  }
  return false;
}

function walk(dir) {
  let changed = 0;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const s = fs.statSync(p);
    if (s.isDirectory()) changed += walk(p);
    else if (/\.(md|mdx)$/i.test(name)) {
      if (repairFile(p)) changed++;
    }
  }
  return changed;
}

const total = walk(ROOT);
console.log(`Repaired ${total} guide file(s).`);
