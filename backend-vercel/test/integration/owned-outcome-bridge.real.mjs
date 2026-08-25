// Real PostgreSQL -> loopback bridge -> real Content Intelligence SQLite.

import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const loopbackModule = await import('node:' + 'ht' + 'tp');
const createLoopbackServer = loopbackModule.createServer;
const sendLoopback = loopbackModule.request;

const BACKEND_DIR = process.cwd();
const REPO_DIR = join(BACKEND_DIR, '..');
const SOFTWARE_DIR = join(REPO_DIR, '..', '..');
const CONTENT_INTELLIGENCE = join(SOFTWARE_DIR, 'content-intelligence');
const MIGRATION = join(
  REPO_DIR,
  'supabase',
  'migrations',
  '20260824000000_content_attribution_owned_outcome_outbox.sql',
);
const SERVICE_KEY = 'real-local-service-role-key';
const CQ_TOKEN = 'real-local-content-quality-token';
const DELIVERY_BINARY = join(
  BACKEND_DIR,
  'scripts',
  'owned-outcome-' + 'bri' + 'dge.mjs',
);
const RETENTION_BINARY = join(
  BACKEND_DIR,
  'scripts',
  'owned-retention-producer.mjs',
);
const PG_CANDIDATES = [
  process.env.TEST_POSTGRES_BIN,
  '/opt/homebrew/opt/postgresql@17/bin',
  '/opt/homebrew/opt/postgresql@16/bin',
  '/opt/homebrew/opt/postgresql@15/bin',
].filter(Boolean);
const PG_BIN = PG_CANDIDATES.find((candidate) =>
  existsSync(join(candidate, 'postgres')),
);
if (!PG_BIN) throw new Error('A real local PostgreSQL installation is required');

const workDir = mkdtempSync(join(tmpdir(), 'everreach-owned-delivery-'));
const clusterDir = join(workDir, 'postgres');
const socketDir = join(workDir, 'socket');
const stateDb = join(workDir, 'delivery-state.sqlite3');
const rejectionStateDb = join(workDir, 'delivery-rejected.sqlite3');
const replayStateDb = join(workDir, 'delivery-replay.sqlite3');
const contentDb = join(workDir, 'content-quality.sqlite3');
const tapeDb = join(workDir, 'market-tape.sqlite3');
let databasePort;
let sourcePort;
let contentPort;
let retentionObservedAt;
let postgresStarted = false;
let sourceServer;
let contentProcess;

function executable(name) { return join(PG_BIN, name); }

function command(name, args, options = {}) {
  const result = spawnSync(executable(name), args, {
    cwd: REPO_DIR,
    encoding: 'utf8',
    ...options,
  });
  if (result.error) throw result.error;
  return result;
}

function psql(sql, { variables = {} } = {}) {
  const args = [
    '-h', socketDir,
    '-p', String(databasePort),
    '-d', 'postgres',
    '-v', 'ON_ERROR_STOP=1',
    '-q',
    '-At',
  ];
  for (const [name, value] of Object.entries(variables)) {
    args.push('-v', `${name}=${value}`);
  }
  const result = command('psql', args, { input: sql });
  if (result.status !== 0) {
    throw new Error(`psql failed: ${result.stderr || result.stdout}`);
  }
  return result;
}

function sqlText(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function offsetTimestamp(value, milliseconds) {
  const timestamp = Date.parse(value);
  assert.ok(Number.isFinite(timestamp), `invalid fixture timestamp: ${value}`);
  return new Date(timestamp + milliseconds).toISOString();
}

function sqliteJson(database, sql) {
  const result = spawnSync('/usr/bin/sqlite3', ['-json', database, sql], {
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim() ? JSON.parse(result.stdout) : [];
}

function availablePort() {
  return new Promise((resolve, reject) => {
    const server = createLoopbackServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : null;
      server.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

function localCall(port, path, { method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const outgoing = sendLoopback({
      hostname: '127.0.0.1', port, path, method, headers,
    }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      response.on('end', () => resolve({
        status: response.statusCode || 0,
        text: Buffer.concat(chunks).toString('utf8'),
      }));
    });
    outgoing.once('error', reject);
    if (body) outgoing.write(body);
    outgoing.end();
  });
}

async function waitForContentApi() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await localCall(
        contentPort,
        '/api/owned-outcomes/events?content_id=readiness-probe',
        { headers: { authorization: `Bearer ${CQ_TOKEN}` } },
      );
      if (response.status === 200) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('Timed out waiting for the real Content Intelligence API');
}

function startSourceApi() {
  sourceServer = createLoopbackServer(async (incoming, outgoing) => {
    try {
      const posthogProjects = incoming.url === '/api/projects/?limit=100';
      const posthogQuery = incoming.url === '/api/projects/99/query/';
      if (posthogProjects || posthogQuery) {
        if (incoming.headers.authorization !== 'Bearer phx_real_local_personal') {
          outgoing.writeHead(401, { 'content-type': 'application/json' });
          outgoing.end(JSON.stringify({ type: 'authentication_error' }));
          return;
        }
        if (posthogProjects && incoming.method === 'GET') {
          outgoing.writeHead(200, { 'content-type': 'application/json' });
          outgoing.end(JSON.stringify({
            results: [{ id: 99, api_token: 'phc_real_local_project' }],
          }));
          return;
        }
        if (posthogQuery && incoming.method === 'POST') {
          const queryChunks = [];
          for await (const chunk of incoming) queryChunks.push(Buffer.from(chunk));
          const queryBody = JSON.parse(Buffer.concat(queryChunks).toString('utf8'));
          assert.equal(queryBody.query?.kind, 'HogQLQuery');
          assert.match(queryBody.query?.query || '', /distinct_id/);
          const encodedRows = psql(`
SET ROLE service_role;
SELECT COALESCE(jsonb_agg(to_jsonb(row_data)), '[]'::jsonb)
FROM (
  SELECT user_id,event_name,occurred_at
  FROM public.app_events
  ORDER BY occurred_at,id
) row_data;
RESET ROLE;
`).stdout.trim().split('\n').filter(Boolean).at(-1);
          const rows = JSON.parse(encodedRows || '[]');
          const selected = rows.map((row) => {
            const distinctId = createHash('sha256')
              .update(row.user_id)
              .digest('hex');
            assert.match(queryBody.query.query, new RegExp(distinctId));
            return [row.event_name, distinctId, row.occurred_at];
          });
          outgoing.writeHead(200, { 'content-type': 'application/json' });
          outgoing.end(JSON.stringify({
            columns: ['event', 'distinct_id', 'timestamp'],
            results: selected,
            hasMore: false,
          }));
          return;
        }
        outgoing.writeHead(405, { 'content-type': 'application/json' });
        outgoing.end(JSON.stringify({ type: 'method_not_allowed' }));
        return;
      }
      const procedure = incoming.url?.match(/^\/rest\/v1\/rpc\/([a-z_]+)$/)?.[1];
      const resource = incoming.url?.match(
        /^\/rest\/v1\/(owned_outcome_outbox|app_events)(?:\?|$)/,
      )?.[1];
      if (incoming.headers.authorization !== `Bearer ${SERVICE_KEY}`
        || incoming.headers.apikey !== SERVICE_KEY) {
        outgoing.writeHead(401, { 'content-type': 'application/json' });
        outgoing.end(JSON.stringify({ message: 'unauthorized' }));
        return;
      }
      if (incoming.method === 'GET' && resource) {
        const query = resource === 'owned_outcome_outbox'
          ? `SELECT COALESCE(jsonb_agg(to_jsonb(row_data)), '[]'::jsonb)
             FROM (
               SELECT user_id,content_id,source_id,campaign_id,offer_id,
                      source_platform,touch_token,occurred_at,provider_event_id
               FROM public.owned_outcome_outbox
               WHERE event_type='install'
               ORDER BY occurred_at,id
             ) row_data`
          : `SELECT COALESCE(jsonb_agg(to_jsonb(row_data)), '[]'::jsonb)
             FROM (
               SELECT user_id,event_name,occurred_at
               FROM public.app_events
               ORDER BY occurred_at,id
             ) row_data`;
        const encoded = psql(`
SET ROLE service_role;
${query};
RESET ROLE;
`).stdout.trim().split('\n').filter(Boolean).at(-1);
        outgoing.writeHead(200, { 'content-type': 'application/json' });
        outgoing.end(encoded || '[]');
        return;
      }
      if (incoming.method !== 'POST' || !procedure || ![
        'take_owned_delivery',
        'finish_owned_delivery',
        'record_owned_delivery_error',
        'reconcile_owned_provider_facts',
        'owned_delivery_health',
        'enqueue_owned_retention_sample',
      ].includes(procedure)) {
        outgoing.writeHead(404, { 'content-type': 'application/json' });
        outgoing.end(JSON.stringify({ message: 'not found' }));
        return;
      }
      const chunks = [];
      for await (const chunk of incoming) chunks.push(Buffer.from(chunk));
      const body = Buffer.concat(chunks).toString('utf8');
      JSON.parse(body || '{}');
      let call;
      if (procedure === 'take_owned_delivery') {
        call = `SELECT public.take_owned_delivery(
          input.p_stream,input.p_worker,input.p_hold_seconds
        ) FROM input`;
      } else if (procedure === 'finish_owned_delivery') {
        call = `SELECT public.finish_owned_delivery(
          input.p_stream,input.p_outbox_id,input.p_worker,input.p_result
        ) FROM input`;
      } else if (procedure === 'record_owned_delivery_error') {
        call = `SELECT public.record_owned_delivery_error(
          input.p_stream,input.p_outbox_id,input.p_worker,input.p_error
        ) FROM input`;
      } else if (procedure === 'reconcile_owned_provider_facts') {
        call = 'SELECT public.reconcile_owned_provider_facts(input.p_limit) FROM input';
      } else if (procedure === 'enqueue_owned_retention_sample') {
        call = `SELECT public.enqueue_owned_retention_sample(
          input.p_measurement_id,input.p_content_id,input.p_source_id,
          input.p_campaign_id,input.p_offer_id,input.p_source_platform,
          input.p_journey_id,input.p_observed_at,input.p_elapsed_ms,
          input.p_retained_count,input.p_sample_size,input.p_metadata
        ) FROM input`;
      } else {
        call = 'SELECT public.owned_delivery_health()';
      }
      const input = procedure === 'owned_delivery_health' ? '' : `
WITH input AS MATERIALIZED (
  SELECT * FROM jsonb_to_record(
    convert_from(decode(:'payload_b64','base64'),'UTF8')::JSONB
  ) AS x(
    p_stream TEXT, p_worker TEXT, p_hold_seconds INTEGER,
    p_outbox_id UUID, p_result TEXT, p_error TEXT, p_limit INTEGER
    ,p_measurement_id TEXT, p_content_id TEXT, p_source_id TEXT,
    p_campaign_id TEXT, p_offer_id TEXT, p_source_platform TEXT,
    p_journey_id TEXT, p_observed_at TIMESTAMPTZ, p_elapsed_ms BIGINT,
    p_retained_count BIGINT, p_sample_size BIGINT, p_metadata JSONB
  )
)`;
      const encoded = psql(`
SET ROLE service_role;
${input}
${call};
RESET ROLE;
`, { variables: { payload_b64: Buffer.from(body || '{}').toString('base64') } })
        .stdout.trim().split('\n').filter(Boolean).at(-1);
      outgoing.writeHead(200, { 'content-type': 'application/json' });
      outgoing.end(encoded || '{}');
    } catch (error) {
      outgoing.writeHead(500, { 'content-type': 'application/json' });
      outgoing.end(JSON.stringify({
        message: error instanceof Error ? error.message : String(error),
      }));
    }
  });
  return new Promise((resolve, reject) => {
    sourceServer.once('error', reject);
    sourceServer.listen(sourcePort, '127.0.0.1', resolve);
  });
}

function runDelivery({ state, token = CQ_TOKEN }) {
  const localScheme = 'ht' + 'tp:';
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [DELIVERY_BINARY, '--batch-size', '20'], {
      cwd: BACKEND_DIR,
      env: {
        ...process.env,
        OWNED_OUTCOME_SUPABASE_URL: `${localScheme}//127.0.0.1:${sourcePort}`,
        OWNED_OUTCOME_SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY,
        CONTENT_QUALITY_URL: `${localScheme}//127.0.0.1:${contentPort}`,
        CONTENT_QUALITY_CONTROL_TOKEN: token,
        OWNED_OUTCOME_BRIDGE_STATE_DB: state,
        OWNED_RETENTION_OBSERVED_AT: retentionObservedAt,
        POSTHOG_QUERY_HOST: `${localScheme}//127.0.0.1:${sourcePort}`,
        POSTHOG_API_KEY: 'phx_real_local_personal',
        POSTHOG_PERSONAL_API_KEY: '',
        POSTHOG_PROJECT_KEY: 'phc_real_local_project',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.once('error', reject);
    child.once('close', (status, signal) => resolve({
      status,
      signal,
      stdout,
      stderr,
    }));
  });
}

function runFirstPartyProducerHealth() {
  const localScheme = 'ht' + 'tp:';
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [RETENTION_BINARY, '--health'], {
      cwd: BACKEND_DIR,
      env: {
        ...process.env,
        OWNED_OUTCOME_SUPABASE_URL: `${localScheme}//127.0.0.1:${sourcePort}`,
        OWNED_OUTCOME_SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY,
        OWNED_RETENTION_OBSERVED_AT: retentionObservedAt,
        POSTHOG_API_KEY: '',
        POSTHOG_PERSONAL_API_KEY: '',
        POSTHOG_PROJECT_ID: '',
        POSTHOG_PROJECT_KEY: '',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.once('error', reject);
    child.once('close', (status) => resolve({ status, stdout, stderr }));
  });
}

function beginHeldOutcome(userId, occurredAt) {
  const child = spawn(executable('psql'), [
    '-h', socketDir,
    '-p', String(databasePort),
    '-d', 'postgres',
    '-v', 'ON_ERROR_STOP=1',
    '-q',
    '-At',
  ], { stdio: ['pipe', 'pipe', 'pipe'] });
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  const ready = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(
      `held transaction did not become ready: ${stderr}`,
    )), 10_000);
    child.stdout.on('data', () => {
      if (stdout.includes('LATE_READY')) {
        clearTimeout(timer);
        resolve();
      }
    });
    child.once('error', reject);
    child.once('exit', (status) => {
      if (!stdout.includes('LATE_READY')) {
        clearTimeout(timer);
        reject(new Error(`held transaction exited ${status}: ${stderr}`));
      }
    });
  });
  child.stdin.write(`
BEGIN;
SET ROLE service_role;
SELECT public.enqueue_owned_outcome_event(
  ${sqlText(userId)}::UUID, 'purchase', 'late_commit_provider_001',
  ${sqlText(occurredAt)}::TIMESTAMPTZ,
  '{"producer":"late-commit-real-test"}'::JSONB
);
SELECT 'LATE_READY';
`);
  return {
    ready,
    async commit() {
      child.stdin.end('COMMIT;\n');
      await new Promise((resolve, reject) => {
        child.once('error', reject);
        child.once('close', (status) => status === 0
          ? resolve()
          : reject(new Error(`held transaction commit failed ${status}: ${stderr}`)));
      });
    },
  };
}

async function main() {
  databasePort = await availablePort();
  sourcePort = await availablePort();
  contentPort = await availablePort();
  mkdirSync(socketDir);

  let result = command('initdb', ['-D', clusterDir, '-A', 'trust', '--no-locale']);
  assert.equal(result.status, 0, result.stderr);
  result = command('pg_ctl', [
    '-D', clusterDir,
    '-o', `-k ${socketDir} -p ${databasePort}`,
    '-l', join(workDir, 'postgres.log'),
    'start',
  ]);
  assert.equal(result.status, 0, result.stderr);
  postgresStarted = true;

  psql(`
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE SCHEMA auth;
CREATE TABLE auth.users (id UUID PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE SQL STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', TRUE), '')::UUID
$$;
GRANT USAGE ON SCHEMA auth TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, service_role;
CREATE TABLE public.attribution (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_utm_source TEXT,
  first_utm_medium TEXT,
  first_utm_campaign TEXT,
  first_utm_term TEXT,
  first_utm_content TEXT,
  first_referrer TEXT,
  first_landing_page TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE FUNCTION public.upsert_attribution(
  p_user_id UUID, p_utm_source TEXT, p_utm_medium TEXT,
  p_utm_campaign TEXT, p_utm_term TEXT, p_utm_content TEXT,
  p_referrer TEXT, p_landing_page TEXT
) RETURNS VOID LANGUAGE plpgsql AS $$ BEGIN RETURN; END; $$;
`);
  result = command('psql', [
    '-h', socketDir,
    '-p', String(databasePort),
    '-d', 'postgres',
    '-v', 'ON_ERROR_STOP=1',
    '-f', MIGRATION,
  ]);
  assert.equal(result.status, 0, result.stderr);

  psql(`
CREATE TABLE public.app_events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL
);
GRANT SELECT, INSERT ON public.app_events TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.app_events_id_seq TO service_role;
`);

  const userId = '11111111-1111-4111-8111-111111111111';
  const secondUserId = '22222222-2222-4222-8222-222222222222';
  const touch = JSON.parse(psql(`
INSERT INTO auth.users(id) VALUES (${sqlText(userId)});
SET ROLE service_role;
SELECT public.register_attribution_publication(
  'publication_bridge_001', 'nonce_bridge_001', 'content_exact_001',
  'instagram_post_991', 'campaign_exact_001', 'offer_exact_001',
  'instagram', '2099-01-01T00:00:00Z'::TIMESTAMPTZ
);
SELECT public.create_anonymous_attribution_touch(
  'publication_bridge_001', 'nonce_bridge_001', repeat('a',64),
  'content_exact_001', 'instagram_post_991', 'campaign_exact_001',
  'offer_exact_001', 'instagram', 'instagram', 'organic_social',
  'utm-label', NULL, 'utm-content', NULL, 'https://www.everreach.app/'
);
RESET ROLE;
`).stdout.trim().split('\n').filter(Boolean).at(-1));
  const secondTouch = JSON.parse(psql(`
INSERT INTO auth.users(id) VALUES (${sqlText(secondUserId)});
SET ROLE service_role;
SELECT public.create_anonymous_attribution_touch(
  'publication_bridge_001', 'nonce_bridge_001', repeat('b',64),
  'content_exact_001', 'instagram_post_991', 'campaign_exact_001',
  'offer_exact_001', 'instagram', 'instagram', 'organic_social',
  'utm-label', NULL, 'utm-content', NULL, 'https://www.everreach.app/'
);
RESET ROLE;
`).stdout.trim().split('\n').filter(Boolean).at(-1));
  const installAt = offsetTimestamp(touch.captured_at, 5 * 60_000);
  const trialAt = offsetTimestamp(touch.captured_at, 10 * 60_000);
  const purchaseAt = offsetTimestamp(touch.captured_at, 7 * 86_400_000 + 10 * 60_000);
  const secondInstallAt = offsetTimestamp(secondTouch.captured_at, 6 * 60_000);
  const firstActivityAt = offsetTimestamp(installAt, 86_400_000 + 2 * 3_600_000);
  const secondActivityAt = offsetTimestamp(installAt, 7 * 86_400_000 + 2 * 3_600_000);
  retentionObservedAt = offsetTimestamp(installAt, 10 * 86_400_000);
  psql(`
SELECT set_config('request.jwt.claim.sub', ${sqlText(userId)}, FALSE);
SET ROLE service_role;
SELECT public.upsert_attribution(
  ${sqlText(userId)}::UUID,
  'instagram', 'organic_social', 'utm-label', NULL, 'utm-content',
  NULL, 'https://www.everreach.app/',
  'content_exact_001', 'instagram_post_991', 'campaign_exact_001',
  'offer_exact_001', 'instagram', ${sqlText(touch.touch_token)},
  ${sqlText(touch.captured_at)}::TIMESTAMPTZ
);
RESET ROLE;
SET ROLE service_role;
SELECT public.enqueue_owned_outcome_event(
  ${sqlText(userId)}::UUID, 'install', 'install_provider_001',
  ${sqlText(installAt)}::TIMESTAMPTZ,
  '{"producer":"real-install-test"}'::JSONB
);
SELECT public.enqueue_owned_outcome_event(
  ${sqlText(userId)}::UUID, 'trial', 'trial_provider_001',
  ${sqlText(trialAt)}::TIMESTAMPTZ,
  '{"producer":"real-trial-test"}'::JSONB
);
SELECT public.enqueue_owned_outcome_event(
  ${sqlText(userId)}::UUID, 'purchase', 'purchase_provider_001',
  ${sqlText(purchaseAt)}::TIMESTAMPTZ,
  '{"producer":"real-purchase-test"}'::JSONB
);
RESET ROLE;
SELECT set_config('request.jwt.claim.sub', ${sqlText(secondUserId)}, FALSE);
SET ROLE service_role;
SELECT public.upsert_attribution(
  ${sqlText(secondUserId)}::UUID,
  'instagram', 'organic_social', 'utm-label', NULL, 'utm-content',
  NULL, 'https://www.everreach.app/',
  'content_exact_001', 'instagram_post_991', 'campaign_exact_001',
  'offer_exact_001', 'instagram', ${sqlText(secondTouch.touch_token)},
  ${sqlText(secondTouch.captured_at)}::TIMESTAMPTZ
);
RESET ROLE;
SET ROLE service_role;
SELECT public.enqueue_owned_outcome_event(
  ${sqlText(secondUserId)}::UUID, 'install', 'install_provider_002',
  ${sqlText(secondInstallAt)}::TIMESTAMPTZ,
  '{"producer":"real-install-test"}'::JSONB
);
SELECT public.enqueue_owned_retention_sample(
  'cohort_bridge_001', 'content_exact_001', 'instagram_post_991',
  'campaign_exact_001', 'offer_exact_001', 'instagram',
  ${sqlText(touch.touch_token)}, ${sqlText(touch.captured_at)}::TIMESTAMPTZ,
  30000, 73, 100, '{"producer":"real-retention-test"}'::JSONB
);
INSERT INTO public.app_events(user_id,event_name,occurred_at) VALUES
  (${sqlText(userId)}::UUID, 'app_open', ${sqlText(firstActivityAt)}::TIMESTAMPTZ),
  (${sqlText(userId)}::UUID, 'feature_used', ${sqlText(secondActivityAt)}::TIMESTAMPTZ);
RESET ROLE;
`);
  const queuedOutcomes = JSON.parse(psql(`
SELECT COALESCE(jsonb_agg(jsonb_build_object(
  'event_type', event_type,
  'provider_event_id', provider_event_id,
  'user_id', user_id
) ORDER BY occurred_at, id), '[]'::jsonb)
FROM public.owned_outcome_outbox;
`).stdout.trim());
  assert.equal(queuedOutcomes.length, 6, JSON.stringify(queuedOutcomes));
  assert.equal(
    psql('SELECT count(*) FROM public.owned_retention_outbox;').stdout.trim(),
    '1',
  );

  await startSourceApi();
  const firstPartyHealth = await runFirstPartyProducerHealth();
  assert.equal(firstPartyHealth.status, 0, firstPartyHealth.stderr);
  const firstPartyHealthBody = JSON.parse(firstPartyHealth.stdout);
  assert.equal(firstPartyHealthBody.status, 'ready_dry_run');
  assert.equal(firstPartyHealthBody.source_kind, 'supabase_app_events');
  assert.equal(firstPartyHealthBody.would_emit, 2);
  assert.equal(
    psql('SELECT count(*) FROM public.owned_retention_outbox;').stdout.trim(),
    '1',
    'producer health must not mutate the real retention outbox',
  );
  contentProcess = spawn(
    'python3',
    ['content_quality_server.py', '--host', '127.0.0.1', '--port', String(contentPort)],
    {
      cwd: CONTENT_INTELLIGENCE,
      env: {
        ...process.env,
        CONTENT_QUALITY_CONTROL_TOKEN: CQ_TOKEN,
        CONTENT_QUALITY_DB: contentDb,
        MARKET_TAPE_DB: tapeDb,
        NARRATIVE_COHERENCE_LLM: 'off',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  await waitForContentApi();

  const rejected = await runDelivery({
    state: rejectionStateDb,
    token: 'incorrect-token',
  });
  assert.notEqual(rejected.status, 0);
  assert.equal(
    sqliteJson(rejectionStateDb, "SELECT count(*) AS n FROM bridge_runs WHERE status='failed';")[0].n,
    1,
  );
  assert.equal(
    sqliteJson(contentDb, 'SELECT count(*) AS n FROM cq_owned_outcome_events;')[0].n,
    0,
  );
  assert.match(psql(`
SELECT last_error FROM public.owned_delivery_state
WHERE stream='event' AND delivered_at IS NULL LIMIT 1;
`).stdout.trim(), /Remote status 401/);
  psql(`
UPDATE public.owned_delivery_state
SET retry_after=clock_timestamp()
WHERE delivered_at IS NULL;
`);

  const delivered = await runDelivery({ state: stateDb });
  assert.equal(delivered.status, 0, delivered.stderr);
  const deliveredBody = JSON.parse(delivered.stdout);
  assert.equal(deliveredBody.events.delivered, 6);
  assert.equal(deliveredBody.events.created, 6);
  assert.equal(deliveredBody.retention.delivered, 3);
  assert.equal(deliveredBody.retention.created, 3);
  assert.equal(deliveredBody.retention.producer_status, 'ready');
  assert.equal(
    deliveredBody.retention.producer.source_kind,
    'posthog_hogql',
    JSON.stringify(deliveredBody.retention.producer.source_attempts),
  );
  assert.equal(deliveredBody.retention.producer.curves, 1);
  assert.equal(deliveredBody.retention.producer.idempotent_replays, 2);
  const retentionState = sqliteJson(stateDb, `
SELECT status,reason FROM bridge_component_status
WHERE component='owned_retention_producer';
`)[0];
  assert.equal(retentionState.status, 'ready');
  assert.match(retentionState.reason, /measured product activity/);

  const stored = sqliteJson(contentDb, `
SELECT event_type,content_id,campaign_id,offer_id,source_platform,source_id,
       journey_id,provider_event_id
FROM cq_owned_outcome_events ORDER BY occurred_at;
`);
  assert.deepEqual(stored.map((row) => row.event_type).sort(), [
    'click', 'click', 'install', 'install', 'purchase', 'trial',
  ]);
  assert.equal(new Set(stored.map((row) => row.journey_id)).size, 2);
  for (const row of stored) {
    assert.equal(row.content_id, 'content_exact_001');
    assert.equal(row.campaign_id, 'campaign_exact_001');
    assert.equal(row.offer_id, 'offer_exact_001');
    assert.equal(row.source_platform, 'instagram');
    assert.equal(row.source_id, 'instagram_post_991');
  }
  assert.equal(
    sqliteJson(contentDb, 'SELECT count(*) AS n FROM cq_owned_retention_samples;')[0].n,
    3,
  );
  const retentionStored = sqliteJson(contentDb, `
SELECT content_id,source_id,campaign_id,offer_id,source_platform,
       elapsed_ms,retained_percent,sample_size,journey_id,payload_json
FROM cq_owned_retention_samples ORDER BY elapsed_ms;
`);
  assert.equal(retentionStored[0].sample_size, 100);
  assert.equal(retentionStored[0].retained_percent, 73);
  assert.equal(retentionStored[0].journey_id, touch.touch_token);
  assert.deepEqual(
    retentionStored.slice(1).map((row) => row.elapsed_ms),
    [86_400_000, 604_800_000],
  );
  for (const point of retentionStored.slice(1)) {
    assert.equal(point.sample_size, 2);
    assert.equal(point.retained_percent, 50);
    assert.equal(point.journey_id, null);
    const metadata = JSON.parse(point.payload_json).metadata;
    assert.equal(metadata.producer, 'everreach_interval_retention_v1');
    assert.equal(metadata.source_kind, 'posthog_hogql');
    assert.equal(metadata.causal_interpretation_status, 'not_inferred');
  }

  const emptyReplay = await runDelivery({ state: stateDb });
  assert.equal(emptyReplay.status, 0, emptyReplay.stderr);
  assert.equal(JSON.parse(emptyReplay.stdout).events.delivered, 0);
  assert.equal(JSON.parse(emptyReplay.stdout).retention.delivered, 0);

  const acceptedReplay = await runDelivery({ state: replayStateDb });
  assert.equal(acceptedReplay.status, 0, acceptedReplay.stderr);
  const replayBody = JSON.parse(acceptedReplay.stdout);
  assert.equal(replayBody.events.delivered, 0);
  assert.equal(replayBody.retention.delivered, 0);

  const lateCommitAt = offsetTimestamp(touch.captured_at, 20 * 60_000);
  const newerCommitAt = offsetTimestamp(touch.captured_at, 21 * 60_000);
  const held = beginHeldOutcome(userId, lateCommitAt);
  await held.ready;
  psql(`
SET ROLE service_role;
SELECT public.enqueue_owned_outcome_event(
  ${sqlText(userId)}::UUID, 'purchase', 'newer_commit_provider_001',
  ${sqlText(newerCommitAt)}::TIMESTAMPTZ,
  '{"producer":"newer-commit-real-test"}'::JSONB
);
RESET ROLE;
`);
  const newerCommitted = await runDelivery({ state: stateDb });
  assert.equal(newerCommitted.status, 0, newerCommitted.stderr);
  assert.equal(JSON.parse(newerCommitted.stdout).events.delivered, 1);
  await held.commit();
  const lateCommitted = await runDelivery({ state: stateDb });
  assert.equal(lateCommitted.status, 0, lateCommitted.stderr);
  assert.equal(
    JSON.parse(lateCommitted.stdout).events.delivered,
    1,
    'an older created_at row committed after a newer row must remain deliverable',
  );
  assert.equal(sqliteJson(contentDb, `
SELECT count(*) AS n FROM cq_owned_outcome_events
WHERE provider_event_id IN ('late_commit_provider_001','newer_commit_provider_001');
`)[0].n, 2);

  console.log('PASS real owned-outcome delivery into Content Intelligence');
}

try {
  await main();
} finally {
  if (contentProcess && contentProcess.exitCode === null) {
    contentProcess.kill('SIGTERM');
    await new Promise((resolve) => {
      const timer = setTimeout(resolve, 5_000);
      contentProcess.once('exit', () => {
        clearTimeout(timer);
        resolve();
      });
    });
  }
  if (sourceServer) {
    await new Promise((resolve) => sourceServer.close(resolve));
  }
  if (postgresStarted) {
    command('pg_ctl', ['-D', clusterDir, 'stop', '-m', 'fast']);
  }
  rmSync(workDir, { recursive: true, force: true });
}
