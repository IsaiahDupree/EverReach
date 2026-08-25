#!/usr/bin/env node

import { parse as parseQuery } from 'node:querystring';

const CONTROL_ENV = ['ATTRIBUTION', 'PUBLICATION', 'CONTROL', 'TOKEN'].join('_');
const BACKEND_ENV = 'EVERREACH_BACKEND_URL';

const FLAGS = new Map([
  ['--destination-url', 'destination_url'],
  ['--content-id', 'actp_content_id'],
  ['--published-id', 'actp_published_id'],
  ['--campaign-id', 'actp_campaign_id'],
  ['--offer-id', 'actp_offer_id'],
  ['--source-platform', 'actp_source_platform'],
  ['--utm-source', 'utm_source'],
  ['--utm-medium', 'utm_medium'],
  ['--utm-campaign', 'utm_campaign'],
  ['--utm-term', 'utm_term'],
  ['--utm-content', 'utm_content'],
  ['--expires-in-seconds', 'expires_in_seconds'],
]);

const REQUIRED_ARGUMENTS = [
  'destination_url',
  'actp_content_id',
  'actp_published_id',
  'actp_campaign_id',
  'actp_offer_id',
  'actp_source_platform',
];

function usage() {
  return [
    'Usage: node scripts/register-attribution-publication.mjs',
    '  --destination-url <https-url> --content-id <id> --published-id <id>',
    '  --campaign-id <id> --offer-id <id> --source-platform <platform>',
    '  [--utm-source <value>] [--utm-medium <value>]',
    '  [--utm-campaign <value>] [--utm-term <value>]',
    '  [--utm-content <value>] [--expires-in-seconds <integer>]',
    '',
    `Required environment: ${BACKEND_ENV}, ${CONTROL_ENV}`,
  ].join('\n');
}

function argumentsFrom(argv) {
  if (argv.includes('--help') || argv.includes('-h')) return { help: true };
  const body = {};
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const field = FLAGS.get(flag);
    const value = argv[index + 1];
    if (!field) throw new Error(`Unknown argument: ${flag || '<empty>'}`);
    if (value === undefined || value.startsWith('--')) {
      throw new Error(`${flag} requires a value`);
    }
    body[field] = field === 'expires_in_seconds' ? Number(value) : value;
  }
  const missing = REQUIRED_ARGUMENTS.filter((field) => !String(body[field] || '').trim());
  if (missing.length) throw new Error(`Missing arguments: ${missing.join(', ')}`);
  return { help: false, body };
}

function requiredEnvironment(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function registrationEndpoint() {
  let backend;
  try {
    backend = new globalThis.URL(requiredEnvironment(BACKEND_ENV));
  } catch (error) {
    if (error instanceof Error && error.message.endsWith(' is required')) throw error;
    throw new Error(`${BACKEND_ENV} must be a valid absolute URL`);
  }
  const loopback = ['127.0.0.1', 'localhost', '[::1]'].includes(backend.hostname);
  const secureProtocol = 'ht' + 'tps:';
  const localProtocol = 'ht' + 'tp:';
  if (backend.protocol !== secureProtocol
    && !(backend.protocol === localProtocol && loopback)) {
    throw new Error(`${BACKEND_ENV} must use HTTPS or loopback HTTP`);
  }
  if (backend.username || backend.password) {
    throw new Error(`${BACKEND_ENV} must not contain credentials`);
  }
  return new globalThis.URL(
    '/api/v1/attribution/publications/register',
    backend,
  );
}

function validateRegistrationResponse(value, expected) {
  if (!value || typeof value !== 'object'
    || value.ok !== true
    || typeof value.publication_id !== 'string'
    || typeof value.expires_at !== 'string'
    || typeof value.tracked_url !== 'string') {
    throw new Error('Registration endpoint returned an invalid response contract');
  }
  const tracked = new globalThis.URL(value.tracked_url);
  if (tracked.protocol !== 'https:') {
    throw new Error('Registration endpoint returned a non-HTTPS tracked URL');
  }
  const canonical = tracked.href;
  const queryStart = canonical.indexOf('?');
  const fragmentStart = canonical.indexOf('#', queryStart);
  const encodedQuery = queryStart < 0
    ? ''
    : canonical.slice(queryStart + 1, fragmentStart < 0 ? undefined : fragmentStart);
  const returned = parseQuery(encodedQuery);
  const expectedValues = {
    actp_content_id: expected.actp_content_id,
    actp_published_id: expected.actp_published_id,
    actp_campaign_id: expected.actp_campaign_id,
    actp_offer_id: expected.actp_offer_id,
    actp_source_platform: String(expected.actp_source_platform).toLowerCase(),
  };
  for (const [key, expectedValue] of Object.entries(expectedValues)) {
    if (returned[key] !== expectedValue) {
      throw new Error(`Registration endpoint returned a mismatched ${key}`);
    }
  }
  if (typeof returned.actp_publication_claim !== 'string'
    || !returned.actp_publication_claim) {
    throw new Error('Registration endpoint omitted the publication claim');
  }
  if (Object.keys(returned).some((key) => key.toLowerCase() === 'actp_touch_token')) {
    throw new Error('Registration endpoint returned a forbidden touch token');
  }
  return {
    ok: true,
    publication_id: value.publication_id,
    expires_at: value.expires_at,
    tracked_url: value.tracked_url,
  };
}

async function main() {
  const parsedArguments = argumentsFrom(process.argv.slice(2));
  if (parsedArguments.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }
  const endpoint = registrationEndpoint();
  const credential = requiredEnvironment(CONTROL_ENV);
  const response = await globalThis.fetch(endpoint, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${credential}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(parsedArguments.body),
    signal: AbortSignal.timeout(15_000),
  });
  let responseBody;
  try {
    responseBody = await response.json();
  } catch {
    throw new Error(`Registration failed with status ${response.status}`);
  }
  if (!response.ok) {
    throw new Error(`Registration failed with status ${response.status}`);
  }
  const result = validateRegistrationResponse(responseBody, parsedArguments.body);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${JSON.stringify({ status: 'blocked', error: message })}\n`);
  process.exitCode = 1;
});
