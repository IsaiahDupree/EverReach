// Dynamic CORS helper with allowlist and Origin echoing
// - Allowed origins default to a conservative set and can be extended via env CORS_ORIGINS (comma-separated)
// - Adds Vary: Origin for proper caching behavior

const STATIC_ALLOWED = new Set<string>([
  'https://ai-enhanced-personal-crm.rork.app',
  'https://rork.com',
  'https://everreach.app',
  'https://www.everreach.app',
]);

function parseEnvAllowlist(): Set<string> {
  const out = new Set<string>();
  const raw = process.env.CORS_ORIGINS?.trim();
  if (!raw) return out;
  for (const part of raw.split(',')) {
    const v = part.trim();
    if (v) out.add(v);
  }
  return out;
}

function isRequest(obj: unknown): obj is Request {
  return !!obj && typeof (obj as any).headers?.get === 'function';
}

export function buildCorsHeaders(origin?: string): HeadersInit {
  const allowlist = new Set<string>([...STATIC_ALLOWED, ...parseEnvAllowlist()]);
  let allow = origin && allowlist.has(origin) ? origin : '';
  
  // Dev convenience: allow localhost and all local development
  if (!allow && origin) {
    try {
      const url = new URL(origin);
      const host = url.hostname.toLowerCase();
      if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local') || host.includes('localhost')) {
        allow = origin;
      }
    } catch (_) {
      // ignore invalid origin strings
    }
  }
  
  // Allow all origins in development (for local testing)
  if (!allow && process.env.NODE_ENV !== 'production' && process.env.ALLOW_ALL_ORIGINS === 'true') {
    allow = origin || '*';
  }
  
  // Dev convenience: allow any https://*.exp.direct when ALLOW_EXP_DIRECT=true
  if (!allow && origin && process.env.ALLOW_EXP_DIRECT === 'true') {
    try {
      const url = new URL(origin);
      const host = url.host.toLowerCase();
      if (url.protocol === 'https:' && /(^|\.)exp\.direct$/.test(host)) {
        allow = origin;
      }
    } catch (_) {
      // ignore invalid origin strings
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
    // Do not set credentials with wildcard origin
  }
  return headers;
}

export function options(req?: Request) {
  const origin = req?.headers?.get('origin') ?? undefined;
  return new Response(null, { headers: buildCorsHeaders(origin), status: 204 });
}

// Backward-compatible response helpers. Accept either extra headers or a Request as 2nd arg.
export function ok(body: unknown, extraOrReq: HeadersInit | Request = {}, maybeExtra: HeadersInit = {}) {
  const origin = isRequest(extraOrReq) ? extraOrReq.headers.get('origin') ?? undefined : undefined;
  const extra = isRequest(extraOrReq) ? maybeExtra : (extraOrReq as HeadersInit);
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json', ...buildCorsHeaders(origin), ...extra },
    status: 200,
  });
}

export function created(body: unknown, extraOrReq: HeadersInit | Request = {}, maybeExtra: HeadersInit = {}) {
  const origin = isRequest(extraOrReq) ? extraOrReq.headers.get('origin') ?? undefined : undefined;
  const extra = isRequest(extraOrReq) ? maybeExtra : (extraOrReq as HeadersInit);
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json', ...buildCorsHeaders(origin), ...extra },
    status: 201,
  });
}

export function badRequest(message: string, extraOrReq: HeadersInit | Request = {}, maybeExtra: HeadersInit = {}) {
  const origin = isRequest(extraOrReq) ? extraOrReq.headers.get('origin') ?? undefined : undefined;
  const extra = isRequest(extraOrReq) ? maybeExtra : (extraOrReq as HeadersInit);
  return new Response(JSON.stringify({ error: message }), {
    headers: { 'Content-Type': 'application/json', ...buildCorsHeaders(origin), ...extra },
    status: 400,
  });
}

export function serverError(message: string, extraOrReq: HeadersInit | Request = {}, maybeExtra: HeadersInit = {}) {
  const origin = isRequest(extraOrReq) ? extraOrReq.headers.get('origin') ?? undefined : undefined;
  const extra = isRequest(extraOrReq) ? maybeExtra : (extraOrReq as HeadersInit);
  return new Response(JSON.stringify({ error: message }), {
    headers: { 'Content-Type': 'application/json', ...buildCorsHeaders(origin), ...extra },
    status: 500,
  });
}

export function unauthorized(message: string = 'Unauthorized', extraOrReq: HeadersInit | Request = {}, maybeExtra: HeadersInit = {}) {
  const origin = isRequest(extraOrReq) ? extraOrReq.headers.get('origin') ?? undefined : undefined;
  const extra = isRequest(extraOrReq) ? maybeExtra : (extraOrReq as HeadersInit);
  return new Response(JSON.stringify({ error: message }), {
    headers: { 'Content-Type': 'application/json', ...buildCorsHeaders(origin), ...extra },
    status: 401,
  });
}

export function notFound(message: string = 'Not Found', extraOrReq: HeadersInit | Request = {}, maybeExtra: HeadersInit = {}) {
  const origin = isRequest(extraOrReq) ? extraOrReq.headers.get('origin') ?? undefined : undefined;
  const extra = isRequest(extraOrReq) ? maybeExtra : (extraOrReq as HeadersInit);
  return new Response(JSON.stringify({ error: message }), {
    headers: { 'Content-Type': 'application/json', ...buildCorsHeaders(origin), ...extra },
    status: 404,
  });
}
