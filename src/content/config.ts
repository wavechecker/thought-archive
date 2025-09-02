// src/content/config.ts
import { defineCollection, z } from "astro:content";

// Reusable validators
const isoDate = z.string().refine((d) => !Number.isNaN(Date.parse(d)), {
  message: "Invalid date — use ISO YYYY-MM-DD",
});

// Canonical categories (single source of truth)
// NOTE: ASCII apostrophe in "Women's Health" (avoid smart-quote drift)
const CATEGORY = z.enum([
  "Emergencies",
  "Infectious Diseases",
  "Vaccination",
  "Heart & Circulation",
  "Women's Health",
  "Diabetes",
  "Cancer",
  "Neurology",
  "Mental Health",
  "General Health",
  "End of Life",
  "Child & Adolescent Health",
  "Guide Hubs",
]);

// Common fields
const base = {
  title: z.string(),
  description: z.string().optional(),
  // Prefer string dates so you control formatting in the UI
  publishDate: isoDate.optional(),
  updatedDate: isoDate.optional(),
  draft: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  image: z.string().optional(),
  // Optional: include if your pages read data.slug instead of entry.slug
  slug: z.string().optional(),
};

// Guides (strict)
const guides = defineCollection({
  type: "content",
  schema: z.object({
    ...base,
    publishDate: isoDate,        // required
    category: CATEGORY,          // required + enum-locked
    hubKey: z.string().optional()
  }),
});

// Posts (dates required; no strict category)
const posts = defineCollection({
  type: "content",
  schema: z.object({
    ...base,
    publishDate: isoDate,        // required
  }),
});

// Resources (optional category, but from same enum when present)
const resources = defineCollection({
  type: "content",
  schema: z.object({
    ...base,
    category: CATEGORY.optional(),
  }),
});

// Taxonomy
const taxonomy = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    hubKey: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

// Pages
const pages = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { guides, posts, resources, taxonomy, pages };




