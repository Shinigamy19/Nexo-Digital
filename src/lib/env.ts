/**
 * Centralized access to env vars. Throws on first access if a required var
 * is missing so we fail fast instead of at request time.
 *
 * Read order:
 *   1. process.env  — authoritative at runtime (works with `node --env-file=.env`)
 *   2. import.meta.env — Vite-inlined values (useful in dev / during build)
 *
 * Never read env vars directly elsewhere; always go through `env.*`.
 */
function required(name: string, value: string | undefined): string {
  if (!value || value.length === 0) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Copy .env.example to .env and fill in the values from your Supabase project settings, ` +
        `or run the server with \`node --env-file=.env dist/server/entry.mjs\`.`,
    );
  }
  if (isPlaceholderValue(value)) {
    throw new Error(
      `Environment variable ${name} is still set to a placeholder value ("${value}"). ` +
        `Replace it with the real value from your Supabase project settings.`,
    );
  }
  return value;
}

function isPlaceholderValue(value: string): boolean {
  const lower = value.toLowerCase();
  return (
    lower.includes('your_project_ref') ||
    lower.includes('your_anon') ||
    lower.includes('your_service') ||
    lower.includes('replace_me') ||
    lower === 'your_anon_public_key' ||
    lower === 'your_service_role_key'
  );
}

/**
 * True if any required env var is missing or still set to a placeholder
 * value (e.g. someone copied `.env.example` to `.env` and forgot to fill
 * it in). Use this at the top of code paths that *require* a real
 * Supabase backend (middleware, API routes) to fail gracefully with a
 * clear 503 instead of crashing with an obscure error.
 */
export function isPlaceholderEnv(): boolean {
  const url = read('PUBLIC_SUPABASE_URL');
  const anon = read('PUBLIC_SUPABASE_ANON_KEY');
  if (!url || !anon) return true;
  if (isPlaceholderValue(url)) return true;
  if (isPlaceholderValue(anon)) return true;
  return false;
}

function optional(value: string | undefined, fallback: string): string {
  return value && value.length > 0 ? value : fallback;
}

const read = (name: string): string | undefined => {
  const fromProcess = process.env[name];
  if (fromProcess && fromProcess.length > 0) return fromProcess;
  const fromVite = (import.meta.env as Record<string, string | undefined>)[name];
  return fromVite;
};

const url = read('PUBLIC_SUPABASE_URL') ?? '';
const anonKey = read('PUBLIC_SUPABASE_ANON_KEY') ?? '';
const serviceKey = read('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const siteUrl = read('PUBLIC_SITE_URL') ?? 'http://localhost:4321';
const databaseUrl = read('DATABASE_URL') ?? '';
const directUrl = read('DIRECT_URL') ?? '';

export const env = {
  get PUBLIC_SUPABASE_URL() {
    return required('PUBLIC_SUPABASE_URL', url);
  },
  get PUBLIC_SUPABASE_ANON_KEY() {
    return required('PUBLIC_SUPABASE_ANON_KEY', anonKey);
  },
  get SUPABASE_SERVICE_ROLE_KEY() {
    return required('SUPABASE_SERVICE_ROLE_KEY', serviceKey);
  },
  get PUBLIC_SITE_URL() {
    return siteUrl.replace(/\/$/, '');
  },
  get DATABASE_URL() {
    return required('DATABASE_URL', databaseUrl);
  },
  get DIRECT_URL() {
    return directUrl || databaseUrl;
  },
};
