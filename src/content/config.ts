import { defineCollection, z } from "astro:content";

// Blog posts (keep pubDate flexible so old posts don't break)
const posts = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    pubDate: z.coerce.date().optional(),
    description: z.string().optional(),
    tags: z.array(z.string()).default([]),
  }),
});

// Patient guides (new)
const guides = defineCollection({
  type: "content",
  schema: z.object({
    conditionName: z.string(),
    icd10: z.string().optional(),
    synonyms: z.array(z.string()).optional(),
    lang: z.enum(["en", "es", "ar", "zh"]).default("en"),
    summary: z.string().min(20),
    audience: z.enum(["patient", "caregiver"]).default("patient"),
    tags: z.array(z.string()).default([]),
    redFlags: z.array(z.string()).default([]),
    lastReviewed: z.string().optional(), // ISO date
    sources: z.array(z.object({
      name: z.string(),
      url: z.string().url(),
    })).min(1),
  }),
});

export const collections = { posts, guides };

