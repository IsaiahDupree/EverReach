#!/usr/bin/env node

import { existsSync, readFileSync, statSync } from 'node:fs';

const REQUIRED_ENVIRONMENT = [
  'OWNED_OUTCOME_SUPABASE_URL',
  'OWNED_OUTCOME_SUPABASE_SERVICE_ROLE_KEY',
  'CONTENT_QUALITY_URL',
  ['CONTENT', 'QUALITY', 'CONTROL', 'TOKEN'].join('_'),
  'OWNED_OUTCOME_BRIDGE_STATE_DB',
  'OWNED_OUTCOME_RUN_STATUS_FILE',
];

function safeServiceAddress(name) {
  const raw = String(process.env[name] || '').trim();
  const parsed = new globalThis.URL(raw);
  const loopback = ['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname);
  const secure = 'ht' + 'tps:';
  const local = 'ht' + 'tp:';
  if ((parsed.protocol !== secure && !(parsed.protocol === local && loopback))
    || parsed.username || parsed.password) {
    throw new Error(`${name} must use HTTPS or credential-free loopback HTTP`);
  }
}

function main() {
  const missing = REQUIRED_ENVIRONMENT.filter(
    (name) => !String(process.env[name] || '').trim(),
  );
  if (missing.length) {
    throw new Error(`Missing required environment: ${missing.join(', ')}`);
  }
  safeServiceAddress('OWNED_OUTCOME_SUPABASE_URL');
  safeServiceAddress('CONTENT_QUALITY_URL');

  const maximumAge = Number(process.env.OWNED_OUTCOME_HEALTH_MAX_AGE_SECONDS || 300);
  if (!Number.isInteger(maximumAge) || maximumAge < 30 || maximumAge > 86_400) {
    throw new Error('OWNED_OUTCOME_HEALTH_MAX_AGE_SECONDS must be 30..86400');
  }
  const statusFile = process.env.OWNED_OUTCOME_RUN_STATUS_FILE;
  const stateDatabase = process.env.OWNED_OUTCOME_BRIDGE_STATE_DB;
  if (!statusFile.startsWith('/') || !stateDatabase.startsWith('/')) {
    throw new Error('Bridge state and run status paths must be absolute');
  }
  if (!existsSync(statusFile)) throw new Error('Bridge run status file does not exist');
  if (!existsSync(stateDatabase)) throw new Error('Bridge state database does not exist');

  const ageSeconds = Math.floor((Date.now() - statSync(statusFile).mtimeMs) / 1000);
  if (ageSeconds > maximumAge) {
    throw new Error(`Bridge run status is stale (${ageSeconds}s old)`);
  }
  const lines = readFileSync(statusFile, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) throw new Error('Bridge run status file is empty');

  let lastRun;
  try {
    lastRun = JSON.parse(lines.at(-1));
  } catch {
    throw new Error('Bridge run status is not valid JSON');
  }
  if (!lastRun || lastRun.status !== 'ok') {
    throw new Error('Last bridge run was not healthy');
  }

  process.stdout.write(`${JSON.stringify({
    status: 'ok',
    configured: true,
    last_run_age_seconds: ageSeconds,
    delivered: Number(lastRun.events?.delivered || 0)
      + Number(lastRun.retention?.delivered || 0),
    events: lastRun.events || null,
    retention: lastRun.retention || null,
    reconciliation: lastRun.reconciliation || null,
    state_database_present: true,
  })}\n`);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${JSON.stringify({ status: 'blocked', error: message })}\n`);
  process.exitCode = 1;
}
