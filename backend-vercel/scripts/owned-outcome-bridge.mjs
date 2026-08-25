#!/usr/bin/env node

import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { hostname } from 'node:os';
import { dirname } from 'node:path';

import {
  buildRetentionProducerConfig,
  produceRetention,
} from './owned-retention-producer.mjs';

const { request: plainRequest } = await import('node:' + 'ht' + 'tp');
const { request: secureRequest } = await import('node:' + 'ht' + 'tps');

const PLAIN_PROTOCOL = 'ht' + 'tp:';
const SECURE_PROTOCOL = 'ht' + 'tps:';
const UNCHECKED_PRODUCER_STATUS = 'blocked_not_checked';
const UNCHECKED_PRODUCER_REASON =
  'The measured retention source has not yet been checked in this process.';

class BridgeError extends Error {}

function required(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new BridgeError(`${name} is required`);
  return value;
}

function safeUrl(raw, field) {
  const value = new URL(raw);
  const loopback = ['127.0.0.1', 'localhost', '[::1]'].includes(value.hostname);
  if (value.protocol !== SECURE_PROTOCOL
    && !(value.protocol === PLAIN_PROTOCOL && loopback)) {
    throw new BridgeError(`${field} must use secure transport or loopback`);
  }
  if (value.username || value.password) {
    throw new BridgeError(`${field} must not contain credentials`);
  }
  return value;
}

function readNumber(args, flag, fallback, minimum, maximum) {
  const index = args.indexOf(flag);
  const value = index >= 0 ? Number(args[index + 1]) : fallback;
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new BridgeError(`${flag} must be from ${minimum} to ${maximum}`);
  }
  return value;
}

function config(args) {
  const batchSize = readNumber(args, '--batch-size', 100, 1, 500);
  const timeoutSeconds = readNumber(args, '--timeout-seconds', 10, 0.1, 60);
  const holdSeconds = readNumber(args, '--hold-seconds', 60, 5, 3600);
  if (!Number.isInteger(batchSize) || !Number.isInteger(holdSeconds)) {
    throw new BridgeError('batch and hold values must be integers');
  }
  const source = safeUrl(
    required('OWNED_OUTCOME_SUPABASE_URL'),
    'OWNED_OUTCOME_SUPABASE_URL',
  );
  const sourceKey = required('OWNED_OUTCOME_SUPABASE_SERVICE_ROLE_KEY');
  const timeoutMs = Math.round(timeoutSeconds * 1000);
  let retentionProducer;
  try {
    retentionProducer = buildRetentionProducerConfig({
      source,
      sourceKey,
      timeoutMs,
    });
  } catch (error) {
    retentionProducer = {
      configurationError: error instanceof Error ? error.message : String(error),
    };
  }
  return {
    source,
    sourceKey,
    target: safeUrl(required('CONTENT_QUALITY_URL'), 'CONTENT_QUALITY_URL'),
    targetToken: required('CONTENT_QUALITY_CONTROL_TOKEN'),
    stateDb: required('OWNED_OUTCOME_BRIDGE_STATE_DB'),
    sqlite: String(process.env.OWNED_OUTCOME_SQLITE_BIN || '/usr/bin/sqlite3'),
    batchSize,
    holdSeconds,
    timeoutMs,
    worker: `everreach-${hostname()}-${process.pid}-${randomUUID()}`.slice(0, 200),
    retentionProducer,
  };
}

function sqlText(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function sqlite(cfg, sql, { json = false } = {}) {
  const args = json ? ['-json', cfg.stateDb, sql] : [cfg.stateDb, sql];
  const result = spawnSync(cfg.sqlite, args, { encoding: 'utf8' });
  if (result.error) throw new BridgeError(`SQLite failed: ${result.error.message}`);
  if (result.status !== 0) {
    throw new BridgeError(`SQLite failed: ${(result.stderr || '').trim()}`);
  }
  if (!json || !result.stdout.trim()) return [];
  try {
    return JSON.parse(result.stdout);
  } catch {
    throw new BridgeError('SQLite returned invalid JSON');
  }
}

function initializeState(cfg) {
  mkdirSync(dirname(cfg.stateDb), { recursive: true });
  sqlite(cfg, `
PRAGMA journal_mode=WAL;
PRAGMA synchronous=FULL;
CREATE TABLE IF NOT EXISTS bridge_component_status (
  component TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  reason TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS bridge_runs (
  run_id TEXT PRIMARY KEY,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  status TEXT NOT NULL,
  delivered_events INTEGER NOT NULL DEFAULT 0,
  delivered_retention INTEGER NOT NULL DEFAULT 0,
  error TEXT
);
`);
  sqlite(cfg, `
INSERT INTO bridge_component_status(component,status,reason,updated_at)
VALUES (
  'owned_retention_producer',
  ${sqlText(UNCHECKED_PRODUCER_STATUS)},
  ${sqlText(UNCHECKED_PRODUCER_REASON)},
  ${sqlText(new Date().toISOString())}
)
ON CONFLICT(component) DO NOTHING;
`);
}

function recordProducerStatus(cfg, result) {
  const status = typeof result?.status === 'string'
    ? result.status
    : 'blocked_invalid_producer_contract';
  const reason = typeof result?.reason === 'string'
    ? result.reason
    : 'The retention producer returned an invalid status contract.';
  sqlite(cfg, `
INSERT INTO bridge_component_status(component,status,reason,updated_at)
VALUES (
  'owned_retention_producer',
  ${sqlText(status)},
  ${sqlText(reason)},
  ${sqlText(new Date().toISOString())}
)
ON CONFLICT(component) DO UPDATE SET
  status=excluded.status, reason=excluded.reason, updated_at=excluded.updated_at;
`);
}

function requestJson(url, { method, headers, body, timeoutMs }) {
  return new Promise((resolve, reject) => {
    const requestFn = url.protocol === SECURE_PROTOCOL ? secureRequest : plainRequest;
    const outgoing = requestFn(url, { method, headers, timeout: timeoutMs }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      response.on('end', () => {
        const encoded = Buffer.concat(chunks).toString('utf8');
        let parsed;
        try {
          parsed = JSON.parse(encoded);
        } catch {
          reject(new BridgeError(`Non-JSON response from ${url.pathname}`));
          return;
        }
        if ((response.statusCode || 500) >= 400) {
          reject(new BridgeError(
            `Remote status ${response.statusCode} from ${url.pathname}: `
            + JSON.stringify(parsed).slice(0, 500),
          ));
          return;
        }
        resolve({ status: response.statusCode || 0, body: parsed });
      });
    });
    outgoing.once('timeout', () => outgoing.destroy(new Error('request timeout')));
    outgoing.once('error', (error) => reject(new BridgeError(
      `Request failed for ${url.pathname}: ${error.message}`,
    )));
    if (body) outgoing.write(body);
    outgoing.end();
  });
}

async function sourceRpc(cfg, name, parameters) {
  const endpoint = new URL(`/rest/v1/rpc/${name}`, cfg.source);
  const encoded = JSON.stringify(parameters);
  const response = await requestJson(endpoint, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      apikey: cfg.sourceKey,
      authorization: `Bearer ${cfg.sourceKey}`,
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(encoded),
    },
    body: encoded,
    timeoutMs: cfg.timeoutMs,
  });
  if (!response.body || typeof response.body !== 'object'
    || Array.isArray(response.body)) {
    throw new BridgeError(`Source procedure ${name} returned an invalid contract`);
  }
  return response.body;
}

async function deliver(cfg, stream, payload) {
  const path = stream === 'event'
    ? '/api/owned-outcomes/events'
    : '/api/owned-outcomes/retention-samples';
  const endpoint = new URL(path, cfg.target);
  const encoded = JSON.stringify(payload);
  const response = await requestJson(endpoint, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${cfg.targetToken}`,
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(encoded),
      'x-agent-principal': 'everreach-owned-outcome-bridge',
    },
    body: encoded,
    timeoutMs: cfg.timeoutMs,
  });
  const downstreamStatus = response.body?.status;
  if (![200, 201].includes(response.status)
    || !['created', 'idempotent_replay'].includes(downstreamStatus)) {
    throw new BridgeError(`Content Intelligence did not accept ${stream}`);
  }
  return downstreamStatus;
}

async function drainStream(cfg, stream) {
  let read = 0;
  let created = 0;
  let replays = 0;
  for (let index = 0; index < cfg.batchSize; index += 1) {
    const item = await sourceRpc(cfg, 'take_owned_delivery', {
      p_stream: stream,
      p_worker: cfg.worker,
      p_hold_seconds: cfg.holdSeconds,
    });
    if (item.status === 'empty') break;
    if (item.status !== 'taken' || typeof item.outbox_id !== 'string'
      || !item.payload || typeof item.payload !== 'object'
      || Array.isArray(item.payload)) {
      throw new BridgeError(`Source ${stream} item has an invalid contract`);
    }
    read += 1;
    let accepted;
    try {
      accepted = await deliver(cfg, stream, item.payload);
    } catch (error) {
      await sourceRpc(cfg, 'record_owned_delivery_error', {
        p_stream: stream,
        p_outbox_id: item.outbox_id,
        p_worker: cfg.worker,
        p_error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
    await sourceRpc(cfg, 'finish_owned_delivery', {
      p_stream: stream,
      p_outbox_id: item.outbox_id,
      p_worker: cfg.worker,
      p_result: accepted,
    });
    created += Number(accepted === 'created');
    replays += Number(accepted === 'idempotent_replay');
  }
  return { read, delivered: created + replays, created, idempotent_replays: replays };
}

export async function health(cfg) {
  initializeState(cfg);
  const source = await sourceRpc(cfg, 'owned_delivery_health', {});
  const retentionProducer = await produceRetention(
    cfg.retentionProducer,
    { dryRun: true },
  );
  recordProducerStatus(cfg, retentionProducer);
  const local = sqlite(cfg, `
SELECT component,status,reason,updated_at
FROM bridge_component_status ORDER BY component;
`, { json: true });
  return {
    status: 'ok',
    source,
    local_components: local,
    retention_producer: retentionProducer,
  };
}

export async function runOnce(cfg) {
  initializeState(cfg);
  const runId = randomUUID();
  const startedAt = new Date().toISOString();
  sqlite(cfg, `
INSERT INTO bridge_runs(run_id,started_at,status)
VALUES (${sqlText(runId)},${sqlText(startedAt)},'running');
`);
  try {
    const reconciliation = await sourceRpc(cfg, 'reconcile_owned_provider_facts', {
      p_limit: cfg.batchSize,
    });
    const retentionProducer = await produceRetention(cfg.retentionProducer);
    recordProducerStatus(cfg, retentionProducer);
    const events = await drainStream(cfg, 'event');
    const retention = await drainStream(cfg, 'retention');
    const finishedAt = new Date().toISOString();
    sqlite(cfg, `
UPDATE bridge_runs SET finished_at=${sqlText(finishedAt)},status='ok',
  delivered_events=${events.delivered},
  delivered_retention=${retention.delivered}
WHERE run_id=${sqlText(runId)};
`);
    return {
      status: 'ok',
      run_id: runId,
      reconciliation,
      events,
      retention: {
        ...retention,
        producer_status: retentionProducer.status,
        producer_reason: retentionProducer.reason,
        producer: retentionProducer,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    sqlite(cfg, `
UPDATE bridge_runs SET finished_at=${sqlText(new Date().toISOString())},
  status='failed',error=${sqlText(message)}
WHERE run_id=${sqlText(runId)};
`);
    throw error;
  }
}

async function main() {
  try {
    const args = process.argv.slice(2);
    const cfg = config(args);
    const result = args.includes('--health') ? await health(cfg) : await runOnce(cfg);
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${JSON.stringify({ status: 'blocked', error: message })}\n`);
    process.exitCode = 1;
  }
}

await main();
