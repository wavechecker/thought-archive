#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

// --- CONFIG: the 10 new guides, with desired metadata + related links ---
const MAP = {
  "home-blood-pressure-monitoring-cuff-size-technique-targets": {
    category: "Cardiac Health",
    tags: ["blood pressure","home monitoring","hypertension"],
    related: [
      "/guides/when-to-seek-emergency-help-for-chest-pain/",
      "/guides/common-heart-medications-and-their-side-effects/"
    ],
  },
  "statins-benefits-risks-and-common-myths": {
    category: "Cardiac Health",
    tags: ["statins","cholesterol","prevention"],
    related: [
      "/guides/preventing-heart-disease-lifestyle-and-medical-screening/",
      "/guides/common-heart-medications-and-their-side-effects/"
    ],
  },
  "heart-palpitations-skipped-beats-whats-normal-and-when-to-worry": {
    category: "Cardiac Health",
    tags: ["palpitations","arrhythmia","pvcs"],
    related: [
      "/guides/atrial-fibrillation-symptoms-risks-and-treatment/",
      "/guides/when-to-seek-emergency-help-for-chest-pain/"
    ],
  },
  "diabetes-foot-care-daily-checks-to-prevent-ulcers": {
    category: "Diabetes Management",
    tags: ["foot care","ulcers","neuropathy"],
    related: [
      "/guides/understanding-hba1c-and-why-it-matters-for-diabetes-management/",
      "/guides/blood-glucose-testing-how-and-when-to-check/"
    ],
  },
  "morning-highs-in-diabetes-dawn-phenomenon-vs-somogyi-effect": {
    category: "Diabetes Management",
    tags: ["dawn phenomenon","somogyi","morning highs"],
    related: [
      "/guides/insulin-types-explained-rapid-short-intermediate-long-acting/",
      "/guides/blood-glucose-testing-how-and-when-to-check/"
    ],
  },
  "insulin-storage-travel-fridges-heat-and-backup-plans": {
    category: "Diabetes Management",
    tags: ["insulin storage","travel","backup"],
    related: [
      "/guides/travel-tips-for-people-with-type-1-diabetes/",
      "/guides/insulin-administration-pens-syringes-and-pumps/"
    ],
  },
  "panic-attack-vs-heart-attack-telling-the-difference-and-what-to-do": {
    category: "General Health",
    tags: ["panic attack","chest pain","anxiety"],
    related: [
      "/guides/when-to-seek-emergency-help-for-chest-pain/",
      "/guides/the-basics-of-mental-health-first-aid/"
    ],
  },
  "heat-exhaustion-vs-heat-stroke-recognise-cool-and-act-fast": {
    category: "First Aid",
    tags: ["heat stroke","heat exhaustion","first aid"],
    related: [
      "/guides/when-a-fever-becomes-dangerous-adults-vs-children/",
      "/guides/first-aid-for-severe-allergic-reactions-anaphylaxis/"
    ],
  },
  "concussion-red-flags-rest-and-safe-return-to-activity": {
    category: "First Aid",
    tags: ["concussion","head injury","red flags"],
    related: [
      "/guides/common-causes-of-dizziness-and-when-to-worry/",
      "/guides/the-basics-of-mental-health-first-aid/"
    ],
  },
  "pneumonia-vs-bronchitis-symptoms-tests-and-when-to-seek-care": {
    category: "Respiratory Health",
    tags: ["pneumonia","bronchitis","cough"],
    related: [
      "/guides/flu-vs-common-cold-how-to-tell-the-difference/",
      "/guides/when-a-fever-becomes-dangerous-adults-vs-children/"
    ],
  },
};

// --- helpers ---
const root = process.cwd();
const guidesDir = path.join(root, "src", "content", "guides");
const todayISO = new Date().toISOString();

const fm = (obj) => {
  // stable frontmatter order used across the site
  const lines = [];
  lines.push("---");
  lines.push(`title: "${obj.title.replace(/"/g,'\\"')}"`);
  if (obj.description) lines.push(`description: "${obj.description.replace(/"/g,'\\"')}"`);
  if (obj.category) lines.push(`category: "${obj.category.replace(/"/g,'\\"')}"`);
  if (obj.publishDate) lines.push(`publishDate: "${obj.publishDate}"`);
  if (obj.updatedDate) lines.push(`updatedDate: "${obj.updatedDate}"`);
  lines.push(`draft: ${obj.draft === false ? "false" : "false"}`);
  lines.push(
    `tags: [${(obj.tags || []).map(t => `"${t.replace(/"/g,'\\"')}"`).join(", ")}]`
  );
  lines.push("---");
  return lines.join("\n");
};

// normalize section order and spacing
function normalizeBody(body, related) {
  // Remove leading H1 if present
  body = body.replace(/^# .*\n+/,'');
  // Ensure H2 sections in preferred order; create if missing
  const sections = {
    "## Overview": "",
    "## Key Symptoms": "",
    "## Causes / Risk Factors": "",
    "## What To Do Now": "",
    "## Diagnosis & Treatment": "",
    "## Prevention / Daily Management": "",
    "## Red-Flag Signs (Seek Urgent Care)": "",
    "## Related Guides": "",
    "## References": "",
  };

  // Split existing content by H2
  const parts = body.split(/\n(?=## )/g);
  for (const part of parts) {
    const m = part.match(/^## [^\n]+/);
    if (!m) continue;
    const head = m[0].trim();
    if (sections[head] !== undefined) sections[head] = part.replace(/^## [^\n]+\n?/, "").trim();
  }

  // Inject Related Guides list
  const relatedBlock = (related && related.length)
    ? related.map(u => `- [Related](${u})`).join("\n")
    : "";

  // Reassemble with blank lines between sections
  const order = Object.keys(sections);
  sections["## Related Guides"] = relatedBlock || sections["## Related Guides"];

  return order
    .map(h => sections[h] !== "" ? `${h}\n${sections[h].trim()}\n` : `${h}\n`)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n"); // collapse excess blank lines
}

function parseFrontmatter(txt) {
  const m = txt.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { data: {}, body: txt };
  const yaml = m[1];
  const data = {};
  yaml.split("\n").forEach(line => {
    const idx = line.indexOf(":");
    if (idx === -1) return;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    val = val.replace(/^"(.*)"$/,"$1"); // unwrap quotes if present
    data[key] = val;
  });
  const body = txt.slice(m[0].length);
  return { data, body };
}

// --- run ---
const files = fs.readdirSync(guidesDir).filter(f => /\.en\.md$/.test(f) || /\.md$/.test(f));

let changed = 0;
for (const f of files) {
  const p = path.join(guidesDir, f);
  const raw = fs.readFileSync(p, "utf8");

  // Derive slug from filename (strip .en.md or .md)
  const slug = f.replace(/\.en\.md$|\.md$/,"");

  if (!MAP[slug]) continue; // only touch the 10 new ones

  const { data, body } = parseFrontmatter(raw);

  const title = data.title ? String(data.title) : slug.replace(/-/g," ").replace(/\b\w/g, s => s.toUpperCase());
  const publishDate = data.publishDate || todayISO;

  const meta = {
    title,
    description: data.description || `${title} — practical, plain-language guidance.`,
    category: MAP[slug].category,
    publishDate,
    updatedDate: todayISO,
    draft: false,
    tags: MAP[slug].tags || [],
  };

  const newBody = normalizeBody(body, MAP[slug].related);

  const out = fm(meta) + "\n\n" + newBody.trim() + "\n";
  fs.writeFileSync(p, out, "utf8");
  console.log(`Normalized: ${f}`);
  changed++;
}

if (changed === 0) {
  console.log("No matching files updated. Are the slugs different?");
} else {
  console.log(`Done. Updated ${changed} file(s).`);
}
