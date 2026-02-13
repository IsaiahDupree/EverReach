/**
 * Jest config for backend integration tests.
 * Uses real fetch (no mocking) and loads .env for credentials.
 *
 * Run: npx jest --config test/backend/jest.config.js
 */
const path = require('path');

// Load .env from ios-app root
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// Default to local backend if not set
if (!process.env.BACKEND_BASE_URL) {
  process.env.BACKEND_BASE_URL = 'http://localhost:3333';
}

module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/__tests__/**/*.test.[jt]s?(x)'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', {
      presets: ['babel-preset-expo'],
    }],
  },
  transformIgnorePatterns: ['node_modules/'],
  rootDir: __dirname,
  // No setupFilesAfterEnv — we need real native fetch, not the jest.fn() mock
};
