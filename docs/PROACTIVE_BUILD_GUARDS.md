# Proactive Build Guards

Updated: 2025-10-17

## Goals

- Catch all type, lint, and build errors before Vercel
- Prevent runtime crashes from API shape changes
- Keep CI and local environments in sync

---

## One-Command Local Gate

- **Run before every push**:
```bash
cd web
npm run validate && npm run build:local
```
- Scripts (already added to `web/package.json`):
```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "lint": "next lint",
    "build:local": "NEXT_TELEMETRY_DISABLED=1 next build",
    "validate": "npm run typecheck && npm run lint -- --max-warnings=0"
  }
}
```

---

## CI Gate (GitHub Actions)

- Workflow: `.github/workflows/frontend-ci.yml`
- Runs on PRs and pushes to `main` and `feat/backend-vercel-only-clean`
- Steps in `web/`:
  - `npm ci`
  - `npm run typecheck`
  - `npm run lint -- --max-warnings=0`
  - `npm run build`
- Uses dummy env vars to avoid runtime-only env failures
- Make this a required status check for merges

---

## TypeScript Hardening

- In `web/tsconfig.json`:
  - Ensure: `"strict": true` (already on)
  - Add:
```json
{
  "noUncheckedIndexedAccess": true,
  "noImplicitOverride": true,
  "noFallthroughCasesInSwitch": true
}
```
  - Note: Keep `skipLibCheck: true` for now to avoid vendor noise. Revisit later.

---

## Next.js & Routing

- Keep `typedRoutes` enabled in `web/next.config.js`
- Prefer typed hrefs:
```ts
import type { Route } from 'next'
const items: { href: Route; label: string }[] = [
  { href: '/settings/profile', label: 'Profile' }
]
```
- If literals are necessary: `href: '/settings/profile' as const`

---

## Data Shape Resilience

- Use `web/lib/api.ts` helpers
  - `getJsonArray()` now returns `[]` on ANY error (network/500/parse)
  - Prevents `.map()`/`.filter()` crashes
- In components, still guard:
```tsx
{(items || []).map(...)}
```

---

## Optional (Recommended)

- Husky pre-commit:
```bash
npx husky add .husky/pre-commit "cd web && npm run validate"
```
- Pin Node version (root `package.json`):
```json
{ "engines": { "node": ">=18 <21" } }
```
- Do NOT set `eslint.ignoreDuringBuilds` in `web/next.config.js`
- Keep Vercel envs in parity:
```bash
vercel env ls
vercel env pull .env.vercel
```

---

## Quick Triage

- Type errors: `npm run typecheck`
- Lint errors: `npm run lint -- --max-warnings=0`
- Build issues: `npm run build:local`
- API 500s: UI should still render (empty states); check console warnings from `getJsonArray()`

---

## Status

- Local gate scripts: ✅
- CI gate: ✅
- TS hardening flags: ⏳ (to apply now)
- Node engines pin: ⏳ (to apply now)
- Husky pre-commit: ⏳ (optional)
