/**
 * Unified Jest Configuration
 * Runs all tests with comprehensive HTML reporting
 */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  
  // Match all test files
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/tests/**/*.test.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  
  // Path mapping
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  
  // Coverage collection
  collectCoverageFrom: [
    'app/**/*.ts',
    'lib/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/__tests__/**',
    '!**/tests/**',
  ],
  
  coverageDirectory: '<rootDir>/tests/reports/coverage',
  
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 80,
      lines: 85,
      statements: 85,
    },
  },
  
  // Test setup
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
  testTimeout: 30000, // 30 seconds for API tests with OpenAI
  
  // Reporters for comprehensive output
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/tests/reports',
        outputName: 'test-report.xml',
        suiteName: 'EverReach Backend Tests',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true,
      },
    ],
  ],
  
  // Test categories
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/.next/',
  ],
  
  // Verbose output
  verbose: true,
  
  // Detect open handles
  detectOpenHandles: true,
  forceExit: true,
  
  // Max workers for parallel execution
  maxWorkers: '50%',
};
