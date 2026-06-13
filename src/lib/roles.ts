/**
 * Role helpers. The source of truth lives in the database (see
 * `current_role()`, `is_moderator_or_admin()`, `is_admin()` in
 * supabase/migrations/0001_user_system.sql). These are TypeScript-side
 * conveniences for use in pages and components.
 */
import type { SessionUser, UserRole } from '../types/database';

export const ROLE_RANK: Record<UserRole, number> = {
  user: 0,
  moderator: 1,
  admin: 2,
};

export const isAuthenticated = (user: SessionUser | null | undefined): user is SessionUser =>
  Boolean(user);

export const roleOf = (user: SessionUser | null | undefined): UserRole =>
  user?.profile?.role ?? 'user';

export const isModerator = (user: SessionUser | null | undefined): boolean =>
  ROLE_RANK[roleOf(user)] >= ROLE_RANK.moderator;

export const isAdmin = (user: SessionUser | null | undefined): boolean =>
  ROLE_RANK[roleOf(user)] >= ROLE_RANK.admin;

export const canModerate = isModerator;

/**
 * Throws an `Error` if the user is not at least the required role. Use
 * inside API routes / server-side code that has already passed the
 * auth check. Pages can use `Astro.redirect()` instead.
 */
export function requireRole(
  user: SessionUser | null | undefined,
  required: UserRole,
): asserts user is SessionUser {
  if (!isAuthenticated(user)) {
    throw new Error('unauthenticated');
  }
  if (ROLE_RANK[roleOf(user)] < ROLE_RANK[required]) {
    throw new Error('forbidden');
  }
}
