require('dotenv').config({ path: './backend-vercel/.env' });
require('dotenv').config({ path: './backend-vercel/.env.local', override: true });

// Tests run against the deployed backend, not localhost
process.env.NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL_TEST || 'https://ever-reach-be.vercel.app';

/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        '@babel/preset-typescript',
      ],
    }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@supabase|jose)/)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/backend-vercel/$1',
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    // Setup/helper files that aren't actual tests
    '__tests__/setup\\.ts$',
    '__tests__/setup-env\\.ts$',
    '__tests__/setup-v1-tests\\.ts$',
    '__tests__/setup/integration-setup\\.ts$',
    '__tests__/test-config\\.ts$',
    '__tests__/helpers/',
    '__tests__/reporters/',
    // Files that call process.exit and kill the runner
    'usage-limits-live',
    'usage-limits\\.test\\.mjs$',
    'run-paywall-live-tests',
    'debug-auth\\.mjs$',
    // Vitest-only tests (use vi.fn/vi.mock — not compatible with Jest)
    'usage-limits-routes\\.test\\.ts$',
    'usage-enforcement\\.integration\\.test\\.ts$',
  ],
};
