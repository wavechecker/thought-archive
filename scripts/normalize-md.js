// scripts/normalize-md.js
// Normalize Markdown files: frontmatter fences, straight quotes, basic metadata extraction.
// Usage:
//   node scripts/normalize-md.js --path src/content --dry-run
//   node scripts/normalize-md.js --path src/content

const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const getArg = (name, fallback = null) => {
  const idx = args.indexOf(name);
  if (idx !== -1) return args[idx + 1] ?? true;
  return fallback;
};

const ROOT = process.cwd();
const START_DIR = path.resolve(ROOT, getArg("--path", "src/content"));
const DRY_RUN = args.includes("--dry-run");

const mdFiles = [];
function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.isFile() && p.toLowerCase().endsWith(".md")) mdFiles.push(p);
  }
}

function toStraightQuotes(s) {
  // curly double → straight
  s = s.replace(/[\u201C\u201D\u2033]/g, '"');
  // curly single/apostrophe → straight
  s = s.replace(/[\u2018\u2019\u2032]/g, "'");
  // common non-breaking spaces → normal space
  s = s.replace(/\u00A0/g, " ");
  return s;
}

function slugify(str) {
  return String(str || "")
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseInlineMeta(lines) {
  // Accept simple "key: value" lines until a blank line or non-matching line.
  // Returns {meta, consumed}
  const meta = {};
  let consumed = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) break;
    const m = trimmed.match(/^([A-Za-z][A-Za-z0-9_-]*):\s*(.+)$/);
    if (!m) break;
    const key = m[1];
    let val = m[2].trim();

    // Strip surrounding quotes if present (straight or curly)
    val = val.replace(/^["“”]|["“”]$/g, "");
    val = val.replace(/^['‘’]|['‘’]$/g, "");

    // Convert simple array forms like [“a”, “b”] or ["a","b"]
    if (/^\[.*\]$/.test(val)) {
      const inner = val.slice(1, -1);
      const items = inner
        .split(",")
        .map((x) =>
          x
            .trim()
            .replace(/^["“”]|["“”]$/g, "")
            .replace(/^['‘’]|['‘’]$/g, "")
        )
        .filter(Boolean);
      meta[key] = items;
    } else {
      meta[key] = val;
    }
    consumed++;
  }
  return { meta, consumed };
}

function hasFrontmatterTop(s) {
  return s.startsWith("---\n") || s.startsWith("---\r\n");
}

function extractFrontmatter(s) {
  // returns { fm: string|null, body: string }
  if (!hasFrontmatterTop(s)) return { fm: null, body: s };
  const end = s.indexOf("\n---", 4);
  if (end === -1) return { fm: null, body: s }; // malformed, treat as none
  const fenceEnd = s.indexOf("\n", end + 4);
  const fm = s.slice(4, end + 1).trimEnd(); // content between fences
  const body = s.slice(fenceEnd + 1);
  return { fm, body };
}

function parseYamlLoosely(fm) {
  // VERY light parser: key: value per line, quotes optional, arrays in [a,b].
  // We mainly want to normalize quotes and pick out title/slug/dates/tags.
  const out = {};
  const lines = fm.split(/\r?\n/);
  for (let line of lines) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const m = line.match(/^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();

    // Preserve JSON-like arrays
    if (/^\[.*\]$/.test(val)) {
      const inner = val.slice(1, -1);
      const items = inner
        .split(",")
        .map((x) =>
          x
            .trim()
            .replace(/^["“”]|["“”]$/g, "")
            .replace(/^['‘’]|['‘’]$/g, "")
        )
        .filter(Boolean);
      out[key] = items;
    } else {
      // Strip surrounding quotes (either style)
      val = val.replace(/^["“”]|["“”]$/g, "");
      val = val.replace(/^['‘’]|['‘’]$/g, "");
      out[key] = val;
    }
  }
  return out;
}

function buildYaml(obj) {
  const lines = [];
  const pushKV = (k, v) => {
    if (Array.isArray(v)) {
      const arr = `[${v.map((x) => `"${String(x)}"`).join(", ")}]`;
      lines.push(`${k}: ${arr}`);
    } else if (typeof v === "boolean") {
      lines.push(`${k}: ${v}`);
    } else {
      lines.push(`${k}: "${String(v)}"`);
    }
  };
  // Order is nice to have
  const order = [
    "title",
    "slug",
    "description",
    "category",
    "publishDate",
    "updatedDate",
    "draft",
    "tags",
  ];
  for (const k of order) if (k in obj) pushKV(k, obj[k]);
  // include any extra keys
  for (const k of Object.keys(obj)) {
    if (!order.includes(k)) pushKV(k, obj[k]);
  }
  return `---\n${lines.join("\n")}\n---\n`;
}

function normalizeOne(filePath) {
  const original = fs.readFileSync(filePath, "utf8");
  let content = toStraightQuotes(original);

  // Extract or synthesize frontmatter
  let { fm, body } = extractFrontmatter(content);

  if (!fm) {
    // Try to parse inline meta at the very top (loose key: value lines)
    const lines = content.split(/\r?\n/);
    const { meta, consumed } = parseInlineMeta(lines);
    if (consumed > 0) {
      // Remove consumed lines
      body = lines.slice(consumed).join("\n").replace(/^\s*\n+/, "");
      fm = buildYaml(meta).slice(4, -4).trim(); // convert to YAML string (w/out fences)
    } else {
      // No frontmatter at all; we'll create minimal if we can find a title
      const h1Match = body.match(/^\s*#\s+(.+?)\s*$/m);
      const title = h1Match ? h1Match[1].trim() : null;
      if (title) {
        fm = `title: "${title}"\nslug: "${slugify(title)}"\ndraft: false`;
      }
    }
  }

  // Parse → normalize → rebuild YAML
  let meta = {};
  if (fm) meta = parseYamlLoosely(fm);

  // Derive slug if missing and we have title
  if (!meta.slug && meta.title) meta.slug = slugify(meta.title);

  // Ensure draft is boolean if present as string
  if (typeof meta.draft === "string") {
    meta.draft = meta.draft.toLowerCase() === "true" ? true : false;
  }

  // Rebuild file
  const fmBlock = meta && Object.keys(meta).length ? buildYaml(meta) : "";
  const newContent = fmBlock + (body || content);

  const changed = newContent !== original;
  if (DRY_RUN) {
    if (changed) console.log(`[DRY] Would update: ${filePath}`);
    return { changed: false };
  } else {
    if (changed) {
      // write a backup once per file (first change only)
      const bak = filePath + ".bak";
      if (!fs.existsSync(bak)) {
        fs.writeFileSync(bak, original, "utf8");
      }
      fs.writeFileSync(filePath, newContent, "utf8");
      console.log(`[OK] Updated: ${filePath}`);
      return { changed: true };
    } else {
      return { changed: false };
    }
  }
}

function main() {
  if (!fs.existsSync(START_DIR)) {
    console.error(`Path not found: ${START_DIR}`);
    process.exit(1);
  }
  walk(START_DIR);
  if (mdFiles.length === 0) {
    console.log("No Markdown files found.");
    return;
  }
  console.log(`Scanning ${mdFiles.length} Markdown files under ${START_DIR} ...`);
  let changed = 0;
  for (const f of mdFiles) {
    const res = normalizeOne(f);
    if (res.changed) changed++;
  }
  console.log(`Done. ${changed} files updated.`);
}

main();
