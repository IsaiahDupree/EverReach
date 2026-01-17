/**
 * Schema Smoke Test
 *
 * Verifies required tables/views/columns exist in Supabase for agent tests.
 * Runs read-only Supabase REST calls using the test user JWT to avoid backend coupling.
 */

import { getEnv, getAccessToken, writeReport, nowIso, runId } from './_shared.mjs';

async function supaFetch(path, { method = 'GET', headers = {}, body } = {}) {
  const SUPABASE_URL = await getEnv('SUPABASE_URL');
  const SUPABASE_ANON_KEY = await getEnv('SUPABASE_ANON_KEY');
  const token = await getAccessToken();
  const url = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...headers,
    },
    body,
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { res, json };
}

async function tableExists(name, select = 'id', limit = 1) {
  const q = `/${encodeURIComponent(name)}?select=${encodeURIComponent(select)}&limit=${limit}`;
  const { res } = await supaFetch(q);
  // 200 indicates table/view exists (even if 0 rows due to RLS)
  return res.status === 200;
}

async function columnsExist(name, columns) {
  // PostgREST will return 400 if any selected column does not exist
  const select = columns.join(',');
  const q = `/${encodeURIComponent(name)}?select=${encodeURIComponent(select)}&limit=1`;
  const { res } = await supaFetch(q);
  return res.status === 200;
}

async function main() {
  const rid = runId();
  const lines = [
    '# Schema Smoke Test',
    '',
    `- **Run ID**: ${rid}`,
    `- **Timestamp**: ${nowIso()}`,
    '',
    '## Results',
    '',
  ];

  let exitCode = 0;
  const checks = [];

  // Core feature systems
  checks.push({ name: 'feature_requests table', fn: () => tableExists('feature_requests') });
  checks.push({ name: 'feature_votes table', fn: () => tableExists('feature_votes') });
  checks.push({ name: 'feature_changelog table', fn: () => tableExists('feature_changelog') });

  checks.push({ name: 'feature_buckets table', fn: () => tableExists('feature_buckets') });
  checks.push({ name: 'feature_request_embeddings table', fn: () => tableExists('feature_request_embeddings') });
  checks.push({ name: 'feature_activity table', fn: () => tableExists('feature_activity') });
  checks.push({ name: 'feature_user_stats table', fn: () => tableExists('feature_user_stats', 'user_id') });
  checks.push({ name: 'feature_bucket_rollups materialized view', fn: () => tableExists('feature_bucket_rollups', 'bucket_id') });

  // Templates system (table + permissive RLS expected)
  checks.push({ name: 'templates table', fn: () => tableExists('templates') });

  // Persona notes / interactions
  checks.push({ name: 'persona_notes table', fn: () => tableExists('persona_notes') });
  checks.push({ name: 'interactions table', fn: () => tableExists('interactions') });

  // Warmth alerts & push tokens
  checks.push({ name: 'warmth_alerts table', fn: () => tableExists('warmth_alerts') });
  checks.push({ name: 'user_push_tokens table', fn: () => tableExists('user_push_tokens') });

  // Contacts columns required by watch endpoint
  checks.push({ name: 'contacts watch columns (watch_status, warmth_alert_threshold)', fn: () => columnsExist('contacts', ['id','watch_status','warmth_alert_threshold']) });

  // Execute checks
  for (const chk of checks) {
    try {
      const ok = await chk.fn();
      const pass = !!ok;
      lines.push(`- ${pass ? '✅' : '❌'} ${chk.name}`);
      if (!pass) exitCode = 1;
    } catch (e) {
      lines.push(`- ❌ ${chk.name} — error: ${e?.message || String(e)}`);
      exitCode = 1;
    }
  }

  lines.push('');
  lines.push(`**Summary**: ${checks.length - (exitCode ? 1 : 0)} passed, ${exitCode ? 1 : 0} failed (see above)`);

  await writeReport(lines, 'test/agent/reports', 'schema_smoke');

  if (exitCode === 0) {
    console.log('✅ Schema smoke test passed');
  } else {
    console.error('❌ Schema smoke test failed');
  }
  process.exit(exitCode);
}

main().catch((err) => {
  console.error('[Schema Smoke Test Failed]', err?.message || err);
  process.exit(1);
});
