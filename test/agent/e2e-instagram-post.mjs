/**
 * Instagram Post Publishing — E2E Test Suite
 *
 * Tests the full lifecycle of the Instagram Content Publishing integration:
 *   POST /api/v1/integrations/instagram/post  — create & publish a post
 *   GET  /api/v1/integrations/instagram/post  — list recent posts
 *
 * Tests 1–2: Route availability (no auth required)
 * Tests 3–9: Full API tests (require TEST_EMAIL / TEST_PASSWORD)
 * Tests 10–11: Live publish (require INSTAGRAM_ACCESS_TOKEN + INSTAGRAM_BUSINESS_ACCOUNT_ID)
 *
 * Run:  node test/agent/e2e-instagram-post.mjs
 */

import { getEnv, getAccessToken, apiFetch, writeReport, runId, nowIso, mdEscape } from './_shared.mjs';

const rid = runId();
const ENDPOINT_POST  = '/api/v1/integrations/instagram/post';
const ENDPOINT_STATS = '/api/v1/integrations/instagram/stats';

const lines = [
  '# Instagram Post Publishing — E2E Tests',
  `**Run ID**: \`${rid}\``,
  `**Timestamp**: ${nowIso()}`,
  '',
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function pass(label, detail) {
  const msg = detail ? `- ✅ ${label}: ${detail}` : `- ✅ ${label}`;
  lines.push(msg);
  console.log('PASS:', label, detail ?? '');
}

function warn(label, detail) {
  const msg = detail ? `- ⚠️ ${label}: ${detail}` : `- ⚠️ ${label}`;
  lines.push(msg);
  console.warn('WARN:', label, detail ?? '');
}

function fail(label, detail) {
  const msg = detail ? `- ❌ ${label}: ${detail}` : `- ❌ ${label}`;
  lines.push(msg);
  console.error('FAIL:', label, detail ?? '');
}

function isCredentialMissing(json) {
  const msg = (json?.error ?? '') + (json?.details ?? '');
  return msg.toLowerCase().includes('not configured') || msg.toLowerCase().includes('credentials');
}

// ─── Main test ───────────────────────────────────────────────────────────────

async function test() {
  try {
    const BASE_URL = await getEnv('NEXT_PUBLIC_API_URL');
    lines.push('## Setup', `- Base URL: \`${BASE_URL}\``, '');

    // ════════════════════════════════════════════════════════════════════════
    // TESTS 1–2: Route availability — no auth required
    // ════════════════════════════════════════════════════════════════════════
    lines.push('## Test 1: POST route exists (unauthenticated → must not 404)');
    {
      const r = await apiFetch(BASE_URL, ENDPOINT_POST, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ media_type: 'IMAGE', image_url: 'https://example.com/x.jpg' }),
      });
      if (r.res.status === 404) {
        fail('POST route not found', `${ENDPOINT_POST} → 404 (endpoint not deployed yet)`);
      } else if (r.res.status === 401) {
        pass('POST route is live', `401 Unauthorized (auth required, route exists)`);
      } else {
        pass('POST route is live', `→ ${r.res.status}`);
      }
    }
    lines.push('');

    lines.push('## Test 2: GET route exists (unauthenticated → must not 404)');
    {
      const r = await apiFetch(BASE_URL, `${ENDPOINT_POST}?limit=5`, { method: 'GET' });
      if (r.res.status === 404) {
        fail('GET route not found', `${ENDPOINT_POST} → 404 (endpoint not deployed yet)`);
      } else if (r.res.status === 401) {
        pass('GET route is live', `401 Unauthorized (auth required, route exists)`);
      } else {
        pass('GET route is live', `→ ${r.res.status}`);
      }
    }
    lines.push('');

    // ── Try to authenticate ──────────────────────────────────────────────────
    let token = null;
    try {
      token = await getAccessToken();
      pass('Authenticated');
    } catch (authErr) {
      warn('Authentication failed', `${authErr.message}`);
      warn('Tests 3–11 skipped', 'Set TEST_EMAIL + TEST_PASSWORD in .env to run full suite');
      lines.push('');
      lines.push('## Configuration');
      lines.push('```');
      lines.push('TEST_EMAIL=your_test_user@example.com');
      lines.push('TEST_PASSWORD=your_test_password');
      lines.push('NEXT_PUBLIC_API_URL=https://ever-reach-be.vercel.app');
      lines.push('SUPABASE_URL=https://utasetfxiqcrnwyfforx.supabase.co');
      lines.push('SUPABASE_ANON_KEY=<anon key>');
      lines.push('```');
      return; // Skip remaining tests gracefully
    }
    lines.push('');

    const authH = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    // ════════════════════════════════════════════════════════════════════════
    // TEST 3: GET /stats — account info
    // ════════════════════════════════════════════════════════════════════════
    lines.push('## Test 3: GET Instagram Stats');
    {
      const r = await apiFetch(BASE_URL, ENDPOINT_STATS, { method: 'GET', headers: authH });
      if (r.res.status === 401) {
        fail('Stats — auth', '401 Unauthorized');
      } else if (r.res.ok) {
        pass('Stats returned', `${r.ms}ms`);
        const acct = r.json?.account;
        if (acct) pass('Account info', `@${acct.username ?? acct.name ?? '?'}, followers: ${acct.followers_count ?? '?'}`);
      } else if (isCredentialMissing(r.json)) {
        warn('Stats skipped', 'INSTAGRAM_ACCESS_TOKEN not configured on server');
      } else {
        fail('Stats error', r.json?.error ?? r.json?.details ?? r.res.status);
      }
    }
    lines.push('');

    // ════════════════════════════════════════════════════════════════════════
    // TEST 4: GET /post — list recent posts
    // ════════════════════════════════════════════════════════════════════════
    lines.push('## Test 4: GET Recent Posts (list)');
    {
      const r = await apiFetch(BASE_URL, `${ENDPOINT_POST}?limit=5`, { method: 'GET', headers: authH });
      if (r.res.status === 401) {
        fail('List posts — auth', '401 Unauthorized');
      } else if (r.res.ok) {
        const posts = r.json?.posts ?? [];
        pass('List posts returned', `${posts.length} posts, ${r.ms}ms`);
        if (posts.length > 0) pass('Most recent', `${posts[0].media_type} — ${posts[0].timestamp}`);
      } else if (isCredentialMissing(r.json)) {
        warn('List posts skipped', 'INSTAGRAM_BUSINESS_ACCOUNT_ID or token not configured on server');
      } else {
        fail('List posts error', r.json?.error ?? r.res.status);
      }
    }
    lines.push('');

    // ════════════════════════════════════════════════════════════════════════
    // TEST 5: POST validation — missing image_url
    // ════════════════════════════════════════════════════════════════════════
    lines.push('## Test 5: POST Validation — IMAGE without image_url → 400');
    {
      const r = await apiFetch(BASE_URL, ENDPOINT_POST, {
        method: 'POST',
        headers: authH,
        body: JSON.stringify({ media_type: 'IMAGE', caption: 'no url' }),
      });
      if (r.res.status === 400) {
        pass('Rejects IMAGE without image_url', r.json?.error);
      } else if (r.res.status === 500 && isCredentialMissing(r.json)) {
        warn('Inconclusive', 'Server checks credentials before body — set INSTAGRAM creds to test validation path');
      } else {
        fail('Expected 400', `Got ${r.res.status}: ${JSON.stringify(r.json)}`);
      }
    }
    lines.push('');

    // ════════════════════════════════════════════════════════════════════════
    // TEST 6: POST validation — invalid media_type
    // ════════════════════════════════════════════════════════════════════════
    lines.push('## Test 6: POST Validation — invalid media_type → 400');
    {
      const r = await apiFetch(BASE_URL, ENDPOINT_POST, {
        method: 'POST',
        headers: authH,
        body: JSON.stringify({ media_type: 'INVALID', image_url: 'https://example.com/x.jpg' }),
      });
      if (r.res.status === 400) {
        pass('Rejects invalid media_type', r.json?.error);
      } else if (r.res.status === 500 && isCredentialMissing(r.json)) {
        warn('Inconclusive', 'Set INSTAGRAM creds to test validation path');
      } else {
        fail('Expected 400', `Got ${r.res.status}`);
      }
    }
    lines.push('');

    // ════════════════════════════════════════════════════════════════════════
    // TEST 7: POST validation — REELS without video_url
    // ════════════════════════════════════════════════════════════════════════
    lines.push('## Test 7: POST Validation — REELS without video_url → 400');
    {
      const r = await apiFetch(BASE_URL, ENDPOINT_POST, {
        method: 'POST',
        headers: authH,
        body: JSON.stringify({ media_type: 'REELS', caption: 'no video' }),
      });
      if (r.res.status === 400) {
        pass('Rejects REELS without video_url', r.json?.error);
      } else if (r.res.status === 500 && isCredentialMissing(r.json)) {
        warn('Inconclusive', 'Set INSTAGRAM creds to test validation path');
      } else {
        fail('Expected 400', `Got ${r.res.status}`);
      }
    }
    lines.push('');

    // ════════════════════════════════════════════════════════════════════════
    // TEST 8: POST validation — CAROUSEL_ALBUM with < 2 children
    // ════════════════════════════════════════════════════════════════════════
    lines.push('## Test 8: POST Validation — carousel with 1 child → 400');
    {
      const r = await apiFetch(BASE_URL, ENDPOINT_POST, {
        method: 'POST',
        headers: authH,
        body: JSON.stringify({ media_type: 'CAROUSEL_ALBUM', children: [{ image_url: 'https://example.com/a.jpg' }] }),
      });
      if (r.res.status === 400) {
        pass('Rejects carousel < 2 children', r.json?.error);
      } else if (r.res.status === 500 && isCredentialMissing(r.json)) {
        warn('Inconclusive', 'Set INSTAGRAM creds to test validation path');
      } else {
        fail('Expected 400', `Got ${r.res.status}`);
      }
    }
    lines.push('');

    // ════════════════════════════════════════════════════════════════════════
    // TEST 9: POST validation — STORIES without image_url
    // ════════════════════════════════════════════════════════════════════════
    lines.push('## Test 9: POST Validation — STORIES without image_url → 400');
    {
      const r = await apiFetch(BASE_URL, ENDPOINT_POST, {
        method: 'POST',
        headers: authH,
        body: JSON.stringify({ media_type: 'STORIES', caption: 'no url' }),
      });
      if (r.res.status === 400) {
        pass('Rejects STORIES without image_url', r.json?.error);
      } else if (r.res.status === 500 && isCredentialMissing(r.json)) {
        warn('Inconclusive', 'Set INSTAGRAM creds to test validation path');
      } else {
        fail('Expected 400', `Got ${r.res.status}`);
      }
    }
    lines.push('');

    // ════════════════════════════════════════════════════════════════════════
    // TEST 10: Schedule validation — time too soon (< 10 min)
    // ════════════════════════════════════════════════════════════════════════
    lines.push('## Test 10: POST Validation — scheduled_publish_time < 10 min → 400');
    {
      const tooSoon = Math.floor(Date.now() / 1000) + 60; // 1 minute from now
      const r = await apiFetch(BASE_URL, ENDPOINT_POST, {
        method: 'POST',
        headers: authH,
        body: JSON.stringify({
          media_type: 'IMAGE',
          image_url: 'https://example.com/x.jpg',
          scheduled_publish_time: tooSoon,
        }),
      });
      if (r.res.status === 400) {
        pass('Rejects schedule time < 10 min', r.json?.error);
      } else if (r.res.status === 500 && isCredentialMissing(r.json)) {
        warn('Inconclusive', 'Set INSTAGRAM creds to test scheduling validation');
      } else {
        fail('Expected 400 for too-soon schedule', `Got ${r.res.status}: ${JSON.stringify(r.json)}`);
      }
    }
    lines.push('');

    // ════════════════════════════════════════════════════════════════════════
    // TEST 11: Live IMAGE publish — immediate
    // ════════════════════════════════════════════════════════════════════════
    lines.push('## Test 11: Live IMAGE Publish (immediate)');
    {
      const testImageUrl = process.env.INSTAGRAM_TEST_IMAGE_URL;
      if (!testImageUrl) {
        warn('Skipped', 'Set INSTAGRAM_TEST_IMAGE_URL to a public HTTPS image URL to run');
      } else {
        const r = await apiFetch(BASE_URL, ENDPOINT_POST, {
          method: 'POST',
          headers: authH,
          body: JSON.stringify({
            media_type: 'IMAGE',
            image_url: testImageUrl,
            caption: `EverReach integration test — ${rid.slice(0, 8)}`,
          }),
        });
        if (r.res.ok && r.json?.success) {
          pass('IMAGE published', `ig_media_id=${r.json.ig_media_id}, status=${r.json.status}`);
          if (r.json.permalink) pass('Permalink', r.json.permalink);
        } else if (isCredentialMissing(r.json)) {
          warn('Skipped', 'Set INSTAGRAM_ACCESS_TOKEN + INSTAGRAM_BUSINESS_ACCOUNT_ID on server');
        } else {
          fail('IMAGE publish failed', r.json?.error ?? r.json?.details ?? r.res.status);
        }
      }
    }
    lines.push('');

    // ════════════════════════════════════════════════════════════════════════
    // TEST 12: Scheduled IMAGE publish — tomorrow noon UTC
    // ════════════════════════════════════════════════════════════════════════
    lines.push('## Test 12: Scheduled IMAGE Publish (tomorrow noon UTC)');
    {
      const testImageUrl = process.env.INSTAGRAM_TEST_IMAGE_URL;
      if (!testImageUrl) {
        warn('Skipped', 'Set INSTAGRAM_TEST_IMAGE_URL to run scheduled post test');
      } else {
        const tomorrow = new Date();
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
        tomorrow.setUTCHours(12, 0, 0, 0);

        const r = await apiFetch(BASE_URL, ENDPOINT_POST, {
          method: 'POST',
          headers: authH,
          body: JSON.stringify({
            media_type: 'IMAGE',
            image_url: testImageUrl,
            caption: `EverReach scheduled test — ${rid.slice(0, 8)}`,
            scheduled_publish_time: tomorrow.toISOString(),
          }),
        });
        if (r.res.ok && r.json?.success) {
          pass('IMAGE scheduled', `ig_media_id=${r.json.ig_media_id}`);
          pass('Scheduled for', r.json.scheduled_publish_time);
        } else if (isCredentialMissing(r.json)) {
          warn('Skipped', 'Set INSTAGRAM_ACCESS_TOKEN + INSTAGRAM_BUSINESS_ACCOUNT_ID on server');
        } else {
          fail('Scheduled IMAGE failed', r.json?.error ?? r.json?.details ?? r.res.status);
        }
      }
    }
    lines.push('');

    // ════════════════════════════════════════════════════════════════════════
    // TEST 13: Live REELS publish
    // ════════════════════════════════════════════════════════════════════════
    lines.push('## Test 13: Live REELS Publish');
    {
      const testVideoUrl = process.env.INSTAGRAM_TEST_VIDEO_URL;
      if (!testVideoUrl) {
        warn('Skipped', 'Set INSTAGRAM_TEST_VIDEO_URL to a public HTTPS video URL to run');
      } else {
        const r = await apiFetch(BASE_URL, ENDPOINT_POST, {
          method: 'POST',
          headers: authH,
          body: JSON.stringify({
            media_type: 'REELS',
            video_url: testVideoUrl,
            caption: `EverReach Reels test — ${rid.slice(0, 8)}`,
            share_to_feed: true,
          }),
        });
        if (r.res.ok && r.json?.success) {
          pass('REELS published', `ig_media_id=${r.json.ig_media_id}`);
          if (r.json.permalink) pass('Permalink', r.json.permalink);
        } else if (isCredentialMissing(r.json)) {
          warn('Skipped', 'Set INSTAGRAM_ACCESS_TOKEN + INSTAGRAM_BUSINESS_ACCOUNT_ID on server');
        } else {
          fail('REELS publish failed', r.json?.error ?? r.json?.details ?? r.res.status);
        }
      }
    }
    lines.push('');

    // ── Summary ──────────────────────────────────────────────────────────────
    lines.push('## Summary');
    lines.push('');
    lines.push('### To run live + scheduled post tests, add to Vercel env + local .env:');
    lines.push('```');
    lines.push('# Vercel env vars (npx vercel env add):');
    lines.push('INSTAGRAM_ACCESS_TOKEN=<fresh long-lived page token from Meta for Developers>');
    lines.push('INSTAGRAM_BUSINESS_ACCOUNT_ID=<ig-user-id>');
    lines.push('# Local .env (for test runner):');
    lines.push('INSTAGRAM_TEST_IMAGE_URL=https://any-publicly-accessible-image.jpg');
    lines.push('INSTAGRAM_TEST_VIDEO_URL=https://any-publicly-accessible-video.mp4  # optional');
    lines.push('```');
    lines.push('');
    lines.push('### Scheduling format:');
    lines.push('```json');
    lines.push(JSON.stringify({
      media_type: 'IMAGE',
      image_url: 'https://example.com/image.jpg',
      caption: 'My scheduled post',
      scheduled_publish_time: new Date(Date.now() + 86400000).toISOString(),
    }, null, 2));
    lines.push('```');

  } catch (err) {
    lines.push('', '## Fatal Error', '```', mdEscape(err.stack || err.message || String(err)), '```');
  } finally {
    await writeReport(lines, 'test/agent/reports', 'instagram_post');
  }
}

test().then(() => process.exit(0)).catch(() => process.exit(1));
