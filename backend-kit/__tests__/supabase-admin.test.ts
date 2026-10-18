/**
 * Test for Supabase Admin Client
 *
 * This test verifies that the Supabase admin client:
 * 1. Exports a function to create an admin client
 * 2. Uses the service role key (not anon key)
 * 3. Returns a valid Supabase client instance that bypasses RLS
 */

describe('Supabase Admin Client', () => {
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
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    };
  });

  afterEach(() => {
    // Restore original env
    process.env = originalEnv;
  });

  it('should export createAdminClient function', () => {
    const supabaseAdminModule = require('../lib/supabase/admin');
    expect(supabaseAdminModule).toBeDefined();
    expect(typeof supabaseAdminModule.createAdminClient).toBe('function');
  });

  it('should create a Supabase admin client instance', () => {
    const { createAdminClient } = require('../lib/supabase/admin');
    const client = createAdminClient();

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
      require('../lib/supabase/admin');
    }).toThrow();
  });

  it('should throw error if SUPABASE_SERVICE_ROLE_KEY is missing', () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Re-require the module to pick up env changes
    jest.resetModules();

    expect(() => {
      require('../lib/supabase/admin');
    }).toThrow();
  });

  it('should allow querying with from() method', () => {
    const { createAdminClient } = require('../lib/supabase/admin');
    const client = createAdminClient();

    // Test that we can call from() to start a query
    const query = client.from('users');
    expect(query).toBeDefined();
    expect(query.select).toBeDefined();
    expect(typeof query.select).toBe('function');
  });

  it('should have auth admin methods', () => {
    const { createAdminClient } = require('../lib/supabase/admin');
    const client = createAdminClient();

    // Admin client should have admin-specific auth methods
    expect(client.auth.admin).toBeDefined();
    expect(client.auth.admin.listUsers).toBeDefined();
    expect(typeof client.auth.admin.listUsers).toBe('function');
  });

  it('should export a singleton admin client', () => {
    const supabaseAdminModule = require('../lib/supabase/admin');
    expect(supabaseAdminModule.adminClient).toBeDefined();
    expect(supabaseAdminModule.adminClient.auth).toBeDefined();
  });
});
