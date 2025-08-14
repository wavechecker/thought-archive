import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

export default defineConfig({
  integrations: [mdx()],
  vite: {
    resolve: {
      alias: {
        // Optional, but harmless if you want to use "@/..."
        '@': '/src',
      },
    },
  },
});
