// Minimal Supabase auth (GoTrue REST) helpers for test runner
import { request } from './http.mjs';

function trimSafe(v) { return (v ?? '').toString().trim(); }
function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

export async function signInWithPassword({ url, anonKey, email, password, retries = 3 }) {
  url = trimSafe(url).replace(/\/$/, '');
  anonKey = trimSafe(anonKey);
  email = trimSafe(email);
  password = trimSafe(password);
  if (!url || !anonKey || !email || !password) {
    throw new Error('Missing Supabase envs: SUPABASE_URL, SUPABASE_ANON_KEY, TEST_EMAIL, TEST_PASSWORD');
  }
  const endpoint = `${url}/auth/v1/token?grant_type=password`;

  let lastErr;
  for (let attempt = 1; attempt <= Math.max(1, retries); attempt++) {
    try {
      const { status, ok, data, raw } = await request('POST', endpoint, {
        headers: {
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`,
          'Content-Type': 'application/json',
        },
        body: { email, password },
      });
      if (!ok) {
        const detail = data?.error_description || data?.error || raw || 'unknown error';
        throw new Error(`Supabase sign-in failed (${status}): ${detail}`);
      }
      const accessToken = data?.access_token;
      if (!accessToken) throw new Error('No access_token in Supabase response');
      return { accessToken, data };
    } catch (e) {
      lastErr = e;
      if (attempt < retries) await sleep(250 * attempt);
    }
  }
  throw lastErr || new Error('Supabase sign-in failed');
}
