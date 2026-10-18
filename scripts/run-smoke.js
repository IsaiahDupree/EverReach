#!/usr/bin/env node
/*
  Smoke runner:
  - Kills dev servers on common ports
  - Starts Expo Web via `npm run start-web`
  - Waits until a local URL is reachable
  - Runs Playwright smoke test with WEB_BASE_URL and TEST_* env
  - Cleans up the dev server
*/
const { spawn, execSync } = require('child_process');
const http = require('http');
const path = require('path');

// Resolve project root based on this script's location so it works from ANY cwd
const ROOT = path.resolve(__dirname, '..');
const TIMEOUT_MS = 120_000; // total wait budget for server
const POLL_INTERVAL_MS = 1500;
const CANDIDATE_PORTS = [19006, 8081, 3000];
const CANDIDATE_BASES = CANDIDATE_PORTS.map(p => `http://localhost:${p}`);

function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

function killPort(port){
  try {
    // macOS: lsof to get PIDs then kill
    const pids = execSync(`lsof -ti tcp:${port} || true`, { stdio: ['ignore','pipe','pipe'] })
      .toString()
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);
    if (pids.length) {
      console.log(`[smoke] Killing port ${port}: PIDs ${pids.join(', ')}`);
      execSync(`kill -9 ${pids.join(' ')}`);
    }
  } catch (e) {
    console.warn(`[smoke] killPort(${port}) warn:`, e.message || String(e));
  }
}

async function isReachable(base){
  return new Promise(resolve => {
    const req = http.get(base, res => { res.resume(); resolve(true); });
    req.on('error', () => resolve(false));
    req.setTimeout(2000, () => { req.destroy(); resolve(false); });
  });
}

async function waitForServer(bases){
  const start = Date.now();
  const preferred = process.env.WEB_BASE_URL ? [process.env.WEB_BASE_URL] : bases;
  while ((Date.now() - start) < TIMEOUT_MS) {
    for (const b of preferred) {
      // Probe health-status first if possible, else root
      const url = b.replace(/\/$/, '') + '/health-status';
      const ok = await isReachable(url).catch(() => false);
      if (ok) return b;
      const okRoot = await isReachable(b).catch(() => false);
      if (okRoot) return b;
    }
    await sleep(POLL_INTERVAL_MS);
  }
  throw new Error('Timed out waiting for dev server to become reachable');
}

(async () => {
  // 1) Kill common dev ports
  for (const p of CANDIDATE_PORTS) killPort(p);

  // 2) Start Expo Web
  console.log('[smoke] Starting Expo Web: npm run start-web');
  const dev = spawn('npm', ['run', 'start-web'], { cwd: ROOT, stdio: 'inherit', env: { ...process.env } });

  let base;
  try {
    // 3) Wait for server
    base = await waitForServer(CANDIDATE_BASES);
    console.log(`[smoke] Dev server ready at ${base}`);

    // 4) Run Playwright smoke with credentials and base
    const email = process.env.TEST_EMAIL || 'isaiahdupree33@gmail.com';
    const pass = process.env.TEST_PASSWORD;
    if (!pass) {
      console.error('[smoke] TEST_PASSWORD not set');
      process.exitCode = 1;
      return;
    }

    console.log('[smoke] Running smoke-network.spec.ts');
    const test = spawn('npx', ['playwright', 'test', 'test/frontend/tests/smoke-network.spec.ts'], {
      cwd: ROOT,
      stdio: 'inherit',
      env: { ...process.env, WEB_BASE_URL: base, TEST_EMAIL: email, TEST_PASSWORD: pass },
    });

    await new Promise((resolve) => test.on('close', resolve));
  } catch (e) {
    console.error('[smoke] Error:', e?.message || String(e));
    process.exitCode = 1;
  } finally {
    // 5) Cleanup
    try {
      console.log('[smoke] Stopping dev server');
      dev.kill('SIGKILL');
      await sleep(1000);
      for (const p of CANDIDATE_PORTS) killPort(p);
    } catch {}
  }
})();
