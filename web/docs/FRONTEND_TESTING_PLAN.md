# Frontend Testing Plan (ESM + Playwright - Real API Integration)

Status: Draft v2  
App: Next.js 14 (app router) in `web/`

---

## Objectives
- Validate core flows across all routes against REAL backend APIs.
- Use ESM throughout (config files as .mjs) and Playwright for integration/E2E tests.
- Keep tests simple, reliable, and CI-friendly.
- **NO MOCKING** - Tests hit actual backend endpoints for real integration confidence.

---

## Tooling

- **Component Tests** (minimal): Vitest + React Testing Library + jest-dom
  - Only for pure UI components with no API dependencies
  - Config: `vitest.config.mjs`
  - Setup: `test/setupTests.mjs`
- **Integration/E2E Tests** (primary): Playwright (Chromium/Firefox/WebKit)
  - Config: `playwright.config.mjs`
  - Tests: `e2e/**/*.spec.ts`
  - Hits real backend at `NEXT_PUBLIC_BACKEND_BASE`

Rationale:
- Playwright provides real browser testing with actual API calls.
- Component tests only for isolated UI logic (buttons, forms, styling).
- NO MSW - tests verify real backend integration.

---

## Environment & Local Dev

- Create `web/.env.local` (copy from `web/.env.example`).
  - `NEXT_PUBLIC_BACKEND_BASE` → Backend base URL (prod or local)
  - `NEXT_PUBLIC_SUPABASE_URL` → Your Supabase URL
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → Anon key

Run locally:
```bash
# from web/
npm install
npm run dev
```

---

## Directory Structure (to be added)

```
web/
  e2e/
    auth.spec.ts              # Login flow, auth guards
    contacts.spec.ts          # List, detail, CRUD operations
    alerts.spec.ts            # Alerts list, actions (approve/skip)
    settings.spec.ts          # Settings updates
    voice-notes.spec.ts       # Voice note upload flow
  __tests__/                  # Minimal component tests only
    components/
      button.test.tsx         # Pure UI components
      form-field.test.tsx
  test/
    setupTests.mjs            # Test environment setup
    helpers/
      auth.mjs                # Playwright auth helpers
      api.mjs                 # API test utilities
  playwright.config.mjs
  vitest.config.mjs           # For component tests only
```

---

## Component Tests (Vitest + RTL) - MINIMAL ONLY

**Purpose**: Test pure UI components in isolation (no API calls, no routing).

- Install (dev):
```bash
npm i -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event @vitest/coverage-v8
```

- `vitest.config.mjs` (ESM):
```js
// vitest.config.mjs
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setupTests.mjs'],
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      lines: 0.50,  // Lower threshold - only for UI components
      functions: 0.50,
      branches: 0.50,
      statements: 0.50,
    },
  },
})
```

- `test/setupTests.mjs`:
```js
import '@testing-library/jest-dom'
```

- **What to test with Vitest** (component tests only):
  - Pure UI components: buttons, form fields, cards, modals
  - Component prop variations and conditional rendering
  - User interactions (clicks, typing) that don't involve APIs
  - CSS/Tailwind class application
  - Accessibility attributes (ARIA roles, labels)

- **What NOT to test with Vitest**:
  - ❌ API calls
  - ❌ Full page routes
  - ❌ Authentication flows
  - ❌ Data fetching/mutations
  - ❌ Navigation/routing

**Examples**:
```tsx
// __tests__/components/button.test.tsx
import { render, screen } from '@testing-library/react'
import { Button } from '@/components/button'

test('renders button with text', () => {
  render(<Button>Click me</Button>)
  expect(screen.getByRole('button')).toHaveTextContent('Click me')
})

test('disables button when disabled prop is true', () => {
  render(<Button disabled>Click me</Button>)
  expect(screen.getByRole('button')).toBeDisabled()
})
```

**Note**: Keep component tests minimal. PRIMARY testing happens in Playwright with real API integration.

---

## E2E Tests (Playwright)

- Install (dev):
```bash
npm i -D @playwright/test
npx playwright install --with-deps
```

- `playwright.config.mjs`:
```js
// playwright.config.mjs
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: true,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
```

- **E2E Test Specs** (all hit REAL backend APIs):

### e2e/auth.spec.ts
```typescript
import { test, expect } from '@playwright/test'

test('login flow with real API', async ({ page }) => {
  await page.goto('/login')
  await page.fill('[name="email"]', 'test@example.com')
  await page.fill('[name="password"]', 'password123')
  await page.click('button[type="submit"]')
  
  // Wait for real auth response and redirect
  await expect(page).toHaveURL('/')
  await expect(page.locator('text=Dashboard')).toBeVisible()
})

test('protected routes redirect to login', async ({ page }) => {
  await page.goto('/contacts')
  // Real auth check from backend
  await expect(page).toHaveURL('/login')
})
```

### e2e/contacts.spec.ts
```typescript
test('contacts list loads from real API', async ({ page }) => {
  // Assumes authenticated state
  await page.goto('/contacts')
  
  // Wait for real API response
  await page.waitForResponse(res => 
    res.url().includes('/v1/contacts') && res.status() === 200
  )
  
  // Verify data rendered
  await expect(page.locator('[data-testid="contact-card"]').first()).toBeVisible()
})

test('contact detail page loads', async ({ page }) => {
  await page.goto('/contacts')
  await page.click('[data-testid="contact-card"]').first()
  
  await page.waitForResponse(res => 
    res.url().includes('/v1/contacts/') && res.status() === 200
  )
  
  await expect(page.locator('h1')).toContainText(/Contact/)
})
```

### e2e/alerts.spec.ts
```typescript
test('alerts page loads with real data', async ({ page }) => {
  await page.goto('/alerts')
  
  await page.waitForResponse(res => 
    res.url().includes('/v1/alerts') && res.status() === 200
  )
  
  await expect(page.locator('[data-testid="alert-item"]')).toHaveCount.greaterThan(0)
})

test('approve alert action', async ({ page }) => {
  await page.goto('/alerts')
  await page.click('[data-testid="alert-approve-btn"]').first()
  
  // Wait for real API mutation
  await page.waitForResponse(res => 
    res.url().includes('/v1/alerts') && 
    res.request().method() === 'PATCH' &&
    res.status() === 200
  )
  
  await expect(page.locator('text=Alert approved')).toBeVisible()
})
```

### e2e/settings.spec.ts
```typescript
test('update settings with real API', async ({ page }) => {
  await page.goto('/settings')
  
  await page.selectOption('[name="theme"]', 'dark')
  await page.click('button:has-text("Save")')
  
  await page.waitForResponse(res => 
    res.url().includes('/v1/settings') && 
    res.request().method() === 'PATCH' &&
    res.status() === 200
  )
  
  await expect(page.locator('text=Settings saved')).toBeVisible()
})
```

### e2e/voice-notes.spec.ts
```typescript
test('voice note upload flow', async ({ page }) => {
  await page.goto('/voice-notes')
  
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles('test/fixtures/sample.m4a')
  
  await page.click('button:has-text("Upload")')
  
  // Wait for real upload API
  await page.waitForResponse(res => 
    res.url().includes('/v1/voice-notes') && 
    res.request().method() === 'POST' &&
    res.status() === 201
  )
  
  await expect(page.locator('text=Upload successful')).toBeVisible()
})
```

**Key Principles**:
- ✅ All tests hit REAL backend at `NEXT_PUBLIC_BACKEND_BASE`
- ✅ Wait for actual API responses with `page.waitForResponse()`
- ✅ Verify real data rendered after API calls
- ✅ Test full user flows end-to-end
- ❌ NO network interception or mocking
- ❌ NO stubbed responses

---

## NPM Scripts (add to `web/package.json`)

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",

    "test": "npm run test:unit && npm run test:e2e",
    "test:unit": "vitest run",
    "test:watch": "vitest",

    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "playwright:install": "playwright install --with-deps"
  }
}
```

---

## CI (GitHub Actions) – Outline

- Job matrix for Node 18/20.
- Cache `~/.cache/ms-playwright` and npm cache.
- Steps:
  - `npm ci`
  - `npm run build` (optional for E2E using webServer)
  - `npm run test:unit`
  - `npx playwright install --with-deps`
  - `npm run test:e2e`

---

## Test Data & Environment Management

### Test Accounts
- Create dedicated test users in Supabase for E2E tests
- Store credentials in `.env.test.local` (gitignored)
- Use namespace prefixes (e.g., `test_user_playwright_`) to avoid conflicts

### Backend Environment
- **Local Development**: Point to `http://localhost:3000` (backend-vercel)
- **Staging**: Point to staging backend URL with test database
- **Production**: Run read-only tests only, never destructive operations

### Test Data Cleanup
- Use Playwright's `afterEach` to clean up created data
- Create a test helper: `test/helpers/cleanup.mjs`
- Delete test contacts/alerts/notes after each test run

---

## Quality Gates

- **Component Tests**: 50% coverage minimum (UI components only)
- **E2E Tests**: Cover all 7 primary routes with real API integration
- **Flake Budget**: <2% retries on CI
- **Performance**: All E2E tests complete within 5 minutes total

---

## Rollout Steps

1. ✅ **Create `web/.env.local`** with backend and Supabase config
2. **Install dependencies**:
   ```bash
   cd web
   npm i -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event @vitest/coverage-v8
   npm i -D @playwright/test
   npx playwright install --with-deps
   ```
3. **Add config files**:
   - `vitest.config.mjs`
   - `playwright.config.mjs`
   - `test/setupTests.mjs`
4. **Add test helpers**:
   - `test/helpers/auth.mjs` (Playwright login helper)
   - `test/helpers/api.mjs` (API utilities)
   - `test/helpers/cleanup.mjs` (Test data cleanup)
5. **Implement E2E specs** for all 7 routes
6. **Add minimal component tests** for reusable UI components
7. **Update `package.json`** with test scripts
8. **Run locally**: `npm run test:e2e` and verify against real backend
9. **Wire GitHub Actions** (optional)

---

## CI/CD Integration (Optional)

### GitHub Actions Workflow

```yaml
name: Frontend Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20]
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
          cache-dependency-path: web/package-lock.json
      
      - name: Install dependencies
        working-directory: web
        run: npm ci
      
      - name: Run component tests
        working-directory: web
        run: npm run test:unit
      
      - name: Install Playwright
        working-directory: web
        run: npx playwright install --with-deps
      
      - name: Run E2E tests
        working-directory: web
        run: npm run test:e2e
        env:
          NEXT_PUBLIC_BACKEND_BASE: ${{ secrets.STAGING_BACKEND_URL }}
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
      
      - name: Upload Playwright report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: web/playwright-report/
```

---

## Testing Principles

### ✅ DO
- Test against REAL backend APIs
- Wait for actual API responses
- Verify real data in the UI
- Use meaningful selectors (`data-testid`, ARIA roles)
- Clean up test data after runs
- Test happy paths and critical error cases
- Use Playwright for all integration/E2E tests
- Keep component tests minimal (UI only)

### ❌ DON'T
- Mock API calls or responses
- Use snapshot testing excessively
- Test implementation details
- Ignore flaky tests
- Run destructive tests against production
- Over-test pure logic (that's for backend)
- Skip error state testing

---

## Maintenance & Best Practices

- **Review tests quarterly** - Remove obsolete, update for new features
- **Monitor flake rate** - Fix consistently flaky tests immediately
- **Update selectors** - Keep `data-testid` attributes in sync with UI changes
- **Document test accounts** - Maintain list of test credentials
- **Parallel execution** - Playwright supports parallel runs across browsers
- **Visual regression** (future) - Consider Playwright screenshot comparisons for critical UI

---

## Next Steps

Ready to implement? Here's the order:

1. **[NOW]** Create `web/.env.local` with real backend URL + Supabase keys
2. **[15 min]** Install dependencies and add config files
3. **[30 min]** Create Playwright auth helper and first test (login flow)
4. **[2-3 hrs]** Implement E2E tests for all 7 routes
5. **[30 min]** Add minimal component tests for UI components
6. **[15 min]** Update package.json scripts
7. **[Test]** Run `npm run test:e2e` locally and verify
8. **[Optional]** Add GitHub Actions workflow

---

**Status**: Plan Complete - Ready for Implementation  
**Testing Strategy**: Real API Integration (NO MOCKING)  
**Primary Tool**: Playwright E2E  
**Secondary Tool**: Vitest for UI components only
