/**
 * Backend CORS Utility Tests
 * BACK-UTIL-001: CORS Utility
 *
 * Tests for the CORS configuration utility that handles
 * Cross-Origin Resource Sharing headers for API routes.
 */

import { NextResponse } from 'next/server';
import { corsHeaders, withCors, isOriginAllowed } from '@/lib/utils/cors';

describe('BACK-UTIL-001: CORS Utility', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables before each test
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('corsHeaders function', () => {
    it('should return standard CORS headers for allowed origin', () => {
      const origin = 'https://example.com';
      process.env.ALLOWED_ORIGINS = 'https://example.com,https://app.example.com';

      const headers = corsHeaders(origin);

      expect(headers['Access-Control-Allow-Origin']).toBe(origin);
      expect(headers['Access-Control-Allow-Methods']).toBe('GET, POST, PUT, DELETE, OPTIONS');
      expect(headers['Access-Control-Allow-Headers']).toContain('Content-Type');
      expect(headers['Access-Control-Allow-Headers']).toContain('Authorization');
      expect(headers['Access-Control-Max-Age']).toBe('86400');
    });

    it('should not set Access-Control-Allow-Origin for disallowed origin', () => {
      const origin = 'https://malicious.com';
      process.env.ALLOWED_ORIGINS = 'https://example.com';

      const headers = corsHeaders(origin);

      expect(headers['Access-Control-Allow-Origin']).toBeUndefined();
    });

    it('should allow wildcard origin when ALLOWED_ORIGINS is *', () => {
      const origin = 'https://any-domain.com';
      process.env.ALLOWED_ORIGINS = '*';

      const headers = corsHeaders(origin);

      expect(headers['Access-Control-Allow-Origin']).toBe('*');
    });

    it('should include credentials header when specified', () => {
      const origin = 'https://example.com';
      process.env.ALLOWED_ORIGINS = 'https://example.com';

      const headers = corsHeaders(origin, { credentials: true });

      expect(headers['Access-Control-Allow-Credentials']).toBe('true');
    });

    it('should handle undefined origin gracefully', () => {
      process.env.ALLOWED_ORIGINS = 'https://example.com';

      const headers = corsHeaders(undefined);

      expect(headers['Access-Control-Allow-Origin']).toBeUndefined();
    });

    it('should allow custom methods', () => {
      const origin = 'https://example.com';
      process.env.ALLOWED_ORIGINS = 'https://example.com';

      const headers = corsHeaders(origin, {
        methods: ['GET', 'POST', 'PATCH'],
      });

      expect(headers['Access-Control-Allow-Methods']).toBe('GET, POST, PATCH');
    });

    it('should allow custom headers', () => {
      const origin = 'https://example.com';
      process.env.ALLOWED_ORIGINS = 'https://example.com';

      const headers = corsHeaders(origin, {
        headers: ['X-Custom-Header', 'X-API-Key'],
      });

      expect(headers['Access-Control-Allow-Headers']).toBe('X-Custom-Header, X-API-Key');
    });
  });

  describe('isOriginAllowed function', () => {
    it('should return true for allowed origin', () => {
      process.env.ALLOWED_ORIGINS = 'https://example.com,https://app.example.com';

      expect(isOriginAllowed('https://example.com')).toBe(true);
      expect(isOriginAllowed('https://app.example.com')).toBe(true);
    });

    it('should return false for disallowed origin', () => {
      process.env.ALLOWED_ORIGINS = 'https://example.com';

      expect(isOriginAllowed('https://malicious.com')).toBe(false);
    });

    it('should return true for any origin when ALLOWED_ORIGINS is *', () => {
      process.env.ALLOWED_ORIGINS = '*';

      expect(isOriginAllowed('https://any-domain.com')).toBe(true);
      expect(isOriginAllowed('http://localhost:3000')).toBe(true);
    });

    it('should return false for undefined origin', () => {
      process.env.ALLOWED_ORIGINS = 'https://example.com';

      expect(isOriginAllowed(undefined)).toBe(false);
    });

    it('should handle localhost with different ports', () => {
      process.env.ALLOWED_ORIGINS = 'http://localhost:3000,http://localhost:8080';

      expect(isOriginAllowed('http://localhost:3000')).toBe(true);
      expect(isOriginAllowed('http://localhost:8080')).toBe(true);
      expect(isOriginAllowed('http://localhost:9000')).toBe(false);
    });

    it('should trim whitespace from origins in env', () => {
      process.env.ALLOWED_ORIGINS = 'https://example.com , https://app.example.com ';

      expect(isOriginAllowed('https://example.com')).toBe(true);
      expect(isOriginAllowed('https://app.example.com')).toBe(true);
    });

    it('should default to empty list when ALLOWED_ORIGINS not set', () => {
      delete process.env.ALLOWED_ORIGINS;

      expect(isOriginAllowed('https://example.com')).toBe(false);
    });
  });

  describe('withCors middleware', () => {
    it('should handle OPTIONS preflight request', async () => {
      process.env.ALLOWED_ORIGINS = 'https://example.com';

      const handler = withCors(async () => {
        return NextResponse.json({ message: 'success' });
      });

      const mockRequest = {
        method: 'OPTIONS',
        headers: {
          get: (name: string) => {
            if (name === 'origin') return 'https://example.com';
            return null;
          },
        },
      } as any;

      const response = await handler(mockRequest);

      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://example.com');
    });

    it('should add CORS headers to regular requests', async () => {
      process.env.ALLOWED_ORIGINS = 'https://example.com';

      const handler = withCors(async () => {
        return NextResponse.json({ data: 'test' });
      });

      const mockRequest = {
        method: 'GET',
        headers: {
          get: (name: string) => {
            if (name === 'origin') return 'https://example.com';
            return null;
          },
        },
      } as any;

      const response = await handler(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toBe('test');
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://example.com');
    });

    it('should not add CORS headers for disallowed origin', async () => {
      process.env.ALLOWED_ORIGINS = 'https://example.com';

      const handler = withCors(async () => {
        return NextResponse.json({ data: 'test' });
      });

      const mockRequest = {
        method: 'GET',
        headers: {
          get: (name: string) => {
            if (name === 'origin') return 'https://malicious.com';
            return null;
          },
        },
      } as any;

      const response = await handler(mockRequest);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
    });

    it('should support custom CORS options', async () => {
      process.env.ALLOWED_ORIGINS = 'https://example.com';

      const handler = withCors(
        async () => {
          return NextResponse.json({ data: 'test' });
        },
        {
          credentials: true,
          methods: ['GET', 'POST'],
        }
      );

      const mockRequest = {
        method: 'GET',
        headers: {
          get: (name: string) => {
            if (name === 'origin') return 'https://example.com';
            return null;
          },
        },
      } as any;

      const response = await handler(mockRequest);

      expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST');
    });

    it('should handle requests without origin header', async () => {
      process.env.ALLOWED_ORIGINS = 'https://example.com';

      const handler = withCors(async () => {
        return NextResponse.json({ data: 'test' });
      });

      const mockRequest = {
        method: 'GET',
        headers: {
          get: () => null,
        },
      } as any;

      const response = await handler(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toBe('test');
    });
  });

  describe('Acceptance Criteria', () => {
    it('Configurable origins - supports environment variable configuration', () => {
      // Test multiple origins
      process.env.ALLOWED_ORIGINS = 'https://example.com,https://app.example.com,http://localhost:3000';

      expect(isOriginAllowed('https://example.com')).toBe(true);
      expect(isOriginAllowed('https://app.example.com')).toBe(true);
      expect(isOriginAllowed('http://localhost:3000')).toBe(true);
      expect(isOriginAllowed('https://unauthorized.com')).toBe(false);

      // Test wildcard
      process.env.ALLOWED_ORIGINS = '*';
      expect(isOriginAllowed('https://any-domain.com')).toBe(true);
    });

    it('Handles preflight - properly responds to OPTIONS requests', async () => {
      process.env.ALLOWED_ORIGINS = 'https://example.com';

      const handler = withCors(async () => {
        return NextResponse.json({ message: 'success' });
      });

      const preflightRequest = {
        method: 'OPTIONS',
        headers: {
          get: (name: string) => {
            if (name === 'origin') return 'https://example.com';
            return null;
          },
        },
      } as any;

      const response = await handler(preflightRequest);

      // Should return 204 No Content for preflight
      expect(response.status).toBe(204);

      // Should include all necessary preflight headers
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://example.com');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBeDefined();
      expect(response.headers.get('Access-Control-Allow-Headers')).toBeDefined();
      expect(response.headers.get('Access-Control-Max-Age')).toBeDefined();
    });
  });

  describe('Production Scenarios', () => {
    it('should support typical production origin setup', () => {
      process.env.ALLOWED_ORIGINS = 'https://myapp.com,https://www.myapp.com,https://api.myapp.com';

      expect(isOriginAllowed('https://myapp.com')).toBe(true);
      expect(isOriginAllowed('https://www.myapp.com')).toBe(true);
      expect(isOriginAllowed('https://api.myapp.com')).toBe(true);
      expect(isOriginAllowed('https://evil.com')).toBe(false);
    });

    it('should support mixed development and production origins', () => {
      process.env.ALLOWED_ORIGINS =
        'https://production.com,http://localhost:3000,http://localhost:19006';

      expect(isOriginAllowed('https://production.com')).toBe(true);
      expect(isOriginAllowed('http://localhost:3000')).toBe(true);
      expect(isOriginAllowed('http://localhost:19006')).toBe(true);
      expect(isOriginAllowed('https://staging.com')).toBe(false);
    });
  });
});
