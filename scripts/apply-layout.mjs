import fs from "node:fs";
import path from "node:path";

const ROOT = "src/content/guides";

function applyLayout(filePath) {
  let text = fs.readFileSync(filePath, "utf8");
  if (!text.startsWith("---\n")) return false;

  const end = text.indexOf("\n---", 3);
  if (end < 0) return false;

  let fm = text.slice(0, end + 4);
  const body = text.slice(end + 4);

  // Remove any existing layout line(s) in frontmatter
  fm = fm.replace(/\nlayout:\s*.*\r?\n/gi, "\n");

  // If no layout present, insert after opening ---
  if (!/(\n|^)layout:/.test(fm)) {
    fm = fm.replace(
      /^---\n/,
      '---\nlayout: "@/layouts/GuideLayout.astro"\n'
    );
  }

  const out = fm + body;
  if (out !== text) {
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
      if (applyLayout(p)) changed++;
    }
  }
  return changed;
}

const total = walk(ROOT);
console.log(`Applied GuideLayout to ${total} file(s).`);
