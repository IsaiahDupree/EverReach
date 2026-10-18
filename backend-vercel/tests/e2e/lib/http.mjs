// Simple HTTP helpers using global fetch (Node 18+/Bun)
import fs from 'node:fs/promises';
import path from 'node:path';

const LOG = (process?.env?.TEST_LOG || '').toLowerCase() === 'true' || process?.env?.TEST_LOG === '1';

export async function request(method, url, { headers = {}, body, timeoutMs = 20000 } = {}) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    if (LOG) console.log(`[http] => ${method} ${url}`);
    const res = await fetch(url, {
      method,
      headers,
      body: typeof body === 'string' ? body : body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
    const text = await res.text();
    let data = null;
    try { data = JSON.parse(text); } catch { /* non-JSON */ }
    if (LOG) console.log(`[http] <= ${res.status} ${method} ${url}`);
    return { status: res.status, ok: res.ok, headers: Object.fromEntries(res.headers.entries()), data, raw: text };
  } finally {
    clearTimeout(id);
  }
}

export function authHeaders(token, origin, extra = {}) {
  const VERCEL_BYPASS = process.env.VERCEL_PROTECTION_BYPASS || process.env.X_VERCEL_PROTECTION_BYPASS;
  const h = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(origin ? { Origin: origin } : {}),
  };
  const maybeBypass = VERCEL_BYPASS ? { 'x-vercel-protection-bypass': VERCEL_BYPASS } : {};
  return { ...h, ...maybeBypass, ...extra };
}

export async function writeFile(filePath, content) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf8');
  if (LOG) console.log(`[fs] wrote ${filePath}`);
}
