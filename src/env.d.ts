/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { SessionUser } from './types/database';

declare global {
  namespace App {
  interface Locals {
    /**
     * Supabase client bound to the current request. Populated by the
     * middleware on every server-rendered request. `undefined` on
     * statically prerendered pages (the marketing site).
     */
    supabase?: SupabaseClient;
    /**
     * Authenticated user and their profile. `null` when the visitor is
     * signed out. `undefined` on statically prerendered pages.
     */
    user?: SessionUser | null;
  }
  }
}

export {};
