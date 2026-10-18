# How to Run Frontend Playwright Tests

## Prerequisites
1. Expo web must be fully started and serving
2. Check your Expo terminal - it should show "Web Bundled" and a URL
3. Open that URL in a browser first to confirm it loads

## Steps
1. **Start Expo web** (if not already running):
```bash
npx expo start --web
```
Wait for "Web Bundled" message.

2. **Verify it works** - open `http://localhost:8081` (or your port) in a browser and confirm the app loads.

3. **Run Playwright tests**:
```bash
# Default (port 8081)
npx playwright test -c test/frontend/playwright.config.ts

# Custom port
WEB_BASE_URL=http://localhost:19006 npx playwright test -c test/frontend/playwright.config.ts
```

## Troubleshooting
- **ERR_CONNECTION_REFUSED**: Expo web isn't running or hasn't finished bundling. Wait for the bundle to complete.
- **Timeout**: The page takes too long to load. Check if Expo web is accessible in your browser first.
- **Test failures**: If the page loads but tests fail, check that the expected text/elements are present by visiting the pages manually.
