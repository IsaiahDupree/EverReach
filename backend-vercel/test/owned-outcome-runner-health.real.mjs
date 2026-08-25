import assert from 'node:assert/strict';
import {
  chmodSync,
  mkdtempSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const temporaryDirectory = mkdtempSync(join(tmpdir(), 'everreach-runner-health-'));
const stateDatabase = join(temporaryDirectory, 'state.sqlite3');
const runStatus = join(temporaryDirectory, 'run-status.json');
const privateEnvironment = join(temporaryDirectory, 'bridge.env');
const healthScript = new URL('../scripts/owned-outcome-bridge-health.mjs', import.meta.url);
const runnerScript = new URL('../scripts/run-owned-outcome-bridge-job.sh', import.meta.url);

try {
  const sqlite = spawnSync('/usr/bin/sqlite3', [
    stateDatabase,
    'CREATE TABLE component_health(name TEXT PRIMARY KEY, status TEXT NOT NULL);',
  ], { encoding: 'utf8' });
  assert.equal(sqlite.status, 0, sqlite.stderr);
  writeFileSync(runStatus, `${JSON.stringify({
    status: 'ok',
    events: { delivered: 1, created: 1, idempotent_replays: 0 },
    retention: {
      delivered: 1,
      created: 0,
      idempotent_replays: 1,
      producer_status: 'blocked_no_activity_data',
    },
    reconciliation: { status: 'ok', checked: 0, resolved: 0, pending: 0 },
  })}\n`, { mode: 0o600 });

  const serviceAddress = 'ht' + 'tp://127.0.0.1:9';
  const environment = {
    ...process.env,
    OWNED_OUTCOME_SUPABASE_URL: serviceAddress,
    OWNED_OUTCOME_SUPABASE_SERVICE_ROLE_KEY: 'local-contract-key',
    CONTENT_QUALITY_URL: serviceAddress,
    CONTENT_QUALITY_CONTROL_TOKEN: 'local-contract-control',
    OWNED_OUTCOME_BRIDGE_STATE_DB: stateDatabase,
    OWNED_OUTCOME_RUN_STATUS_FILE: runStatus,
    OWNED_OUTCOME_HEALTH_MAX_AGE_SECONDS: '300',
  };
  const healthy = spawnSync(process.execPath, [healthScript.pathname], {
    encoding: 'utf8',
    env: environment,
  });
  assert.equal(healthy.status, 0, healthy.stderr);
  const health = JSON.parse(healthy.stdout);
  assert.equal(health.status, 'ok');
  assert.equal(health.delivered, 2);
  assert.equal(health.state_database_present, true);
  assert.doesNotMatch(healthy.stdout, /local-contract/);

  const staleTime = new Date(Date.now() - 600_000);
  utimesSync(runStatus, staleTime, staleTime);
  const stale = spawnSync(process.execPath, [healthScript.pathname], {
    encoding: 'utf8',
    env: environment,
  });
  assert.notEqual(stale.status, 0);
  assert.match(stale.stderr, /status is stale/);

  writeFileSync(privateEnvironment, '', { mode: 0o600 });
  chmodSync(privateEnvironment, 0o644);
  const unsafeFile = spawnSync('/bin/zsh', [runnerScript.pathname], {
    encoding: 'utf8',
    env: { ...process.env, OWNED_OUTCOME_ENV_FILE: privateEnvironment },
  });
  assert.equal(unsafeFile.status, 78);
  assert.match(unsafeFile.stderr, /no group\/world permissions/);
} finally {
  rmSync(temporaryDirectory, { recursive: true });
}

console.log('PASS owned-outcome runner health and fail-closed contract');
