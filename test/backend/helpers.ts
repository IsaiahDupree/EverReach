/**
 * Shared test helpers for backend integration tests
 */

const BASE_URL = process.env.BACKEND_BASE_URL || 'https://ever-reach-be.vercel.app';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://utasetfxiqcrnwyfforx.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const TEST_EMAIL = process.env.TEST_EMAIL || 'isaiahdupree33@gmail.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || '';

let cachedToken: string | null = null;

export async function getAccessToken(): Promise<string> {
  if (cachedToken) return cachedToken;
  if (process.env.ACCESS_TOKEN) {
    cachedToken = process.env.ACCESS_TOKEN;
    return cachedToken;
  }

  if (!TEST_PASSWORD) {
    throw new Error('TEST_PASSWORD environment variable is required');
  }

  const url = `${SUPABASE_URL.replace(/\/$/, '')}/auth/v1/token?grant_type=password`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    }),
  });

  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    const msg = json?.error_description || json?.error || res.statusText;
    throw new Error(`Supabase sign-in failed: ${res.status} ${msg}`);
  }

  const json = await res.json();
  const token = json?.access_token;
  if (!token) {
    throw new Error('No access_token from Supabase REST');
  }

  cachedToken = token;
  return token;
}

export interface ApiFetchOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  token?: string;
}

export async function apiFetch(
  path: string,
  options: ApiFetchOptions = {}
): Promise<Response> {
  const { method = 'GET', headers = {}, body, token } = options;
  const url = `${BASE_URL}${path}`;

  const hdrs: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (token) {
    hdrs['Authorization'] = `Bearer ${token}`;
  }

  return fetch(url, {
    method,
    headers: hdrs,
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function generateIdempotencyKey(prefix: string = 'test'): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 5,
  delayMs: number = 500
): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (i < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastError;
}
