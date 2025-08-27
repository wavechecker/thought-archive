import { defineCollection, z } from "astro:content";

const guides = defineCollection({
  // type: "content", // optional in Astro v5 (defaults to content)
  schema: z.object({
    title: z.string().optional(),
    description: z.string().optional(),

    // Dates: allow string or Date; normalize to Date
    publishDate: z.union([z.string(), z.date()]).optional()
      .transform((v) => (v ? new Date(v) : undefined)),
    updatedDate: z.union([z.string(), z.date()]).optional()
      .transform((v) => (v ? new Date(v) : undefined)),

    draft: z.boolean().default(false),

    // 🔑 REQUIRED for hubs page to work (even if optional here):
    category: z.string().optional(),   // or z.enum([...]) once you’re ready
    hubKey: z.string().optional(),

    tags: z.array(z.string()).optional(),
    slug: z.string().optional(),
  }),
});

const pages = defineCollection({
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    publishDate: z.union([z.string(), z.date()]).transform((v) => new Date(v)),
    draft: z.boolean().default(false),
  }),
});

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

export const collections = { guides, pages, posts };



