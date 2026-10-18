/**
 * Tests for useAuth Hook
 * Feature: IOS-AUTH-003
 *
 * Tests the useAuth hook which provides a convenient wrapper
 * around the AuthContext for accessing authentication state and methods.
 */

import { useAuth } from '../../hooks/useAuth';
import { useAuthContext } from '../../providers/AuthProvider';

// Mock the AuthProvider
jest.mock('../../providers/AuthProvider', () => ({
  useAuthContext: jest.fn(),
}));

describe('useAuth', () => {
  const mockUseAuthContext = useAuthContext as jest.MockedFunction<typeof useAuthContext>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when AuthContext is available', () => {
    it('should return user state from context', () => {
      const mockContextValue = {
        user: { id: '123', email: 'test@example.com' } as any,
        loading: false,
        signIn: jest.fn(),
        signOut: jest.fn(),
        signUp: jest.fn(),
        resetPassword: jest.fn(),
      };

      mockUseAuthContext.mockReturnValue(mockContextValue);

      const result = useAuth();

      expect(result.user).toEqual(mockContextValue.user);
      expect(result.loading).toBe(false);
    });

    it('should return signIn method from context', () => {
      const mockSignIn = jest.fn();
      const mockContextValue = {
        user: null,
        loading: false,
        signIn: mockSignIn,
        signOut: jest.fn(),
        signUp: jest.fn(),
        resetPassword: jest.fn(),
      };

      mockUseAuthContext.mockReturnValue(mockContextValue);

      const result = useAuth();

      expect(result.signIn).toBe(mockSignIn);
      expect(typeof result.signIn).toBe('function');
    });

    it('should return signOut method from context', () => {
      const mockSignOut = jest.fn();
      const mockContextValue = {
        user: null,
        loading: false,
        signIn: jest.fn(),
        signOut: mockSignOut,
        signUp: jest.fn(),
        resetPassword: jest.fn(),
      };

      mockUseAuthContext.mockReturnValue(mockContextValue);

      const result = useAuth();

      expect(result.signOut).toBe(mockSignOut);
      expect(typeof result.signOut).toBe('function');
    });

    it('should return signUp method from context', () => {
      const mockSignUp = jest.fn();
      const mockContextValue = {
        user: null,
        loading: false,
        signIn: jest.fn(),
        signOut: jest.fn(),
        signUp: mockSignUp,
        resetPassword: jest.fn(),
      };

      mockUseAuthContext.mockReturnValue(mockContextValue);

      const result = useAuth();

      expect(result.signUp).toBe(mockSignUp);
      expect(typeof result.signUp).toBe('function');
    });

    it('should return all required properties from context', () => {
      const mockContextValue = {
        user: { id: '123', email: 'test@example.com' } as any,
        loading: true,
        signIn: jest.fn(),
        signOut: jest.fn(),
        signUp: jest.fn(),
        resetPassword: jest.fn(),
      };

      mockUseAuthContext.mockReturnValue(mockContextValue);

      const result = useAuth();

      expect(result).toEqual(
        expect.objectContaining({
          user: expect.anything(),
          loading: expect.any(Boolean),
          signIn: expect.any(Function),
          signOut: expect.any(Function),
          signUp: expect.any(Function),
          resetPassword: expect.any(Function),
        })
      );
    });
  });

  describe('when used outside AuthProvider', () => {
    it('should throw an error', () => {
      mockUseAuthContext.mockImplementation(() => {
        throw new Error('useAuthContext must be used within an AuthProvider');
      });

      expect(() => {
        useAuth();
      }).toThrow('useAuthContext must be used within an AuthProvider');
    });
  });
});
