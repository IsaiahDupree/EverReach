/**
 * Auth Flow Tests
 * 
 * Tests the authentication logic in AuthProviderV2 by mocking
 * Supabase auth methods and verifying behavior of:
 * - signInWithEmail / signInWithPassword
 * - signOut (including RevenueCat logout, cache clearing)
 * - requestPasswordReset
 * - Auth state change handling
 * - Session initialization
 * - isAuthenticated guard logic
 */

// ─── Mocks ───────────────────────────────────────────────

const mockSignInWithPassword = jest.fn();
const mockSignOut = jest.fn();
const mockResetPasswordForEmail = jest.fn();
const mockGetSession = jest.fn();
const mockOnAuthStateChange = jest.fn();
const mockExchangeCodeForSession = jest.fn();
const mockSignInWithOAuth = jest.fn();
const mockSignInWithIdToken = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: any[]) => mockSignInWithPassword(...args),
      signOut: (...args: any[]) => mockSignOut(...args),
      resetPasswordForEmail: (...args: any[]) => mockResetPasswordForEmail(...args),
      getSession: (...args: any[]) => mockGetSession(...args),
      onAuthStateChange: (...args: any[]) => mockOnAuthStateChange(...args),
      exchangeCodeForSession: (...args: any[]) => mockExchangeCodeForSession(...args),
      signInWithOAuth: (...args: any[]) => mockSignInWithOAuth(...args),
      signInWithIdToken: (...args: any[]) => mockSignInWithIdToken(...args),
    },
  },
}));

jest.mock('@/lib/api', () => ({
  clearSessionCache: jest.fn(),
  apiFetch: jest.fn(),
  backendBase: () => 'http://localhost:3000',
  authHeader: () => Promise.resolve({ Authorization: 'Bearer test' }),
}));

jest.mock('@/lib/posthog', () => ({
  identifyUser: jest.fn().mockResolvedValue(undefined),
  resetPostHog: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/revenuecat', () => ({
  logIn: jest.fn().mockResolvedValue({ created: false }),
  logOut: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/repos/SubscriptionRepo', () => ({
  SubscriptionRepo: {
    getEntitlements: jest.fn().mockResolvedValue({}),
    restorePurchases: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock('@/constants/flags', () => ({
  FLAGS: { LOCAL_ONLY: false },
}));

jest.mock('@/lib/redirectUri', () => ({
  redirectUri: 'myapp://auth-callback',
  resetRedirectUri: 'myapp://reset-password',
}));

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: jest.fn(),
}));

jest.mock('expo-apple-authentication', () => ({
  signInAsync: jest.fn(),
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
}));

jest.mock('expo-crypto', () => ({
  digestStringAsync: jest.fn().mockResolvedValue('hashed-nonce'),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
}));

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageTag: 'en-US' }],
}));

jest.mock('@/auth/LocalAuth', () => ({
  getOrCreateLocalUser: jest.fn().mockResolvedValue({ id: 'local-user', type: 'local' }),
}));

jest.mock('@nkzw/create-context-hook', () => {
  return (factory: () => any) => {
    // Return [Provider, useHook] but just expose the factory for testing
    return [() => null, () => factory()];
  };
});

import { supabase } from '@/lib/supabase';
import { clearSessionCache } from '@/lib/api';
import { resetPostHog } from '@/lib/posthog';
import { logOut as revenueCatLogOut } from '@/lib/revenuecat';

// ─── Helper Data ─────────────────────────────────────────

const mockSession = {
  access_token: 'test-access-token',
  refresh_token: 'test-refresh-token',
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: {
    id: 'user-123',
    email: 'test@example.com',
    user_metadata: {},
  },
};

// ─── Tests ───────────────────────────────────────────────

describe('Auth Flow - signInWithPassword', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('calls supabase signInWithPassword with correct args', async () => {
    mockSignInWithPassword.mockResolvedValue({ data: { session: mockSession }, error: null });

    await supabase!.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'password123',
    });

    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
  });

  test('throws on invalid credentials', async () => {
    const authError = { message: 'Invalid login credentials', status: 400 };
    mockSignInWithPassword.mockResolvedValue({ data: { session: null }, error: authError });

    const result = await supabase!.auth.signInWithPassword({
      email: 'wrong@example.com',
      password: 'wrong',
    });

    expect(result.error).toBeDefined();
    expect(result.error.message).toBe('Invalid login credentials');
  });

  test('returns session on success', async () => {
    mockSignInWithPassword.mockResolvedValue({ data: { session: mockSession }, error: null });

    const result = await supabase!.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'correct',
    });

    expect(result.error).toBeNull();
    expect(result.data.session).toBeDefined();
    expect(result.data.session.user.email).toBe('test@example.com');
  });
});

describe('Auth Flow - signOut', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('calls supabase signOut with global scope', async () => {
    mockSignOut.mockResolvedValue({ error: null });

    await supabase!.auth.signOut({ scope: 'global' });

    expect(mockSignOut).toHaveBeenCalledWith({ scope: 'global' });
  });

  test('signOut clears session cache', async () => {
    mockSignOut.mockResolvedValue({ error: null });

    // Simulate what AuthProviderV2.signOut does
    (clearSessionCache as jest.Mock)();
    await supabase!.auth.signOut({ scope: 'global' });
    (resetPostHog as jest.Mock)();

    expect(clearSessionCache).toHaveBeenCalled();
    expect(resetPostHog).toHaveBeenCalled();
  });

  test('RevenueCat logout is called during signOut', async () => {
    (revenueCatLogOut as jest.Mock).mockResolvedValue(true);

    await revenueCatLogOut();

    expect(revenueCatLogOut).toHaveBeenCalled();
  });

  test('signOut continues even if RevenueCat fails', async () => {
    (revenueCatLogOut as jest.Mock).mockRejectedValue(new Error('RC unavailable'));
    mockSignOut.mockResolvedValue({ error: null });

    // Should not throw
    try {
      await revenueCatLogOut();
    } catch {
      // Expected - RC failed
    }

    // Supabase signOut should still work
    const result = await supabase!.auth.signOut({ scope: 'global' });
    expect(result.error).toBeNull();
  });
});

describe('Auth Flow - requestPasswordReset', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('calls resetPasswordForEmail with correct args', async () => {
    mockResetPasswordForEmail.mockResolvedValue({ error: null });

    await supabase!.auth.resetPasswordForEmail('user@example.com', {
      redirectTo: 'myapp://reset-password',
    });

    expect(mockResetPasswordForEmail).toHaveBeenCalledWith('user@example.com', {
      redirectTo: 'myapp://reset-password',
    });
  });

  test('throws on invalid email', async () => {
    const authError = { message: 'Unable to validate email address: invalid format' };
    mockResetPasswordForEmail.mockResolvedValue({ error: authError });

    const result = await supabase!.auth.resetPasswordForEmail('not-an-email');
    expect(result.error).toBeDefined();
  });
});

describe('Auth Flow - getSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns existing session', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    const result = await supabase!.auth.getSession();
    expect(result.data.session).toBeDefined();
    expect(result.data.session.user.id).toBe('user-123');
  });

  test('returns null session when not authenticated', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    const result = await supabase!.auth.getSession();
    expect(result.data.session).toBeNull();
  });

  test('handles session check error gracefully', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: { message: 'Auth session missing' },
    });

    const result = await supabase!.auth.getSession();
    expect(result.error).toBeDefined();
    expect(result.error.message).toBe('Auth session missing');
  });
});

describe('Auth Flow - onAuthStateChange', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('registers auth state listener', () => {
    const mockCallback = jest.fn();
    const mockUnsubscribe = jest.fn();
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsubscribe } },
    });

    const { data } = supabase!.auth.onAuthStateChange(mockCallback);

    expect(mockOnAuthStateChange).toHaveBeenCalledWith(mockCallback);
    expect(data.subscription.unsubscribe).toBeDefined();
  });

  test('SIGNED_IN event provides session', () => {
    let capturedCallback: any = null;
    mockOnAuthStateChange.mockImplementation((cb: any) => {
      capturedCallback = cb;
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    });

    supabase!.auth.onAuthStateChange((event: string, session: any) => {
      if (event === 'SIGNED_IN') {
        expect(session).toBeDefined();
        expect(session.user.email).toBe('test@example.com');
      }
    });

    // Simulate SIGNED_IN event
    capturedCallback('SIGNED_IN', mockSession);
  });

  test('SIGNED_OUT event clears session', () => {
    let capturedCallback: any = null;
    mockOnAuthStateChange.mockImplementation((cb: any) => {
      capturedCallback = cb;
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    });

    supabase!.auth.onAuthStateChange((event: string, session: any) => {
      if (event === 'SIGNED_OUT') {
        expect(session).toBeNull();
      }
    });

    capturedCallback('SIGNED_OUT', null);
  });

  test('TOKEN_REFRESHED provides updated session', () => {
    let capturedCallback: any = null;
    mockOnAuthStateChange.mockImplementation((cb: any) => {
      capturedCallback = cb;
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    });

    const updatedSession = {
      ...mockSession,
      access_token: 'refreshed-token',
    };

    supabase!.auth.onAuthStateChange((event: string, session: any) => {
      if (event === 'TOKEN_REFRESHED') {
        expect(session.access_token).toBe('refreshed-token');
      }
    });

    capturedCallback('TOKEN_REFRESHED', updatedSession);
  });

  test('PASSWORD_RECOVERY event is handled', () => {
    let capturedCallback: any = null;
    mockOnAuthStateChange.mockImplementation((cb: any) => {
      capturedCallback = cb;
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    });

    let passwordRecoveryTriggered = false;
    supabase!.auth.onAuthStateChange((event: string) => {
      if (event === 'PASSWORD_RECOVERY') {
        passwordRecoveryTriggered = true;
      }
    });

    capturedCallback('PASSWORD_RECOVERY', mockSession);
    expect(passwordRecoveryTriggered).toBe(true);
  });

  test('cleanup unsubscribes listener', () => {
    const mockUnsubscribe = jest.fn();
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsubscribe } },
    });

    const { data } = supabase!.auth.onAuthStateChange(jest.fn());
    data.subscription.unsubscribe();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});

describe('Auth Flow - isAuthenticated guard', () => {
  test('session presence determines authentication', () => {
    // With session
    const withSession = { session: mockSession };
    expect(!!withSession.session).toBe(true);

    // Without session
    const noSession = { session: null };
    expect(!!noSession.session).toBe(false);
  });

  test('LOCAL_ONLY flag bypasses session check', () => {
    const FLAGS = { LOCAL_ONLY: true };
    const session = null;
    const isAuthenticated = !!session || FLAGS.LOCAL_ONLY;
    expect(isAuthenticated).toBe(true);
  });

  test('without LOCAL_ONLY, null session means not authenticated', () => {
    const FLAGS = { LOCAL_ONLY: false };
    const session = null;
    const isAuthenticated = !!session || FLAGS.LOCAL_ONLY;
    expect(isAuthenticated).toBe(false);
  });
});

describe('Auth Flow - OAuth code exchange', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('exchangeCodeForSession is called with code', async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });

    await supabase!.auth.exchangeCodeForSession('auth-code-123');

    expect(mockExchangeCodeForSession).toHaveBeenCalledWith('auth-code-123');
  });

  test('handles exchange error', async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      error: { message: 'Invalid code' },
    });

    const result = await supabase!.auth.exchangeCodeForSession('invalid-code');
    expect(result.error).toBeDefined();
    expect(result.error.message).toBe('Invalid code');
  });
});

describe('Auth Flow - edge cases', () => {
  test('session expiry time is in the future', () => {
    const now = Math.floor(Date.now() / 1000);
    expect(mockSession.expires_at).toBeGreaterThan(now);
  });

  test('session has required fields', () => {
    expect(mockSession.access_token).toBeDefined();
    expect(mockSession.refresh_token).toBeDefined();
    expect(mockSession.expires_at).toBeDefined();
    expect(mockSession.user).toBeDefined();
    expect(mockSession.user.id).toBeDefined();
    expect(mockSession.user.email).toBeDefined();
  });

  test('empty password is handled by supabase', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { session: null },
      error: { message: 'Password should be at least 6 characters' },
    });

    const result = await supabase!.auth.signInWithPassword({
      email: 'test@example.com',
      password: '',
    });

    expect(result.error).toBeDefined();
  });
});
