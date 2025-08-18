#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const WRITE = process.argv.includes("--write"); // dry-run by default

const guidesDir = path.join(process.cwd(), "src", "content", "guides");
const files = fs.readdirSync(guidesDir).filter(f => f.endsWith(".md"));
const slugs = files.map(f => f.replace(/\.en\.md$|\.md$/,""));

// --- Exact alias map from your repo's current files ---
const ALIAS = {
  // Cardiac cluster
  "understanding-coronary-angiography": "coronary-angiography",
  "common-heart-medications-and-their-side-effects": "common-heart-medications",
  "preventing-heart-disease-lifestyle-and-medical-screening": "preventing-heart-disease",
  "cardiac-rehabilitation-after-a-heart-event": "cardiac-rehabilitation",
  "what-is-angina-symptoms-and-management": "angina-symptoms-management",

  // Diabetes cluster
  "insulin-administration-pens-syringes-and-pumps": "insulin-administration",
  "travel-tips-for-people-with-type-1-diabetes": "travel-tips-t1d",
  // Likely shorter slugs in your repo:
  "blood-glucose-testing-how-and-when-to-check": "blood-glucose-testing",
  "recognising-highs-and-lows-symptoms-and-first-steps": "recognising-highs-and-lows",
  "type-1-diabetes-managing-low-blood-glucose-hypoglycaemia": "type-1-diabetes-managing-low-blood-glucose-hypoglycaemia", // keep same if present; best-match will handle if different

  // Respiratory
  "flu-vs-common-cold-how-to-tell-the-difference": "flu-vs-common-cold",
};

// --- Simple token overlap for best-guess if alias missing ---
function sim(a, b) {
  const ta = new Set(a.split("-"));
  const tb = new Set(b.split("-"));
  const inter = [...ta].filter(t => tb.has(t)).length;
  const union = new Set([...ta, ...tb]).size || 1;
  return inter / union;
}
function bestMatch(target) {
  let best = { slug: null, score: 0 };
  for (const s of slugs) {
    const score = sim(target, s);
    if (score > best.score) best = { slug: s, score };
  }
  return best.score >= 0.45 ? best.slug : null; // a bit forgiving
}

let changed = 0;
const report = [];

for (const f of files) {
  const p = path.join(guidesDir, f);
  let text = fs.readFileSync(p, "utf8");
  let edits = 0;

  text = text.replace(/\]\((\/guides\/[a-z0-9\-]+\/)\)/g, (m, url) => {
    const target = url.replace(/^\/guides\/|\/$/g,"");
    if (slugs.includes(target)) return m; // already good

    // alias first
    if (ALIAS[target]) {
      const fixed = `/guides/${ALIAS[target]}/`;
      if (ALIAS[target] !== target) {
        edits++; report.push({ file: f, from: url, to: fixed, reason: "alias" });
        return `](${fixed})`;
      }
    }

    // best-match fallback
    const guess = bestMatch(target);
    if (guess) {
      const fixed = `/guides/${guess}/`;
      edits++; report.push({ file: f, from: url, to: fixed, reason: "best-match" });
      return `](${fixed})`;
    }

    // no change; log for manual follow-up
    report.push({ file: f, from: url, to: null, reason: "no-match" });
    return m;
  });

  if (edits) {
    if (WRITE) fs.writeFileSync(p, text, "utf8");
    changed += edits;
  }
}

console.log(`${WRITE ? "✅ Applied" : "🧪 Dry-run:"} ${changed} rewrite(s).`);
if (report.length) {
  console.log(report.map(r => `- ${r.file}: ${r.from} ${r.to ? "→ " + r.to : "(no match)"} [${r.reason}]`).join("\n"));
}
if (!WRITE) console.log("\nRun again with --write to apply changes.");
