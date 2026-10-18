// Dynamic CORS helper with allowlist and Origin echoing
// - Allowed origins default to a conservative set and can be extended via env CORS_ORIGINS (comma-separated)
// - Adds Vary: Origin for proper caching behavior
// - Generates X-Request-ID for all responses for debugging and log correlation

// Universal request ID generator (Edge + Node)
function makeRequestId(): string {
  try {
    const uuid = (globalThis as any).crypto?.randomUUID?.();
    if (uuid) return `req_${uuid.replace(/-/g, '')}`;
  } catch {}
  const rand = Math.random().toString(16).slice(2) + Date.now().toString(16);
  return `req_${rand.padEnd(32, '0').slice(0, 32)}`;
}

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
  
  // Dev convenience: allow localhost on any port
  if (!allow && origin) {
    try {
      const url = new URL(origin);
      const host = url.host.toLowerCase();
      // Allow localhost or 127.0.0.1 on any port
      if (host.startsWith('localhost:') || host === 'localhost' || host.startsWith('127.0.0.1:') || host === '127.0.0.1') {
        allow = origin;
      }
    } catch (_) {
      // ignore invalid origin strings
    }
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
    'Access-Control-Allow-Headers': 'Authorization,Content-Type,Idempotency-Key,idempotency-key,x-vercel-protection-bypass,X-Requested-With,X-Platform,X-App-Version,X-RevenueCat-Signature,X-Test-Mode',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'true',
  };
  if (allow) headers['Access-Control-Allow-Origin'] = allow;
  return headers;
}

export function options(req?: Request) {
  const origin = req?.headers?.get('origin') ?? undefined;
  return new Response(null, { headers: buildCorsHeaders(origin), status: 200 });
}

// Backward-compatible response helpers. Accept either extra headers or a Request as 2nd arg.
export function ok(body: unknown, extraOrReq: HeadersInit | Request = {}, maybeExtra: HeadersInit = {}) {
  const origin = isRequest(extraOrReq) ? extraOrReq.headers.get('origin') ?? undefined : undefined;
  const extra = isRequest(extraOrReq) ? maybeExtra : (extraOrReq as HeadersInit);
  const requestId = makeRequestId();
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json', 'X-Request-ID': requestId, ...buildCorsHeaders(origin), ...extra },
    status: 200,
  });
}

export function created(body: unknown, extraOrReq: HeadersInit | Request = {}, maybeExtra: HeadersInit = {}) {
  const origin = isRequest(extraOrReq) ? extraOrReq.headers.get('origin') ?? undefined : undefined;
  const extra = isRequest(extraOrReq) ? maybeExtra : (extraOrReq as HeadersInit);
  const requestId = makeRequestId();
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json', 'X-Request-ID': requestId, ...buildCorsHeaders(origin), ...extra },
    status: 201,
  });
}

export function badRequest(message: string, extraOrReq: HeadersInit | Request = {}, maybeExtra: HeadersInit = {}) {
  const origin = isRequest(extraOrReq) ? extraOrReq.headers.get('origin') ?? undefined : undefined;
  const extra = isRequest(extraOrReq) ? maybeExtra : (extraOrReq as HeadersInit);
  const requestId = makeRequestId();
  return new Response(JSON.stringify({ error: message, request_id: requestId }), {
    headers: { 'Content-Type': 'application/json', 'X-Request-ID': requestId, ...buildCorsHeaders(origin), ...extra },
    status: 400,
  });
}

export function serverError(message: string, extraOrReq: HeadersInit | Request = {}, maybeExtra: HeadersInit = {}) {
  const origin = isRequest(extraOrReq) ? extraOrReq.headers.get('origin') ?? undefined : undefined;
  const extra = isRequest(extraOrReq) ? maybeExtra : (extraOrReq as HeadersInit);
  const requestId = makeRequestId();
  return new Response(JSON.stringify({ error: message, request_id: requestId }), {
    headers: { 'Content-Type': 'application/json', 'X-Request-ID': requestId, ...buildCorsHeaders(origin), ...extra },
    status: 500,
  });
}

export function unauthorized(message: string = 'Unauthorized', extraOrReq: HeadersInit | Request = {}, maybeExtra: HeadersInit = {}) {
  const origin = isRequest(extraOrReq) ? extraOrReq.headers.get('origin') ?? undefined : undefined;
  const extra = isRequest(extraOrReq) ? maybeExtra : (extraOrReq as HeadersInit);
  const requestId = makeRequestId();
  return new Response(JSON.stringify({ error: message, request_id: requestId }), {
    headers: { 'Content-Type': 'application/json', 'X-Request-ID': requestId, ...buildCorsHeaders(origin), ...extra },
    status: 401,
  });
}

export function notFound(message: string, extraOrReq: HeadersInit | Request = {}, maybeExtra: HeadersInit = {}) {
  const origin = isRequest(extraOrReq) ? extraOrReq.headers.get('origin') ?? undefined : undefined;
  const extra = isRequest(extraOrReq) ? maybeExtra : (extraOrReq as HeadersInit);
  const requestId = makeRequestId();
  return new Response(JSON.stringify({ error: message, request_id: requestId }), {
    headers: { 'Content-Type': 'application/json', 'X-Request-ID': requestId, ...buildCorsHeaders(origin), ...extra },
    status: 404,
  });
}

export function tooManyRequests(message: string, extraOrReq: HeadersInit | Request = {}, maybeExtra: HeadersInit = {}) {
  const origin = isRequest(extraOrReq) ? extraOrReq.headers.get('origin') ?? undefined : undefined;
  const extra = isRequest(extraOrReq) ? maybeExtra : (extraOrReq as HeadersInit);
  const requestId = makeRequestId();
  return new Response(JSON.stringify({ error: message, request_id: requestId }), {
    headers: { 'Content-Type': 'application/json', 'X-Request-ID': requestId, ...buildCorsHeaders(origin), ...extra },
    status: 429,
  });
}

export function okXml(xmlContent: string, extraOrReq: HeadersInit | Request = {}, maybeExtra: HeadersInit = {}) {
  const origin = isRequest(extraOrReq) ? extraOrReq.headers.get('origin') ?? undefined : undefined;
  const extra = isRequest(extraOrReq) ? maybeExtra : (extraOrReq as HeadersInit);
  const requestId = makeRequestId();
  return new Response(xmlContent, {
    headers: { 'Content-Type': 'text/xml', 'X-Request-ID': requestId, ...buildCorsHeaders(origin), ...extra },
    status: 200,
  });
}
