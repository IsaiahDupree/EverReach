#!/usr/bin/env node
/**
 * RevenueCat Webhook Event Monitor — Local proxy for real-time debugging
 *
 * Usage:
 *   node scripts/revenuecat-event-monitor.mjs
 *
 * This script:
 *   1. Listens on port 3457 for RevenueCat webhook events
 *   2. Logs every event with color-coded output
 *   3. Forwards to your real backend webhook handler (optional)
 *   4. Shows the Meta CAPI event that WOULD be fired for each event
 *
 * To use with RevenueCat:
 *   - In RevenueCat Dashboard → Integrations → Webhooks
 *   - Add a webhook URL pointing to your ngrok/localtunnel URL + /webhook
 *   - Or use this locally with the simulator by pointing to localhost:3457
 *
 * For StoreKit testing:
 *   - Make a test purchase in Xcode/Simulator
 *   - RevenueCat processes the sandbox transaction
 *   - If webhook is pointed here, you'll see the event live
 */

import http from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env
function loadEnv() {
  try {
    const envPath = resolve(__dirname, '..', '.env');
    const content = readFileSync(envPath, 'utf-8');
    const vars = {};
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      vars[key] = val;
    }
    return vars;
  } catch {
    return {};
  }
}

const env = loadEnv();
const BACKEND_URL = env.EXPO_PUBLIC_API_URL || 'https://ever-reach-be.vercel.app';
const FORWARD_TO_BACKEND = process.argv.includes('--forward');
const PORT = 3457;

// ANSI colors
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  white: '\x1b[37m',
  blue: '\x1b[34m',
  bgGreen: '\x1b[42m',
  bgRed: '\x1b[41m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
};

let eventCounter = 0;
const eventLog = [];

// RevenueCat event type → Meta CAPI event mapping (mirrors meta-capi.ts emitter)
const RC_TO_META = {
  INITIAL_PURCHASE: (e) => e.period_type === 'TRIAL' ? 'StartTrial' : 'Purchase',
  RENEWAL: () => 'Purchase (renewal)',
  CANCELLATION: () => 'Cancel',
  EXPIRATION: () => 'Churn',
  BILLING_ISSUE: () => 'BillingIssue',
  PRODUCT_CHANGE: () => 'Subscribe',
  UNCANCELLATION: () => 'Reactivate',
  REFUND: () => 'Refund',
  NON_RENEWING_PURCHASE: () => 'Purchase',
  SUBSCRIBER_ALIAS: () => null,
};

function getMetaEvent(rcEvent) {
  const mapper = RC_TO_META[rcEvent.type];
  if (!mapper) return null;
  return mapper(rcEvent);
}

function getStatusColor(eventType) {
  switch (eventType) {
    case 'INITIAL_PURCHASE':
    case 'RENEWAL':
    case 'UNCANCELLATION':
      return c.green;
    case 'CANCELLATION':
    case 'EXPIRATION':
    case 'REFUND':
      return c.red;
    case 'BILLING_ISSUE':
      return c.yellow;
    case 'PRODUCT_CHANGE':
      return c.cyan;
    default:
      return c.white;
  }
}

function logHeader() {
  console.log(`\n${c.bold}${c.blue}╔══════════════════════════════════════════════════╗${c.reset}`);
  console.log(`${c.bold}${c.blue}║   RevenueCat Webhook Monitor — Listening :${PORT}   ║${c.reset}`);
  console.log(`${c.bold}${c.blue}╚══════════════════════════════════════════════════╝${c.reset}`);
  if (FORWARD_TO_BACKEND) {
    console.log(`${c.dim}Forwarding to: ${BACKEND_URL}/api/webhooks/revenuecat${c.reset}`);
  } else {
    console.log(`${c.dim}Monitor only (use --forward to also send to backend)${c.reset}`);
  }
  console.log(`${c.dim}Waiting for RevenueCat webhook events...${c.reset}\n`);
}

function logEvent(num, event) {
  const time = new Date().toLocaleTimeString();
  const typeColor = getStatusColor(event.type);
  const metaEvent = getMetaEvent(event);

  console.log(`${c.dim}─────────────────────────────────────────────────────${c.reset}`);
  console.log(`${c.bold}#${num}${c.reset}  ${typeColor}${c.bold}${event.type}${c.reset}  ${c.dim}${time}${c.reset}`);
  console.log(`  ${c.dim}User:${c.reset} ${event.app_user_id}`);
  console.log(`  ${c.dim}Product:${c.reset} ${event.product_id}`);
  console.log(`  ${c.dim}Period:${c.reset} ${event.period_type || 'N/A'}  ${c.dim}Env:${c.reset} ${event.environment}`);
  console.log(`  ${c.dim}Store:${c.reset} ${event.store || 'N/A'}  ${c.dim}Country:${c.reset} ${event.country_code || 'N/A'}`);

  if (event.entitlement_ids?.length) {
    console.log(`  ${c.dim}Entitlements:${c.reset} ${c.magenta}${event.entitlement_ids.join(', ')}${c.reset}`);
  }

  if (event.expiration_at_ms) {
    const exp = new Date(event.expiration_at_ms);
    const isExpired = exp < new Date();
    console.log(`  ${c.dim}Expires:${c.reset} ${isExpired ? c.red : c.green}${exp.toLocaleString()}${isExpired ? ' (EXPIRED)' : ''}${c.reset}`);
  }

  if (event.is_trial_conversion) {
    console.log(`  ${c.green}${c.bold}★ TRIAL CONVERSION${c.reset}`);
  }

  // Show the Meta CAPI event that would fire
  if (metaEvent) {
    console.log(`  ${c.cyan}→ Meta CAPI: ${c.bold}${metaEvent}${c.reset}`);
  } else {
    console.log(`  ${c.dim}→ Meta CAPI: (no mapping)${c.reset}`);
  }
}

function logSummary() {
  console.log(`\n${c.bold}Session Summary${c.reset}`);
  console.log(`${c.dim}──────────────────────────${c.reset}`);
  console.log(`Total events: ${eventCounter}`);

  const typeCounts = {};
  for (const e of eventLog) {
    typeCounts[e.type] = (typeCounts[e.type] || 0) + 1;
  }
  for (const [type, count] of Object.entries(typeCounts)) {
    const color = getStatusColor(type);
    console.log(`  ${color}${type}${c.reset}: ${count}`);
  }
  console.log('');
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-RevenueCat-Signature');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Health check
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', events_processed: eventCounter }));
    return;
  }

  // Event log endpoint (for the app test screen)
  if (req.method === 'GET' && req.url === '/events') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ events: eventLog.slice(0, 50), total: eventCounter }));
    return;
  }

  // Accept RevenueCat webhook on /webhook or /
  if (req.method !== 'POST') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Use POST /webhook' }));
    return;
  }

  let body = '';
  for await (const chunk of req) body += chunk;

  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid JSON' }));
    return;
  }

  const event = payload.event;
  if (!event) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'No event field in payload' }));
    return;
  }

  eventCounter++;
  eventLog.unshift({ ...event, _received_at: new Date().toISOString(), _num: eventCounter });
  if (eventLog.length > 100) eventLog.length = 100;

  logEvent(eventCounter, event);

  // Optionally forward to real backend
  if (FORWARD_TO_BACKEND) {
    try {
      const fwdUrl = `${BACKEND_URL}/api/webhooks/revenuecat`;
      console.log(`  ${c.dim}Forwarding to ${fwdUrl}...${c.reset}`);
      const fwdRes = await fetch(fwdUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(req.headers['x-revenuecat-signature']
            ? { 'X-RevenueCat-Signature': req.headers['x-revenuecat-signature'] }
            : {}),
        },
        body,
      });
      const fwdData = await fwdRes.json().catch(() => ({}));
      if (fwdRes.ok) {
        console.log(`  ${c.green}✓ Backend: ${fwdRes.status}${c.reset}`);
      } else {
        console.log(`  ${c.red}✗ Backend: ${fwdRes.status} ${JSON.stringify(fwdData).substring(0, 100)}${c.reset}`);
      }
    } catch (err) {
      console.log(`  ${c.red}✗ Backend forward failed: ${err.message}${c.reset}`);
    }
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ success: true, event_num: eventCounter }));
});

server.listen(PORT, () => {
  logHeader();
});

process.on('SIGINT', () => {
  logSummary();
  process.exit(0);
});
