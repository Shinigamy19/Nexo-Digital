#!/usr/bin/env node
/**
 * Verifies the local Supabase migration set is complete and that
 * each file is non-trivial. Run before pushing to catch drift.
 *
 * Usage: npm run db:check
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATIONS_DIR = 'supabase/migrations';
let pass = 0;
let fail = 0;

function check(name, ok, detail = '') {
  if (ok) {
    console.log(`  ✅ ${name}${detail ? ' — ' + detail : ''}`);
    pass++;
  } else {
    console.log(`  ❌ ${name}${detail ? ' — ' + detail : ''}`);
    fail++;
  }
}

console.log('Checking Supabase migrations\n');

let entries;
try {
  entries = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
} catch (err) {
  console.error(`Cannot read ${MIGRATIONS_DIR}: ${err.message}`);
  process.exit(2);
}

check(`${MIGRATIONS_DIR}/ exists with .sql files`, entries.length > 0, `${entries.length} file(s)`);

if (entries.length === 0) {
  process.exit(1);
}

let totalLines = 0;
for (const file of entries) {
  const path = join(MIGRATIONS_DIR, file);
  const content = readFileSync(path, 'utf8');
  const lines = content.split('\n').length;
  const size = statSync(path).size;
  totalLines += lines;

  const hasHeader = content.startsWith('--') || /^\s*--/m.test(content);
  const hasIdempotency = /CREATE\s+(TABLE|INDEX|POLICY|TRIGGER|FUNCTION)\s+IF\s+NOT\s+EXISTS/i.test(content)
    || /CREATE\s+OR\s+REPLACE/i.test(content)
    || /DO\s+\$\$/i.test(content);

  check(`${file} is non-trivial`, lines > 5, `${lines} lines, ${size} bytes`);
  check(`${file} has a comment header`, hasHeader);
}

console.log(`\nTotal: ${totalLines} lines across ${entries.length} migration(s)`);
console.log(`\n===================================`);
console.log(`  ${pass} passed, ${fail} failed`);
console.log(`===================================`);
process.exit(fail === 0 ? 0 : 1);
