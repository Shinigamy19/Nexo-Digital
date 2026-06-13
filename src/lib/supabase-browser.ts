/**
 * Supabase client for the browser. Used by client-side scripts that need
 * to call Supabase outside of an Astro page render (e.g. live UI updates).
 */
import { createBrowserClient } from '@supabase/ssr';

export const createSupabaseBrowserClient = () => {
  return createBrowserClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
  );
};
