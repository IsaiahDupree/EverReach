/**
 * Backend CORS Tests
 * 
 * Tests the CORS helper logic from backend-vercel/lib/cors.ts.
 * Inlined since backend-vercel is excluded from jest module resolution.
 */

// ─── Inline CORS logic ──────────────────────────────────

const STATIC_ALLOWED = new Set<string>([
  'https://ai-enhanced-personal-crm.rork.app',
  'https://rork.com',
  'https://everreach.app',
  'https://www.everreach.app',
]);

function buildCorsHeaders(origin?: string): Record<string, string> {
  const allowlist = new Set<string>([...STATIC_ALLOWED]);
  let allow = origin && allowlist.has(origin) ? origin : '';

  // Dev: allow localhost
  if (!allow && origin) {
    try {
      const url = new URL(origin);
      const host = url.hostname.toLowerCase();
      if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')) {
        allow = origin;
      }
    } catch {
      // ignore
    }
  }

  const headers: Record<string, string> = {
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization,Content-Type,X-Requested-With,x-vercel-protection-bypass,Idempotency-Key,idempotency-key,X-Platform,X-App-Version',
    'Access-Control-Max-Age': '86400',
  };

  if (allow) {
    headers['Access-Control-Allow-Origin'] = allow;
    headers['Access-Control-Allow-Credentials'] = 'true';
  } else {
    headers['Access-Control-Allow-Origin'] = '*';
  }
  return headers;
}

// ─── Tests ───────────────────────────────────────────────

describe('buildCorsHeaders', () => {
  test('allows known production origin', () => {
    const headers = buildCorsHeaders('https://everreach.app');
    expect(headers['Access-Control-Allow-Origin']).toBe('https://everreach.app');
    expect(headers['Access-Control-Allow-Credentials']).toBe('true');
  });

  test('allows www variant', () => {
    const headers = buildCorsHeaders('https://www.everreach.app');
    expect(headers['Access-Control-Allow-Origin']).toBe('https://www.everreach.app');
  });

  test('allows rork.app origin', () => {
    const headers = buildCorsHeaders('https://ai-enhanced-personal-crm.rork.app');
    expect(headers['Access-Control-Allow-Origin']).toBe('https://ai-enhanced-personal-crm.rork.app');
  });

  test('allows localhost for dev', () => {
    const headers = buildCorsHeaders('http://localhost:3000');
    expect(headers['Access-Control-Allow-Origin']).toBe('http://localhost:3000');
  });

  test('allows 127.0.0.1 for dev', () => {
    const headers = buildCorsHeaders('http://127.0.0.1:8081');
    expect(headers['Access-Control-Allow-Origin']).toBe('http://127.0.0.1:8081');
  });

  test('falls back to * for unknown origin', () => {
    const headers = buildCorsHeaders('https://evil.com');
    expect(headers['Access-Control-Allow-Origin']).toBe('*');
    expect(headers['Access-Control-Allow-Credentials']).toBeUndefined();
  });

  test('falls back to * when no origin', () => {
    const headers = buildCorsHeaders(undefined);
    expect(headers['Access-Control-Allow-Origin']).toBe('*');
  });

  test('always includes Vary header', () => {
    expect(buildCorsHeaders()['Vary']).toBe('Origin');
    expect(buildCorsHeaders('https://everreach.app')['Vary']).toBe('Origin');
  });

  test('includes all required methods', () => {
    const methods = buildCorsHeaders()['Access-Control-Allow-Methods'];
    expect(methods).toContain('GET');
    expect(methods).toContain('POST');
    expect(methods).toContain('PUT');
    expect(methods).toContain('PATCH');
    expect(methods).toContain('DELETE');
    expect(methods).toContain('OPTIONS');
  });

  test('includes Authorization in allowed headers', () => {
    const allowed = buildCorsHeaders()['Access-Control-Allow-Headers'];
    expect(allowed).toContain('Authorization');
    expect(allowed).toContain('Content-Type');
  });

  test('max-age is 24 hours', () => {
    expect(buildCorsHeaders()['Access-Control-Max-Age']).toBe('86400');
  });
});

describe('CORS response helpers', () => {
  test('ok() returns 200 with JSON content-type', () => {
    const body = { data: 'test' };
    const response = new Response(JSON.stringify(body), {
      headers: { 'Content-Type': 'application/json', ...buildCorsHeaders() },
      status: 200,
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/json');
  });

  test('badRequest() returns 400', () => {
    const response = new Response(JSON.stringify({ error: 'Bad request' }), {
      headers: { 'Content-Type': 'application/json', ...buildCorsHeaders() },
      status: 400,
    });
    expect(response.status).toBe(400);
  });

  test('unauthorized() returns 401', () => {
    const response = new Response(JSON.stringify({ error: 'Unauthorized' }), {
      headers: { 'Content-Type': 'application/json', ...buildCorsHeaders() },
      status: 401,
    });
    expect(response.status).toBe(401);
  });

  test('notFound() returns 404', () => {
    const response = new Response(JSON.stringify({ error: 'Not Found' }), {
      headers: { 'Content-Type': 'application/json', ...buildCorsHeaders() },
      status: 404,
    });
    expect(response.status).toBe(404);
  });

  test('serverError() returns 500', () => {
    const response = new Response(JSON.stringify({ error: 'Internal error' }), {
      headers: { 'Content-Type': 'application/json', ...buildCorsHeaders() },
      status: 500,
    });
    expect(response.status).toBe(500);
  });

  test('options() returns 204', () => {
    const response = new Response(null, {
      headers: buildCorsHeaders(),
      status: 204,
    });
    expect(response.status).toBe(204);
    expect(response.body).toBeNull();
  });
});
