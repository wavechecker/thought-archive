// Public, cache-busted by Netlify. Safe with strict CSP (no inline).
function fmt(n) {
  const nn = Number(n);
  return Number.isFinite(nn) ? nn.toLocaleString() : "—";
}
function setText(root, sel, val) {
  const el = root.querySelector(sel);
  if (el) el.textContent = val;
}

async function hydrateBox(root) {
  const urlAttr = root.getAttribute("data-url") || "/data/measles-us.json";
  // Resolve against origin to handle base paths or relative quirks
  const url = new URL(urlAttr, location.origin).toString();

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const j = await res.json();

    if (j.cases != null) setText(root, '[data-field="cases"]', fmt(j.cases));

    if (j.statesAffected != null) {
      setText(root, '[data-field="statesAffected"]', String(j.statesAffected));
      const line = root.querySelector('[data-field="statesLine"]');
      if (line) line.style.display = "";
    }

    if (j.hospitalizations != null) {
      setText(root, '[data-field="hospitalizations"]', fmt(j.hospitalizations));
    }
    if (j.deaths != null) {
      setText(root, '[data-field="deaths"]', fmt(j.deaths));
    }
    if (j.lastUpdated) {
      const d = new Date(j.lastUpdated);
      setText(
        root,
        '[data-field="lastUpdated"]',
        isNaN(d.getTime()) ? String(j.lastUpdated) : d.toLocaleDateString()
      );
    }
  } catch (err) {
    // Optional: add a tiny error note for debugging (remove once stable)
    root.setAttribute("data-error", String(err));
  }
}

function init() {
  document.querySelectorAll('[data-outbreak][data-url]').forEach(hydrateBox);
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
