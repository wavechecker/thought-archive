// astro.config.ts
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@astrojs/mdx";
import { fileURLToPath } from "node:url"; // ✅ needed for alias

export default defineConfig({
  // Canonical site URL (used for <link rel="canonical"> and JSON-LD @id
