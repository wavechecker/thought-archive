import { defineCollection, z } from "astro:content";

const DateLike = z.union([z.string(), z.date()]);

const common = {
  title: z.string(),
  description: z.string().max(200).optional(),
  publishDate: DateLike,
  updatedDate: DateLike.optional(),
  tags: z.array(z.string()).default([]),
};

const guides = defineCollection({ type: "content", schema: z.object(common) });
const posts  = defineCollection({ type: "content", schema: z.object(common) });

export const collections = { guides, posts };


