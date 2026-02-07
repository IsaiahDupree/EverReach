/**
 * Authentication Types
 *
 * Type definitions for authentication-related functionality
 */

import type { User } from '@supabase/supabase-js';

/**
 * Authenticated user context
 */
export interface AuthUser extends User {}

/**
 * JWT token payload structure
 */
export interface TokenPayload {
  sub: string; // User ID
  email?: string;
  role?: string;
  exp: number; // Expiration timestamp
  iat: number; // Issued at timestamp
}

/**
 * Auth error types
 */
export type AuthErrorType =
  | 'MISSING_TOKEN'
  | 'INVALID_TOKEN'
  | 'EXPIRED_TOKEN'
  | 'MALFORMED_HEADER'
  | 'AUTHENTICATION_FAILED';

/**
 * Auth error response
 */
export interface AuthError {
  error: 'Unauthorized';
  message: string;
  type?: AuthErrorType;
}

/**
 * Auth configuration options
 */
export interface AuthConfig {
  /**
   * Whether to require authentication
   * @default true
   */
  required?: boolean;

  /**
   * Custom error handler
   */
  onError?: (error: AuthError) => void;
}
