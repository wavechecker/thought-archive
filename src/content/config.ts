import { defineCollection, z } from "astro:content";

/**
 * Guides collection (strict; accepts string or Date for dates)
 */
const guides = defineCollection({
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishDate: z.union([z.string(), z.date()]).transform((v) => new Date(v)),
    updatedDate: z.union([z.string(), z.date()]).transform((v) => new Date(v)).optional(),
    draft: z.boolean().default(false),
    tags: z.array(z.string()).optional(),
    slug: z.string().optional(), // keep optional in case you derive from filename
  }),
});

/**
 * Pages collection (simple static pages like Contact/About)
 */
const pages = defineCollection({
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    publishDate: z.union([z.string(), z.date()]).transform((v) => new Date(v)),
    draft: z.boolean().default(false),
  }),
});

/**
 * Posts collection (optional; only if you actually have src/content/posts/)
 * If you don't use posts yet, you can remove this block AND the 'posts:' line below.
 */
const posts = defineCollection({
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    publishDate: z.union([z.string(), z.date()]).transform((v) => new Date(v)),
    updatedDate: z.union([z.string(), z.date()]).transform((v) => new Date(v)).optional(),
    draft: z.boolean().default(false),
    tags: z.array(z.string()).optional(),
  }),
});

export const collections = {
  guides,
  pages,
  posts, // <- delete this line if you removed the 'posts' block above
};


