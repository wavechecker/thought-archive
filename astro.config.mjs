// astro.config.ts
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  // Canonical site URL (used for <link rel="canonical"> and JSON-LD @id)
  site: "https://patientguide.io",

  // Output build as a static site (no SSR)
  output: "static",

  // Control how URLs are generated
  trailingSlash: "never",

  // Integrations
  integrations: [
    sitemap({
      filter: (page) => !page.includes("/draft"), // optional: skip draft pages in sitemap
    }),
  ],

  // Vite plugins
  vite: {
    plugins: [tailwindcss()],
  },
});
