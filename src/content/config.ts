// src/content/config.ts
import { defineCollection, z } from "astro:content";

// -----------------------------
// Reusable validators
// -----------------------------
const isoDate = z.string().refine((d) => !Number.isNaN(Date.parse(d)), {
  message: "Invalid date — use ISO YYYY-MM-DD",
});

// -----------------------------
// Canonical categories
// NOTE: ASCII apostrophe in "Women's Health" (avoid smart-quote drift)
// -----------------------------
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
  "Obesity & Metabolic Health Hub",
  "Guide Hubs",
]);

// Optional categories for posts
const POST_CATEGORY = z.enum([
  "AI & Society",
  "Health & Policy",
  "Opinion",
]);

// -----------------------------
// Common fields
// -----------------------------
const base = {
  title: z.string(),
  description: z.string().optional(),
  publishDate: isoDate.optional(),
  updatedDate: isoDate.optional(),
  draft: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  image: z.string().optional(),
  slug: z.string().optional(), // optional: for custom routing
};

// -----------------------------
// Guides (strict, category required)
// -----------------------------
const guides = defineCollection({
  type: "content",
  schema: z.object({
    ...base,
    publishDate: isoDate, // required
    category: CATEGORY,   // required + enum-locked
    hubKey: z.string().optional(),
  }),
});

// -----------------------------
// Posts (category optional)
// -----------------------------
const posts = defineCollection({
  type: "content",
  schema: z.object({
    ...base,
    publishDate: isoDate,               // required
    category: POST_CATEGORY.optional(), // optional grouping
    related: z.array(z.string()).optional(),
  }),
});

// -----------------------------
// Resources (tools, checklists, quick refs)
// Category optional, but must match CATEGORY when used
// -----------------------------
const resources = defineCollection({
  type: "content",
  schema: z.object({
    ...base,
    publishDate: isoDate,        // required for consistency
    category: CATEGORY.optional(),
  }),
});

// -----------------------------
// Taxonomy (hub definitions, category mapping)
// -----------------------------
const taxonomy = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    hubKey: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

// -----------------------------
// Pages (static content like About, Contact)
// -----------------------------
const pages = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

// -----------------------------
// Export all collections
// -----------------------------
export const collections = {
  guides,
  posts,
  resources,
  taxonomy,
  pages,
};





