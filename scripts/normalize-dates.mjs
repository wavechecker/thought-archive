import fs from "node:fs";
import path from "node:path";

const ROOT = "src/content/guides";

function fixFrontmatter(filePath) {
  let text = fs.readFileSync(filePath, "utf8");
  if (!text.startsWith("---\n")) return false;

  const end = text.indexOf("\n---", 3);
  if (end < 0) return false;

  let fm = text.slice(0, end + 4);
  const body = text.slice(end + 4);
  let changed = false;

  const hasPublish = /^publishDate:/m.test(fm);
  const hasUpdatedDate = /^updatedDate:/m.test(fm);

  // If publishDate already exists, remove legacy keys; else map them
  if (hasPublish) {
    const before = fm;
    fm = fm.replace(/^\s*pubDate:\s*.*\r?\n/m, "");
    fm = fm.replace(/^\s*date:\s*.*\r?\n/m, "");
    changed ||= fm !== before;
  } else {
    const before = fm;
    fm = fm.replace(/^\s*pubDate:\s*(.*)\r?\n/m, "publishDate: $1\n");
    fm = fm.replace(/^\s*date:\s*(.*)\r?\n/m, "publishDate: $1\n");
    changed ||= fm !== before;
  }

  // If updatedDate already exists, remove legacy 'updated'; else map it
  if (hasUpdatedDate) {
    const before = fm;
    fm = fm.replace(/^\s*updated:\s*.*\r?\n/m, "");
    changed ||= fm !== before;
  } else {
    const before = fm;
    fm = fm.replace(/^\s*updated:\s*(.*)\r?\n/m, "updatedDate: $1\n");
    changed ||= fm !== before;
  }

  if (!changed) return false;

  fs.writeFileSync(filePath, fm + body, "utf8");
  return true;
}

function walk(dir) {
  let changed = 0;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const s = fs.statSync(p);
    if (s.isDirectory()) changed += walk(p);
    else if (/\.(md|mdx)$/i.test(name)) {
      if (fixFrontmatter(p)) changed++;
    }
  }
  return changed;
}

const total = walk(ROOT);
console.log(`Normalized date keys in ${total} file(s).`);
