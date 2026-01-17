# Backend API Integration Tests

These tests hit the deployed backend in read-only ways.

Base URL (override with env): `BACKEND_BASE_URL`, default `https://ever-reach-be.vercel.app`.

Run:
```bash
npm test
```

Included:
- `__tests__/health.test.ts` – GET `/api/health` returns healthy JSON
- `__tests__/context-bundle-auth.test.ts` – GET `/api/v1/contacts/:id/context-bundle` without auth → 401/403/404
