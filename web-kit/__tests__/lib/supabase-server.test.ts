/**
 * Tests for Supabase Server Client
 *
 * The server client is used in:
 * - Server Components (app router)
 * - API routes
 * - Server Actions
 *
 * Key differences from browser client:
 * - Uses cookies for session management (not localStorage)
 * - Works with Next.js request/response objects
 * - Requires cookie handling for SSR
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Mock Next.js cookies
jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

// Mock Supabase SSR client
jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({
    from: jest.fn(),
    auth: {
      getUser: jest.fn(),
      getSession: jest.fn(),
      signOut: jest.fn(),
    },
  })),
}));

describe('Supabase Server Client', () => {
  const originalEnv = process.env;

  beforeAll(() => {
    // Set up environment variables
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should export a createClient function', () => {
    const { createClient } = require('@/lib/supabase/server');
    expect(createClient).toBeDefined();
    expect(typeof createClient).toBe('function');
  });

  it('should create a server client with cookie handling', () => {
    const mockCookieStore = {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
    };

    (cookies as jest.Mock).mockReturnValue(mockCookieStore);

    const { createClient } = require('@/lib/supabase/server');
    const client = createClient();

    expect(client).toBeDefined();
    expect(createServerClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'test-anon-key',
      expect.objectContaining({
        cookies: expect.any(Object),
      })
    );
  });

  it('should handle cookie get operations', () => {
    const mockCookieStore = {
      get: jest.fn((name: string) => ({ name, value: 'test-value' })),
      set: jest.fn(),
      remove: jest.fn(),
    };

    (cookies as jest.Mock).mockReturnValue(mockCookieStore);
    (createServerClient as jest.Mock).mockImplementation(
      (url: string, key: string, options: any) => {
        // Simulate cookie get operation
        const cookie = options.cookies.get('test-cookie');
        return {
          from: jest.fn(),
          auth: {
            getUser: jest.fn(),
            getSession: jest.fn(),
          },
          cookie,
        };
      }
    );

    const { createClient } = require('@/lib/supabase/server');
    const client = createClient();

    // The createServerClient should have been called with cookie handlers
    expect(createServerClient).toHaveBeenCalled();
    const callArgs = (createServerClient as jest.Mock).mock.calls[0];
    const cookieHandlers = callArgs[2].cookies;

    // Test the cookie handlers
    expect(cookieHandlers.get).toBeDefined();
    const result = cookieHandlers.get('test-cookie');
    expect(mockCookieStore.get).toHaveBeenCalledWith('test-cookie');
  });

  it('should handle cookie set operations', () => {
    const mockCookieStore = {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
    };

    (cookies as jest.Mock).mockReturnValue(mockCookieStore);

    const { createClient } = require('@/lib/supabase/server');
    createClient();

    // Get the cookie handlers from the call
    const callArgs = (createServerClient as jest.Mock).mock.calls[0];
    const cookieHandlers = callArgs[2].cookies;

    // Test the set handler
    expect(cookieHandlers.set).toBeDefined();
    cookieHandlers.set('test-cookie', 'test-value', { maxAge: 3600 });
    expect(mockCookieStore.set).toHaveBeenCalledWith(
      'test-cookie',
      'test-value',
      { maxAge: 3600 }
    );
  });

  it('should handle cookie remove operations', () => {
    const mockCookieStore = {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
    };

    (cookies as jest.Mock).mockReturnValue(mockCookieStore);

    const { createClient } = require('@/lib/supabase/server');
    createClient();

    // Get the cookie handlers from the call
    const callArgs = (createServerClient as jest.Mock).mock.calls[0];
    const cookieHandlers = callArgs[2].cookies;

    // Test the remove handler
    expect(cookieHandlers.remove).toBeDefined();
    cookieHandlers.remove('test-cookie', {});
    expect(mockCookieStore.set).toHaveBeenCalledWith('test-cookie', '', {
      maxAge: 0,
    });
  });

  it('should throw error if SUPABASE_URL is missing', () => {
    const savedUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    jest.resetModules();

    expect(() => {
      require('@/lib/supabase/server');
    }).toThrow('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL');

    process.env.NEXT_PUBLIC_SUPABASE_URL = savedUrl;
    jest.resetModules();
  });

  it('should throw error if SUPABASE_ANON_KEY is missing', () => {
    const savedKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    jest.resetModules();

    expect(() => {
      require('@/lib/supabase/server');
    }).toThrow('Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY');

    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = savedKey;
    jest.resetModules();
  });

  it('should have TypeScript types available', () => {
    const mockCookieStore = {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
    };

    (cookies as jest.Mock).mockReturnValue(mockCookieStore);

    const { createClient } = require('@/lib/supabase/server');
    const client = createClient();

    // Verify the client has expected methods
    expect(typeof client.from).toBe('function');
    expect(typeof client.auth.getUser).toBe('function');
    expect(typeof client.auth.getSession).toBe('function');
  });
});
