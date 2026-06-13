/**
 * Helpers for parsing form submissions on the server. Forms send
 * everything as strings, so we need to coerce to the right types and
 * validate before inserting into Supabase.
 *
 * All helpers are pure and never throw on malformed input — they
 * return a sane fallback so the caller can surface a user-friendly
 * error in the form.
 */

/**
 * Safely extract a string value from a `FormData` entry. Returns `null`
 * if the field is missing or is a `File` (i.e. a multipart file upload,
 * which none of our text fields expect). Use this at the top of an API
 * handler to coerce form input to the `string | null` shape the rest of
 * the helpers in this file expect.
 */
export function formValue(form: FormData, key: string): string | null {
  const v = form.get(key);
  return typeof v === 'string' ? v : null;
}

const MAX_ITEMS = 20;
const MAX_ITEM_LENGTH = 80;
const MAX_DESC_LENGTH = 2000;
const MAX_TITLE_LENGTH = 120;
const MIN_TITLE_LENGTH = 4;
const MAX_COMPANY_LENGTH = 80;
const MAX_LOCATION_LENGTH = 120;
const MAX_CONTACT_LENGTH = 200;
const MAX_URL_LENGTH = 500;
const MIN_URL_LENGTH = 8;

/**
 * Split a comma-separated string into a clean, deduplicated list. Empty
 * entries are dropped. Trims whitespace. Caps length of each entry.
 *
 * "  React, typescript , react , " → ["React", "typescript", "react"]
 */
export function parseStringList(value: string | null | undefined, max = MAX_ITEMS): string[] {
  if (!value || typeof value !== 'string') return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of value.split(',')) {
    const item = raw.trim().slice(0, MAX_ITEM_LENGTH);
    if (!item) continue;
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= max) break;
  }
  return out;
}

/**
 * Parse a non-empty string field. Returns null if missing or too short
 * (caller decides whether that's an error).
 */
export function parseText(
  value: string | null | undefined,
  min: number,
  max: number,
): string | null {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) return null;
  return trimmed;
}

/**
 * Optional text. Returns null if empty, otherwise trims and clamps.
 */
export function parseOptionalText(
  value: string | null | undefined,
  max: number,
): string | null {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

/**
 * Parse an integer from a form field. Returns null if empty, undefined
 * if invalid (so callers can decide), or the integer.
 */
export function parseInt(
  value: string | null | undefined,
): number | null | undefined {
  if (value === null || value === undefined || value === '') return null;
  const trimmed = String(value).trim();
  if (!/^-?\d+$/.test(trimmed)) return undefined;
  const n = Number.parseInt(trimmed, 10);
  if (Number.isNaN(n)) return undefined;
  return n;
}

/**
 * Parse a boolean from a checkbox / hidden field. Forms send "on",
 * "true", "1" as truthy.
 */
export function parseBool(value: string | null | undefined): boolean {
  if (!value) return false;
  const v = String(value).toLowerCase().trim();
  return v === 'on' || v === 'true' || v === '1' || v === 'yes';
}

/**
 * Coerce a string to one of the values in `allowed`. Returns null if
 * the value is not allowed (callers should treat that as a 400).
 */
export function parseEnum<T extends string>(
  value: string | null | undefined,
  allowed: readonly T[],
): T | null {
  if (!value) return null;
  return allowed.includes(value as T) ? (value as T) : null;
}

// Limits re-exported for the API routes that need to compose them.
export const LIMITS = {
  MAX_ITEMS,
  MAX_ITEM_LENGTH,
  MAX_DESC_LENGTH,
  MAX_TITLE_LENGTH,
  MIN_TITLE_LENGTH,
  MAX_COMPANY_LENGTH,
  MAX_LOCATION_LENGTH,
  MAX_CONTACT_LENGTH,
  MAX_URL_LENGTH,
  MIN_URL_LENGTH,
} as const;
