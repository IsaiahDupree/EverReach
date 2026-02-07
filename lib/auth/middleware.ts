/**
 * Auth Middleware
 *
 * Provides authentication middleware for protecting API routes.
 * Validates JWT tokens from Authorization header and extracts user information.
 *
 * Usage:
 * ```typescript
 * import { withAuth } from '@/lib/auth/middleware';
 *
 * // In your API route handler
 * export const GET = withAuth(async (request, context) => {
 *   // context.user contains the authenticated user
 *   const userId = context.user.id;
 *
 *   return NextResponse.json({ userId });
 * });
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import type { User } from '@supabase/supabase-js';

/**
 * Context object passed to authenticated route handlers
 */
export interface AuthContext {
  user: User;
}

/**
 * Type for authenticated route handlers
 */
export type AuthenticatedHandler<T = any> = (
  request: NextRequest,
  context: AuthContext & T
) => Promise<NextResponse> | NextResponse;

/**
 * Higher-order function that wraps API route handlers with authentication
 *
 * Validates the JWT token from the Authorization header and extracts the user.
 * If authentication fails, returns a 401 Unauthorized response.
 * If successful, calls the handler with the authenticated user in the context.
 *
 * @param handler - The route handler to protect
 * @returns A wrapped handler that performs authentication
 */
export function withAuth<T = any>(
  handler: AuthenticatedHandler<T>
): (request: NextRequest, context: T) => Promise<NextResponse> {
  return async (request: NextRequest, context: T) => {
    try {
      // Extract token from Authorization header
      const authHeader = request.headers.get('Authorization');

      if (!authHeader) {
        return NextResponse.json(
          {
            error: 'Unauthorized',
            message: 'Missing Authorization header',
          },
          { status: 401 }
        );
      }

      // Validate Authorization header format (should be "Bearer <token>")
      const parts = authHeader.split(' ');
      if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return NextResponse.json(
          {
            error: 'Unauthorized',
            message: 'Invalid Authorization header format. Expected: Bearer <token>',
          },
          { status: 401 }
        );
      }

      const token = parts[1];

      if (!token) {
        return NextResponse.json(
          {
            error: 'Unauthorized',
            message: 'Missing token',
          },
          { status: 401 }
        );
      }

      // Create Supabase client and verify the token
      const supabase = createServerClient();

      // Set the auth token for this request
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        return NextResponse.json(
          {
            error: 'Unauthorized',
            message: error?.message || 'Invalid or expired token',
          },
          { status: 401 }
        );
      }

      // Create auth context with user
      const authContext: AuthContext & T = {
        ...context,
        user,
      };

      // Call the handler with authenticated context
      return await handler(request, authContext);
    } catch (error) {
      // Handle any unexpected errors during authentication
      console.error('Authentication error:', error);

      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Authentication failed',
        },
        { status: 401 }
      );
    }
  };
}

/**
 * Extracts the JWT token from the Authorization header
 *
 * @param request - The Next.js request object
 * @returns The token string or null if not found
 */
export function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1] || null;
}

/**
 * Type guard to check if a context has auth information
 *
 * @param context - The context object to check
 * @returns True if context contains a user
 */
export function isAuthContext(context: any): context is AuthContext {
  return context && typeof context === 'object' && 'user' in context;
}
