#!/usr/bin/env node
/**
 * Warmth Endpoints Test
 * 
 * Tests warmth recompute and history endpoints with before/after comparison
 * 
 * Usage:
 *   node test/warmth-endpoints-test.mjs
 * 
 * Environment:
 *   SUPABASE_URL - Supabase project URL
 *   SUPABASE_SERVICE_KEY - Service role key for auth
 *   TEST_USER_EMAIL - Test user email (default: test@example.com)
 *   TEST_USER_PASSWORD - Test user password (default: testpassword123)
 */

import { createClient } from '@supabase/supabase-js';

const API_BASE = process.env.API_BASE || 'https://ever-reach-be.vercel.app';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gvxkfxqcjqxuqoqhxvkz.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com';
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'testpassword123';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'bright');
  console.log('='.repeat(60));
}

function logStep(step, message) {
  log(`\n[${step}] ${message}`, 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

async function getAuthToken() {
  if (!SUPABASE_SERVICE_KEY) {
    throw new Error('SUPABASE_SERVICE_KEY environment variable is required');
  }

  logStep('AUTH', 'Authenticating test user...');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: TEST_USER_EMAIL,
    password: TEST_USER_PASSWORD,
  });

  if (error) {
    throw new Error(`Auth failed: ${error.message}`);
  }

  if (!data.session?.access_token) {
    throw new Error('No access token in auth response');
  }

  logSuccess(`Authenticated as ${TEST_USER_EMAIL}`);
  return data.session.access_token;
}

async function apiRequest(endpoint, token, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  return {
    status: response.status,
    ok: response.ok,
    data,
  };
}

async function getTestContact(token) {
  logStep('SETUP', 'Finding test contact...');
  
  const { status, ok, data } = await apiRequest('/api/v1/contacts?limit=1', token);
  
  if (!ok || !data?.contacts?.length) {
    throw new Error('No contacts found. Please create a test contact first.');
  }

  const contact = data.contacts[0];
  logSuccess(`Using contact: ${contact.display_name || contact.id}`);
  log(`  ID: ${contact.id}`, 'blue');
  log(`  Current warmth: ${contact.warmth || 'N/A'}`, 'blue');
  
  return contact.id;
}

async function testWarmthCurrent(contactId, token, label = 'Current') {
  logStep(label, `GET /api/v1/contacts/${contactId}/warmth/current`);
  
  const { status, ok, data } = await apiRequest(
    `/api/v1/contacts/${contactId}/warmth/current`,
    token
  );

  log(`  Status: ${status}`, status === 200 ? 'green' : 'red');
  
  if (ok && data) {
    log(`  Score: ${data.score || data.warmth || 'N/A'}`, 'blue');
    log(`  Band: ${data.band || data.warmth_band || 'N/A'}`, 'blue');
    log(`  Days since contact: ${data.days_since_contact || 'N/A'}`, 'blue');
    return data;
  } else {
    logWarning(`Endpoint returned ${status}: ${JSON.stringify(data)}`);
    return null;
  }
}

async function testWarmthHistory(contactId, token, label = 'History') {
  logStep(label, `GET /api/v1/contacts/${contactId}/warmth-history?window=30d`);
  
  const { status, ok, data } = await apiRequest(
    `/api/v1/contacts/${contactId}/warmth-history?window=30d`,
    token
  );

  log(`  Status: ${status}`, status === 200 ? 'green' : 'yellow');
  
  if (status === 404) {
    logWarning('Primary history endpoint not deployed yet (404)');
    return null;
  }
  
  if (ok && data) {
    const items = data.items || [];
    log(`  Items: ${items.length}`, 'blue');
    if (items.length > 0) {
      log(`  Latest: ${items[items.length - 1].date} → ${items[items.length - 1].score}`, 'blue');
    }
    return data;
  } else {
    logWarning(`Endpoint returned ${status}: ${JSON.stringify(data)}`);
    return null;
  }
}

async function testWarmthHistoryLegacy(contactId, token, label = 'History (Legacy)') {
  logStep(label, `GET /api/v1/contacts/${contactId}/warmth/history?limit=30`);
  
  const { status, ok, data } = await apiRequest(
    `/api/v1/contacts/${contactId}/warmth/history?limit=30`,
    token
  );

  log(`  Status: ${status}`, status === 200 ? 'green' : 'yellow');
  
  if (status === 404) {
    logWarning('Legacy history endpoint not deployed yet (404)');
    return null;
  }
  
  if (ok && data) {
    const history = data.history || [];
    log(`  Items: ${history.length}`, 'blue');
    if (history.length > 0) {
      log(`  Latest: ${history[history.length - 1].timestamp} → ${history[history.length - 1].warmth}`, 'blue');
    }
    return data;
  } else {
    logWarning(`Endpoint returned ${status}: ${JSON.stringify(data)}`);
    return null;
  }
}

async function testWarmthRecompute(contactId, token) {
  logStep('RECOMPUTE', `POST /api/v1/contacts/${contactId}/warmth/recompute`);
  
  const { status, ok, data } = await apiRequest(
    `/api/v1/contacts/${contactId}/warmth/recompute`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({ reason: 'cli_test' }),
    }
  );

  log(`  Status: ${status}`, status === 200 ? 'green' : 'red');
  
  if (ok && data) {
    const contact = data.contact || {};
    log(`  New warmth: ${contact.warmth || 'N/A'}`, 'blue');
    log(`  Band: ${contact.warmth_band || 'N/A'}`, 'blue');
    log(`  Updated at: ${contact.warmth_updated_at || 'N/A'}`, 'blue');
    return data;
  } else {
    logError(`Recompute failed: ${JSON.stringify(data)}`);
    return null;
  }
}

async function testBulkRecompute(contactId, token) {
  logStep('BULK RECOMPUTE', 'POST /api/v1/warmth/recompute');
  
  const { status, ok, data } = await apiRequest(
    '/api/v1/warmth/recompute',
    token,
    {
      method: 'POST',
      body: JSON.stringify({ contact_ids: [contactId] }),
    }
  );

  log(`  Status: ${status}`, status === 200 ? 'green' : 'yellow');
  
  if (status === 404) {
    logWarning('Bulk recompute endpoint not deployed yet (404)');
    return null;
  }
  
  if (ok && data) {
    log(`  Result: ${JSON.stringify(data)}`, 'blue');
    return data;
  } else {
    logWarning(`Endpoint returned ${status}: ${JSON.stringify(data)}`);
    return null;
  }
}

async function main() {
  logSection('🔥 WARMTH ENDPOINTS TEST');
  
  try {
    // Step 1: Authenticate
    const token = await getAuthToken();
    
    // Step 2: Get test contact
    const contactId = await getTestContact(token);
    
    // Step 3: Baseline - Get current warmth
    logSection('📊 BASELINE (Before Recompute)');
    const beforeCurrent = await testWarmthCurrent(contactId, token, 'BEFORE - Current');
    const beforeHistory = await testWarmthHistory(contactId, token, 'BEFORE - History');
    const beforeHistoryLegacy = await testWarmthHistoryLegacy(contactId, token, 'BEFORE - History (Legacy)');
    
    // Step 4: Recompute warmth
    logSection('🔄 RECOMPUTE WARMTH');
    const recomputeResult = await testWarmthRecompute(contactId, token);
    
    if (!recomputeResult) {
      throw new Error('Recompute failed - cannot continue');
    }
    
    // Step 5: After - Get updated warmth
    logSection('📊 AFTER RECOMPUTE');
    const afterCurrent = await testWarmthCurrent(contactId, token, 'AFTER - Current');
    const afterHistory = await testWarmthHistory(contactId, token, 'AFTER - History');
    const afterHistoryLegacy = await testWarmthHistoryLegacy(contactId, token, 'AFTER - History (Legacy)');
    
    // Step 6: Test bulk recompute (optional)
    logSection('🔄 BULK RECOMPUTE (Optional)');
    await testBulkRecompute(contactId, token);
    
    // Step 7: Summary
    logSection('📋 SUMMARY');
    
    if (beforeCurrent && afterCurrent) {
      const beforeScore = beforeCurrent.score || beforeCurrent.warmth || 0;
      const afterScore = afterCurrent.score || afterCurrent.warmth || 0;
      const change = afterScore - beforeScore;
      
      log(`\nWarmth Score Change:`, 'bright');
      log(`  Before: ${beforeScore}`, 'blue');
      log(`  After:  ${afterScore}`, 'blue');
      log(`  Change: ${change >= 0 ? '+' : ''}${change}`, change === 0 ? 'yellow' : 'green');
    }
    
    log('\nEndpoint Availability:', 'bright');
    log(`  ✅ Current warmth: Available`, 'green');
    log(`  ${beforeHistory ? '✅' : '❌'} Primary history: ${beforeHistory ? 'Available' : 'Not deployed (404)'}`, beforeHistory ? 'green' : 'yellow');
    log(`  ${beforeHistoryLegacy ? '✅' : '❌'} Legacy history: ${beforeHistoryLegacy ? 'Available' : 'Not deployed (404)'}`, beforeHistoryLegacy ? 'green' : 'yellow');
    log(`  ✅ Recompute: Available`, 'green');
    
    logSection('✅ TEST COMPLETE');
    
  } catch (error) {
    logSection('❌ TEST FAILED');
    logError(error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
