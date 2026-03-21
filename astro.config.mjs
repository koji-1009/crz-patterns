import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  site: 'https://koji-1009.github.io',
  base: '/crz-patterns/',
  server: { port: 4321 },
  vite: {
    plugins: [tailwindcss()],
  },
});
