import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.WEB_BASE_URL || 'http://localhost:8081';

export default defineConfig({
  testDir: __dirname,
  timeout: 60_000,
  retries: 0,
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    // Setup project that runs first
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts$/,
    },
    // Authenticated tests
    {
      name: 'chromium',
      testDir: __dirname + '/tests',
      use: {
        ...devices['Desktop Chrome'],
        // Use saved auth state
        storageState: 'test/frontend/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
});
