import { defineCollection, z } from "astro:content";

const guides = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string().max(200),
    publishDate: z.string(),           // "YYYY-MM-DD"
    updatedDate: z.string().optional(),
    tags: z.array(z.string()).default([]),
    slug: z.string(),
  }),
});

const posts = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string().max(200),
    publishDate: z.string(),
    updatedDate: z.string().optional(),
    tags: z.array(z.string()).default([]),
    slug: z.string(),
  }),
});

export const collections = { guides, posts };

