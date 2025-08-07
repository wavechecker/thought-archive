import { defineCollection, z } from 'astro:content';

const posts = defineCollection({
  schema: z.object({
    title:       z.string().optional(),
    description: z.string().optional(),
    pubDate:     z.string().optional(),
    tags:        z.array(z.string()).optional(),
  }),
});

export const collections = { posts };
