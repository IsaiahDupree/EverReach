import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '.env') });

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:8081',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'meta-pixel',
      testMatch: /meta-pixel\.spec\.ts/,
    },
  ],
  webServer: {
    command: 'npx expo start --web --port 8081',
    port: 8081,
    timeout: 120_000,
    reuseExistingServer: true,
  },
});
