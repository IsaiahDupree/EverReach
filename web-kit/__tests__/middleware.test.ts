/**
 * Tests for Next.js Authentication Middleware
 *
 * The middleware is responsible for:
 * - Protecting routes that require authentication
 * - Refreshing user sessions automatically
 * - Redirecting unauthenticated users to login
 * - Allowing public routes without authentication
 *
 * Acceptance Criteria:
 * - Redirects unauthenticated users trying to access protected routes
 * - Refreshes session cookies automatically
 * - Allows access to public routes without auth
 * - Maintains session state across requests
 */

// Mock environment variables before any imports
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

// Mock Next.js server
const mockNextResponse = {
  next: jest.fn((options?: any) => {
    return {
      cookies: {
        set: jest.fn(),
        get: jest.fn(),
        delete: jest.fn(),
      },
    };
  }),
  redirect: jest.fn((url: string | URL) => {
    return {
      url: url.toString(),
      redirected: true,
      cookies: {
        set: jest.fn(),
      },
    };
  }),
};

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: mockNextResponse,
}));

// Mock Supabase SSR
const mockSupabaseAuth = {
  getUser: jest.fn(),
};

const mockSupabaseClient = {
  auth: mockSupabaseAuth,
};

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => mockSupabaseClient),
}));

// Import the middleware after mocks are set up
const middlewareModule = require('@/middleware');

describe('Authentication Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockRequest = (pathname: string) => ({
    url: `http://localhost:3000${pathname}`,
    nextUrl: {
      pathname,
      origin: 'http://localhost:3000',
      searchParams: new URLSearchParams(),
    },
    cookies: {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
    },
    headers: new Headers(),
  });

  describe('Protected Routes', () => {
    it('should redirect unauthenticated users from /dashboard to /login', async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      });

      const mockRequest = createMockRequest('/dashboard');
      await middlewareModule.middleware(mockRequest);

      expect(mockNextResponse.redirect).toHaveBeenCalled();
      const redirectCall = mockNextResponse.redirect.mock.calls[0];
      expect(redirectCall[0].toString()).toContain('/login');
    });

    it('should allow authenticated users to access /dashboard', async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'test-user-id',
            email: 'test@example.com'
          }
        },
        error: null
      });

      const mockRequest = createMockRequest('/dashboard');
      await middlewareModule.middleware(mockRequest);

      expect(mockNextResponse.next).toHaveBeenCalled();
      expect(mockNextResponse.redirect).not.toHaveBeenCalled();
    });

    it('should protect /settings routes', async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      });

      const mockRequest = createMockRequest('/settings');
      await middlewareModule.middleware(mockRequest);

      expect(mockNextResponse.redirect).toHaveBeenCalled();
    });

    it('should protect /items routes', async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      });

      const mockRequest = createMockRequest('/items');
      await middlewareModule.middleware(mockRequest);

      expect(mockNextResponse.redirect).toHaveBeenCalled();
    });
  });

  describe('Public Routes', () => {
    it('should allow access to / without authentication', async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      });

      const mockRequest = createMockRequest('/');
      await middlewareModule.middleware(mockRequest);

      expect(mockNextResponse.next).toHaveBeenCalled();
      expect(mockNextResponse.redirect).not.toHaveBeenCalled();
    });

    it('should allow access to /login without authentication', async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      });

      const mockRequest = createMockRequest('/login');
      await middlewareModule.middleware(mockRequest);

      expect(mockNextResponse.next).toHaveBeenCalled();
      expect(mockNextResponse.redirect).not.toHaveBeenCalled();
    });

    it('should allow access to /signup without authentication', async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      });

      const mockRequest = createMockRequest('/signup');
      await middlewareModule.middleware(mockRequest);

      expect(mockNextResponse.next).toHaveBeenCalled();
      expect(mockNextResponse.redirect).not.toHaveBeenCalled();
    });

    it('should allow access to /pricing without authentication', async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      });

      const mockRequest = createMockRequest('/pricing');
      await middlewareModule.middleware(mockRequest);

      expect(mockNextResponse.next).toHaveBeenCalled();
      expect(mockNextResponse.redirect).not.toHaveBeenCalled();
    });
  });

  describe('Session Management', () => {
    it('should refresh session for authenticated requests', async () => {
      const mockSetCookie = jest.fn();

      mockSupabaseAuth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'test-user-id',
            email: 'test@example.com'
          }
        },
        error: null
      });

      const mockRequest = createMockRequest('/dashboard');
      mockRequest.cookies.set = mockSetCookie;

      await middlewareModule.middleware(mockRequest);

      // Session refresh is handled by createServerClient cookie callbacks
      expect(mockSupabaseAuth.getUser).toHaveBeenCalled();
    });

    it('should handle session errors gracefully', async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid session' }
      });

      const mockRequest = createMockRequest('/dashboard');

      // Should not throw error, just redirect
      await expect(middlewareModule.middleware(mockRequest)).resolves.toBeDefined();
      expect(mockNextResponse.redirect).toHaveBeenCalled();
    });
  });

  describe('Middleware Configuration', () => {
    it('should export a config object with matcher', () => {
      expect(middlewareModule.config).toBeDefined();
      expect(middlewareModule.config.matcher).toBeDefined();
      expect(Array.isArray(middlewareModule.config.matcher)).toBe(true);
    });

    it('should exclude static files from matcher', () => {
      const { config } = middlewareModule;

      // Config should exclude _next/static, _next/image, etc.
      expect(config.matcher).toBeDefined();
      expect(config.matcher[0]).toBeTruthy();

      // The matcher uses negative lookahead to exclude files
      const pattern = config.matcher[0];
      expect(pattern).toContain('_next/static');
      expect(pattern).toContain('_next/image');
    });
  });

  describe('Redirect Behavior', () => {
    it('should preserve the original URL as redirect parameter', async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      });

      const mockRequest = createMockRequest('/dashboard/settings');
      await middlewareModule.middleware(mockRequest);

      expect(mockNextResponse.redirect).toHaveBeenCalled();
      const redirectCall = mockNextResponse.redirect.mock.calls[0];
      const redirectUrl = redirectCall[0].toString();

      // Should redirect to login with the original path as a parameter
      expect(redirectUrl).toContain('/login');
      expect(redirectUrl).toContain('redirectTo');
      // URL is encoded, so check for encoded version
      expect(redirectUrl).toContain('%2Fdashboard%2Fsettings');
    });

    it('should handle nested protected routes', async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      });

      const mockRequest = createMockRequest('/settings/billing');
      await middlewareModule.middleware(mockRequest);

      expect(mockNextResponse.redirect).toHaveBeenCalled();
    });
  });
});
