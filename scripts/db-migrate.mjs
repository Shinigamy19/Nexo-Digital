#!/usr/bin/env node
/**
 * Migration helper. Tries the Supabase CLI first; falls back to
 * printing the dashboard steps + a copy-paste-ready SQL preview.
 *
 * Usage:
 *   npm run db:migrate              # print instructions for the next unapplied migration
 *   npm run db:migrate -- --all     # print all migrations
 *   npm run db:migrate -- --diff    # also print a one-line summary of what each does
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const MIGRATIONS_DIR = 'supabase/migrations';
const args = new Set(process.argv.slice(2));
const wantAll = args.has('--all') || args.has('-a');
const wantDiff = args.has('--diff') || args.has('-d');

function trySupabaseCli() {
  const r = spawnSync('supabase', ['--version'], { encoding: 'utf8' });
  return r.status === 0;
}

function getMigrations() {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => ({ file: f, path: join(MIGRATIONS_DIR, f), content: readFileSync(join(MIGRATIONS_DIR, f), 'utf8') }));
}

function summarize(content) {
  const lines = content.split('\n');
  const tables = [...content.matchAll(/CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+([a-z_."]+)/gi)].map((m) => m[1].replace(/"/g, ''));
  const policies = [...content.matchAll(/CREATE\s+POLICY\s+"([^"]+)"/gi)].map((m) => m[1]);
  const triggers = [...content.matchAll(/CREATE\s+(?:OR\s+REPLACE\s+)?TRIGGER\s+([a-z_]+)/gi)].map((m) => m[1]);
  const functions = [...content.matchAll(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+([a-z_.]+)/gi)].map((m) => m[1]);
  return {
    tables: Array.from(new Set(tables)),
    policies,
    triggers,
    functions,
    lines: lines.length,
  };
}

console.log('🗄️  Nexo Digital — Supabase migration helper\n');

const hasCli = trySupabaseCli();
const migrations = getMigrations();

if (hasCli) {
  console.log('✅ Supabase CLI detected.\n');
  console.log('Recommended workflow (requires `supabase link` first):\n');
  console.log('  supabase db push                  # apply all pending migrations');
  console.log('  supabase db diff -f <name>        # generate a new migration from local diff\n');
  console.log('Pending migrations:');
  for (const m of migrations) {
    console.log(`  - ${m.file}`);
  }
  process.exit(0);
}

console.log('ℹ️  Supabase CLI not detected. Use the dashboard instead.\n');
console.log('Steps:');
console.log('  1. Open https://supabase.com/dashboard → your project');
console.log('  2. Click "SQL Editor" in the sidebar (icon: ▸_)');
console.log('  3. Click "New query"');
console.log('  4. Paste the content of the migration file (see below)');
console.log('  5. Click "Run" (or Cmd/Ctrl+Enter)');
console.log('  6. Repeat for each migration, in order\n');

const toShow = wantAll ? migrations : migrations.slice(0, 1);
for (const m of toShow) {
  console.log('─'.repeat(70));
  console.log(`📄 ${m.file}`);
  console.log('─'.repeat(70));
  if (wantDiff) {
    const s = summarize(m.content);
    console.log(`   ${s.lines} lines`);
    if (s.tables.length)   console.log(`   tables:   ${s.tables.join(', ')}`);
    if (s.policies.length) console.log(`   policies: ${s.policies.length} (${s.policies.slice(0, 3).join(', ')}${s.policies.length > 3 ? '…' : ''})`);
    if (s.triggers.length) console.log(`   triggers: ${s.triggers.join(', ')}`);
    if (s.functions.length)console.log(`   funcs:    ${s.functions.join(', ')}`);
    console.log('');
  }
  console.log(m.content);
  console.log('');
}

if (!wantAll && migrations.length > 1) {
  console.log(`💡 ${migrations.length - 1} more migration(s) not shown. Run with --all to see all.\n`);
  console.log(`   npm run db:migrate -- --all\n`);
}
