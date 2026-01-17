# Warmth Endpoints Test Report

## Summary
- Tested against: `https://ever-reach-be.vercel.app`
- Auth: Supabase email/password test user via service key (see script)
- Contact used: first contact from `GET /api/v1/contacts?limit=1` (auto-picked by script)

## Results
- **GET /api/v1/contacts/:id/warmth-history?window=30d**: 200 OK, items: 0 (endpoint deployed)
- **GET /api/v1/contacts/:id/warmth/history?limit=30**: 200 OK, items: 0 (legacy endpoint deployed)
- **GET /api/v1/contacts/:id/warmth/current**: 404 Not Found (not deployed)
- **POST /api/v1/contacts/:id/warmth/recompute**: 500 Internal Server Error
  - Error: `null value in column "band" of relation "warmth_history" violates not-null constraint`

## Root Cause
- Database likely has a trigger that inserts rows into `warmth_history` when `contacts.warmth` updates.
- Our recompute endpoint updated only `warmth` (score) and did not set `warmth_band`.
- Trigger attempted to insert a history row with a null `band`.

## Fix Implemented (in repo)
File: `backend-vercel/app/api/v1/contacts/[id]/warmth/recompute/route.ts`
- Added band derivation and updated both fields:
  - `warmth` (clamped 0–100)
  - `warmth_band` based on score thresholds: hot ≥70, warm ≥50, neutral ≥30, cool ≥15, else cold
- Endpoint now updates `{ warmth, warmth_band }` in one statement.

Note: This needs a backend deploy for production to pick up the fix.

## Next Steps
- Deploy backend (Vercel) so the fix is live.
- Re-run the test script:
  - `node test/warmth-endpoints-test.mjs` (with env: `SUPABASE_SERVICE_KEY`, `SUPABASE_URL`, `TEST_USER_EMAIL`, `TEST_USER_PASSWORD`)
- Optional: implement `GET /api/v1/contacts/:id/warmth/current` to return current score and metadata.
- Optional: update Activity tab to prefer `warmth-history`, then fallback to legacy, then current-only.

## Script
- Location: `test/warmth-endpoints-test.mjs`
- What it does: Auth → pick a contact → baseline current/history → recompute → re-check → (optional) bulk recompute

## References
- Primary history (docs): `GET /api/v1/contacts/{id}/warmth-history?window=7d|30d|90d`
- Legacy history (docs): `GET /api/v1/contacts/{id}/warmth/history?limit=30`
- Recompute: `POST /api/v1/contacts/{id}/warmth/recompute`
