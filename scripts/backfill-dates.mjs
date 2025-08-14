import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, statSync } from "node:fs";
import matter from "gray-matter";
import { globby } from "globby";

const ROOT = process.cwd();
const GLOB = "src/content/guides/**/*.{md,mdx}";

function gitDateISO(file, which = "A") {
  try {
    const fmt = "%aI"; // strict ISO 8601
    const filter = which === "A" ? "--diff-filter=A" : "";
    const cmd = "git log " + filter + " --follow --format=" + fmt + ' -- "' + file + '"';
    const out = execSync(cmd, { cwd: ROOT, encoding: "utf8" }).trim();
    if (!out) return null;
    // first line = most recent; last line = oldest (added)
    return which === "A" ? out.split("\n").pop() : out.split("\n")[0];
  } catch {
    return null;
  }
}

function fileMtimeISO(file) {
  try {
    return new Date(statSync(file).mtime).toISOString();
  } catch {
    return null;
  }
}

const files = await globby(GLOB);
let changed = 0;

for (const f of files) {
  const src = readFileSync(f, "utf8");
  const fm = matter(src);

  let publishDate = fm.data.publishDate;
  let updatedDate = fm.data.updatedDate;

  if (!publishDate) {
    const created = gitDateISO(f, "A") || fileMtimeISO(f) || new Date().toISOString();
    fm.data.publishDate = created;
  }

  if (!updatedDate) {
    const modified = gitDateISO(f, "M") || fm.data.publishDate;
    fm.data.updatedDate = modified;
  }

  const out = matter.stringify(fm.content, fm.data, { lineWidth: 0 });
  if (out !== src) {
    writeFileSync(f, out, "utf8");
    changed++;
  }
}

console.log("Updated " + changed + " file(s) with dates.");
