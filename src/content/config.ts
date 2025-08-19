import { defineCollection, z } from "astro:content";

const guides = defineCollection({
  schema: z.object({
    // Make everything optional for now so legacy files without frontmatter pass
    title: z.string().optional(),
    description: z.string().optional(),
    publishDate: z.union([z.string(), z.date()]).optional()
      .transform((v) => (v ? new Date(v) : undefined)),
    updatedDate: z.union([z.string(), z.date()]).optional()
      .transform((v) => (v ? new Date(v) : undefined)),
    draft: z.boolean().default(false),
    tags: z.array(z.string()).optional(),
    slug: z.string().optional(),
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


