import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: './test-setup.mjs',
    testTimeout: 30000, // 30 seconds for API calls
    hookTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'test-setup.mjs',
        '**/*.config.mjs',
      ],
    },
    sequence: {
      shuffle: false, // Run tests in order for now
    },
  },
});
