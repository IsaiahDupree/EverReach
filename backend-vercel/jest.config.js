module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/?(*.)+(spec|test).ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    'app/**/*.ts',
    'lib/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/__tests__/**',
  ],
  setupFiles: ['<rootDir>/__tests__/setup-env.ts'], // Load env vars BEFORE test files
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'], // Setup AFTER test files loaded
  reporters: [
    'default',
    '<rootDir>/__tests__/reporters/markdown-reporter.js'
  ],
  testTimeout: 30000, // 30 seconds for API tests with OpenAI
};
