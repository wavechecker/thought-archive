import fs from "node:fs"; import path from "node:path";

const ROOT = "src/content/guides";

function isEmptyBody(txt){
  if(!/^---\n/.test(txt)) return txt.trim().length===0;
  const i = txt.indexOf("\n---",3);
  if(i < 0) return txt.trim().length===0;
  const body = txt.slice(i+4).trim();
  return body.length===0;
}

function walk(dir, del=[]) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const s = fs.statSync(p);
    if (s.isDirectory()) walk(p, del);
    else if (/\.(md|mdx)$/i.test(name)) {
      const txt = fs.readFileSync(p, "utf8");
      if (isEmptyBody(txt)) del.push(p);
    }
  }
  return del;
}

const victims = walk(ROOT, []);
if (!victims.length) {
  console.log("No empty guides found.");
  process.exit(0);
}

for (const f of victims) {
  fs.unlinkSync(f);
  console.log("DELETED:", f);
}
console.log(`\nPurged ${victims.length} empty guide(s).`);
