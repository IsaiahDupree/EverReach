import { validateSession, refreshSession, clearSession, isSessionExpiringSoon } from '@/lib/auth/session';
import { supabase } from '@/lib/supabase';

// Mock supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      refreshSession: jest.fn(),
      signOut: jest.fn(),
    },
  },
}));

const mockGetSession = supabase.auth.getSession as jest.Mock;
const mockRefreshSession = supabase.auth.refreshSession as jest.Mock;
const mockSignOut = supabase.auth.signOut as jest.Mock;

function makeSession(overrides: Record<string, any> = {}) {
  return {
    access_token: 'test-token',
    refresh_token: 'test-refresh',
    expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    user: { id: 'user-123', email: 'test@example.com' },
    ...overrides,
  };
}

describe('auth/session', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateSession', () => {
    test('returns session when valid', async () => {
      const session = makeSession();
      mockGetSession.mockResolvedValue({ data: { session }, error: null });

      const result = await validateSession();
      expect(result).toEqual(session);
      expect(mockGetSession).toHaveBeenCalledTimes(1);
    });

    test('returns null when no session exists', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

      const result = await validateSession();
      expect(result).toBeNull();
    });

    test('returns null on error', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: new Error('Network error'),
      });

      const result = await validateSession();
      expect(result).toBeNull();
    });

    test('returns null when session is expired', async () => {
      const expiredSession = makeSession({
        expires_at: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
      });
      mockGetSession.mockResolvedValue({ data: { session: expiredSession }, error: null });

      const result = await validateSession();
      expect(result).toBeNull();
    });

    test('returns null when getSession throws', async () => {
      mockGetSession.mockRejectedValue(new Error('crash'));

      const result = await validateSession();
      expect(result).toBeNull();
    });
  });

  describe('refreshSession', () => {
    test('returns refreshed session', async () => {
      const session = makeSession();
      mockRefreshSession.mockResolvedValue({ data: { session }, error: null });

      const result = await refreshSession();
      expect(result).toEqual(session);
    });

    test('returns null on error', async () => {
      mockRefreshSession.mockResolvedValue({
        data: { session: null },
        error: new Error('Refresh failed'),
      });

      const result = await refreshSession();
      expect(result).toBeNull();
    });

    test('returns null when refreshSession throws', async () => {
      mockRefreshSession.mockRejectedValue(new Error('crash'));

      const result = await refreshSession();
      expect(result).toBeNull();
    });
  });

  describe('clearSession', () => {
    test('calls signOut', async () => {
      mockSignOut.mockResolvedValue({ error: null });

      await clearSession();
      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });

    test('does not throw on signOut error', async () => {
      mockSignOut.mockRejectedValue(new Error('signOut failed'));

      await expect(clearSession()).resolves.toBeUndefined();
    });
  });

  describe('isSessionExpiringSoon', () => {
    test('returns false for null session', () => {
      expect(isSessionExpiringSoon(null)).toBe(false);
    });

    test('returns false for session without expires_at', () => {
      expect(isSessionExpiringSoon({ expires_at: undefined } as any)).toBe(false);
    });

    test('returns false when session has more than 5 minutes left', () => {
      const session = makeSession({
        expires_at: Math.floor(Date.now() / 1000) + 600, // 10 min
      });
      expect(isSessionExpiringSoon(session as any)).toBe(false);
    });

    test('returns true when session expires in less than 5 minutes', () => {
      const session = makeSession({
        expires_at: Math.floor(Date.now() / 1000) + 120, // 2 min
      });
      expect(isSessionExpiringSoon(session as any)).toBe(true);
    });

    test('returns true when session is already expired', () => {
      const session = makeSession({
        expires_at: Math.floor(Date.now() / 1000) - 60, // 1 min ago
      });
      expect(isSessionExpiringSoon(session as any)).toBe(true);
    });
  });
});
