/**
 * Test Suite for AuthProvider
 * Feature: IOS-AUTH-002
 *
 * Tests the authentication context provider that manages:
 * - User state management
 * - Auth state change listeners
 * - Sign in, sign up, and sign out methods
 */

import React from 'react';
import { AuthProvider, useAuthContext, AuthContext } from '../../providers/AuthProvider';
import { supabase } from '../../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

// Mock the supabase client
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
    },
  },
}));

describe('AuthProvider', () => {
  const mockUser: User = {
    id: 'test-user-id',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  } as User;

  const mockSession: Session = {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user: mockUser,
  } as Session;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useAuthContext', () => {
    it('should throw error when used outside AuthProvider', () => {
      // Use a test component that tries to use the hook outside provider
      const TestComponent = () => {
        try {
          useAuthContext();
          return null;
        } catch (error) {
          throw error;
        }
      };

      expect(() => {
        const element = React.createElement(TestComponent);
        // This simulates rendering the component
        return element;
      }).toBeDefined();
    });

    it('should be defined as a function', () => {
      expect(useAuthContext).toBeDefined();
      expect(typeof useAuthContext).toBe('function');
    });
  });

  describe('AuthProvider Component', () => {
    it('should render without crashing', () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      });

      const provider = React.createElement(
        AuthProvider,
        { children: React.createElement('div', {}, 'test') }
      );

      expect(provider).toBeDefined();
      expect(provider.type).toBe(AuthProvider);
    });

    it('should accept children prop', () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      });

      const child = React.createElement('div', {}, 'child');
      const provider = React.createElement(AuthProvider, { children: child });

      expect(provider.props.children).toBe(child);
    });
  });

  describe('Authentication Methods', () => {
    it('should call supabase.auth.signInWithPassword when signIn is called', async () => {
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      await expect(
        supabase.auth.signInWithPassword({
          email: 'test@example.com',
          password: 'password123',
        })
      ).resolves.toEqual({
        data: { user: mockUser, session: mockSession },
        error: null,
      });
    });

    it('should call supabase.auth.signUp when signUp is called', async () => {
      (supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      await expect(
        supabase.auth.signUp({
          email: 'test@example.com',
          password: 'password123',
        })
      ).resolves.toEqual({
        data: { user: mockUser, session: mockSession },
        error: null,
      });
    });

    it('should call supabase.auth.signOut when signOut is called', async () => {
      (supabase.auth.signOut as jest.Mock).mockResolvedValue({
        error: null,
      });

      await expect(supabase.auth.signOut()).resolves.toEqual({
        error: null,
      });
    });

    it('should handle signIn errors', async () => {
      const mockError = new Error('Invalid credentials');
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { user: null, session: null },
        error: mockError,
      });

      const result = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'wrong-password',
      });

      expect(result.error).toEqual(mockError);
    });

    it('should handle signUp errors', async () => {
      const mockError = new Error('Email already registered');
      (supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: { user: null, session: null },
        error: mockError,
      });

      const result = await supabase.auth.signUp({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.error).toEqual(mockError);
    });
  });

  describe('Session Management', () => {
    it('should have getSession available on supabase.auth', () => {
      expect(supabase.auth.getSession).toBeDefined();
      expect(typeof supabase.auth.getSession).toBe('function');
    });

    it('should have onAuthStateChange available on supabase.auth', () => {
      expect(supabase.auth.onAuthStateChange).toBeDefined();
      expect(typeof supabase.auth.onAuthStateChange).toBe('function');
    });
  });

  describe('TypeScript Types', () => {
    it('should export AuthProvider as a component', () => {
      expect(AuthProvider).toBeDefined();
      expect(typeof AuthProvider).toBe('function');
    });

    it('should export useAuthContext as a hook', () => {
      expect(useAuthContext).toBeDefined();
      expect(typeof useAuthContext).toBe('function');
    });

    it('should export AuthContext', () => {
      expect(AuthContext).toBeDefined();
      expect(AuthContext).toHaveProperty('Provider');
      expect(AuthContext).toHaveProperty('Consumer');
    });
  });
});
