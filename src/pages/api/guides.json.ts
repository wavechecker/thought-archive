import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

function toIso(d: unknown): string | null {
  if (!d) return null;
  const dt = d instanceof Date ? d : new Date(String(d));
  return Number.isFinite(dt.getTime()) ? dt.toISOString().slice(0, 10) : null;
}

export const GET: APIRoute = async () => {
  const guides = await getCollection("guides");

  // Sort: newest first (prefer publishDate, fall back to updatedDate)
  const items = guides
    .map((g) => {
      const publishDate = toIso(g.data.publishDate);
      const updatedDate = toIso((g.data as any).updatedDate);

      return {
        id: g.id,
        slug: g.slug,
        title: g.data.title,
        description: g.data.description,
        summary: (g.data as any).summary ?? g.data.description,
        keyPoints: (g.data as any).keyPoints ?? [],
        category: (g.data as any).category ?? null,
        tags: (g.data as any).tags ?? [],
        publishDate,
        updatedDate,
        url: `/guides/${g.slug}/`,
      };
    })
    .filter((x) => !!x.publishDate) // keep only valid dated guides
    .sort((a, b) => (b.publishDate || "").localeCompare(a.publishDate || ""));

  return new Response(
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        count: items.length,
        items,
      },
      null,
      2
    ),
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=900", // 15 min
      },
    }
  );
};


