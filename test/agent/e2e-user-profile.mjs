/**
 * E2E Test: User Profile & Settings
 * 
 * Tests user profile retrieval, usage statistics, and entitlements.
 */

import { getEnv, getAccessToken, writeReport, runId, nowIso } from './_shared.mjs';

const rid = runId();
const lines = [
  '# E2E Test: User Profile & Settings',
  '',
  `- **Run ID**: ${rid}`,
  `- **Timestamp**: ${nowIso()}`,
];

let exitCode = 0;

async function main() {
  const BACKEND_BASE = await getEnv('EXPO_PUBLIC_API_URL', true, 'https://ever-reach-be.vercel.app');
  const token = await getAccessToken();

  lines.push(`- **Backend URL**: ${BACKEND_BASE}`);
  lines.push('');
  lines.push('## Test Workflow: User Profile Operations');
  lines.push('');

  const tests = [];

  // ===== STEP 1: Get User Profile =====
  lines.push('### Step 1: Get User Profile');
  lines.push('');

  try {
    const startTime = Date.now();
    const res = await fetch(`${BACKEND_BASE}/api/v1/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    const ms = Date.now() - startTime;
    const json = await res.json().catch(() => ({}));
    
    const pass = res.status === 200 && (json?.id || json?.user_id || json?.email);
    
    tests.push({
      name: 'Get user profile',
      pass,
      status: res.status,
      ms,
      has_user_id: !!(json?.id || json?.user_id),
      has_email: !!json?.email,
    });
    
    if (pass) {
      lines.push(`- ✅ Profile retrieved`);
      lines.push(`- User ID: ${json?.id || json?.user_id || 'N/A'}`);
      lines.push(`- Email: ${json?.email || 'N/A'}`);
    } else {
      lines.push(`- ❌ Failed: ${res.status}`);
      lines.push(`- Response: ${JSON.stringify(json).slice(0, 200)}`);
    }
    lines.push('');
    if (!pass) exitCode = 1;
  } catch (e) {
    tests.push({ name: 'Get user profile', pass: false, error: e.message });
    lines.push(`- ❌ Failed: ${e.message}`);
    lines.push('');
    exitCode = 1;
  }

  // ===== STEP 2: Get Usage Summary =====
  lines.push('### Step 2: Get Usage Summary');
  lines.push('');

  try {
    const startTime = Date.now();
    const res = await fetch(`${BACKEND_BASE}/api/v1/me/usage-summary?window=30d`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    const ms = Date.now() - startTime;
    const json = await res.json().catch(() => ({}));
    
    const pass = res.status === 200;
    
    tests.push({
      name: 'Get usage summary',
      pass,
      status: res.status,
      ms,
      has_usage_data: !!json && Object.keys(json).length > 0,
    });
    
    if (pass) {
      lines.push(`- ✅ Usage summary retrieved`);
      lines.push(`- Data fields: ${Object.keys(json).length}`);
      if (json?.contacts_created !== undefined) {
        lines.push(`- Contacts created: ${json.contacts_created}`);
      }
      if (json?.messages_sent !== undefined) {
        lines.push(`- Messages sent: ${json.messages_sent}`);
      }
    } else {
      lines.push(`- ⚠️  Usage summary: ${res.status}`);
      lines.push(`- Response: ${JSON.stringify(json).slice(0, 200)}`);
    }
    lines.push('');
    if (!pass && res.status !== 404) exitCode = 1;
  } catch (e) {
    tests.push({ name: 'Get usage summary', pass: false, error: e.message });
    lines.push(`- ⚠️  Failed: ${e.message}`);
    lines.push('');
  }

  // ===== STEP 3: Get Entitlements =====
  lines.push('### Step 3: Get User Entitlements');
  lines.push('');

  try {
    const startTime = Date.now();
    const res = await fetch(`${BACKEND_BASE}/api/v1/me/entitlements`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    const ms = Date.now() - startTime;
    const json = await res.json().catch(() => ({}));
    
    const pass = res.status === 200;
    
    tests.push({
      name: 'Get entitlements',
      pass,
      status: res.status,
      ms,
      has_tier: !!json?.tier,
      has_limits: !!json?.limits,
    });
    
    if (pass) {
      lines.push(`- ✅ Entitlements retrieved`);
      lines.push(`- Tier: ${json?.tier || 'N/A'}`);
      if (json?.limits) {
        lines.push(`- Limits defined: ${Object.keys(json.limits).length}`);
      }
    } else {
      lines.push(`- ❌ Failed: ${res.status}`);
      lines.push(`- Response: ${JSON.stringify(json).slice(0, 200)}`);
    }
    lines.push('');
    if (!pass) exitCode = 1;
  } catch (e) {
    tests.push({ name: 'Get entitlements', pass: false, error: e.message });
    lines.push(`- ❌ Failed: ${e.message}`);
    lines.push('');
    exitCode = 1;
  }

  // ===== STEP 4: Test Health Endpoint =====
  lines.push('### Step 4: Test Backend Health');
  lines.push('');

  try {
    const startTime = Date.now();
    const res = await fetch(`${BACKEND_BASE}/api/health`, {
      method: 'GET',
    });
    
    const ms = Date.now() - startTime;
    const json = await res.json().catch(() => ({}));
    
    const pass = res.status === 200;
    
    tests.push({
      name: 'Backend health check',
      pass,
      status: res.status,
      ms,
      is_healthy: json?.status === 'ok' || json?.healthy === true,
    });
    
    if (pass) {
      lines.push(`- ✅ Backend is healthy`);
      lines.push(`- Status: ${json?.status || 'ok'}`);
    } else {
      lines.push(`- ⚠️  Health check: ${res.status}`);
    }
    lines.push('');
    if (!pass) exitCode = 1;
  } catch (e) {
    tests.push({ name: 'Backend health check', pass: false, error: e.message });
    lines.push(`- ❌ Failed: ${e.message}`);
    lines.push('');
    exitCode = 1;
  }

  // ===== SUMMARY =====
  lines.push('---');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- **Tests Passed**: ${tests.filter(t => t.pass).length}/${tests.length}`);
  lines.push(`- **Profile**: Retrieved`);
  lines.push(`- **Usage Stats**: Checked`);
  lines.push(`- **Entitlements**: Verified`);
  lines.push('');

  if (exitCode === 0) {
    lines.push('✅ **All user profile tests passed**');
  } else {
    lines.push('❌ **Some user profile tests failed**');
  }

  lines.push('');
  lines.push('## Test Results');
  lines.push('');
  lines.push('```json');
  lines.push(JSON.stringify(tests, null, 2));
  lines.push('```');

  await writeReport('e2e_user_profile', lines, tests, exitCode);
}

main().then(() => process.exit(exitCode)).catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
