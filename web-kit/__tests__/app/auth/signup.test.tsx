import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SignupPage from '@/app/(auth)/signup/page';

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithOAuth: jest.fn(),
    },
  },
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

describe('Signup Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Form Rendering', () => {
    it('renders signup form with name, email and password fields', () => {
      render(<SignupPage />);

      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
    });

    it('renders link to login page', () => {
      render(<SignupPage />);

      const loginLink = screen.getByText(/already have an account/i);
      expect(loginLink).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('shows error when name is empty', async () => {
      render(<SignupPage />);

      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole('button', { name: /sign up/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      });
    });

    it('shows error when email is invalid', async () => {
      render(<SignupPage />);

      const nameInput = screen.getByLabelText(/name/i);
      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole('button', { name: /sign up/i });

      fireEvent.change(nameInput, { target: { value: 'John Doe' } });
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
      });
    });

    it('shows error when password is too short', async () => {
      render(<SignupPage />);

      const nameInput = screen.getByLabelText(/name/i);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const submitButton = screen.getByRole('button', { name: /sign up/i });

      fireEvent.change(nameInput, { target: { value: 'John Doe' } });
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'short' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
      });
    });

    it('shows error when passwords do not match', async () => {
      render(<SignupPage />);

      const nameInput = screen.getByLabelText(/name/i);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /sign up/i });

      fireEvent.change(nameInput, { target: { value: 'John Doe' } });
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'password456' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
      });
    });

    it('shows password strength indicator for weak password', async () => {
      render(<SignupPage />);

      const passwordInput = screen.getByLabelText(/^password$/i);

      fireEvent.change(passwordInput, { target: { value: '12345678' } });

      await waitFor(() => {
        expect(screen.getByText(/weak/i)).toBeInTheDocument();
      });
    });

    it('shows password strength indicator for strong password', async () => {
      render(<SignupPage />);

      const passwordInput = screen.getByLabelText(/^password$/i);

      fireEvent.change(passwordInput, { target: { value: 'StrongP@ss123' } });

      await waitFor(() => {
        expect(screen.getByText(/strong/i)).toBeInTheDocument();
      });
    });

    it('does not submit form with invalid data', async () => {
      const { supabase } = require('@/lib/supabase/client');
      render(<SignupPage />);

      const submitButton = screen.getByRole('button', { name: /sign up/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(supabase.auth.signUp).not.toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error message when signup fails', async () => {
      const { supabase } = require('@/lib/supabase/client');
      supabase.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'User already exists' },
      });

      render(<SignupPage />);

      const nameInput = screen.getByLabelText(/name/i);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /sign up/i });

      fireEvent.change(nameInput, { target: { value: 'John Doe' } });
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/user already exists/i)).toBeInTheDocument();
      });
    });

    it('shows loading state while submitting', async () => {
      const { supabase } = require('@/lib/supabase/client');
      supabase.auth.signUp.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      render(<SignupPage />);

      const nameInput = screen.getByLabelText(/name/i);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /sign up/i });

      fireEvent.change(nameInput, { target: { value: 'John Doe' } });
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      expect(submitButton).toBeDisabled();
    });
  });

  describe('OAuth Buttons', () => {
    it('renders Google OAuth button', () => {
      render(<SignupPage />);

      const googleButton = screen.getByRole('button', { name: /google/i });
      expect(googleButton).toBeInTheDocument();
    });

    it('renders GitHub OAuth button', () => {
      render(<SignupPage />);

      const githubButton = screen.getByRole('button', { name: /github/i });
      expect(githubButton).toBeInTheDocument();
    });

    it('calls OAuth sign in when Google button clicked', async () => {
      const { supabase } = require('@/lib/supabase/client');
      render(<SignupPage />);

      const googleButton = screen.getByRole('button', { name: /google/i });
      fireEvent.click(googleButton);

      await waitFor(() => {
        expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
          provider: 'google',
          options: expect.any(Object),
        });
      });
    });
  });

  describe('Successful Signup', () => {
    it('redirects to dashboard on successful signup', async () => {
      const { supabase } = require('@/lib/supabase/client');
      const mockPush = jest.fn();

      jest.spyOn(require('next/navigation'), 'useRouter').mockImplementation(() => ({
        push: mockPush,
        replace: jest.fn(),
      }));

      supabase.auth.signUp.mockResolvedValue({
        data: {
          user: { id: '123', email: 'test@example.com' },
          session: { access_token: 'token' },
        },
        error: null,
      });

      render(<SignupPage />);

      const nameInput = screen.getByLabelText(/name/i);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /sign up/i });

      fireEvent.change(nameInput, { target: { value: 'John Doe' } });
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('shows email verification message when email confirmation is required', async () => {
      const { supabase } = require('@/lib/supabase/client');

      supabase.auth.signUp.mockResolvedValue({
        data: {
          user: { id: '123', email: 'test@example.com', email_confirmed_at: null },
          session: null,
        },
        error: null,
      });

      render(<SignupPage />);

      const nameInput = screen.getByLabelText(/name/i);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /sign up/i });

      fireEvent.change(nameInput, { target: { value: 'John Doe' } });
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        const elements = screen.getAllByText(/check your email/i);
        expect(elements.length).toBeGreaterThan(0);
      });
    });
  });
});
