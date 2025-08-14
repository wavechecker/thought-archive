import { defineCollection, z } from "astro:content";

const guides = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    slug: z.string().optional(),                 // allow explicit slugs in frontmatter
    lang: z.enum(["en", "es"]).optional(),
    tags: z.array(z.string()).optional().default([]),

    // Dates are OPTIONAL for now so builds won’t fail while we normalize content.
    // They’re coerced to Date instances when present.
    publishDate: z.union([z.string(), z.date()]).optional()
      .transform((v) => (v ? new Date(v) : undefined)),
    updatedDate: z.union([z.string(), z.date()]).optional()
      .transform((v) => (v ? new Date(v) : undefined)),

    draft: z.boolean().default(false),
  }),
  // Prefer a frontmatter slug when provided; otherwise use Astro's default
  slug: ({ data, defaultSlug }) => (data.slug ? data.slug : defaultSlug),
});

export const collections = { guides };

