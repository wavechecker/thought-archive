import { defineCollection, z } from "astro:content";

const HUB_FROM_CATEGORY: Record<string, string> = {
  "infectious disease": "Infectious Diseases",
  "infectious diseases": "Infectious Diseases",
  "infections": "Infectious Diseases",
  "vaccination": "Vaccination",
  "vaccinations": "Vaccination",
  "emergencies": "Emergencies",
  "heart & circulation": "Heart & Circulation",
  "cancer": "Cancer",
  "diabetes": "Diabetes",
  "women's health": "Women’s Health",
  "neurology": "Neurology",
  "general health": "General Health",
  "bowel cancer": "Bowel Cancer",
  "type 1 diabetes": "Type 1 Diabetes",
};

const norm = (s?: string) => (s ?? "").toLowerCase().trim();

const guides = defineCollection({
  schema: z
    .object({
      title: z.string().optional(),
      description: z.string().optional(),

      publishDate: z.union([z.string(), z.date()]).optional()
        .transform((v) => (v ? new Date(v) : undefined)),
      updatedDate: z.union([z.string(), z.date()]).optional()
        .transform((v) => (v ? new Date(v) : undefined)),

      draft: z.boolean().default(false),

      category: z.string().optional(),
      hubKey: z.string().optional(),

      tags: z.array(z.string()).optional(),
      slug: z.string().optional(),
    })
    .transform((data) => {
      // if hubKey missing, derive from category
      if (!data.hubKey && data.category) {
        const guess = HUB_FROM_CATEGORY[norm(data.category)];
        return { ...data, hubKey: guess ?? undefined };
      }
      return data;
    })
    .refine((d) => !!d.hubKey, {
      message:
        "hubKey is required (add hubKey in frontmatter or map this category in HUB_FROM_CATEGORY).",
    }),
});




