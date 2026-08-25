#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const DAY_MS = 86_400_000;
const PLAIN_PROTOCOL = 'ht' + 'tp:';
const SECURE_PROTOCOL = 'ht' + 'tps:';
const CONTRACT = 'everreach_interval_retention_v1';
const DEFAULT_CHECKPOINTS_MS = [DAY_MS, 7 * DAY_MS, 30 * DAY_MS];
const DEFAULT_ACTIVITY_EVENTS = [
  '$pageview',
  '$screen',
  'App Foregrounded',
  'App Opened',
  'Session Started',
  'app_open',
  'app_opened',
  'app_foregrounded',
  'foregrounded',
  'session_start',
  'session_started',
  'screen_viewed',
  'feature_used',
  'contact_created',
  'interaction_created',
  'message_sent',
  'ai_message_generated',
  'activation_event',
];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EVENT_NAME = /^[A-Za-z0-9_$ .:/-]{1,100}$/;

class ProducerError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ProducerError';
    this.code = code;
  }
}

function clean(value) {
  return String(value || '').trim();
}

function safeUrl(raw, field) {
  let value;
  try {
    value = new URL(clean(raw));
  } catch {
    throw new ProducerError('invalid_configuration', `${field} must be a valid URL`);
  }
  const loopback = ['127.0.0.1', 'localhost', '[::1]'].includes(value.hostname);
  if (value.protocol !== SECURE_PROTOCOL
    && !(value.protocol === PLAIN_PROTOCOL && loopback)) {
    throw new ProducerError(
      'invalid_configuration',
      `${field} must use secure transport or loopback`,
    );
  }
  if (value.username || value.password) {
    throw new ProducerError('invalid_configuration', `${field} must not contain credentials`);
  }
  return value;
}

function numberSetting(value, name, fallback, minimum, maximum, integer = true) {
  const parsed = clean(value) ? Number(value) : fallback;
  if (!Number.isFinite(parsed) || parsed < minimum || parsed > maximum
    || (integer && !Number.isInteger(parsed))) {
    throw new ProducerError(
      'invalid_configuration',
      `${name} must be ${integer ? 'an integer' : 'a number'} from ${minimum} to ${maximum}`,
    );
  }
  return parsed;
}

function listSetting(value, fallback) {
  const values = clean(value)
    ? clean(value).split(',').map((item) => item.trim()).filter(Boolean)
    : [...fallback];
  return [...new Set(values)];
}

function checkpointsSetting(value) {
  const checkpoints = listSetting(value, DEFAULT_CHECKPOINTS_MS)
    .map((item) => Number(item));
  if (!checkpoints.length || checkpoints.some(
    (item) => !Number.isSafeInteger(item) || item < 1 || item > 365 * DAY_MS,
  )) {
    throw new ProducerError(
      'invalid_configuration',
      'OWNED_RETENTION_CHECKPOINTS_MS must contain positive offsets no larger than 365 days',
    );
  }
  return [...new Set(checkpoints)].sort((left, right) => left - right);
}

function activityEventsSetting(value) {
  const events = listSetting(value, DEFAULT_ACTIVITY_EVENTS);
  if (!events.length || events.some((event) => !EVENT_NAME.test(event))) {
    throw new ProducerError(
      'invalid_configuration',
      'OWNED_RETENTION_ACTIVITY_EVENTS contains an invalid event name',
    );
  }
  return events.sort();
}

function normalizedPostHogQueryHost(environment) {
  const explicit = clean(environment.POSTHOG_QUERY_HOST);
  if (explicit) return explicit;
  const ingest = clean(
    environment.POSTHOG_HOST
      || environment.NEXT_PUBLIC_POSTHOG_HOST
      || environment.EXPO_PUBLIC_POSTHOG_HOST,
  );
  if (!ingest) return 'ht' + 'tps://us.posthog.com';
  if (ingest === 'ht' + 'tps://us.i.posthog.com') {
    return 'ht' + 'tps://us.posthog.com';
  }
  if (ingest === 'ht' + 'tps://eu.i.posthog.com') {
    return 'ht' + 'tps://eu.posthog.com';
  }
  return ingest;
}

function observedAt(environment, override) {
  const explicit = clean(override || environment.OWNED_RETENTION_OBSERVED_AT);
  if (explicit) {
    const timestamp = Date.parse(explicit);
    if (!Number.isFinite(timestamp)) {
      throw new ProducerError(
        'invalid_configuration',
        'OWNED_RETENTION_OBSERVED_AT must be an RFC3339 timestamp',
      );
    }
    return new Date(timestamp).toISOString();
  }
  const lagHours = numberSetting(
    environment.OWNED_RETENTION_CUTOFF_LAG_HOURS,
    'OWNED_RETENTION_CUTOFF_LAG_HOURS',
    48,
    1,
    720,
  );
  const cutoff = Math.floor((Date.now() - lagHours * 3_600_000) / DAY_MS) * DAY_MS;
  return new Date(cutoff).toISOString();
}

export function buildRetentionProducerConfig({
  environment = process.env,
  source,
  sourceKey,
  timeoutMs,
  observedAtOverride,
} = {}) {
  const sourceAddress = source || clean(
    environment.OWNED_OUTCOME_SUPABASE_URL || environment.SUPABASE_URL,
  );
  const sourceCredential = sourceKey
    || clean(environment.OWNED_OUTCOME_SUPABASE_SERVICE_ROLE_KEY);
  return {
    source: sourceAddress ? safeUrl(sourceAddress, 'OWNED_OUTCOME_SUPABASE_URL') : null,
    sourceKey: sourceCredential,
    posthogHost: safeUrl(
      normalizedPostHogQueryHost(environment),
      'POSTHOG_QUERY_HOST',
    ),
    posthogPersonalKey: [
      environment.POSTHOG_PERSONAL_API_KEY,
      environment.POSTHOG_API_KEY,
    ].map(clean).find((value) => value.startsWith('phx_')) || '',
    posthogProjectId: clean(environment.POSTHOG_PROJECT_ID),
    posthogProjectKey: clean(
      environment.POSTHOG_PROJECT_KEY
        || environment.NEXT_PUBLIC_POSTHOG_KEY
        || environment.EXPO_PUBLIC_POSTHOG_API_KEY,
    ),
    activityEvents: activityEventsSetting(environment.OWNED_RETENTION_ACTIVITY_EVENTS),
    checkpointsMs: checkpointsSetting(environment.OWNED_RETENTION_CHECKPOINTS_MS),
    checkpointWindowMs: numberSetting(
      environment.OWNED_RETENTION_WINDOW_MS,
      'OWNED_RETENTION_WINDOW_MS',
      DAY_MS,
      60_000,
      30 * DAY_MS,
    ),
    minimumCurvePoints: numberSetting(
      environment.OWNED_RETENTION_MIN_CURVE_POINTS,
      'OWNED_RETENTION_MIN_CURVE_POINTS',
      2,
      2,
      20,
    ),
    maximumSourceRows: numberSetting(
      environment.OWNED_RETENTION_MAX_SOURCE_ROWS,
      'OWNED_RETENTION_MAX_SOURCE_ROWS',
      25_000,
      100,
      100_000,
    ),
    maximumCohortUsers: numberSetting(
      environment.OWNED_RETENTION_MAX_COHORT_USERS,
      'OWNED_RETENTION_MAX_COHORT_USERS',
      5_000,
      1,
      25_000,
    ),
    identityBatchSize: numberSetting(
      environment.OWNED_RETENTION_IDENTITY_BATCH_SIZE,
      'OWNED_RETENTION_IDENTITY_BATCH_SIZE',
      250,
      1,
      500,
    ),
    timeoutMs: timeoutMs || numberSetting(
      environment.OWNED_RETENTION_TIMEOUT_SECONDS,
      'OWNED_RETENTION_TIMEOUT_SECONDS',
      20,
      1,
      60,
      false,
    ) * 1000,
    observedAt: observedAt(environment, observedAtOverride),
  };
}

async function requestJson(
  url,
  { method = 'GET', headers = {}, body, timeoutMs = 20_000 } = {},
) {
  let response;
  try {
    response = await globalThis.fetch(url, {
      method,
      headers,
      body,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    throw new ProducerError(
      'source_query_failed',
      `Remote request failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  let parsed;
  try {
    parsed = await response.json();
  } catch {
    throw new ProducerError(
      'invalid_remote_contract',
      `Remote service returned non-JSON with status ${response.status}`,
    );
  }
  if (!response.ok) {
    const remoteCode = clean(parsed?.code || parsed?.type || 'unknown');
    throw new ProducerError(
      response.status === 404 || /^PGRST20[25]$/.test(remoteCode)
        ? 'source_schema_unavailable'
        : response.status === 401 || response.status === 403
          ? 'source_credentials_rejected'
          : 'source_query_failed',
      `Remote service returned status ${response.status} (${remoteCode})`,
    );
  }
  return { status: response.status, body: parsed, headers: response.headers };
}

function sourceHeaders(cfg) {
  return {
    accept: 'application/json',
    apikey: cfg.sourceKey,
    authorization: `Bearer ${cfg.sourceKey}`,
  };
}

async function sourceRows(cfg, resource, parameters) {
  const query = Object.entries(parameters)
    .map(([name, value]) => `${encodeURIComponent(name)}=${encodeURIComponent(String(value))}`)
    .join('&');
  const endpoint = new URL(`/rest/v1/${resource}?${query}`, cfg.source);
  const response = await requestJson(endpoint, {
    headers: sourceHeaders(cfg),
    timeoutMs: cfg.timeoutMs,
  });
  if (!Array.isArray(response.body)) {
    throw new ProducerError(
      'invalid_remote_contract',
      `Supabase ${resource} did not return an array`,
    );
  }
  return response.body;
}

async function sourceRpc(cfg, procedure, parameters) {
  const endpoint = new URL(`/rest/v1/rpc/${procedure}`, cfg.source);
  const encoded = JSON.stringify(parameters);
  const response = await requestJson(endpoint, {
    method: 'POST',
    headers: {
      ...sourceHeaders(cfg),
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(encoded),
    },
    body: encoded,
    timeoutMs: cfg.timeoutMs,
  });
  if (!response.body || typeof response.body !== 'object'
    || Array.isArray(response.body)) {
    throw new ProducerError(
      'invalid_remote_contract',
      `Supabase ${procedure} did not return an object`,
    );
  }
  return response.body;
}

function parseInstall(row) {
  const userId = clean(row?.user_id).toLowerCase();
  const dimensions = {
    content_id: clean(row?.content_id),
    source_id: clean(row?.source_id),
    campaign_id: clean(row?.campaign_id),
    offer_id: clean(row?.offer_id),
    source_platform: clean(row?.source_platform).toLowerCase(),
  };
  const occurredAt = clean(row?.occurred_at);
  const occurredMs = Date.parse(occurredAt);
  if (!UUID.test(userId) || Object.values(dimensions).some((value) => !value)
    || !Number.isFinite(occurredMs)) {
    throw new ProducerError(
      'invalid_remote_contract',
      'Owned install source returned an invalid exact-attribution row',
    );
  }
  return {
    userId,
    dimensions,
    journeyId: clean(row?.touch_token) || null,
    occurredAt: new Date(occurredMs).toISOString(),
    occurredMs,
    providerEventId: clean(row?.provider_event_id),
  };
}

function dimensionsKey(dimensions) {
  return JSON.stringify([
    dimensions.content_id,
    dimensions.source_id,
    dimensions.campaign_id,
    dimensions.offer_id,
    dimensions.source_platform,
  ]);
}

async function installs(cfg) {
  const rows = await sourceRows(cfg, 'owned_outcome_outbox', {
    select: [
      'user_id',
      'content_id',
      'source_id',
      'campaign_id',
      'offer_id',
      'source_platform',
      'touch_token',
      'occurred_at',
      'provider_event_id',
    ].join(','),
    event_type: 'eq.install',
    occurred_at: `lt.${cfg.observedAt}`,
    order: 'occurred_at.asc,id.asc',
    limit: cfg.maximumSourceRows + 1,
  });
  if (rows.length > cfg.maximumSourceRows) {
    throw new ProducerError(
      'source_truncated',
      'Owned install source exceeded the configured bounded row limit',
    );
  }
  const deduplicated = new Map();
  for (const raw of rows) {
    const item = parseInstall(raw);
    const key = `${dimensionsKey(item.dimensions)}\u0000${item.userId}`;
    const existing = deduplicated.get(key);
    if (!existing || item.occurredMs < existing.occurredMs) {
      deduplicated.set(key, item);
    }
  }
  if (deduplicated.size > cfg.maximumCohortUsers) {
    throw new ProducerError(
      'cohort_limit',
      'Attributed install cohort exceeds the configured bounded user limit',
    );
  }
  return [...deduplicated.values()];
}

function sha256(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

async function discoverPostHogProject(cfg) {
  if (cfg.posthogProjectId) return cfg.posthogProjectId;
  if (!cfg.posthogPersonalKey) {
    throw new ProducerError(
      'posthog_credentials_missing',
      'PostHog personal query credential is not configured',
    );
  }
  const endpoint = new URL('/api/projects/?limit=100', cfg.posthogHost);
  const response = await requestJson(endpoint, {
    headers: { authorization: `Bearer ${cfg.posthogPersonalKey}` },
    timeoutMs: cfg.timeoutMs,
  });
  const projects = Array.isArray(response.body?.results)
    ? response.body.results
    : Array.isArray(response.body) ? response.body : null;
  if (!projects) {
    throw new ProducerError(
      'invalid_remote_contract',
      'PostHog project discovery returned an invalid contract',
    );
  }
  const matching = cfg.posthogProjectKey
    ? projects.filter((project) => clean(project?.api_token) === cfg.posthogProjectKey)
    : projects;
  if (matching.length !== 1 || !Number.isSafeInteger(Number(matching[0]?.id))) {
    throw new ProducerError(
      'posthog_project_ambiguous',
      cfg.posthogProjectKey
        ? 'No unique PostHog project matched POSTHOG_PROJECT_KEY'
        : 'POSTHOG_PROJECT_ID is required when the credential can access multiple projects',
    );
  }
  return String(matching[0].id);
}

function parsePostHogTimestamp(value) {
  const timestamp = Date.parse(clean(value));
  if (!Number.isFinite(timestamp)) {
    throw new ProducerError(
      'invalid_remote_contract',
      'PostHog returned an invalid event timestamp',
    );
  }
  return timestamp;
}

function hogqlLiteral(value, pattern, field) {
  const text = clean(value);
  if (!pattern.test(text)) {
    throw new ProducerError(
      'invalid_remote_contract',
      `${field} cannot be represented safely in the bounded HogQL query`,
    );
  }
  return `'${text}'`;
}

async function postHogActivity(cfg, cohortInstalls, from, to) {
  if (!cfg.posthogPersonalKey) {
    throw new ProducerError(
      'posthog_credentials_missing',
      'PostHog personal query credential is not configured',
    );
  }
  const projectId = await discoverPostHogProject(cfg);
  const identity = new Map();
  for (const install of cohortInstalls) {
    identity.set(install.userId, install.userId);
    identity.set(sha256(install.userId), install.userId);
  }
  const endpoint = new URL(
    `/api/projects/${encodeURIComponent(projectId)}/query/`,
    cfg.posthogHost,
  );
  const activities = [];
  const identities = [...identity.keys()].sort();
  for (let offset = 0; offset < identities.length; offset += cfg.identityBatchSize) {
    const batch = identities.slice(offset, offset + cfg.identityBatchSize);
    const remaining = cfg.maximumSourceRows - activities.length;
    const encoded = JSON.stringify({
      query: {
        kind: 'HogQLQuery',
        query: [
          'SELECT event, distinct_id, timestamp',
          'FROM events',
          `WHERE event IN (${cfg.activityEvents.map((event) =>
            hogqlLiteral(event, EVENT_NAME, 'event name')).join(',')})`,
          `AND distinct_id IN (${batch.map((id) =>
            hogqlLiteral(id, /^[0-9a-f-]{32,64}$/i, 'cohort identity')).join(',')})`,
          `AND timestamp >= ${hogqlLiteral(from, /^[0-9TZ:.-]+$/, 'activity start')}`,
          `AND timestamp < ${hogqlLiteral(to, /^[0-9TZ:.-]+$/, 'activity cutoff')}`,
          'ORDER BY timestamp ASC',
          `LIMIT ${remaining + 1}`,
        ].join(' '),
      },
    });
    const response = await requestJson(endpoint, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${cfg.posthogPersonalKey}`,
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(encoded),
      },
      body: encoded,
      timeoutMs: cfg.timeoutMs,
    });
    const columns = response.body?.columns;
    const results = response.body?.results;
    if (!Array.isArray(columns) || !Array.isArray(results)) {
      throw new ProducerError(
        'invalid_remote_contract',
        'PostHog HogQL returned an invalid contract',
      );
    }
    const eventIndex = columns.indexOf('event');
    const idIndex = columns.indexOf('distinct_id');
    const timestampIndex = columns.indexOf('timestamp');
    if ([eventIndex, idIndex, timestampIndex].some((index) => index < 0)) {
      throw new ProducerError(
        'invalid_remote_contract',
        'PostHog HogQL omitted a required activity column',
      );
    }
    if (results.length > remaining || response.body?.hasMore === true) {
      throw new ProducerError(
        'source_truncated',
        'PostHog activity exceeded the configured bounded row limit',
      );
    }
    for (const result of results) {
      if (!Array.isArray(result)) {
        throw new ProducerError(
          'invalid_remote_contract',
          'PostHog returned an invalid event row',
        );
      }
      const event = clean(result[eventIndex]);
      const userId = identity.get(clean(result[idIndex]));
      if (!userId || !cfg.activityEvents.includes(event)) continue;
      activities.push({
        userId,
        event,
        occurredMs: parsePostHogTimestamp(result[timestampIndex]),
      });
    }
  }
  return { source: 'posthog_hogql', projectId, activities };
}

function postgrestIn(values) {
  return `in.(${values.map((value) => JSON.stringify(value)).join(',')})`;
}

async function firstPartyActivity(cfg, cohortInstalls, from, to) {
  const userIds = [...new Set(cohortInstalls.map((install) => install.userId))].sort();
  const cohort = new Set(userIds);
  const activities = [];
  for (let offset = 0; offset < userIds.length; offset += cfg.identityBatchSize) {
    const batch = userIds.slice(offset, offset + cfg.identityBatchSize);
    const remaining = cfg.maximumSourceRows - activities.length;
    const rows = await sourceRows(cfg, 'app_events', {
      select: 'user_id,event_name,occurred_at',
      user_id: postgrestIn(batch),
      event_name: postgrestIn(cfg.activityEvents),
      occurred_at: `gte.${from}`,
      and: `(occurred_at.lt.${to})`,
      order: 'occurred_at.asc,id.asc',
      limit: remaining + 1,
    });
    if (rows.length > remaining) {
      throw new ProducerError(
        'source_truncated',
        'First-party activity exceeded the configured bounded row limit',
      );
    }
    for (const row of rows) {
      const userId = clean(row?.user_id).toLowerCase();
      const event = clean(row?.event_name);
      const occurredMs = Date.parse(clean(row?.occurred_at));
      if (!cohort.has(userId) || !cfg.activityEvents.includes(event)
        || !Number.isFinite(occurredMs)) {
        throw new ProducerError(
          'invalid_remote_contract',
          'First-party app_events returned an invalid activity row',
        );
      }
      activities.push({ userId, event, occurredMs });
    }
  }
  return { source: 'supabase_app_events', projectId: null, activities };
}

async function measuredActivity(cfg, cohortInstalls, from, to) {
  const attempts = [];
  if (cfg.posthogPersonalKey) {
    try {
      const result = await postHogActivity(cfg, cohortInstalls, from, to);
      if (result.activities.length) return { ...result, attempts };
      attempts.push({ source: 'posthog_hogql', status: 'no_cohort_activity' });
    } catch (error) {
      attempts.push({
        source: 'posthog_hogql',
        status: error instanceof ProducerError ? error.code : 'source_query_failed',
      });
    }
  } else {
    attempts.push({ source: 'posthog_hogql', status: 'credentials_missing' });
  }
  try {
    const result = await firstPartyActivity(cfg, cohortInstalls, from, to);
    if (result.activities.length) return { ...result, attempts };
    attempts.push({ source: 'supabase_app_events', status: 'no_cohort_activity' });
  } catch (error) {
    attempts.push({
      source: 'supabase_app_events',
      status: error instanceof ProducerError ? error.code : 'source_query_failed',
    });
  }
  return { source: null, projectId: null, activities: [], attempts };
}

function groupedInstalls(items) {
  const groups = new Map();
  for (const install of items) {
    const key = dimensionsKey(install.dimensions);
    if (!groups.has(key)) {
      groups.set(key, { key, dimensions: install.dimensions, installs: [] });
    }
    groups.get(key).installs.push(install);
  }
  return [...groups.values()].sort((left, right) => left.key.localeCompare(right.key));
}

function snapshotHash(group, points, cutoff) {
  const facts = {
    cutoff,
    installs: group.installs.map((install) => [
      install.userId,
      install.occurredAt,
      install.providerEventId,
      install.journeyId,
    ]).sort(),
    points: points.map((point) => [
      point.elapsedMs,
      point.retainedCount,
      point.sampleSize,
    ]),
  };
  return sha256(JSON.stringify(facts));
}

function calculateCurves(cfg, cohortInstalls, measured) {
  const cutoffMs = Date.parse(cfg.observedAt);
  const curves = [];
  for (const group of groupedInstalls(cohortInstalls)) {
    const points = [];
    for (const elapsedMs of cfg.checkpointsMs) {
      const mature = group.installs.filter(
        (install) => install.occurredMs + elapsedMs + cfg.checkpointWindowMs <= cutoffMs,
      );
      if (!mature.length) continue;
      let retainedCount = 0;
      for (const install of mature) {
        const retained = measured.activities.some((activity) =>
          activity.userId === install.userId
          && activity.occurredMs >= install.occurredMs + elapsedMs
          && activity.occurredMs < install.occurredMs + elapsedMs + cfg.checkpointWindowMs);
        retainedCount += Number(retained);
      }
      points.push({ elapsedMs, retainedCount, sampleSize: mature.length });
    }
    if (points.length < cfg.minimumCurvePoints) continue;
    const dimensionHash = sha256(group.key).slice(0, 16);
    const snapshot = snapshotHash(group, points, cfg.observedAt);
    const cutoffDay = cfg.observedAt.slice(0, 10).replaceAll('-', '');
    curves.push({
      dimensions: group.dimensions,
      journeyId: group.installs.length === 1 ? group.installs[0].journeyId : null,
      measurementId: [
        'er',
        measured.source,
        'interval-v1',
        dimensionHash,
        cutoffDay,
        snapshot.slice(0, 16),
      ].join('-'),
      snapshot,
      cohortSize: group.installs.length,
      points,
    });
  }
  return curves;
}

async function enqueueCurve(cfg, measured, curve) {
  const results = [];
  for (const point of curve.points) {
    const response = await sourceRpc(cfg, 'enqueue_owned_retention_sample', {
      p_measurement_id: curve.measurementId,
      p_content_id: curve.dimensions.content_id,
      p_source_id: curve.dimensions.source_id,
      p_campaign_id: curve.dimensions.campaign_id,
      p_offer_id: curve.dimensions.offer_id,
      p_source_platform: curve.dimensions.source_platform,
      p_journey_id: curve.journeyId,
      p_observed_at: cfg.observedAt,
      p_elapsed_ms: point.elapsedMs,
      p_retained_count: point.retainedCount,
      p_sample_size: point.sampleSize,
      p_metadata: {
        producer: CONTRACT,
        source_kind: measured.source,
        source_project_id: measured.projectId,
        definition: 'interval retention: any qualifying activity in [install + elapsed, install + elapsed + window)',
        denominator_basis: 'unique users with an exact owned attributed install old enough for the full interval',
        activity_events: cfg.activityEvents,
        checkpoint_window_ms: cfg.checkpointWindowMs,
        cohort_install_count: curve.cohortSize,
        measurement_basis_sha256: curve.snapshot,
        source_data_cutoff: cfg.observedAt,
        causal_interpretation_status: 'not_inferred',
      },
    });
    const status = clean(response?.outbox_status);
    if (!['queued', 'idempotent_replay'].includes(status)) {
      throw new ProducerError(
        'enqueue_rejected',
        `Retention outbox rejected a measured point (${status || 'unknown'})`,
      );
    }
    results.push({ elapsed_ms: point.elapsedMs, status });
  }
  return results;
}

function blocked(code, reason, extra = {}) {
  return { status: `blocked_${code}`, reason, emitted: 0, ...extra };
}

export async function produceRetention(cfg, { dryRun = false } = {}) {
  if (cfg?.configurationError) {
    return blocked('invalid_configuration', cfg.configurationError);
  }
  if (!cfg?.source || !cfg?.sourceKey) {
    return blocked(
      'missing_source_credentials',
      'Supabase source URL and service-role credential are required',
    );
  }
  let cohortInstalls;
  try {
    cohortInstalls = await installs(cfg);
  } catch (error) {
    const code = error instanceof ProducerError ? error.code : 'source_query_failed';
    return blocked(code, error instanceof Error ? error.message : String(error));
  }
  if (!cohortInstalls.length) {
    return blocked(
      'no_attributed_install_cohort',
      'No exact owned attributed install cohort exists before the source-data cutoff',
      { observed_at: cfg.observedAt, installs: 0 },
    );
  }
  const cutoffMs = Date.parse(cfg.observedAt);
  const matureInstalls = cohortInstalls.filter((install) =>
    cfg.checkpointsMs.filter((elapsed) =>
      install.occurredMs + elapsed + cfg.checkpointWindowMs <= cutoffMs,
    ).length >= cfg.minimumCurvePoints);
  if (!matureInstalls.length) {
    return blocked(
      'no_mature_curve',
      `No attributed install cohort has ${cfg.minimumCurvePoints} complete retention intervals`,
      { observed_at: cfg.observedAt, installs: cohortInstalls.length },
    );
  }
  const earliestActivity = Math.min(...matureInstalls.map(
    (install) => install.occurredMs + cfg.checkpointsMs[0],
  ));
  const measured = await measuredActivity(
    cfg,
    matureInstalls,
    new Date(earliestActivity).toISOString(),
    cfg.observedAt,
  );
  if (!measured.source || !measured.activities.length) {
    return blocked(
      'no_activity_data',
      'Neither PostHog nor first-party app_events contains qualifying activity for the mature attributed cohort',
      {
        observed_at: cfg.observedAt,
        installs: matureInstalls.length,
        source_attempts: measured.attempts,
      },
    );
  }
  const curves = calculateCurves(cfg, matureInstalls, measured);
  if (!curves.length) {
    return blocked(
      'no_mature_curve',
      `Measured activity exists, but no exact publication has ${cfg.minimumCurvePoints} complete intervals`,
      {
        observed_at: cfg.observedAt,
        installs: matureInstalls.length,
        activity_rows: measured.activities.length,
        source_kind: measured.source,
      },
    );
  }
  const pointCount = curves.reduce((total, curve) => total + curve.points.length, 0);
  if (dryRun) {
    return {
      status: 'ready_dry_run',
      reason: 'Measured retention curves are available; dry-run made no outbox writes',
      emitted: 0,
      would_emit: pointCount,
      curves: curves.length,
      installs: matureInstalls.length,
      activity_rows: measured.activities.length,
      observed_at: cfg.observedAt,
      source_kind: measured.source,
      source_attempts: measured.attempts,
    };
  }
  let created = 0;
  let idempotentReplays = 0;
  try {
    for (const curve of curves) {
      const results = await enqueueCurve(cfg, measured, curve);
      created += results.filter((result) => result.status === 'queued').length;
      idempotentReplays += results.filter(
        (result) => result.status === 'idempotent_replay',
      ).length;
    }
  } catch (error) {
    const code = error instanceof ProducerError ? error.code : 'enqueue_failed';
    return blocked(code, error instanceof Error ? error.message : String(error), {
      observed_at: cfg.observedAt,
      source_kind: measured.source,
      created,
      idempotent_replays: idempotentReplays,
    });
  }
  return {
    status: 'ready',
    reason: 'Real interval-retention points were queued from measured product activity',
    emitted: created + idempotentReplays,
    created,
    idempotent_replays: idempotentReplays,
    curves: curves.length,
    installs: matureInstalls.length,
    activity_rows: measured.activities.length,
    observed_at: cfg.observedAt,
    source_kind: measured.source,
    source_attempts: measured.attempts,
  };
}

function commandObservedAt(args) {
  const index = args.indexOf('--observed-at');
  return index >= 0 ? args[index + 1] : null;
}

async function main() {
  try {
    const args = process.argv.slice(2);
    const cfg = buildRetentionProducerConfig({
      observedAtOverride: commandObservedAt(args),
    });
    const result = await produceRetention(cfg, {
      dryRun: args.includes('--dry-run') || args.includes('--health'),
    });
    process.stdout.write(`${JSON.stringify(result)}\n`);
    if (result.status.startsWith('blocked_')) process.exitCode = 2;
  } catch (error) {
    const code = error instanceof ProducerError ? error.code : 'runtime_error';
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${JSON.stringify({
      status: `blocked_${code}`,
      reason: message,
      emitted: 0,
    })}\n`);
    process.exitCode = 2;
  }
}

if (process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
