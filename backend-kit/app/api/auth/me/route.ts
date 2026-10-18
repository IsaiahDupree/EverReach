/**
 * Current User Endpoint
 * GET /api/auth/me
 *
 * Returns the currently authenticated user's information.
 * Requires valid JWT token in Authorization header.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/middleware';

/**
 * User response type
 */
interface UserResponse {
  user: {
    id: string;
    email: string;
    [key: string]: any;
  };
}

/**
 * Error response type
 */
interface ErrorResponse {
  error: string;
  message: string;
}

/**
 * GET /api/auth/me
 *
 * Returns the currently authenticated user's information.
 * This endpoint is protected by authentication middleware.
 *
 * Headers required:
 * - Authorization: Bearer <access_token>
 *
 * Response (200):
 * - user: User object with id, email, and other user properties
 *
 * Error responses:
 * - 401: Missing, invalid, or expired token
 * - 500: Internal server error
 */
export const GET = withAuth(
  async (
    request: NextRequest,
    context: AuthContext
  ): Promise<NextResponse<UserResponse | ErrorResponse>> => {
    try {
      // The user is already validated by withAuth middleware
      // We just need to return the user information
      const { user } = context;

      // Return user information
      return NextResponse.json(
        {
          user: {
            id: user.id,
            email: user.email!,
            ...user,
          },
        },
        { status: 200 }
      );
    } catch (error) {
      // Log error for debugging (in production, use proper logging service)
      console.error('Get current user error:', error);

      // Return generic error response without exposing internal details
      return NextResponse.json(
        {
          error: 'Internal Server Error',
          message: 'An error occurred while fetching user information',
        },
        { status: 500 }
      );
    }
  }
);
