/**
 * @jest-environment jsdom
 */
import { createClient } from '@supabase/supabase-js';

const mockCreateClient = jest.fn(() => ({
  from: jest.fn(),
  auth: {
    signInWithPassword: jest.fn(),
    signOut: jest.fn(),
    signUp: jest.fn(),
    getSession: jest.fn(),
    onAuthStateChange: jest.fn(),
  },
}));

// Mock the Supabase createClient function
jest.mock('@supabase/supabase-js', () => ({
  createClient: mockCreateClient,
}));

describe('Supabase Browser Client', () => {
  const originalEnv = process.env;

  beforeAll(() => {
    // Set up environment variables before any imports
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should export a Supabase client instance', () => {
    const { supabase } = require('@/lib/supabase/client');
    expect(supabase).toBeDefined();
  });

  it('should initialize with environment variables', () => {
    // The client is initialized on module import
    // Verify the createClient was called with correct parameters
    expect(mockCreateClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'test-anon-key',
      expect.objectContaining({
        auth: expect.objectContaining({
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        }),
      })
    );
  });

  it('should throw error if SUPABASE_URL is missing', () => {
    const savedUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    jest.resetModules();

    expect(() => {
      require('@/lib/supabase/client');
    }).toThrow('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL');

    process.env.NEXT_PUBLIC_SUPABASE_URL = savedUrl;
  });

  it('should throw error if SUPABASE_ANON_KEY is missing', () => {
    const savedKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    jest.resetModules();

    expect(() => {
      require('@/lib/supabase/client');
    }).toThrow('Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY');

    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = savedKey;
  });

  it('should have TypeScript types available', () => {
    const { supabase } = require('@/lib/supabase/client');

    // Verify the client has expected methods (type checking)
    expect(typeof supabase.from).toBe('function');
    expect(typeof supabase.auth.signInWithPassword).toBe('function');
    expect(typeof supabase.auth.signOut).toBe('function');
  });
});
