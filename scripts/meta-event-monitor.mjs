#!/usr/bin/env node
/**
 * Meta Event Monitor — Local proxy for real-time event debugging
 * 
 * Usage:
 *   node scripts/meta-event-monitor.mjs
 * 
 * Then in the app's Meta Pixel Test screen, enable "Send via Monitor"
 * to route events through this proxy. You'll see every event + Meta's
 * response logged in real-time.
 * 
 * The proxy:
 *   1. Receives events from the app on port 3456
 *   2. Forwards them to Meta's Conversions API
 *   3. Logs the full request/response with color coding
 */

import http from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env manually (no dotenv dependency needed)
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
      // Strip quotes
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
const PIXEL_ID = env.EXPO_PUBLIC_META_PIXEL_ID || '';
const TOKEN = env.EXPO_PUBLIC_META_CONVERSIONS_API_TOKEN || '';
const TEST_EVENT_CODE = env.EXPO_PUBLIC_META_TEST_EVENT_CODE || 'TEST48268';
const GRAPH_API_VERSION = 'v21.0';
const PORT = 3456;

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
  bgGreen: '\x1b[42m',
  bgRed: '\x1b[41m',
  bgYellow: '\x1b[43m',
};

let eventCounter = 0;

function logHeader() {
  console.log(`\n${c.bold}${c.cyan}╔══════════════════════════════════════════════╗${c.reset}`);
  console.log(`${c.bold}${c.cyan}║     Meta Event Monitor — Listening on :${PORT}   ║${c.reset}`);
  console.log(`${c.bold}${c.cyan}╚══════════════════════════════════════════════╝${c.reset}`);
  console.log(`${c.dim}Pixel: ${PIXEL_ID}${c.reset}`);
  console.log(`${c.dim}Token: ${TOKEN.substring(0, 15)}...${c.reset}`);
  console.log(`${c.dim}Test Code: ${TEST_EVENT_CODE}${c.reset}`);
  console.log(`${c.dim}Waiting for events from the app...${c.reset}\n`);
}

function logEvent(num, eventName, status, details) {
  const time = new Date().toLocaleTimeString();
  const statusIcon = status === 'success'
    ? `${c.bgGreen}${c.bold} ✓ RECEIVED ${c.reset}`
    : `${c.bgRed}${c.bold} ✗ FAILED ${c.reset}`;

  console.log(`${c.dim}───────────────────────────────────────────────${c.reset}`);
  console.log(`${c.bold}#${num}${c.reset}  ${c.bold}${c.white}${eventName}${c.reset}  ${statusIcon}  ${c.dim}${time}${c.reset}`);

  if (details.custom_data) {
    const cd = details.custom_data;
    const parts = [];
    if (cd.value !== undefined) parts.push(`value: ${c.green}$${cd.value}${c.reset}`);
    if (cd.currency) parts.push(`currency: ${cd.currency}`);
    if (cd.content_name) parts.push(`content: ${cd.content_name}`);
    if (cd.content_type) parts.push(`type: ${cd.content_type}`);
    if (parts.length) console.log(`  ${c.dim}Data:${c.reset} ${parts.join(' | ')}`);
  }

  if (details.meta_response) {
    const mr = details.meta_response;
    if (mr.events_received) {
      console.log(`  ${c.green}Meta confirmed: ${mr.events_received} event(s) received${c.reset}`);
      if (mr.fbtrace_id) console.log(`  ${c.dim}fbtrace_id: ${mr.fbtrace_id}${c.reset}`);
    }
    if (mr.error) {
      console.log(`  ${c.red}Error: ${mr.error.message}${c.reset}`);
      if (mr.error.error_user_title) console.log(`  ${c.red}Detail: ${mr.error.error_user_title}${c.reset}`);
      console.log(`  ${c.dim}Code: ${mr.error.code} | Subcode: ${mr.error.error_subcode || 'none'}${c.reset}`);
    }
  }

  if (details.user_data) {
    const ud = details.user_data;
    const coverage = [];
    if (ud.em) coverage.push('email');
    if (ud.ph) coverage.push('phone');
    if (ud.fn) coverage.push('fn');
    if (ud.ln) coverage.push('ln');
    if (ud.ct) coverage.push('city');
    if (ud.st) coverage.push('state');
    if (ud.zp) coverage.push('zip');
    if (ud.country) coverage.push('country');
    if (ud.fbp) coverage.push('fbp');
    if (ud.fbc) coverage.push('fbc');
    if (ud.client_ip_address) coverage.push('IP');
    if (ud.external_id) coverage.push('ext_id');
    if (coverage.length) {
      console.log(`  ${c.dim}User data: ${c.magenta}${coverage.join(', ')}${c.reset} ${c.dim}(${coverage.length} params)${c.reset}`);
    }
  }
}

function logSummary() {
  console.log(`\n${c.dim}Total events processed: ${eventCounter}${c.reset}\n`);
}

const server = http.createServer(async (req, res) => {
  // CORS headers for simulator
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', pixel: PIXEL_ID, events_processed: eventCounter }));
    return;
  }

  if (req.method !== 'POST' || req.url !== '/events') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Use POST /events' }));
    return;
  }

  // Read body
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

  // Add test_event_code if not present
  if (!payload.test_event_code && TEST_EVENT_CODE) {
    payload.test_event_code = TEST_EVENT_CODE;
  }

  // Forward to Meta
  const metaUrl = `https://graph.facebook.com/${GRAPH_API_VERSION}/${PIXEL_ID}/events?access_token=${TOKEN}`;

  try {
    const metaRes = await fetch(metaUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const metaData = await metaRes.json();

    // Log each event in the payload
    for (const event of payload.data || []) {
      eventCounter++;
      const success = metaRes.ok && metaData.events_received > 0;
      logEvent(eventCounter, event.event_name, success ? 'success' : 'error', {
        custom_data: event.custom_data,
        user_data: event.user_data,
        meta_response: metaData,
      });
    }

    // Return Meta's response to the app
    res.writeHead(metaRes.ok ? 200 : metaRes.status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ...metaData,
      _monitor: { forwarded: true, events_in_batch: payload.data?.length || 0 },
    }));
  } catch (error) {
    eventCounter++;
    console.log(`  ${c.red}Network error forwarding to Meta: ${error.message}${c.reset}`);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to forward to Meta', detail: error.message }));
  }
});

server.listen(PORT, () => {
  logHeader();
});

process.on('SIGINT', () => {
  logSummary();
  process.exit(0);
});
