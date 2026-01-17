/**
 * E2E Test Client
 * Makes HTTP requests to deployed API endpoints for end-to-end testing
 */

export interface E2ETestConfig {
  baseUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  testEmail: string;
  testPassword: string;
}

export interface RequestOptions {
  headers?: Record<string, string>;
  body?: unknown;
  query?: Record<string, string>;
}

export interface E2EResponse<T = unknown> {
  status: number;
  ok: boolean;
  data: T | null;
  headers: Record<string, string>;
  raw: string;
  error?: string;
}

/**
 * Get test configuration from environment variables
 */
export function getTestConfig(): E2ETestConfig {
  const baseUrl = (process.env.TEST_BASE_URL || 'https://ever-reach-be.vercel.app').replace(/\/$/, '');
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://utasetfxiqcrnwyfforx.supabase.co').replace(/\/$/, '');
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const testEmail = process.env.TEST_EMAIL || '';
  const testPassword = process.env.TEST_PASSWORD || '';

  if (!testEmail || !testPassword) {
    throw new Error('TEST_EMAIL and TEST_PASSWORD must be set for E2E tests. Set TEST_SKIP_E2E=true to skip E2E tests.');
  }

  if (!supabaseAnonKey) {
    throw new Error('Supabase anon key must be set. Check SUPABASE_ANON_KEY or EXPO_PUBLIC_SUPABASE_KEY');
  }

  return {
    baseUrl,
    supabaseUrl,
    supabaseAnonKey,
    testEmail,
    testPassword,
  };
}

/**
 * Check if E2E tests should be skipped
 */
export function shouldSkipE2E(): boolean {
  return process.env.TEST_SKIP_E2E === 'true' || process.env.TEST_SKIP_E2E === '1';
}

/**
 * Make HTTP request to API
 */
export async function request<T = unknown>(
  method: string,
  url: string,
  options: RequestOptions = {}
): Promise<E2EResponse<T>> {
  const { headers = {}, body, query } = options;

  // Add query params
  let finalUrl = url;
  if (query && Object.keys(query).length > 0) {
    const params = new URLSearchParams(query);
    finalUrl = `${url}?${params.toString()}`;
  }

  // Make request
  const response = await fetch(finalUrl, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  // Parse response
  const raw = await response.text();
  let data: T | null = null;
  let error: string | undefined;

  try {
    if (raw) {
      data = JSON.parse(raw) as T;
    }
  } catch {
    // If response is not JSON, store as raw string
    if (raw) {
      error = raw;
    }
  }

  // Extract headers
  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });

  return {
    status: response.status,
    ok: response.ok,
    data,
    headers: responseHeaders,
    raw,
    error,
  };
}

/**
 * Authenticate with Supabase and get access token
 */
export async function authenticateSupabase(config: E2ETestConfig): Promise<string> {
  const { supabaseUrl, supabaseAnonKey, testEmail, testPassword } = config;

  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKey,
    },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to authenticate: ${response.status} ${text}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Get auth headers for authenticated requests
 */
export function authHeaders(token: string, additionalHeaders: Record<string, string> = {}): Record<string, string> {
  return {
    'Authorization': `Bearer ${token}`,
    'Origin': 'https://everreach.app',
    ...additionalHeaders,
  };
}

/**
 * E2E Test Client Class
 */
export class E2EClient {
  private config: E2ETestConfig;
  private accessToken: string | null = null;

  constructor(config?: E2ETestConfig) {
    this.config = config || getTestConfig();
  }

  get baseUrl(): string {
    return this.config.baseUrl;
  }

  /**
   * Authenticate and cache access token
   */
  async authenticate(): Promise<string> {
    if (!this.accessToken) {
      this.accessToken = await authenticateSupabase(this.config);
    }
    return this.accessToken;
  }

  /**
   * Make authenticated request
   */
  async request<T = unknown>(
    method: string,
    path: string,
    options: RequestOptions = {}
  ): Promise<E2EResponse<T>> {
    const token = await this.authenticate();
    const url = `${this.config.baseUrl}${path}`;
    
    return request<T>(method, url, {
      ...options,
      headers: {
        ...authHeaders(token),
        ...(options.headers || {}),
      },
    });
  }

  /**
   * Make unauthenticated request
   */
  async requestUnauth<T = unknown>(
    method: string,
    path: string,
    options: RequestOptions = {}
  ): Promise<E2EResponse<T>> {
    const url = `${this.config.baseUrl}${path}`;
    return request<T>(method, url, options);
  }

  /**
   * Make request with API key
   */
  async requestWithApiKey<T = unknown>(
    method: string,
    path: string,
    apiKey: string,
    options: RequestOptions = {}
  ): Promise<E2EResponse<T>> {
    const url = `${this.config.baseUrl}${path}`;
    
    return request<T>(method, url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        ...(options.headers || {}),
      },
    });
  }

  /**
   * Convenience methods
   */
  async get<T = unknown>(path: string, options: RequestOptions = {}): Promise<E2EResponse<T>> {
    return this.request<T>('GET', path, options);
  }

  async post<T = unknown>(path: string, body: unknown, options: RequestOptions = {}): Promise<E2EResponse<T>> {
    return this.request<T>('POST', path, { ...options, body });
  }

  async patch<T = unknown>(path: string, body: unknown, options: RequestOptions = {}): Promise<E2EResponse<T>> {
    return this.request<T>('PATCH', path, { ...options, body });
  }

  async delete<T = unknown>(path: string, options: RequestOptions = {}): Promise<E2EResponse<T>> {
    return this.request<T>('DELETE', path, options);
  }

  /**
   * Get Supabase client for direct database access (test setup/teardown)
   */
  getSupabaseClient() {
    // Import dynamically to avoid issues when not testing
    const { createClient } = require('@supabase/supabase-js');
    return createClient(this.config.supabaseUrl, this.config.supabaseAnonKey);
  }
}
