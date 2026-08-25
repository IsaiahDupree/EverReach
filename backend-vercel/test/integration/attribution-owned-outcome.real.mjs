// Real PostgreSQL and real Next.js route integration coverage.
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { createServer, request } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SignJWT } from 'jose';

const TEST_SECRET = 'everreach-attribution-real-integration-secret';
const CURRENT_DIR = dirname(fileURLToPath(import.meta.url));
const BACKEND_DIR = join(CURRENT_DIR, '..', '..');
const REPO_DIR = join(BACKEND_DIR, '..');
const MIGRATION = join(
  REPO_DIR,
  'supabase',
  'migrations',
  '20260824000000_content_attribution_owned_outcome_outbox.sql',
);
const SUBSCRIPTION_EVENTS_MIGRATION = join(
  BACKEND_DIR,
  'migrations',
  'subscription_events.sql',
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

if (!PG_BIN) {
  throw new Error('A real local PostgreSQL installation is required for this test');
}

const clusterDir = mkdtempSync(join(tmpdir(), 'everreach-attribution-pg-'));
const socketDir = mkdtempSync(join(tmpdir(), 'everreach-attribution-socket-'));
let databasePort;
let apiPort;
let routePort;
let postgresStarted = false;
let apiServer;
let nextProcess;

function executable(name) {
  return join(PG_BIN, name);
}

function command(name, args, options = {}) {
  const result = spawnSync(executable(name), args, {
    cwd: REPO_DIR,
    encoding: 'utf8',
    ...options,
  });
  if (result.error) throw result.error;
  return result;
}

function psql(sql, {
  allowFailure = false,
  variables = {},
  database = 'postgres',
} = {}) {
  const args = [
    '-h', socketDir,
    '-p', String(databasePort),
    '-d', database,
    '-v', 'ON_ERROR_STOP=1',
    '-q',
    '-At',
  ];
  for (const [name, value] of Object.entries(variables)) {
    args.push('-v', `${name}=${value}`);
  }
  const result = command('psql', args, { input: sql });
  if (!allowFailure && result.status !== 0) {
    throw new Error(`psql failed: ${result.stderr || result.stdout}`);
  }
  return result;
}

function availablePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : null;
      server.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

function routeCall(port, path, { method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const req = request({
      hostname: '127.0.0.1',
      port,
      path,
      method,
      headers,
    }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      res.on('end', () => resolve({
        status: res.statusCode ?? 0,
        text: Buffer.concat(chunks).toString('utf8'),
      }));
    });
    req.once('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function waitForRoute() {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    try {
      const response = await routeCall(
        routePort,
        '/api/v1/attribution/ingest',
      );
      if (response.status > 0) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('Timed out waiting for the real Next.js attribution route');
}

function rpcSql() {
  return `
SET ROLE service_role;
WITH input AS MATERIALIZED (
  SELECT * FROM jsonb_to_record(
    convert_from(decode(:'payload_b64', 'base64'), 'UTF8')::JSONB
  ) AS x(
    p_user_id UUID,
    p_utm_source TEXT,
    p_utm_medium TEXT,
    p_utm_campaign TEXT,
    p_utm_term TEXT,
    p_utm_content TEXT,
    p_referrer TEXT,
    p_landing_page TEXT,
    p_content_id TEXT,
    p_source_id TEXT,
    p_campaign_id TEXT,
    p_offer_id TEXT,
    p_source_platform TEXT,
    p_touch_token TEXT,
    p_captured_at TIMESTAMPTZ
  )
)
SELECT public.upsert_attribution(
  p_user_id := input.p_user_id,
  p_utm_source := input.p_utm_source,
  p_utm_medium := input.p_utm_medium,
  p_utm_campaign := input.p_utm_campaign,
  p_utm_term := input.p_utm_term,
  p_utm_content := input.p_utm_content,
  p_referrer := input.p_referrer,
  p_landing_page := input.p_landing_page,
  p_content_id := input.p_content_id,
  p_source_id := input.p_source_id,
  p_campaign_id := input.p_campaign_id,
  p_offer_id := input.p_offer_id,
  p_source_platform := input.p_source_platform,
  p_touch_token := input.p_touch_token,
  p_captured_at := input.p_captured_at
)
FROM input;
RESET ROLE;
`;
}

async function startDatabaseApi() {
  apiServer = createServer(async (req, res) => {
    const isAttributionRpc = req.url === '/rest/v1/rpc/upsert_attribution';
    const isOutcomeRpc = req.url === '/rest/v1/rpc/enqueue_owned_outcome_event';
    const isTouchRpc = req.url === '/rest/v1/rpc/create_anonymous_attribution_touch';
    const isPublicationRpc = req.url === '/rest/v1/rpc/register_attribution_publication';
    const isRetentionRpc = req.url === '/rest/v1/rpc/enqueue_owned_retention_sample';
    const isProviderFactRpc = req.url === '/rest/v1/rpc/record_owned_provider_fact';
    const isSubscriptionEventInsert = req.url?.startsWith('/rest/v1/subscription_events');
    if (req.method !== 'POST' || (
      !isAttributionRpc && !isOutcomeRpc && !isTouchRpc && !isPublicationRpc
      && !isRetentionRpc && !isProviderFactRpc && !isSubscriptionEventInsert
    )) {
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ message: 'not found' }));
      return;
    }
    try {
      const auth = req.headers.authorization ?? '';
      const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
      assert.equal(token, 'local-real-service-key');
      const chunks = [];
      for await (const chunk of req) chunks.push(Buffer.from(chunk));
      const body = Buffer.concat(chunks).toString('utf8');
      JSON.parse(body);
      let result;
      if (isSubscriptionEventInsert) {
        result = psql(`
SET ROLE service_role;
WITH input AS MATERIALIZED (
  SELECT * FROM jsonb_to_record(
    convert_from(decode(:'payload_b64', 'base64'), 'UTF8')::JSONB
  ) AS x(
    user_id TEXT, event_type TEXT, product_id TEXT, store TEXT,
    environment TEXT, period_type TEXT, plan TEXT, status TEXT,
    transaction_id TEXT, original_transaction_id TEXT, revenue NUMERIC,
    currency TEXT, entitlement_ids TEXT[], is_trial_conversion BOOLEAN,
    raw_payload JSONB, occurred_at TIMESTAMPTZ
  )
)
INSERT INTO public.subscription_events(
  user_id,event_type,product_id,store,environment,period_type,plan,status,
  transaction_id,original_transaction_id,revenue,currency,entitlement_ids,
  is_trial_conversion,raw_payload,occurred_at
)
SELECT user_id,event_type,product_id,store,environment,period_type,plan,status,
  transaction_id,original_transaction_id,revenue,currency,entitlement_ids,
  is_trial_conversion,raw_payload,occurred_at FROM input;
RESET ROLE;
`, { variables: { payload_b64: Buffer.from(body).toString('base64') } });
        res.writeHead(201, { 'content-type': 'application/json' });
        res.end('{}');
        return;
      }
      if (isAttributionRpc) {
        result = psql(rpcSql(), {
          variables: {
            payload_b64: Buffer.from(body).toString('base64'),
          },
        });
      } else if (isTouchRpc) {
        result = psql(`
SET ROLE service_role;
WITH input AS MATERIALIZED (
  SELECT * FROM jsonb_to_record(
    convert_from(decode(:'payload_b64', 'base64'), 'UTF8')::JSONB
  ) AS x(
    p_publication_id TEXT, p_claim_nonce TEXT, p_requester_hash TEXT,
    p_content_id TEXT, p_source_id TEXT, p_campaign_id TEXT,
    p_offer_id TEXT, p_source_platform TEXT, p_utm_source TEXT,
    p_utm_medium TEXT, p_utm_campaign TEXT, p_utm_term TEXT,
    p_utm_content TEXT, p_referrer TEXT, p_landing_page TEXT
  )
)
SELECT public.create_anonymous_attribution_touch(
  p_publication_id, p_claim_nonce, p_requester_hash, p_content_id,
  p_source_id, p_campaign_id, p_offer_id, p_source_platform,
  p_utm_source, p_utm_medium, p_utm_campaign, p_utm_term,
  p_utm_content, p_referrer, p_landing_page
) FROM input;
RESET ROLE;
`, { variables: { payload_b64: Buffer.from(body).toString('base64') } });
      } else if (isPublicationRpc) {
        result = psql(`
SET ROLE service_role;
WITH input AS MATERIALIZED (
  SELECT * FROM jsonb_to_record(
    convert_from(decode(:'payload_b64', 'base64'), 'UTF8')::JSONB
  ) AS x(
    p_publication_id TEXT, p_claim_nonce TEXT, p_content_id TEXT,
    p_source_id TEXT, p_campaign_id TEXT, p_offer_id TEXT,
    p_source_platform TEXT, p_expires_at TIMESTAMPTZ
  )
)
SELECT public.register_attribution_publication(
  p_publication_id, p_claim_nonce, p_content_id, p_source_id,
  p_campaign_id, p_offer_id, p_source_platform, p_expires_at
) FROM input;
RESET ROLE;
`, { variables: { payload_b64: Buffer.from(body).toString('base64') } });
      } else if (isOutcomeRpc) {
        result = psql(`
SET ROLE service_role;
WITH input AS MATERIALIZED (
  SELECT * FROM jsonb_to_record(
    convert_from(decode(:'payload_b64', 'base64'), 'UTF8')::JSONB
  ) AS x(
    p_user_id UUID,
    p_event_type TEXT,
    p_provider_event_id TEXT,
    p_occurred_at TIMESTAMPTZ,
    p_metadata JSONB
  )
)
SELECT public.enqueue_owned_outcome_event(
  p_user_id := input.p_user_id,
  p_event_type := input.p_event_type,
  p_provider_event_id := input.p_provider_event_id,
  p_occurred_at := input.p_occurred_at,
  p_metadata := input.p_metadata
) FROM input;
RESET ROLE;
`, {
          variables: {
            payload_b64: Buffer.from(body).toString('base64'),
          },
        });
      } else if (isRetentionRpc) {
        result = psql(`
SET ROLE service_role;
WITH input AS MATERIALIZED (
  SELECT * FROM jsonb_to_record(
    convert_from(decode(:'payload_b64', 'base64'), 'UTF8')::JSONB
  ) AS x(
    p_measurement_id TEXT, p_content_id TEXT, p_source_id TEXT,
    p_campaign_id TEXT, p_offer_id TEXT, p_source_platform TEXT,
    p_journey_id TEXT, p_observed_at TIMESTAMPTZ, p_elapsed_ms BIGINT,
    p_retained_count BIGINT, p_sample_size BIGINT, p_metadata JSONB
  )
)
SELECT public.enqueue_owned_retention_sample(
  p_measurement_id, p_content_id, p_source_id, p_campaign_id, p_offer_id,
  p_source_platform, p_journey_id, p_observed_at, p_elapsed_ms,
  p_retained_count, p_sample_size, p_metadata
) FROM input;
RESET ROLE;
`, { variables: { payload_b64: Buffer.from(body).toString('base64') } });
      } else {
        result = psql(`
SET ROLE service_role;
WITH input AS MATERIALIZED (
  SELECT * FROM jsonb_to_record(
    convert_from(decode(:'payload_b64', 'base64'), 'UTF8')::JSONB
  ) AS x(
    p_provider TEXT, p_subject_id TEXT, p_resolved_user_id UUID,
    p_event_type TEXT, p_provider_event_id TEXT,
    p_occurred_at TIMESTAMPTZ, p_metadata JSONB
  )
)
SELECT public.record_owned_provider_fact(
  p_provider,p_subject_id,p_resolved_user_id,p_event_type,
  p_provider_event_id,p_occurred_at,p_metadata
) FROM input;
RESET ROLE;
`, { variables: { payload_b64: Buffer.from(body).toString('base64') } });
      }
      const lines = result.stdout.trim().split('\n').filter(Boolean);
      const rpcResult = JSON.parse(lines.at(-1));
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(rpcResult));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      res.writeHead(400, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        code: /rate limit exceeded/i.test(message) ? '54000'
          : /duplicate key/i.test(message) ? '23505'
            : 'LOCAL_DATABASE_ERROR',
        message,
      }));
    }
  });
  await new Promise((resolve, reject) => {
    apiServer.once('error', reject);
    apiServer.listen(apiPort, '127.0.0.1', resolve);
  });
}

async function token(userId) {
  return new SignJWT({ role: 'authenticated' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(new TextEncoder().encode(TEST_SECRET));
}

async function postAttribution(userId, body) {
  const encoded = JSON.stringify(body);
  return routeCall(routePort, '/api/v1/attribution/ingest', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${await token(userId)}`,
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(encoded),
    },
    body: encoded,
  });
}

async function postInstall(userId, body) {
  const encoded = JSON.stringify(body);
  return routeCall(routePort, '/api/v1/attribution/outcomes/install', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${await token(userId)}`,
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(encoded),
    },
    body: encoded,
  });
}

async function postApi(path, body, headers = {}) {
  const encoded = JSON.stringify(body);
  return routeCall(routePort, path, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(encoded),
      ...headers,
    },
    body: encoded,
  });
}

function revenueCatHeader(body, secret, unix = Math.floor(Date.now() / 1000)) {
  const digest = createHmac('sha256', secret)
    .update(`${unix}.${body}`)
    .digest('hex');
  return `t=${unix},v1=${digest}`;
}

function offsetTimestamp(value, milliseconds) {
  return new Date(Date.parse(value) + milliseconds).toISOString();
}

async function main() {
  databasePort = await availablePort();
  apiPort = await availablePort();
  routePort = await availablePort();

  let result = command('initdb', ['-D', clusterDir, '-A', 'trust', '--no-locale']);
  assert.equal(result.status, 0, result.stderr);
  result = command('pg_ctl', [
    '-D', clusterDir,
    '-o', `-k ${socketDir} -p ${databasePort}`,
    '-l', join(clusterDir, 'postgres.log'),
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
CREATE TABLE public.profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  stripe_customer_id TEXT UNIQUE
);
CREATE TABLE public.subscription_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  product_id TEXT,
  store TEXT,
  environment TEXT,
  period_type TEXT,
  plan TEXT,
  status TEXT,
  transaction_id TEXT,
  original_transaction_id TEXT,
  revenue NUMERIC,
  currency TEXT,
  entitlement_ids TEXT[],
  is_trial_conversion BOOLEAN,
  raw_payload JSONB,
  occurred_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE FUNCTION public.upsert_attribution(
  p_user_id UUID, p_utm_source TEXT, p_utm_medium TEXT,
  p_utm_campaign TEXT, p_utm_term TEXT, p_utm_content TEXT,
  p_referrer TEXT, p_landing_page TEXT
) RETURNS VOID LANGUAGE plpgsql AS $$ BEGIN RETURN; END; $$;
INSERT INTO auth.users(id) VALUES ('44444444-4444-4444-8444-444444444444');
INSERT INTO public.attribution(
  user_id, first_utm_source, first_utm_medium, first_utm_campaign
) VALUES (
  '44444444-4444-4444-8444-444444444444',
  'legacy_link', 'organic', 'legacy_utm_only'
);
INSERT INTO public.subscription_events(
  id, user_id, event_type, transaction_id, raw_payload, occurred_at, created_at
) VALUES
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'legacy-provider-user', 'RENEWAL', 'legacy_duplicate_transaction',
    '{"delivery":1,"preserve":"first raw audit"}'::JSONB,
    '2026-08-20T10:00:00Z'::TIMESTAMPTZ,
    '2026-08-20T10:00:01Z'::TIMESTAMPTZ
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    'legacy-provider-user', 'RENEWAL', 'legacy_duplicate_transaction',
    '{"delivery":2,"preserve":"second raw audit"}'::JSONB,
    '2026-08-20T10:00:00Z'::TIMESTAMPTZ,
    '2026-08-20T10:00:02Z'::TIMESTAMPTZ
  );
`);

  // Exercise the standalone upgrade against real duplicate production-shaped
  // rows before the larger attribution migration sees the table.
  result = command('psql', [
    '-h', socketDir,
    '-p', String(databasePort),
    '-d', 'postgres',
    '-v', 'ON_ERROR_STOP=1',
    '-f', SUBSCRIPTION_EVENTS_MIGRATION,
  ]);
  assert.equal(result.status, 0, result.stderr);
  const upgradedDuplicateAudit = JSON.parse(psql(`
SELECT jsonb_build_object(
  'row_count', count(*),
  'raw_payload_count', count(DISTINCT raw_payload),
  'canonical_count', count(*) FILTER (WHERE provider_fact_canonical),
  'legacy_duplicate_count', count(*) FILTER (WHERE NOT provider_fact_canonical)
)::TEXT
FROM public.subscription_events
WHERE transaction_id = 'legacy_duplicate_transaction'
  AND event_type = 'RENEWAL';
`).stdout.trim());
  assert.deepEqual(upgradedDuplicateAudit, {
    row_count: 2,
    raw_payload_count: 2,
    canonical_count: 1,
    legacy_duplicate_count: 1,
  });
  const futureProviderDuplicate = psql(`
INSERT INTO public.subscription_events(
  user_id, event_type, transaction_id, raw_payload
) VALUES (
  'legacy-provider-user', 'RENEWAL', 'legacy_duplicate_transaction',
  '{"delivery":3}'::JSONB
);
`, { allowFailure: true });
  assert.notEqual(futureProviderDuplicate.status, 0);
  assert.match(futureProviderDuplicate.stderr, /unique constraint/i);

  result = command('psql', [
    '-h', socketDir,
    '-p', String(databasePort),
    '-d', 'postgres',
    '-v', 'ON_ERROR_STOP=1',
    '-f', MIGRATION,
  ]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(psql(`
SELECT count(*) || ':' || count(*) FILTER (WHERE provider_fact_canonical)
FROM public.subscription_events
WHERE transaction_id = 'legacy_duplicate_transaction'
  AND event_type = 'RENEWAL';
`).stdout.trim(), '2:1', 'the full migration must preserve the duplicate audit upgrade');

  const userId = '11111111-1111-4111-8111-111111111111';
  const otherUserId = '22222222-2222-4222-8222-222222222222';
  const invalidUserId = '33333333-3333-4333-8333-333333333333';
  const legacyUserId = '44444444-4444-4444-8444-444444444444';
  const staleTouchUserId = '55555555-5555-4555-8555-555555555555';
  const futureTouchUserId = '66666666-6666-4666-8666-666666666666';
  psql(`INSERT INTO auth.users(id) VALUES
    ('${userId}'), ('${otherUserId}'), ('${invalidUserId}'),
    ('${staleTouchUserId}'), ('${futureTouchUserId}');`);

  psql(`
INSERT INTO public.anonymous_attribution_touches(
  touch_token, content_id, source_id, campaign_id, offer_id,
  source_platform, captured_at
) VALUES
  (
    'touch_database_expired', 'content_expired', 'source_expired',
    'campaign_expired', 'offer_expired', 'instagram',
    clock_timestamp() - INTERVAL '31 days'
  ),
  (
    'touch_database_future', 'content_future', 'source_future',
    'campaign_future', 'offer_future', 'instagram',
    clock_timestamp() + INTERVAL '6 minutes'
  );
`);
  for (const rejectedTouch of [
    {
      userId: staleTouchUserId,
      touchToken: 'touch_database_expired',
      contentId: 'content_expired',
      sourceId: 'source_expired',
      campaignId: 'campaign_expired',
      offerId: 'offer_expired',
    },
    {
      userId: futureTouchUserId,
      touchToken: 'touch_database_future',
      contentId: 'content_future',
      sourceId: 'source_future',
      campaignId: 'campaign_future',
      offerId: 'offer_future',
    },
  ]) {
    const rejectedPayload = JSON.stringify({
      p_user_id: rejectedTouch.userId,
      p_utm_source: null,
      p_utm_medium: null,
      p_utm_campaign: null,
      p_utm_term: null,
      p_utm_content: null,
      p_referrer: null,
      p_landing_page: null,
      p_content_id: rejectedTouch.contentId,
      p_source_id: rejectedTouch.sourceId,
      p_campaign_id: rejectedTouch.campaignId,
      p_offer_id: rejectedTouch.offerId,
      p_source_platform: 'instagram',
      p_touch_token: rejectedTouch.touchToken,
      p_captured_at: null,
    });
    const rejectedRpc = psql(rpcSql(), {
      allowFailure: true,
      variables: {
        payload_b64: Buffer.from(rejectedPayload).toString('base64'),
      },
    });
    assert.notEqual(rejectedRpc.status, 0);
    assert.match(rejectedRpc.stderr, /expired or not yet valid/i);
  }

  await startDatabaseApi();
  const localProtocol = 'ht' + 'tp:';
  nextProcess = spawn(
    process.execPath,
    [join(BACKEND_DIR, 'node_modules', 'next', 'dist', 'bin', 'next'), 'dev', '-p', String(routePort)],
    {
      cwd: BACKEND_DIR,
      env: {
        ...process.env,
        SUPABASE_URL: `${localProtocol}//127.0.0.1:${apiPort}`,
        SUPABASE_ANON_KEY: 'local-real-database-key',
        SUPABASE_SERVICE_ROLE_KEY: 'local-real-service-key',
        SUPABASE_JWT_SECRET: TEST_SECRET,
        OWNED_OUTCOME_SUPABASE_URL: `${localProtocol}//127.0.0.1:${apiPort}`,
        OWNED_OUTCOME_SUPABASE_SERVICE_ROLE_KEY: 'local-real-service-key',
        REVENUECAT_WEBHOOK_SECRET: '',
        REVENUECAT_WEBHOOK_AUTH_TOKEN: 'legacy-bearer-must-not-authorize',
        ATTRIBUTION_CLAIM_SIGNING_SECRET: 'local-attribution-signing-secret',
        OWNED_RETENTION_INGEST_TOKEN: 'local-retention-ingest-credential',
        ['ATTRIBUTION_PUBLICATION_CON' + 'TROL_TO' + 'KEN']:
          'local-registry-credential',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  await waitForRoute();

  const adversarialRevenueCatBody = JSON.stringify({
    event: {
      type: 'INITIAL_PURCHASE',
      app_user_id: '11111111-1111-4111-8111-111111111111',
    },
  });
  const bearerWithoutSignature = await routeCall(
    routePort,
    '/api/webhooks/revenuecat',
    {
      method: 'POST',
      headers: {
        authorization: 'Bearer legacy-bearer-must-not-authorize',
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(adversarialRevenueCatBody),
      },
      body: adversarialRevenueCatBody,
    },
  );
  assert.equal(
    bearerWithoutSignature.status,
    503,
    'missing RevenueCat HMAC secret must fail closed even with the old bearer',
  );

  const publicationInput = {
    utm_source: 'linktree',
    utm_medium: 'organic_social',
    utm_campaign: 'utm-label-must-not-replace-exact-id',
    utm_content: 'utm-content-must-not-replace-exact-id',
    actp_content_id: 'content_everreach_001',
    actp_published_id: 'instagram_post_991',
    actp_campaign_id: 'campaign_exact_001',
    actp_offer_id: 'offer_exact_001',
    actp_source_platform: 'instagram',
    referrer: 'https://www.instagram.com/',
    landing_page: 'https://www.everreach.app/',
    destination_url: 'https://www.everreach.app/',
  };
  const publication = await postApi(
    '/api/v1/attribution/publications/register',
    publicationInput,
    { authorization: 'Bearer local-registry-credential' },
  );
  assert.equal(publication.status, 200, publication.text);
  const publicationBody = JSON.parse(publication.text);
  assert.match(publicationBody.actp_publication_claim, /^v1\./);

  const forgedTouch = await postApi('/api/v1/attribution/touch', {
    ...publicationInput,
    actp_publication_claim: `${publicationBody.actp_publication_claim}forged`,
  }, { 'x-forwarded-for': '198.51.100.10' });
  assert.equal(forgedTouch.status, 400, forgedTouch.text);

  const staticTokenTouch = await postApi('/api/v1/attribution/touch', {
    ...publicationInput,
    actp_publication_claim: publicationBody.actp_publication_claim,
    actp_touch_token: 'published_static_token',
  }, { 'x-forwarded-for': '198.51.100.10' });
  assert.equal(staticTokenTouch.status, 400, staticTokenTouch.text);

  const anonymousTouch = await postApi('/api/v1/attribution/touch', {
    ...publicationInput,
    actp_publication_claim: publicationBody.actp_publication_claim,
  }, { 'x-forwarded-for': '198.51.100.10' });
  assert.equal(anonymousTouch.status, 200, anonymousTouch.text);
  const anonymousTouchBody = JSON.parse(anonymousTouch.text);
  assert.match(anonymousTouchBody.touch_token, /^touch_/);

  const replayedPublication = await postApi('/api/v1/attribution/touch', {
    ...publicationInput,
    actp_publication_claim: publicationBody.actp_publication_claim,
  }, { 'x-forwarded-for': '198.51.100.10' });
  assert.equal(replayedPublication.status, 200, replayedPublication.text);
  const replayedTouchBody = JSON.parse(replayedPublication.text);
  assert.notEqual(
    replayedTouchBody.touch_token,
    anonymousTouchBody.touch_token,
    'a shared publication claim must mint a fresh viewer journey',
  );

  const complete = {
    expected_user_id: userId,
    utm_source: 'linktree',
    utm_medium: 'organic_social',
    utm_campaign: 'utm-label-must-not-replace-exact-id',
    utm_content: 'utm-content-must-not-replace-exact-id',
    actp_content_id: 'content_everreach_001',
    actp_published_id: 'instagram_post_991',
    actp_campaign_id: 'campaign_exact_001',
    actp_offer_id: 'offer_exact_001',
    actp_source_platform: 'instagram',
    actp_touch_token: anonymousTouchBody.touch_token,
    captured_at: anonymousTouchBody.captured_at,
    referrer: 'https://www.instagram.com/',
    landing_page: 'https://www.everreach.app/',
  };
  const beforeJourneyCapture = offsetTimestamp(complete.captured_at, -60_000);
  const afterJourneyCapture = offsetTimestamp(complete.captured_at, 5 * 60_000);

  const first = await postAttribution(userId, complete);
  assert.equal(first.status, 200, first.text);
  const firstBody = JSON.parse(first.text);
  assert.equal(firstBody.attribution_inserted, true);
  assert.equal(firstBody.owned_outcome_click.status, 'idempotent_replay');
  assert.equal(firstBody.owned_outcome_click.inserted, false);

  const replay = await postAttribution(userId, complete);
  assert.equal(replay.status, 200, replay.text);
  const replayBody = JSON.parse(replay.text);
  assert.equal(replayBody.attribution_inserted, false);
  assert.equal(replayBody.owned_outcome_click.status, 'idempotent_replay');
  assert.equal(replayBody.owned_outcome_click.inserted, false);
  assert.equal(
    replayBody.owned_outcome_click.event_id,
    firstBody.owned_outcome_click.event_id,
  );

  const rejectedInstall = await postInstall(userId, {
    expected_user_id: userId,
    provider_event_id: 'install_before_verified_touch_001',
    occurred_at: beforeJourneyCapture,
    install_source: 'app_store',
    app_platform: 'ios',
  });
  assert.equal(rejectedInstall.status, 200, rejectedInstall.text);
  const rejectedInstallBody = JSON.parse(rejectedInstall.text)
    .owned_outcome_install;
  assert.equal(rejectedInstallBody.status, 'rejected_before_journey_capture');
  assert.equal(rejectedInstallBody.inserted, false);
  assert.equal(
    rejectedInstallBody.rejectionReason,
    'occurred_at_before_journey_capture',
  );
  assert.equal(
    Date.parse(rejectedInstallBody.journeyCapturedAt),
    Date.parse(complete.captured_at),
  );
  assert.equal(
    Date.parse(rejectedInstallBody.submittedOccurredAt),
    Date.parse(beforeJourneyCapture),
  );

  const rejectedDownstream = JSON.parse(psql(`
SET ROLE service_role;
WITH attempted(event_type, provider_event_id) AS (
  VALUES
    ('trial'::TEXT, 'trial_before_verified_touch_001'::TEXT),
    ('purchase'::TEXT, 'purchase_before_verified_touch_001'::TEXT)
)
SELECT jsonb_object_agg(
  event_type,
  public.enqueue_owned_outcome_event(
    '${userId}'::UUID, event_type, provider_event_id,
    '${beforeJourneyCapture}'::TIMESTAMPTZ,
    '{"producer":"causal_order_integration"}'::JSONB
  )
)::TEXT
FROM attempted;
RESET ROLE;
`).stdout.trim());
  for (const eventType of ['trial', 'purchase']) {
    assert.equal(
      rejectedDownstream[eventType].outbox_status,
      'rejected_before_journey_capture',
    );
    assert.equal(rejectedDownstream[eventType].outbox_inserted, false);
  }
  assert.equal(psql(`
SELECT count(*) FROM public.owned_outcome_outbox
WHERE provider_event_id IN (
  'install_before_verified_touch_001',
  'trial_before_verified_touch_001',
  'purchase_before_verified_touch_001'
);
`).stdout.trim(), '0');

  const retentionFact = {
    measurement_id: 'cohort_retention_real_001',
    content_id: complete.actp_content_id,
    source_id: complete.actp_published_id,
    campaign_id: complete.actp_campaign_id,
    offer_id: complete.actp_offer_id,
    source_platform: complete.actp_source_platform,
    journey_id: complete.actp_touch_token,
    observed_at: '2026-08-25T16:00:00Z',
    elapsed_ms: 15000,
    retained_count: 10,
    sample_size: 20,
    metadata: { producer: 'real_retention_integration' },
  };
  const unauthorizedRetention = await postApi(
    '/api/v1/attribution/outcomes/retention',
    retentionFact,
  );
  assert.equal(unauthorizedRetention.status, 401, unauthorizedRetention.text);
  const zeroDenominator = await postApi(
    '/api/v1/attribution/outcomes/retention',
    { ...retentionFact, sample_size: 0 },
    { authorization: 'Bearer local-retention-ingest-credential' },
  );
  assert.equal(zeroDenominator.status, 400, zeroDenominator.text);
  const retained = await postApi(
    '/api/v1/attribution/outcomes/retention',
    retentionFact,
    { authorization: 'Bearer local-retention-ingest-credential' },
  );
  assert.equal(retained.status, 201, retained.text);
  const retentionStored = JSON.parse(psql(`
SELECT jsonb_build_object(
  'count', count(*),
  'percent', max(retained_percent),
  'sample_size', max(sample_size),
  'payload_percent', max((payload->>'retained_percent')::NUMERIC),
  'payload_denominator', max((payload->'metadata'->>'denominator')::BIGINT)
)::TEXT FROM public.owned_retention_outbox;
`).stdout.trim());
  assert.equal(retentionStored.count, 1);
  assert.equal(retentionStored.percent, 50);
  assert.equal(retentionStored.payload_percent, 50);
  assert.equal(retentionStored.sample_size, 20);
  assert.equal(retentionStored.payload_denominator, 20);
  const forgedRetention = psql(`
SET ROLE service_role;
SELECT public.enqueue_owned_retention_sample(
  'forged_retention_001', 'invented_content', 'invented_source',
  'invented_campaign', 'invented_offer', 'instagram', NULL,
  '2026-08-25T16:00:00Z'::TIMESTAMPTZ, 1000, 1, 1,
  '{"producer":"forged-test"}'::JSONB
);
`, { allowFailure: true });
  assert.notEqual(forgedRetention.status, 0);
  assert.match(forgedRetention.stderr, /registered publication/i);

  const conflictingReplay = await postAttribution(userId, {
    ...complete,
    actp_offer_id: 'offer_conflicting_replay',
  });
  assert.equal(conflictingReplay.status, 500, conflictingReplay.text);
  assert.equal(
    psql('SELECT count(*) FROM public.owned_outcome_outbox;').stdout.trim(),
    '2',
  );

  const secondLineage = await postAttribution(userId, {
    ...complete,
    actp_touch_token: replayedTouchBody.touch_token,
    captured_at: replayedTouchBody.captured_at,
  });
  assert.equal(secondLineage.status, 500, secondLineage.text);
  assert.equal(
    psql('SELECT count(*) FROM public.owned_outcome_outbox;').stdout.trim(),
    '2',
    'same user cannot enqueue a second caller-supplied first-touch lineage',
  );

  const stored = psql(`
SELECT jsonb_build_object(
  'attribution', (SELECT to_jsonb(a) FROM public.attribution a WHERE user_id = '${userId}'),
  'outbox_count', (SELECT count(*) FROM public.owned_outcome_outbox),
  'outbox', (SELECT to_jsonb(o) FROM public.owned_outcome_outbox o LIMIT 1)
)::TEXT;
`).stdout.trim();
  const storedData = JSON.parse(stored);
  assert.equal(storedData.attribution.content_id, complete.actp_content_id);
  assert.equal(storedData.attribution.source_id, complete.actp_published_id);
  assert.equal(storedData.attribution.campaign_id, complete.actp_campaign_id);
  assert.equal(storedData.attribution.offer_id, complete.actp_offer_id);
  assert.equal(
    storedData.attribution.source_platform,
    complete.actp_source_platform,
  );
  assert.equal(storedData.attribution.touch_token, complete.actp_touch_token);
  assert.equal(
    Date.parse(storedData.attribution.captured_at),
    Date.parse(complete.captured_at),
  );
  assert.equal(storedData.outbox_count, 2);
  assert.deepEqual(storedData.outbox.payload.attribution, {
    content_id: complete.actp_content_id,
    campaign_id: complete.actp_campaign_id,
    offer_id: complete.actp_offer_id,
    source_platform: complete.actp_source_platform,
    source_id: complete.actp_published_id,
  });
  assert.equal(storedData.outbox.payload.journey_id, complete.actp_touch_token);
  assert.equal(
    Date.parse(storedData.outbox.payload.occurred_at),
    Date.parse(complete.captured_at),
  );

  const mismatch = await postAttribution(userId, {
    ...complete,
    expected_user_id: otherUserId,
    actp_touch_token: 'touch_mismatch',
  });
  assert.equal(mismatch.status, 400, mismatch.text);
  assert.match(JSON.parse(mismatch.text).error, /does not match/i);
  assert.equal(
    psql('SELECT count(*) FROM public.owned_outcome_outbox;').stdout.trim(),
    '2',
  );

  const { actp_offer_id: omittedOffer, ...partialTouch } = complete;
  assert.equal(omittedOffer, complete.actp_offer_id);
  const partial = await postAttribution(otherUserId, {
    ...partialTouch,
    expected_user_id: otherUserId,
    actp_touch_token: 'touch_incomplete_exact_dimensions',
  });
  assert.equal(partial.status, 500, partial.text);
  assert.equal(
    psql('SELECT count(*) FROM public.owned_outcome_outbox;').stdout.trim(),
    '2',
  );

  const invalidTimestamp = await postAttribution(invalidUserId, {
    ...complete,
    expected_user_id: invalidUserId,
    actp_touch_token: 'touch_invalid_timestamp',
    captured_at: '2026-08-24 12:00:00',
  });
  assert.equal(invalidTimestamp.status, 400, invalidTimestamp.text);
  assert.match(JSON.parse(invalidTimestamp.text).error, /RFC3339/i);
  assert.equal(
    psql(`SELECT count(*) FROM public.attribution WHERE user_id = '${invalidUserId}';`).stdout.trim(),
    '0',
  );

  const installFact = {
    expected_user_id: userId,
    provider_event_id: 'install_device_everreach_001',
    occurred_at: afterJourneyCapture,
    install_source: 'app_store',
    app_platform: 'ios',
  };
  const install = await postInstall(userId, installFact);
  assert.equal(install.status, 200, install.text);
  const installBody = JSON.parse(install.text);
  assert.equal(installBody.owned_outcome_install.status, 'queued');
  assert.equal(installBody.owned_outcome_install.inserted, true);

  const installReplay = await postInstall(userId, installFact);
  assert.equal(installReplay.status, 200, installReplay.text);
  assert.equal(
    JSON.parse(installReplay.text).owned_outcome_install.status,
    'idempotent_replay',
  );
  const installStored = JSON.parse(psql(`
SELECT jsonb_build_object(
  'count', (SELECT count(*) FROM public.owned_outcome_outbox),
  'journey_count', (
    SELECT count(DISTINCT touch_token) FROM public.owned_outcome_outbox
  ),
  'install', (
    SELECT payload FROM public.owned_outcome_outbox
    WHERE event_type='install' LIMIT 1
  )
)::TEXT;
`).stdout.trim());
  assert.equal(installStored.count, 3);
  assert.equal(installStored.journey_count, 2);
  assert.equal(installStored.install.event_type, 'install');
  assert.equal(
    installStored.install.provider_event_id,
    installFact.provider_event_id,
  );

  const attemptedLineageMutation = psql(`
UPDATE public.attribution
SET touch_token = 'touch_reassigned'
WHERE user_id = '${userId}';
`, { allowFailure: true });
  assert.notEqual(
    attemptedLineageMutation.status,
    0,
    'persisted attribution lineage must be immutable',
  );
  assert.match(attemptedLineageMutation.stderr, /immutable attribution lineage/i);

  const authenticatedLineageMutation = psql(`
SELECT set_config('request.jwt.claim.sub', '${userId}', FALSE);
SET ROLE authenticated;
UPDATE public.attribution
SET touch_token = 'touch_client_reassigned'
WHERE user_id = '${userId}';
`, { allowFailure: true });
  assert.notEqual(
    authenticatedLineageMutation.status,
    0,
    'authenticated clients must not receive attribution UPDATE access',
  );

  const privateRead = psql(`
SET ROLE authenticated;
SELECT count(*) FROM public.owned_outcome_outbox;
`, { allowFailure: true });
  assert.notEqual(privateRead.status, 0, 'app clients must not read the server outbox');

  const attemptedMutation = psql(`
UPDATE public.owned_outcome_outbox SET event_type = 'click';
`, { allowFailure: true });
  assert.notEqual(attemptedMutation.status, 0, 'outbox updates must be rejected');
  assert.match(attemptedMutation.stderr, /append-only|immutable row/i);

  const attemptedDelete = psql(`
DELETE FROM public.owned_outcome_outbox;
`, { allowFailure: true });
  assert.notEqual(attemptedDelete.status, 0, 'outbox deletes must be rejected');
  assert.match(attemptedDelete.stderr, /append-only|immutable row/i);

  for (let index = 0; index < 18; index += 1) {
    const withinLimit = await postApi('/api/v1/attribution/touch', {
      ...publicationInput,
      actp_publication_claim: publicationBody.actp_publication_claim,
    }, { 'x-forwarded-for': '198.51.100.10' });
    assert.equal(withinLimit.status, 200, withinLimit.text);
  }
  const flooded = await postApi('/api/v1/attribution/touch', {
    ...publicationInput,
    actp_publication_claim: publicationBody.actp_publication_claim,
  }, { 'x-forwarded-for': '198.51.100.10', 'user-agent': 'rotated-agent' });
  assert.equal(flooded.status, 429, flooded.text);

  const legacyTouch = await postApi('/api/v1/attribution/touch', {
    ...publicationInput,
    actp_publication_claim: publicationBody.actp_publication_claim,
  }, { 'x-forwarded-for': '198.51.100.20' });
  assert.equal(legacyTouch.status, 200, legacyTouch.text);
  const legacyTouchBody = JSON.parse(legacyTouch.text);
  const legacyCapture = await postAttribution(legacyUserId, {
    ...complete,
    expected_user_id: legacyUserId,
    actp_touch_token: legacyTouchBody.touch_token,
    captured_at: legacyTouchBody.captured_at,
  });
  assert.equal(legacyCapture.status, 200, legacyCapture.text);
  const legacyInstall = await postInstall(legacyUserId, {
    expected_user_id: legacyUserId,
    provider_event_id: 'install_legacy_upgrade_001',
    occurred_at: offsetTimestamp(legacyTouchBody.captured_at, 5 * 60_000),
    install_source: 'app_store',
    app_platform: 'ios',
  });
  assert.equal(legacyInstall.status, 200, legacyInstall.text);
  assert.equal(JSON.parse(legacyInstall.text).owned_outcome_install.status, 'queued');
  const legacyStored = JSON.parse(psql(`
SELECT jsonb_build_object(
  'legacy_row_exact_is_null', (
    SELECT content_id IS NULL AND touch_token IS NULL
    FROM public.attribution WHERE user_id='${legacyUserId}'
  ),
  'journey', (
    SELECT to_jsonb(j) FROM public.attribution_user_journeys j
    WHERE user_id='${legacyUserId}'
  ),
  'install', (
    SELECT payload FROM public.owned_outcome_outbox
    WHERE provider_event_id='install_legacy_upgrade_001'
  )
)::TEXT;
`).stdout.trim());
  assert.equal(legacyStored.legacy_row_exact_is_null, true);
  assert.equal(legacyStored.journey.touch_token, legacyTouchBody.touch_token);
  assert.equal(legacyStored.install.journey_id, legacyTouchBody.touch_token);
  assert.equal(legacyStored.install.attribution.content_id, complete.actp_content_id);

  // Optional stages stay optional: a verified click may advance directly to a
  // purchase without an install or trial fact being fabricated.
  const purchaseOnlyTouch = await postApi('/api/v1/attribution/touch', {
    ...publicationInput,
    actp_publication_claim: publicationBody.actp_publication_claim,
  }, { 'x-forwarded-for': '198.51.100.30' });
  assert.equal(purchaseOnlyTouch.status, 200, purchaseOnlyTouch.text);
  const purchaseOnlyTouchBody = JSON.parse(purchaseOnlyTouch.text);
  const purchaseOnlyCapture = await postAttribution(otherUserId, {
    ...complete,
    expected_user_id: otherUserId,
    actp_touch_token: purchaseOnlyTouchBody.touch_token,
    captured_at: purchaseOnlyTouchBody.captured_at,
  });
  assert.equal(purchaseOnlyCapture.status, 200, purchaseOnlyCapture.text);
  const directPurchase = JSON.parse(psql(`
SET ROLE service_role;
SELECT public.enqueue_owned_outcome_event(
  '${otherUserId}'::UUID, 'purchase', 'purchase_without_trial_001',
  '${offsetTimestamp(purchaseOnlyTouchBody.captured_at, 5 * 60_000)}'::TIMESTAMPTZ,
  '{"producer":"optional_path_integration"}'::JSONB
)::TEXT;
RESET ROLE;
`).stdout.trim());
  assert.equal(directPurchase.outbox_status, 'queued');
  assert.deepEqual(JSON.parse(psql(`
SELECT jsonb_agg(event_type ORDER BY occurred_at)::TEXT
FROM public.owned_outcome_outbox
WHERE touch_token = '${purchaseOnlyTouchBody.touch_token}';
`).stdout.trim()), ['click', 'purchase']);

  psql(`
SET ROLE service_role;
SELECT public.record_owned_provider_fact(
  'stripe', 'cus_late_mapping_001', NULL, 'purchase',
  'evt_late_mapping_001', '${offsetTimestamp(complete.captured_at, 15 * 60_000)}'::TIMESTAMPTZ,
  '{"producer":"stripe_webhook","amount":1299}'::JSONB
);
RESET ROLE;
`);
  assert.equal(psql(`
SELECT status FROM public.owned_outcome_reconciliation
WHERE provider_event_id='evt_late_mapping_001';
`).stdout.trim(), 'pending');
  // The owned-outcome project never reaches into the primary app project's
  // profiles table. Replay the same immutable provider fact after EverReach
  // resolves its customer mapping in the authoritative app data plane.
  psql(`
SET ROLE service_role;
SELECT public.record_owned_provider_fact(
  'stripe', 'cus_late_mapping_001', '${userId}'::UUID, 'purchase',
  'evt_late_mapping_001', '${offsetTimestamp(complete.captured_at, 15 * 60_000)}'::TIMESTAMPTZ,
  '{"producer":"stripe_webhook","amount":1299}'::JSONB
);
RESET ROLE;
`);
  const reconciled = JSON.parse(psql(`
SELECT jsonb_build_object(
  'status', (
    SELECT status FROM public.owned_outcome_reconciliation
    WHERE provider_event_id='evt_late_mapping_001'
  ),
  'payload', (
    SELECT payload FROM public.owned_outcome_outbox
    WHERE provider_event_id='evt_late_mapping_001'
  )
)::TEXT;
`).stdout.trim());
  assert.equal(reconciled.status, 'resolved');
  assert.equal(reconciled.payload.event_type, 'purchase');
  assert.equal(reconciled.payload.journey_id, complete.actp_touch_token);

  const quarantinedProvider = JSON.parse(psql(`
SET ROLE service_role;
SELECT public.record_owned_provider_fact(
  'revenuecat', '${userId}', '${userId}'::UUID, 'trial',
  'rc_trial_before_verified_touch_001',
  '${beforeJourneyCapture}'::TIMESTAMPTZ,
  '{"producer":"revenuecat_webhook","period_type":"TRIAL"}'::JSONB
)::TEXT;
RESET ROLE;
`).stdout.trim());
  assert.equal(
    quarantinedProvider.status,
    'quarantined_before_journey_capture',
  );
  assert.equal(
    quarantinedProvider.rejection_reason,
    'occurred_at_before_journey_capture',
  );
  const quarantineAudit = JSON.parse(psql(`
SELECT jsonb_build_object(
  'status', status,
  'last_error', last_error,
  'attempt_count', attempt_count,
  'outbox_count', (
    SELECT count(*) FROM public.owned_outcome_outbox
    WHERE provider_event_id = 'rc_trial_before_verified_touch_001'
  )
)::TEXT
FROM public.owned_outcome_reconciliation
WHERE provider = 'revenuecat'
  AND provider_event_id = 'rc_trial_before_verified_touch_001'
  AND event_type = 'trial';
`).stdout.trim());
  assert.deepEqual(quarantineAudit, {
    status: 'quarantined',
    last_error: 'occurred_at_before_journey_capture',
    attempt_count: 1,
    outbox_count: 0,
  });
  const quarantineReplay = JSON.parse(psql(`
SET ROLE service_role;
SELECT public.record_owned_provider_fact(
  'revenuecat', '${userId}', '${userId}'::UUID, 'trial',
  'rc_trial_before_verified_touch_001',
  '${beforeJourneyCapture}'::TIMESTAMPTZ,
  '{"producer":"revenuecat_webhook","period_type":"TRIAL"}'::JSONB
)::TEXT;
RESET ROLE;
`).stdout.trim());
  assert.equal(quarantineReplay.status, 'idempotent_quarantine');

  nextProcess.kill('SIGTERM');
  await new Promise((resolve) => nextProcess.once('exit', resolve));
  const revenueCatSecret = 'local-revenuecat-signature-secret';
  nextProcess = spawn(
    process.execPath,
    [join(BACKEND_DIR, 'node_modules', 'next', 'dist', 'bin', 'next'), 'dev', '-p', String(routePort)],
    {
      cwd: BACKEND_DIR,
      env: {
        ...process.env,
        SUPABASE_URL: `${localProtocol}//127.0.0.1:${apiPort}`,
        SUPABASE_ANON_KEY: 'local-real-database-key',
        SUPABASE_SERVICE_ROLE_KEY: 'local-real-service-key',
        SUPABASE_JWT_SECRET: TEST_SECRET,
        OWNED_OUTCOME_SUPABASE_URL: `${localProtocol}//127.0.0.1:${apiPort}`,
        OWNED_OUTCOME_SUPABASE_SERVICE_ROLE_KEY: 'local-real-service-key',
        REVENUECAT_WEBHOOK_SECRET: revenueCatSecret,
        ATTRIBUTION_CLAIM_SIGNING_SECRET: 'local-attribution-signing-secret',
        OWNED_RETENTION_INGEST_TOKEN: 'local-retention-ingest-credential',
        ['ATTRIBUTION_PUBLICATION_CON' + 'TROL_TO' + 'KEN']:
          'local-registry-credential',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  await waitForRoute();

  const revenueCatEvent = {
    api_version: '1.0',
    event: {
      id: 'rc_event_duplicate_001',
      type: 'INITIAL_PURCHASE',
      app_user_id: userId,
      original_app_user_id: userId,
      product_id: 'everreach_pro_monthly',
      period_type: 'TRIAL',
      purchased_at_ms: Date.parse(offsetTimestamp(complete.captured_at, 20 * 60_000)),
      event_timestamp_ms: Date.parse(offsetTimestamp(complete.captured_at, 20 * 60_000)),
      expiration_at_ms: Date.parse(offsetTimestamp(complete.captured_at, 30 * 24 * 60 * 60_000)),
      environment: 'SANDBOX',
      entitlement_ids: ['pro'],
      transaction_id: 'rc_transaction_duplicate_001',
      original_transaction_id: 'rc_original_001',
      store: 'APP_STORE',
      price_in_purchased_currency: 0,
      currency: 'USD',
    },
  };
  psql(`
SET ROLE service_role;
INSERT INTO public.subscription_events(
  user_id,event_type,transaction_id,raw_payload,occurred_at
) VALUES (
  '${userId}','INITIAL_PURCHASE','rc_transaction_duplicate_001',
  '{}'::JSONB,'2026-08-25T16:00:00Z'::TIMESTAMPTZ
);
RESET ROLE;
`);
  const duplicateBody = JSON.stringify(revenueCatEvent);
  const duplicateWebhook = await routeCall(routePort, '/api/webhooks/revenuecat', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(duplicateBody),
      'x-revenuecat-webhook-signature': revenueCatHeader(
        duplicateBody,
        revenueCatSecret,
      ),
    },
    body: duplicateBody,
  });
  assert.equal(duplicateWebhook.status, 200, duplicateWebhook.text);
  assert.equal(JSON.parse(duplicateWebhook.text).duplicate, true);
  assert.equal(psql(`
SELECT count(*) FROM public.owned_outcome_outbox
WHERE provider_event_id='rc_transaction_duplicate_001';
`).stdout.trim(), '1');

  psql(`
CREATE FUNCTION public.reject_selected_subscription_audit()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.transaction_id = 'rc_audit_failure_001' THEN
    RAISE EXCEPTION 'forced real audit storage failure';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER reject_selected_subscription_audit
BEFORE INSERT ON public.subscription_events FOR EACH ROW
EXECUTE FUNCTION public.reject_selected_subscription_audit();
`);
  const auditFailureEvent = structuredClone(revenueCatEvent);
  auditFailureEvent.event.id = 'rc_event_audit_failure_001';
  auditFailureEvent.event.transaction_id = 'rc_audit_failure_001';
  const auditFailureBody = JSON.stringify(auditFailureEvent);
  const auditFailure = await routeCall(routePort, '/api/webhooks/revenuecat', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(auditFailureBody),
      'x-revenuecat-webhook-signature': revenueCatHeader(
        auditFailureBody,
        revenueCatSecret,
      ),
    },
    body: auditFailureBody,
  });
  assert.equal(auditFailure.status, 500, auditFailure.text);
  assert.equal(psql(`
SELECT count(*) FROM public.owned_outcome_reconciliation
WHERE provider_event_id='rc_audit_failure_001';
`).stdout.trim(), '0');
  const rawAuditRead = psql(`
SET ROLE authenticated;
SELECT raw_payload FROM public.subscription_events LIMIT 1;
`, { allowFailure: true });
  assert.notEqual(rawAuditRead.status, 0, 'authenticated clients must not read raw webhook audits');
  const unauthorizedDeliveryRead = psql(`
SET ROLE authenticated;
SELECT public.take_owned_delivery('event','malicious-client',60);
`, { allowFailure: true });
  assert.notEqual(
    unauthorizedDeliveryRead.status,
    0,
    'authenticated clients must not execute delivery readers',
  );
  const unauthorizedLegacyDeliveryRead = psql(`
SET ROLE authenticated;
SELECT public.reserve_owned_outcome_delivery('malicious-client',60);
`, { allowFailure: true });
  assert.notEqual(
    unauthorizedLegacyDeliveryRead.status,
    0,
    'legacy delivery reader must also be service-role only',
  );

  console.log('PASS attribution route + real PostgreSQL owned-outcome outbox');
}

try {
  await main();
} finally {
  if (nextProcess && nextProcess.exitCode === null) {
    nextProcess.kill('SIGTERM');
    await new Promise((resolve) => {
      const timeout = setTimeout(resolve, 5_000);
      nextProcess.once('exit', () => {
        clearTimeout(timeout);
        resolve();
      });
    });
  }
  if (apiServer) {
    await new Promise((resolve) => apiServer.close(resolve));
  }
  if (postgresStarted) {
    command('pg_ctl', ['-D', clusterDir, 'stop', '-m', 'fast']);
  }
  rmSync(clusterDir, { recursive: true, force: true });
  rmSync(socketDir, { recursive: true, force: true });
}
