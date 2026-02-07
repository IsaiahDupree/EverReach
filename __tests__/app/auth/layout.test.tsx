import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import AuthLayout from '@/app/(auth)/layout';

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
  },
}));

// Mock Next.js router
const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
}));

describe('Auth Layout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Layout Structure', () => {
    it('renders children in a centered container', () => {
      const { supabase } = require('@/lib/supabase/client');
      supabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const { container } = render(
        <AuthLayout>
          <div data-testid="auth-content">Auth Content</div>
        </AuthLayout>
      );

      // Check that children are rendered
      expect(screen.getByTestId('auth-content')).toBeInTheDocument();

      // Check for centered layout classes
      const layoutElement = container.querySelector('.flex');
      expect(layoutElement).toBeInTheDocument();
      expect(layoutElement).toHaveClass('min-h-screen');
      expect(layoutElement).toHaveClass('items-center');
      expect(layoutElement).toHaveClass('justify-center');
    });

    it('applies background styling to the container', () => {
      const { supabase } = require('@/lib/supabase/client');
      supabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const { container } = render(
        <AuthLayout>
          <div>Test</div>
        </AuthLayout>
      );

      const layoutElement = container.querySelector('.bg-background');
      expect(layoutElement).toBeInTheDocument();
    });

    it('renders children with proper padding', () => {
      const { supabase } = require('@/lib/supabase/client');
      supabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const { container } = render(
        <AuthLayout>
          <div>Test</div>
        </AuthLayout>
      );

      const layoutElement = container.querySelector('.p-4');
      expect(layoutElement).toBeInTheDocument();
    });
  });

  describe('Authentication Check', () => {
    it('checks for existing session on mount', () => {
      const { supabase } = require('@/lib/supabase/client');
      supabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      render(
        <AuthLayout>
          <div>Test</div>
        </AuthLayout>
      );

      expect(supabase.auth.getSession).toHaveBeenCalled();
    });
  });

  describe('Redirect Behavior', () => {
    it('redirects to dashboard when user is already logged in', async () => {
      const { supabase } = require('@/lib/supabase/client');

      supabase.auth.getSession.mockResolvedValue({
        data: {
          session: {
            access_token: 'test-token',
            user: { id: '123', email: 'test@example.com' },
          },
        },
        error: null,
      });

      render(
        <AuthLayout>
          <div>Test</div>
        </AuthLayout>
      );

      // Wait for async session check
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockReplace).toHaveBeenCalledWith('/dashboard');
    });

    it('does not redirect when user is not logged in', async () => {
      const { supabase } = require('@/lib/supabase/client');

      supabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      render(
        <AuthLayout>
          <div>Test</div>
        </AuthLayout>
      );

      // Wait for async session check
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockReplace).not.toHaveBeenCalled();
    });

    it('handles session check errors gracefully', async () => {
      const { supabase } = require('@/lib/supabase/client');

      supabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Session check failed' },
      });

      render(
        <AuthLayout>
          <div>Test</div>
        </AuthLayout>
      );

      // Wait for async session check
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should not redirect on error
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });
});
