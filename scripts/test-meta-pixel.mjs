#!/usr/bin/env node
/**
 * Meta Pixel / Conversions API Verification Script (Node.js)
 *
 * Usage:
 *   node scripts/test-meta-pixel.mjs               # send all standard events
 *   node scripts/test-meta-pixel.mjs --event PageView  # send a single event
 *
 * Reads .env for EXPO_PUBLIC_META_PIXEL_ID, EXPO_PUBLIC_META_CONVERSIONS_API_TOKEN,
 * and EXPO_PUBLIC_META_TEST_EVENT_CODE.
 *
 * Exit codes: 0 = all passed, 1 = at least one failed
 */

import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = resolve(__dirname, '..');

// Load .env
function loadEnv() {
  const envPath = resolve(PROJECT_DIR, '.env');
  try {
    const content = readFileSync(envPath, 'utf-8');
    const vars = {};
    for (const line of content.split('\n')) {
      const cleaned = line.replace(/\r/g, '').trim();
      if (!cleaned || cleaned.startsWith('#')) continue;
      const eqIdx = cleaned.indexOf('=');
      if (eqIdx > 0) {
        vars[cleaned.substring(0, eqIdx)] = cleaned.substring(eqIdx + 1);
      }
    }
    return vars;
  } catch {
    return {};
  }
}

const env = loadEnv();
const PIXEL_ID = env.EXPO_PUBLIC_META_PIXEL_ID || process.env.EXPO_PUBLIC_META_PIXEL_ID || '';
const TOKEN = env.EXPO_PUBLIC_META_CONVERSIONS_API_TOKEN || process.env.EXPO_PUBLIC_META_CONVERSIONS_API_TOKEN || '';
const TEST_CODE = env.EXPO_PUBLIC_META_TEST_EVENT_CODE || process.env.EXPO_PUBLIC_META_TEST_EVENT_CODE || 'TEST48268';
const API_VERSION = 'v21.0';

function sha256(str) {
  return createHash('sha256').update(str).digest('hex');
}

const EMAIL_HASH = sha256('isaiahdupree33@gmail.com');
const PHONE_HASH = sha256('15551234567'); // normalized test phone
const FBP = `fb.1.${Date.now()}.${Math.floor(Math.random() * 2147483647)}`;

// Fetch client IP for Event Match Quality
let CLIENT_IP = null;
try {
  const ipRes = await fetch('https://api.ipify.org?format=json');
  if (ipRes.ok) CLIENT_IP = (await ipRes.json()).ip;
} catch {}


// Colors
const c = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
};

let passed = 0;
let failed = 0;

async function sendEvent(eventName, customData = {}) {
  const ts = Math.floor(Date.now() / 1000);
  const eventId = `${eventName}_cli_${ts}_${Math.random().toString(36).slice(2, 8)}`;

  const payload = {
    data: [
      {
        event_name: eventName,
        event_time: ts,
        event_id: eventId,
        action_source: 'app',
        user_data: {
          em: [EMAIL_HASH],
          ph: [PHONE_HASH],
          external_id: ['everreach_cli_test'],
          client_user_agent: 'EverReach/1.0 (ios)',
          ...(CLIENT_IP && { client_ip_address: CLIENT_IP }),
          fbp: FBP,
        },
        custom_data: { source: 'cli_test', ...customData },
        app_data: {
          advertiser_tracking_enabled: 1,
          application_tracking_enabled: 1,
          extinfo: [
            'i2', 'com.everreach.app', '1.0.0', '1.0.0', '18.0',
            'iPhone', 'en_US', 'UTC', '', '390', '844', '2', '6',
            '256000', '225000', '-5',
          ],
        },
      },
    ],
    test_event_code: TEST_CODE,
  };

  const url = `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events?access_token=${TOKEN}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const body = await res.json();

    if (res.ok && body.events_received > 0) {
      console.log(`  ${c.green}✅ ${eventName}${c.reset} → events_received: ${body.events_received} (HTTP ${res.status})`);
      passed++;
    } else {
      const msg = body.error?.error_user_msg || body.error?.message || JSON.stringify(body);
      console.log(`  ${c.red}❌ ${eventName}${c.reset} → HTTP ${res.status}`);
      console.log(`     ${c.red}${msg}${c.reset}`);
      failed++;
    }
  } catch (err) {
    console.log(`  ${c.red}❌ ${eventName}${c.reset} → Network error: ${err.message}`);
    failed++;
  }
}

// Parse args
const args = process.argv.slice(2);
let singleEvent = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--event' && args[i + 1]) {
    singleEvent = args[i + 1];
    i++;
  }
}

// Validate config
console.log(`${c.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}`);
console.log(`${c.cyan}  Meta Pixel Verification${c.reset}`);
console.log(`${c.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}`);
console.log(`  Pixel ID:    ${PIXEL_ID}`);
console.log(`  Token:       ${TOKEN.substring(0, 20)}...`);
console.log(`  Test Code:   ${TEST_CODE}`);
console.log(`  API Version: ${API_VERSION}`);
console.log('');

if (!PIXEL_ID || !TOKEN) {
  console.log(`${c.red}ERROR: Missing EXPO_PUBLIC_META_PIXEL_ID or EXPO_PUBLIC_META_CONVERSIONS_API_TOKEN in .env${c.reset}`);
  process.exit(1);
}

const standardEvents = [
  { name: 'PageView', data: {} },
  { name: 'ViewContent', data: { content_name: 'test_screen', content_type: 'screen' } },
  { name: 'CompleteRegistration', data: { content_name: 'test_signup', status: 'test' } },
  { name: 'Lead', data: { content_name: 'test_lead', value: 0, currency: 'USD' } },
  { name: 'StartTrial', data: { value: 0, currency: 'USD' } },
  { name: 'Subscribe', data: { value: 9.99, currency: 'USD' } },
  { name: 'Purchase', data: { value: 9.99, currency: 'USD' } },
  { name: 'Search', data: { search_string: 'test query' } },
  { name: 'Contact', data: { content_name: 'test_contact' } },
];

async function main() {
  if (singleEvent) {
    console.log(`${c.yellow}Sending single event: ${singleEvent}${c.reset}\n`);
    await sendEvent(singleEvent, { source: 'cli_single_test' });
  } else {
    console.log(`${c.yellow}Sending ${standardEvents.length} standard Meta events...${c.reset}\n`);
    for (const { name, data } of standardEvents) {
      await sendEvent(name, data);
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  const total = passed + failed;
  console.log('');
  console.log(`${c.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}`);
  console.log(`  Results: ${c.green}${passed} passed${c.reset} / ${c.red}${failed} failed${c.reset} / ${total} total`);
  console.log(`  Test code: ${TEST_CODE}`);
  console.log(`  Verify at: https://business.facebook.com/events_manager2/list/dataset/${PIXEL_ID}/test_events`);
  console.log(`${c.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}`);

  process.exit(failed > 0 ? 1 : 0);
}

main();
