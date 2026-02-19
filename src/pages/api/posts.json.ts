import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

export const prerender = true;

function toIso(d: unknown): string | null {
  if (!d) return null;
  const dt = d instanceof Date ? d : new Date(String(d));
  return Number.isFinite(dt.getTime()) ? dt.toISOString().slice(0, 10) : null;
}

export const GET: APIRoute = async () => {
  const posts = await getCollection("posts");

  const items = posts
    .map((p) => {
      const publishDate = toIso(p.data.publishDate);
      const updatedDate = toIso((p.data as any).updatedDate);

      return {
        id: p.id,
        slug: p.slug,
        title: p.data.title,
        description: p.data.description,
        tags: (p.data as any).tags ?? [],
        publishDate,
        updatedDate,
        url: `/posts/${p.slug}/`,
      };
    })
    .filter((x) => !!x.publishDate)
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
        "Cache-Control": "public, max-age=900",
      },
    }
  );
};
