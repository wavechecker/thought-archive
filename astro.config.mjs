// astro.config.mjs
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// IMPORTANT: this must be your production URL with https
export default defineConfig({
  site: "https://patientguide.io",
  integrations: [sitemap()],
  // If you have other integrations, include them here too, e.g.:
// integrations: [mdx(), sitemap(), tailwind()],
});
