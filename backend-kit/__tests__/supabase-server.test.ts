/**
 * Test for Supabase Server Client
 *
 * This test verifies that the Supabase server client:
 * 1. Exports a function to create a server client
 * 2. Properly initializes with environment variables
 * 3. Returns a valid Supabase client instance
 */

describe('Supabase Server Client', () => {
  // Store original env vars
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset modules to get fresh imports
    jest.resetModules();

    // Set up test environment variables
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
    };
  });

  afterEach(() => {
    // Restore original env
    process.env = originalEnv;
  });

  it('should export createServerClient function', () => {
    // This will fail initially until we implement the module
    const supabaseServerModule = require('../lib/supabase/server');
    expect(supabaseServerModule).toBeDefined();
    expect(typeof supabaseServerModule.createServerClient).toBe('function');
  });

  it('should create a Supabase client instance', () => {
    const { createServerClient } = require('../lib/supabase/server');
    const client = createServerClient();

    expect(client).toBeDefined();
    expect(client.auth).toBeDefined();
    expect(client.from).toBeDefined();
    expect(typeof client.from).toBe('function');
  });

  it('should throw error if SUPABASE_URL is missing', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    // Re-require the module to pick up env changes
    jest.resetModules();

    expect(() => {
      require('../lib/supabase/server');
    }).toThrow();
  });

  it('should throw error if SUPABASE_ANON_KEY is missing', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Re-require the module to pick up env changes
    jest.resetModules();

    expect(() => {
      require('../lib/supabase/server');
    }).toThrow();
  });

  it('should allow querying with from() method', () => {
    const { createServerClient } = require('../lib/supabase/server');
    const client = createServerClient();

    // Test that we can call from() to start a query
    const query = client.from('users');
    expect(query).toBeDefined();
    expect(query.select).toBeDefined();
    expect(typeof query.select).toBe('function');
  });
});
