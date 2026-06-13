/**
 * End-to-end test:
 * - Creates a test user via admin API
 * - Starts the Astro dev server
 * - Logs in via HTTP POST
 * - Checks the Set-Cookie header
 * - Follows the redirect with the cookie
 * - Verifies the user is authenticated on the next request
 */

import { createClient } from '@supabase/supabase-js';
import { spawn } from 'node:child_process';
import { request } from 'node:http';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { execPath } = process;
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing env vars. Set PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

// 1. Create test user
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const testEmail = `test-e2e-${Date.now()}@example.com`;
const testPass = 'StrongP@ss1';

console.log('Creating test user:', testEmail);
const { error: createErr } = await admin.auth.admin.createUser({ email: testEmail, password: testPass, email_confirm: true });
if (createErr) { console.error('FAIL:', createErr); process.exit(1); }
console.log('OK');

// 2. Start server
console.log('\nStarting server...');
const server = spawn('node', [
  require.resolve('astro/bin/astro.mjs'), 'dev', '--port', '4321'
], {
  cwd: resolve(__dirname, '..'),
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, FORCE_COLOR: '0' },
});
server.stdout.on('data', () => {});
server.stderr.on('data', () => {});

// Wait for server
for (let i = 0; i < 30; i++) {
  try {
    await fetch('http://localhost:4321/', { signal: AbortSignal.timeout(2000) });
    break;
  } catch { await new Promise(r => setTimeout(r, 1000)); }
}
console.log('Server ready');

// 3. Helper: make HTTP request
function httpRequest(url, opts) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const options = {
      hostname: u.hostname, port: u.port, path: u.pathname + u.search,
      method: opts?.method || 'GET',
      headers: opts?.headers || {},
    };
    const req = request(options, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({
        status: res.statusCode,
        headers: res.headers,
        body: Buffer.concat(chunks).toString(),
      }));
    });
    req.on('error', reject);
    if (opts?.body) req.write(opts.body);
    req.end();
  });
}

// 4. Login
console.log('\nPOST /api/auth/login');
const body = `email=${encodeURIComponent(testEmail)}&password=${encodeURIComponent(testPass)}`;
const loginRes = await httpRequest('http://localhost:4321/api/auth/login?next=/perfil', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(body),
    'Origin': 'http://localhost:4321',
    'Referer': 'http://localhost:4321/login',
  },
  body,
});

console.log('Status:', loginRes.status);
console.log('Location:', loginRes.headers.location);

const setCookie = loginRes.headers['set-cookie'];
if (Array.isArray(setCookie)) {
  console.log('Set-Cookie count:', setCookie.length);
  setCookie.forEach((c, i) => console.log(`  [${i}] ${c.substring(0, 120)}...`));
} else if (setCookie) {
  console.log('Set-Cookie:', setCookie.substring(0, 120) + '...');
} else {
  console.log('WARNING: No Set-Cookie header in response!');
  console.log('All response headers:', JSON.stringify(loginRes.headers, null, 2));
}

if (setCookie) {
  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
  console.log('\nGET /perfil with cookies');
  const profileRes = await httpRequest('http://localhost:4321/perfil', {
    headers: { 'Cookie': cookies.join('; ') },
  });
  console.log('Profile status:', profileRes.status);
  console.log('Profile location:', profileRes.headers.location);
  console.log('Profile body (first 400):', profileRes.body.substring(0, 400));

  if (profileRes.status === 200) {
    console.log('\n*** SUCCESS: Session persisted! ***');
  } else if (profileRes.status === 303 && profileRes.headers.location?.startsWith('/login')) {
    console.log('\n*** FAILED: Redirected to login (session not persisted) ***');
  }
}

// 5. Cleanup
console.log('\nCleaning up...');
server.kill();
process.exit(0);
