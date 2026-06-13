// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

// https://astro.build/config
// Output is hybrid by default: pages are prerendered (static) unless they
// opt-in to SSR with `export const prerender = false`. Auth/profile pages
// use SSR to read/write cookies and talk to Supabase.
export default defineConfig({
  output: 'server',
  adapter: vercel(),
  server: {
    port: 4321,
    host: true,
  },
  vite: {
    ssr: {
      noExternal: ['@supabase/ssr'],
    },
  },
});
