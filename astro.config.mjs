// astro.config.mjs
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://patientguide.io',   // REQUIRED for absolute URLs
  integrations: [
    sitemap(),                       // Auto-generates /sitemap-index.xml
  ],
});
