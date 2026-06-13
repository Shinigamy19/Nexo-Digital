import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';

export interface SupabaseContext {
  supabase: SupabaseClient;
  headers: Headers;
}

/**
 * Creates a Supabase server client bound to the current request context.
 *
 * Uses @supabase/ssr's createServerClient which properly handles PKCE
 * code verifier storage in cookies for OAuth flows in SSR frameworks.
 */
export const createSupabaseServerClient = (
  context: { cookies: { get: (key: string) => { value: string | null } | undefined; set: (key: string, value: string, opts: Record<string, unknown>) => void; delete: (key: string, opts: Record<string, unknown>) => void }; request: Request },
  accessToken?: string,
): SupabaseContext => {
  const headers: Record<string, string> = {};
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const supabase = createServerClient(
    env.PUBLIC_SUPABASE_URL,
    env.PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(key: string) {
          return context.cookies.get(key)?.value ?? undefined;
        },
        set(key: string, value: string, opts: Record<string, unknown>) {
          context.cookies.set(key, value, opts as any);
        },
        remove(key: string, opts: Record<string, unknown>) {
          context.cookies.delete(key, opts as any);
        },
      },
      global: {
        headers,
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
    },
  );

  return { supabase, headers: new Headers() };
};

export const createSupabaseAdminClient = (): SupabaseClient => {
  return createClient(
    env.PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    },
  );
};
