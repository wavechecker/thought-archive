import { defineCollection, z } from "astro:content";

// Accept ISO string *or* Date object for dates
const DateLike = z.union([z.string(), z.date()]);

const common = {
  title: z.string(),
  description: z.string().max(200).optional(),
  publishDate: DateLike,              // was z.string()
  updatedDate: DateLike.optional(),   // was z.string().optional()
  tags: z.array(z.string()).default([]),
  // no frontmatter slug; we use entry.slug everywhere
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


