import { defineCollection, z } from "astro:content";

const guides = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    publishDate: z.union([z.string(), z.date()])
      .transform((v) => new Date(v)),
    updatedDate: z.union([z.string(), z.date()]).optional()
      .transform((v) => (v ? new Date(v) : undefined)),
    draft: z.boolean().default(false),
    // add other fields here as needed
  }),
});

export const collections = { guides };

