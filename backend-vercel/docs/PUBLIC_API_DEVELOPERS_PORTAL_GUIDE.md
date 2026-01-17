# Public API – Developers Portal (Frontend Implementation Guide)

This guide explains how to showcase your public API inside the app/website with an API Docs viewer, API Keys management UI, and a Try‑It console.

---

## Goals
- Public, SEO‑friendly API docs page (no auth).
- Authenticated developer tools: API Keys manager and Try‑It console.
- Safe by default: never leak full keys, strict CORS, short caches.

---

## Information Architecture

- **Web (Next.js)**
  - `/developers` → Landing (public)
  - `/developers/api` → API Docs viewer (public)
  - `/developers/keys` → API keys manager (auth)
  - `/developers/console` → Try‑It API console (auth)

- **Mobile (Expo)**
  - Settings → “Developers” → open `https://everreach.app/developers` in in‑app browser/webview 
  - Optional native screens later; start with web pages to move fast.

---

## 1) OpenAPI Spec Exposure

- Preferred: serve spec at `GET /openapi.json` (static) or `/api/openapi.json` (generated).
- Place `openapi.json` in `public/` to publish immediately.
- Keep spec lean initially; expand as endpoints grow.

```json
{
  "openapi": "3.0.3",
  "info": { "title": "EverReach Public API", "version": "1.0.0" },
  "servers": [{ "url": "https://api.everreach.app" }],
  "paths": {}
}
```

---

## 2) API Docs Viewer (/developers/api)

- Use ReDoc (client‑side only, via dynamic import) to avoid SSR issues.
- Minimal page implementation:

```tsx
// app/developers/api/page.tsx
'use client';
import dynamic from 'next/dynamic';
const RedocStandalone = dynamic(() => import('redoc').then(m => m.RedocStandalone), { ssr: false });

export default function APIDocs() {
  return (
    <div className="min-h-screen bg-white">
      <RedocStandalone specUrl="/openapi.json" options={{ hideDownloadButton: true, expandResponses: '200,4xx' }} />
    </div>
  );
}
```

Fallback (if no OpenAPI yet): an MDX page with endpoint tables and examples.

---

## 3) API Keys Manager (/developers/keys)

Features:
- List keys (masked), scopes, created_at, last_used_at.
- Create key: select scopes; show full value only once; copy button.
- Revoke/Delete key.

API contract (example):
- `GET /api/v1/keys` → list
- `POST /api/v1/keys` → create { name, scopes[] }
- `DELETE /api/v1/keys/:id` → revoke

UI rules:
- Show only last 4 chars after creation.
- Use “copy to clipboard” with toasts; never auto‑store full key in localStorage.
- Confirm destructive actions.

Security:
- Gate page behind Supabase session (or your existing auth middleware).
- Rate‑limit key creation.

---

## 4) Try‑It Console (/developers/console)

Purpose: let users call endpoints with their API key from the browser safely.

Features:
- Method select (GET/POST/…); path input with presets.
- Headers panel (auto‑inject `Authorization: Bearer <api_key>` if toggled).
- Body (JSON editor) for POST/PATCH.
- Response viewer: status, pretty JSON, headers.
- Surface rate limit headers: `X-RateLimit-*`, `Retry-After`, request id.

Minimal fetch helper:

```ts
async function tryIt({ method, path, body, apiKey }: { method: string; path: string; body?: any; apiKey?: string }) {
  const BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'https://api.everreach.app';
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  const res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let json: any = null; try { json = JSON.parse(text); } catch {}
  return { ok: res.ok, status: res.status, headers: Object.fromEntries(res.headers.entries()), body: json ?? text };
}
```

Recommended presets:
- `GET /api/v1/me`
- `GET /api/v1/contacts/:id/context-bundle?interactions=20`
- `POST /api/v1/webhooks/test` (if available)

Safety:
- Keep key in memory while the tab is open; do not persist by default.
- Optional “remember this key” behind explicit consent, stored encrypted.

---

## 5) CORS & Security

- Backend CORS allowlist should include docs and app origins only:
  - `https://everreach.app`, `https://www.everreach.app`, `https://api.everreach.app`
- Never log full keys; mask in UI, analytics, and server logs.
- Add CAPTCHA/confirmations for key creation if abuse observed.
- Rate limit Try‑It requests by IP + session.

---

## 6) Analytics (DX insights)

Track with PostHog (or your system):
- `dev_docs_viewed`, `openapi_downloaded`
- `api_key_created`, `api_key_revoked`
- `try_it_sent` (method, path, ok, status)
- `try_it_copy_curl`

Use these to drive funnel improvements.

---

## 7) Environment & Config

- Web:
  - `NEXT_PUBLIC_API_BASE=https://api.everreach.app`
- Mobile:
  - Open external `https://everreach.app/developers` for docs initially.
- Dev vs Prod:
  - Point dev to staging base URL and `evr_test_*` keys.

---

## 8) Step‑by‑Step Checklist

1. Expose OpenAPI at `/openapi.json` (or add MDX fallback).
2. Create `/developers/api` with ReDoc viewer.
3. Build `/developers/keys` with list/create/revoke (auth required).
4. Build `/developers/console` with Try‑It (auth required).
5. Add CORS allowlist entries for docs/app origins.
6. Add analytics events for usage tracking.
7. QA with test keys; verify rate limit headers surface in UI.
8. Announce: link from Settings → Developers.

---

## 9) Content (Docs Landing `/developers`)

- Overview: Base URL, auth model, rate limits, error schema.
- Quick start (cURL + JS/TS), sample responses.
- Links: API Docs, Console, Keys.
- Safety notes: masking keys, rotating keys, scopes.

---

## 10) Future Enhancements

- Code sample tabs (curl, JS/TS, Python).
- Swagger‑UI Try‑It directly in docs (if you prefer one page).
- Sandbox mode with mock responses for exploration.
- Changelog + status badges (uptime, latency, error rate).

---

## Troubleshooting

- 401 Unauthorized: invalid/missing `Authorization` header → use `Bearer evr_*`.
- 429 Too Many Requests: respect `Retry-After`, check headers.
- CORS error: ensure origin is allowlisted in backend CORS.
- Key not working: verify scopes and key status (revoked/expired).
