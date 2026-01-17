import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'integration',
    include: ['__tests__/integration/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['__tests__/setup/integration-setup.ts'],
    testTimeout: 30000, // 30 seconds for integration tests
    hookTimeout: 60000, // 60 seconds for setup/teardown
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['lib/**/*.ts', 'app/api/**/*.ts'],
      exclude: [
        '__tests__/**',
        'node_modules/**',
        'dist/**',
        '**/*.d.ts',
        '**/*.config.ts',
      ],
    },
    pool: 'forks', // Run tests in separate processes for isolation
    poolOptions: {
      forks: {
        singleFork: false, // Allow parallel execution
      },
    },
  },
});
