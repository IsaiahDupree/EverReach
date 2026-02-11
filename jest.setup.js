// Jest setup file for React Native testing

// Mock global variables
global.__DEV__ = true;

// Polyfill window.dispatchEvent for node test environment
// (react-test-renderer calls this but node env doesn't have it)
if (typeof window !== 'undefined' && !window.dispatchEvent) {
  window.dispatchEvent = function () { return true; };
}
if (typeof window !== 'undefined' && !window.addEventListener) {
  window.addEventListener = function () {};
}
if (typeof window !== 'undefined' && !window.removeEventListener) {
  window.removeEventListener = function () {};
}

// Set test environment variables
process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
// Valid JWT format for testing (not a real key, just valid format)
process.env.EXPO_PUBLIC_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc3QiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY0MzI1NjAwMCwiZXhwIjoxOTU4ODMyMDAwfQ.test-signature-for-testing-only-not-real';
process.env.EXPO_PUBLIC_API_URL = 'http://localhost:3000';
process.env.EXPO_PUBLIC_BACKEND_URL = 'http://localhost:3000';

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

// Mock Alert for node test environment (react-native Alert is not available)
jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: jest.fn(),
}), { virtual: true });
