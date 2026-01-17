// Jest setup file for React Native testing

// Mock global variables
global.__DEV__ = true;

// Mock console methods to reduce noise in test output
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  // Keep error for debugging test failures
  error: console.error,
};

// Mock fetch
global.fetch = jest.fn();
