import type { AuthError } from './types';

export function parseAuthError(error: any): AuthError {
  const message = error?.message || 'An unexpected error occurred';
  
  if (message.toLowerCase().includes('invalid login credentials')) {
    return {
      code: 'invalid_credentials',
      message: 'Invalid email or password. Please check your credentials and try again.',
      details: error,
    };
  }
  
  if (message.toLowerCase().includes('invalid') && message.toLowerCase().includes('password')) {
    return {
      code: 'invalid_password',
      message: 'Incorrect password. Please try again or use "Forgot Password" to reset it.',
      details: error,
    };
  }
  
  if (message.toLowerCase().includes('email not confirmed')) {
    return {
      code: 'email_not_confirmed',
      message: 'Please check your email and click the confirmation link to verify your account.',
      details: error,
    };
  }
  
  if (message.toLowerCase().includes('user not found')) {
    return {
      code: 'user_not_found',
      message: 'No account found with this email address. Please sign up first.',
      details: error,
    };
  }
  
  if (message.toLowerCase().includes('weak password') || message.toLowerCase().includes('password should be')) {
    return {
      code: 'weak_password',
      message: 'Password must be at least 6 characters long.',
      details: error,
    };
  }
  
  if (message.toLowerCase().includes('rate limit')) {
    return {
      code: 'rate_limit_exceeded',
      message: 'Too many attempts. Please wait a few minutes and try again.',
      details: error,
    };
  }
  
  if (message.toLowerCase().includes('network') || message.toLowerCase().includes('fetch')) {
    return {
      code: 'network_error',
      message: 'Network error. Please check your connection and try again.',
      details: error,
    };
  }
  
  if (message.toLowerCase().includes('user already registered')) {
    return {
      code: 'user_exists',
      message: 'An account with this email already exists. Please sign in instead.',
      details: error,
    };
  }
  
  return {
    code: 'unknown_error',
    message: message,
    details: error,
  };
}

export function getUserFriendlyMessage(error: AuthError): string {
  return error.message;
}
