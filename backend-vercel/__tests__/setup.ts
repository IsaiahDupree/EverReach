/**
 * Test Setup
 * Runs before all tests
 */

// Load environment variables from .env file
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env file from backend-vercel directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Set test environment variables
// Use Object.defineProperty to avoid TypeScript readonly error
Object.defineProperty(process.env, 'NODE_ENV', { value: 'test', writable: true });
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'sk-test-key';
process.env.SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET || 'test-secret';
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-key';
process.env.CRON_SECRET = 'test-cron-secret';

// Mock console methods to reduce noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  // Keep error for debugging
};

// Extend Jest matchers
expect.extend({
  toBeValidUUID(received: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);
    
    return {
      pass,
      message: () => pass
        ? `expected ${received} not to be a valid UUID`
        : `expected ${received} to be a valid UUID`,
    };
  },

  toBeValidVector(received: number[]) {
    const pass = Array.isArray(received) && 
                 received.length === 1536 && 
                 received.every(n => typeof n === 'number' && !isNaN(n));
    
    return {
      pass,
      message: () => pass
        ? `expected ${received} not to be a valid 1536-dim vector`
        : `expected ${received} to be a valid 1536-dim vector`,
    };
  },
});

// Global test cleanup
afterAll(() => {
  // Cleanup any open handles
});
