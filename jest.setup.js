// Disable Expo's Winter runtime for tests
process.env.EX_DEV = 'false';
process.env.NODE_ENV = 'test';
process.env.EXPO_NO_NATIVE_MODULES = 'true';
process.env.SKIP_ENV_VALIDATION = 'true';

// Load environment variables from .env file
require('dotenv').config();

// Mock fetch globally
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  })
);

// Setup test environment
if (typeof window === 'undefined') {
  global.window = {};
}

// Mock Expo's __ExpoImportMetaRegistry to prevent runtime errors
Object.defineProperty(global, '__ExpoImportMetaRegistry', {
  value: {
    get: () => undefined,
  },
  writable: true,
});

// Suppress console warnings in tests
const originalWarn = console.warn;
const originalError = console.error;

beforeAll(() => {
  console.warn = jest.fn((...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Animated') ||
        args[0].includes('NativeEventEmitter') ||
        args[0].includes('ViewPropTypes') ||
        args[0].includes('Non-serializable values') ||
        args[0].includes('componentWillReceiveProps'))
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  });

  console.error = jest.fn((...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Animated') ||
        args[0].includes('NativeEventEmitter') ||
        args[0].includes('ViewPropTypes') ||
        args[0].includes('Non-serializable values'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  });
});

afterAll(() => {
  console.warn = originalWarn;
  console.error = originalError;
});
