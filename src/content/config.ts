import { defineCollection, z } from "astro:content";

const common = {
  title: z.string(),
  description: z.string().max(200).optional(),   // some legacy guides may lack desc
  publishDate: z.string(),                        // ISO "YYYY-MM-DD"
  updatedDate: z.string().optional(),            // ISO "YYYY-MM-DD"
  tags: z.array(z.string()).default([]),
  slug: z.string(),
};

const guides = defineCollection({
  type: "content",
  schema: z.object(common),
});

const posts = defineCollection({
  type: "content",
  schema: z.object(common),
});

export const collections = { guides, posts };

