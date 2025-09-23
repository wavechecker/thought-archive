// astro.config.ts
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@astrojs/mdx";

export default defineConfig({
  site: "https://patientguide.io",
  output: "static",
  trailingSlash: "never",
  integrations: [
    mdx(),
    sitemap({
      filter: (page) => !page.includes("/draft"),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
