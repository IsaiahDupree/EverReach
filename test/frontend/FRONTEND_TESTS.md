# Frontend Web Tests (Playwright)

These tests run in a real browser against the Expo web dev server.

## Prereqs

- Node 18+
- Install Playwright:
```bash
npm i -D @playwright/test
npx playwright install
```

## Start Expo (web)
```bash
npx expo start --web
```
Expo will print a URL (default `http://localhost:8081`).

## Run tests
```bash
# Using default base URL http://localhost:8081
npx playwright test -c test/frontend/playwright.config.ts

# Custom base URL
WEB_BASE_URL=http://localhost:19006 npx playwright test -c test/frontend/playwright.config.ts
```

## Included specs
- `tests/health.spec.ts` – Visits `/health` and asserts the connectivity cards render.

## Notes
- Tests are read-only. They do not modify backend data.
- Ensure backend CORS allows `localhost:PORT` you use.
