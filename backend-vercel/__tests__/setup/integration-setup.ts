/**
 * Integration Test Setup
 * 
 * Runs before all integration tests to:
 * - Verify database connection
 * - Run migrations if needed
 * - Setup test environment variables
 * - Create global test fixtures
 */

import { createClient } from '@supabase/supabase-js';
import { beforeAll, afterAll } from 'vitest';

// Verify required environment variables
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Create Supabase client
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Global test state
export const testState = {
  organizationIds: new Set<string>(),
  userIds: new Set<string>(),
  contactIds: new Set<string>(),
  apiKeyIds: new Set<string>(),
};

// Setup function that runs once before all tests
beforeAll(async () => {
  console.log('🧪 Setting up integration test environment...');

  // Verify database connection
  const { error } = await supabase.from('organizations').select('id').limit(1);
  
  if (error) {
    throw new Error(`Database connection failed: ${error.message}`);
  }

  console.log('✅ Database connection verified');
  console.log('✅ Integration test environment ready');
});

// Cleanup function that runs once after all tests
afterAll(async () => {
  console.log('🧹 Cleaning up integration test data...');

  try {
    // Clean up in reverse dependency order
    
    // Delete contacts (cascades to channels, preferences, interactions)
    if (testState.contactIds.size > 0) {
      await supabase
        .from('contacts')
        .delete()
        .in('id', Array.from(testState.contactIds));
      console.log(`  ✓ Deleted ${testState.contactIds.size} test contacts`);
    }

    // Delete API keys
    if (testState.apiKeyIds.size > 0) {
      await supabase
        .from('api_keys')
        .delete()
        .in('id', Array.from(testState.apiKeyIds));
      console.log(`  ✓ Deleted ${testState.apiKeyIds.size} test API keys`);
    }

    // Delete users
    if (testState.userIds.size > 0) {
      await supabase
        .from('users')
        .delete()
        .in('id', Array.from(testState.userIds));
      console.log(`  ✓ Deleted ${testState.userIds.size} test users`);
    }

    // Delete organizations (cascades to everything else)
    if (testState.organizationIds.size > 0) {
      await supabase
        .from('organizations')
        .delete()
        .in('id', Array.from(testState.organizationIds));
      console.log(`  ✓ Deleted ${testState.organizationIds.size} test organizations`);
    }

    console.log('✅ Integration test cleanup complete');
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
});

// Helper function to track test resources for cleanup
export function trackResource(type: 'organization' | 'user' | 'contact' | 'apiKey', id: string) {
  switch (type) {
    case 'organization':
      testState.organizationIds.add(id);
      break;
    case 'user':
      testState.userIds.add(id);
      break;
    case 'contact':
      testState.contactIds.add(id);
      break;
    case 'apiKey':
      testState.apiKeyIds.add(id);
      break;
  }
}

// Helper to wait for async conditions
export async function waitFor(
  condition: () => Promise<boolean>,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const timeout = options.timeout || 5000;
  const interval = options.interval || 100;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error(`waitFor condition not met within ${timeout}ms`);
}

// Helper to sleep
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
