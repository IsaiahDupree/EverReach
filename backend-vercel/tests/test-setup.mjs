/**
 * Test Setup
 * Runs before all test files
 */

import { beforeAll } from 'vitest';

beforeAll(() => {
  // Verify required environment variables
  const requiredEnvVars = [
    'TEST_BACKEND_URL',
  ];

  const missing = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.warn(`⚠️  Missing environment variables: ${missing.join(', ')}`);
    console.warn('Using default values for testing');
  }

  // Set defaults if not provided
  if (!process.env.TEST_BACKEND_URL) {
    process.env.TEST_BACKEND_URL = 'https://ever-reach-be.vercel.app';
  }

  console.log('🧪 Test environment configured');
  console.log(`📍 Backend URL: ${process.env.TEST_BACKEND_URL}`);
});
