// src/content/config.ts
import { defineCollection, z } from "astro:content";

// Reusable validators
const isoDate = z.string().refine((d) => !Number.isNaN(Date.parse(d)), {
  message: "Invalid date — use ISO YYYY-MM-DD",
});

// Keep this list as your single source of truth for categories
const CATEGORY = z.enum([
  "Emergencies",
  "Infectious Diseases",
  "Vaccination",
  "Heart & Circulation",
  "Women’s Health",
  "Diabetes",
  "Cancer",
  "Neurology",
  "Mental Health",
  "General Health",
  "End of Life",   // ← NEW for VAD content
  "Child & Adolescent Health",
  "Guide Hubs",    // ← if you publish hub cards as guides
]);

// Common fields
const base = {
  title: z.string(),
  description: z.string().optional(),
  // Prefer string dates so you control formatting in the UI
  publishDate: isoDate.optional(),        // will override per-collection below
  updatedDate: isoDate.optional(),
  draft: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  image: z.string().optional(),
  // Optional: add slug if your pages reference data.slug instead of entry.slug
  slug: z.string().optional(),
};

// Guides
const guides = defineCollection({
  type: "content",
  schema: z.object({
    ...base,
    // Make dates required for guides (safer for lists/sitemaps)
    publishDate: isoDate,
    category: CATEGORY,                  // strict categories prevent typos
    hubKey: z.string().optional(),       // used by your Guide Hubs listing
  }),
});

// Posts
const posts = defineCollection({
  type: "content",
  schema: z.object({
    ...base,
    publishDate: isoDate,                // require for posts too
    // Posts usually don’t need a strict category, but you can add one if you like
  }),
});

// Resources
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





