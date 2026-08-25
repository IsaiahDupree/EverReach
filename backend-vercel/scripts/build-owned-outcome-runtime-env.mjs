#!/usr/bin/env node

import { randomBytes } from 'node:crypto';
import {
  accessSync,
  chmodSync,
  constants,
  lstatSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import { parseArgs } from 'node:util';

import dotenv from 'dotenv';

const EXPECTED_SHARED_PROJECT_REF = 'ivhfuhxorppptyuofbgq';
const SCRUBBED = /^(?:__|<)|placeholder|your[_ -]|replace[_ -]|changeme/i;

class ConfigurationError extends Error {}

function privateEnvironment(path, label) {
  const absolute = resolve(path);
  let stat;
  try {
    stat = lstatSync(absolute);
  } catch {
    throw new ConfigurationError(`${label} does not exist`);
  }
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new ConfigurationError(`${label} must be a non-symlink regular file`);
  }
  if (typeof process.getuid === 'function' && stat.uid !== process.getuid()) {
    throw new ConfigurationError(`${label} must be owned by the current user`);
  }
  if ((stat.mode & 0o077) !== 0) {
    throw new ConfigurationError(`${label} must have no group/world permissions`);
  }
  return { absolute, values: dotenv.parse(readFileSync(absolute, 'utf8')) };
}

function usable(value, name, minimum = 32) {
  const cleaned = String(value || '').trim();
  if (!cleaned || cleaned.length < minimum || SCRUBBED.test(cleaned)) {
    throw new ConfigurationError(`${name} is missing or scrubbed`);
  }
  return cleaned;
}

function decodedJwt(value, name) {
  const parts = value.split('.');
  if (parts.length !== 3) {
    throw new ConfigurationError(`${name} must be a service-role JWT`);
  }
  try {
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    throw new ConfigurationError(`${name} must contain a valid JWT payload`);
  }
}

function sharedProjectConfiguration(environment) {
  const rawUrl = usable(environment.SUPABASE_URL, 'shared SUPABASE_URL', 20);
  let address;
  try {
    address = new URL(rawUrl);
  } catch {
    throw new ConfigurationError('shared SUPABASE_URL is invalid');
  }
  const expectedHost = `${EXPECTED_SHARED_PROJECT_REF}.supabase.co`;
  if (address.protocol !== 'https:' || address.host !== expectedHost
    || address.username || address.password || address.pathname !== '/') {
    throw new ConfigurationError(
      `shared SUPABASE_URL must identify ${EXPECTED_SHARED_PROJECT_REF}`,
    );
  }
  const serviceKey = usable(
    environment.SUPABASE_SERVICE_ROLE_KEY || environment.SUPABASE_SERVICE_KEY,
    'shared service-role key',
    100,
  );
  const claims = decodedJwt(serviceKey, 'shared service-role key');
  if (claims.role !== 'service_role' || claims.ref !== EXPECTED_SHARED_PROJECT_REF) {
    throw new ConfigurationError(
      'shared service-role key does not match the configured shared project',
    );
  }
  return { url: address.toString().replace(/\/$/, ''), serviceKey };
}

function safeContentQualityUrl(raw) {
  const address = new URL(raw || 'http://127.0.0.1:6010');
  const loopback = ['127.0.0.1', 'localhost', '[::1]'].includes(address.hostname);
  if ((address.protocol !== 'https:' && !(address.protocol === 'http:' && loopback))
    || address.username || address.password) {
    throw new ConfigurationError(
      'CONTENT_QUALITY_URL must use HTTPS or credential-free loopback HTTP',
    );
  }
  return address.toString().replace(/\/$/, '');
}

function preservedOrGenerated(existing, name) {
  const current = String(existing[name] || '').trim();
  if (current) return usable(current, name, 48);
  return randomBytes(48).toString('base64url');
}

function nodeExecutable(raw) {
  const value = usable(raw, 'Node executable', 2);
  if (!value.startsWith('/')) {
    throw new ConfigurationError('Node executable must use an absolute path');
  }
  try {
    const stat = lstatSync(value);
    if (!stat.isFile() && !stat.isSymbolicLink()) throw new Error('not a file');
    accessSync(value, constants.X_OK);
  } catch {
    throw new ConfigurationError('Node executable must be an executable file');
  }
  return value;
}

function quoted(value) {
  return `'${String(value).replace(/'/g, `'"'"'`)}'`;
}

function optionalPostHog(personalEnvironment, projectEnvironment) {
  if (!personalEnvironment && !projectEnvironment) return {};
  const personalValues = personalEnvironment?.values || {};
  const projectValues = projectEnvironment?.values || personalValues;
  const personalKey = usable(
    personalValues.POSTHOG_PERSONAL_API_KEY || personalValues.POSTHOG_API_KEY,
    'PostHog personal API key',
    40,
  );
  if (!personalKey.startsWith('phx_')) {
    throw new ConfigurationError('PostHog personal API key must use the phx_ format');
  }
  const projectId = String(projectValues.POSTHOG_PROJECT_ID || '').trim();
  const projectKey = String(
    projectValues.POSTHOG_PROJECT_KEY
      || projectValues.NEXT_PUBLIC_POSTHOG_KEY
      || projectValues.EXPO_PUBLIC_POSTHOG_API_KEY
      || '',
  ).trim();
  if (projectId && !/^\d+$/.test(projectId)) {
    throw new ConfigurationError('POSTHOG_PROJECT_ID must be numeric');
  }
  if (!projectId && (!projectKey || !projectKey.startsWith('phc_')
    || SCRUBBED.test(projectKey))) {
    throw new ConfigurationError(
      'PostHog requires a numeric project ID or usable phc_ project key',
    );
  }
  return {
    POSTHOG_PERSONAL_API_KEY: personalKey,
    ...(projectId ? { POSTHOG_PROJECT_ID: projectId } : {}),
    ...(projectKey ? { POSTHOG_PROJECT_KEY: projectKey } : {}),
    POSTHOG_QUERY_HOST: 'https://us.posthog.com',
  };
}

function main() {
  const { values: args } = parseArgs({
    options: {
      output: { type: 'string' },
      'shared-env': { type: 'string' },
      'content-quality-env': { type: 'string' },
      'content-quality-url': { type: 'string' },
      'posthog-env': { type: 'string' },
      'posthog-project-env': { type: 'string' },
      'state-db': { type: 'string' },
      'status-file': { type: 'string' },
    },
    strict: true,
  });
  if (!args.output || !args['shared-env'] || !args['content-quality-env']) {
    throw new ConfigurationError(
      '--output, --shared-env, and --content-quality-env are required',
    );
  }
  const output = resolve(args.output);
  const shared = privateEnvironment(args['shared-env'], 'shared credential env');
  const contentQuality = privateEnvironment(
    args['content-quality-env'],
    'Content Quality runtime env',
  );
  const posthog = args['posthog-env']
    ? privateEnvironment(args['posthog-env'], 'PostHog credential env')
    : null;
  const posthogProject = args['posthog-project-env']
    ? privateEnvironment(args['posthog-project-env'], 'PostHog project env')
    : null;
  const existing = (() => {
    try { return dotenv.parse(readFileSync(output, 'utf8')); }
    catch { return {}; }
  })();
  const sharedProject = sharedProjectConfiguration(shared.values);
  const runtimeDirectory = dirname(output);
  const stateDb = resolve(
    args['state-db'] || `${runtimeDirectory}/owned-outcome-bridge.sqlite3`,
  );
  const statusFile = resolve(
    args['status-file'] || `${runtimeDirectory}/owned-outcome-last-run.json`,
  );
  const values = {
    OWNED_OUTCOME_SUPABASE_URL: sharedProject.url,
    OWNED_OUTCOME_SUPABASE_SERVICE_ROLE_KEY: sharedProject.serviceKey,
    OWNED_OUTCOME_NODE_BIN: nodeExecutable(process.execPath),
    CONTENT_QUALITY_URL: safeContentQualityUrl(args['content-quality-url']),
    CONTENT_QUALITY_CONTROL_TOKEN: usable(
      contentQuality.values.CONTENT_QUALITY_CONTROL_TOKEN,
      'Content Quality control token',
      32,
    ),
    ATTRIBUTION_PUBLICATION_CONTROL_TOKEN: preservedOrGenerated(
      existing,
      'ATTRIBUTION_PUBLICATION_CONTROL_TOKEN',
    ),
    ATTRIBUTION_CLAIM_SIGNING_SECRET: preservedOrGenerated(
      existing,
      'ATTRIBUTION_CLAIM_SIGNING_SECRET',
    ),
    OWNED_RETENTION_INGEST_TOKEN: preservedOrGenerated(
      existing,
      'OWNED_RETENTION_INGEST_TOKEN',
    ),
    OWNED_OUTCOME_BRIDGE_STATE_DB: stateDb,
    OWNED_OUTCOME_RUN_STATUS_FILE: statusFile,
    ...optionalPostHog(posthog, posthogProject),
  };

  const rendered = [
    '# Generated by build-owned-outcome-runtime-env.mjs; chmod 600; never commit.',
    ...Object.entries(values)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([name, value]) => `export ${name}=${quoted(value)}`),
    '',
  ].join('\n');
  mkdirSync(runtimeDirectory, { recursive: true, mode: 0o700 });
  chmodSync(runtimeDirectory, 0o700);
  const temporary = `${output}.tmp-${process.pid}`;
  rmSync(temporary, { force: true });
  try {
    writeFileSync(temporary, rendered, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
    chmodSync(temporary, 0o600);
    renameSync(temporary, output);
    chmodSync(output, 0o600);
  } finally {
    rmSync(temporary, { force: true });
  }
  process.stdout.write(`${JSON.stringify({
    status: 'configured',
    output,
    shared_project_ref: EXPECTED_SHARED_PROJECT_REF,
    posthog_configured: Boolean(values.POSTHOG_PERSONAL_API_KEY),
    secrets_preserved: Boolean(
      existing.ATTRIBUTION_PUBLICATION_CONTROL_TOKEN
        && existing.ATTRIBUTION_CLAIM_SIGNING_SECRET
        && existing.OWNED_RETENTION_INGEST_TOKEN,
    ),
  })}\n`);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${JSON.stringify({ status: 'blocked', error: message })}\n`);
  process.exitCode = 1;
}
