import { defineCollection, z } from "astro:content";

// Common fields
const base = {
  title: z.string(),
  description: z.string().optional(),
  publishDate: z.coerce.date().optional(),
  updatedDate: z.coerce.date().optional(),
  draft: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  image: z.string().optional(),
};

// Guides
const guides = defineCollection({
  type: "content",
  schema: z.object({
    ...base,
    category: z.string().optional(),
    hubKey: z.string().optional(),
  }),
});

// Posts
const posts = defineCollection({
  type: "content",
  schema: z.object({
    ...base,
  }),
});

// Resources
const resources = defineCollection({
  type: "content",
  schema: z.object({
    ...base,
    category: z.string().optional(),
  }),
});

// Taxonomy / Pages (if you use them as content)
const taxonomy = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    hubKey: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

const pages = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { guides, posts, resources, taxonomy, pages };




