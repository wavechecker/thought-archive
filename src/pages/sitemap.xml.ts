// src/pages/sitemap.xml.ts
import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

export const prerender = true; // ✅ emit a static file during build

const SITE = "https://patientguide.io";

const iso = (d?: unknown) => {
  const s = String(d ?? "");
  const dt = s ? new Date(s) : null;
  return dt && !isNaN(+dt) ? dt.toISOString() : undefined;
};

export const GET: APIRoute = async () => {
  const pages: Array<{ loc: string; lastmod?: string; changefreq?: string; priority?: string }> = [];

  // Core pages
  [
    ["/", undefined, "weekly", "0.8"],
    ["/guides/", undefined, "weekly", "0.8"],
    ["/guides/type-1-diabetes/", undefined, "weekly", "0.6"],
    ["/guides/type-2-diabetes/", undefined, "weekly", "0.6"],
    ["/guides/heart-circulation/", undefined, "weekly", "0.6"],
    ["/guides/cancer/", undefined, "weekly", "0.6"],
    ["/guides/infectious-diseases/", undefined, "weekly", "0.6"],
    ["/guides/emergencies/", undefined, "weekly", "0.6"],
    ["/contact/", undefined, "yearly", "0.3"],
  ].forEach(([path, last, cf, pr]) =>
    pages.push({ loc: SITE + String(path), lastmod: last as string, changefreq: cf as string, priority: pr as string })
  );

  // Guides
  try {
    const guides = await getCollection("guides");
    for (const e of guides) {
      pages.push({
        loc: `${SITE}/guides/${e.slug}/`,
        lastmod: iso(e.data?.updatedDate ?? e.data?.publishDate),
        changefreq: "monthly",
        priority: "0.5",
      });
    }
  } catch {}

  // Posts (optional)
  try {
    const posts = await getCollection("posts");
    for (const e of posts) {
      pages.push({
        loc: `${SITE}/posts/${e.slug}/`,
        lastmod: iso(e.data?.updatedDate ?? e.data?.publishDate),
        changefreq: "monthly",
        priority: "0.5",
      });
    }
  } catch {}

  const urls = pages
    .map((p) => {
      const last = p.lastmod ? `<lastmod>${p.lastmod}</lastmod>` : "";
      const cf = p.changefreq ? `<changefreq>${p.changefreq}</changefreq>` : "";
      const pr = p.priority ? `<priority>${p.priority}</priority>` : "";
      return `<url><loc>${p.loc}</loc>${last}${cf}${pr}</url>`;
    })
    .join("");

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
    urls +
    `</urlset>`;

  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
};
