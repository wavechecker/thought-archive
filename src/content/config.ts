import { defineCollection, z } from "astro:content";

// ✅ Existing guides collection
const guidesCollection = defineCollection({
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishDate: z.string().transform((str) => new Date(str)),
    updatedDate: z.string().transform((str) => new Date(str)).optional(),
    draft: z.boolean().default(false),
    tags: z.array(z.string()).optional(),
  }),
});

// ✅ New pages collection (lightweight schema)
const pagesCollection = defineCollection({
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    publishDate: z.string().transform((str) => new Date(str)),
    draft: z.boolean().default(false),
  }),
});

// ✅ Export both
export const collections = {
  guides: guidesCollection,
  pages: pagesCollection,
};


