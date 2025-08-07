import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';

export default defineConfig({
  // …any existing config…
  adapter: netlify(),
});
