/**
 * Logout Endpoint
 * POST /api/auth/logout
 *
 * Handles user logout by invalidating the current session.
 * This endpoint signs out the user from Supabase Auth.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

/**
 * Success response type
 */
interface LogoutResponse {
  message: string;
}

/**
 * Error response type
 */
interface ErrorResponse {
  error: string;
  message: string;
}

/**
 * POST /api/auth/logout
 *
 * Signs out the current user and invalidates their session.
 *
 * Request:
 * - No body required
 * - Optional: Authorization header with Bearer token
 *
 * Response (200):
 * - message: Confirmation message
 *
 * Error responses:
 * - 500: Internal server error
 */
export async function POST(request: NextRequest): Promise<NextResponse<LogoutResponse | ErrorResponse>> {
  try {
    // Create Supabase client
    const supabase = createServerClient();

    // Sign out the user
    const { error } = await supabase.auth.signOut();

    // Handle signOut errors
    if (error) {
      return NextResponse.json(
        {
          error: 'Logout Failed',
          message: error.message || 'Failed to sign out',
        },
        { status: 500 }
      );
    }

    // Return successful logout response
    return NextResponse.json(
      {
        message: 'Logged out successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    // Log error for debugging (in production, use proper logging service)
    console.error('Logout error:', error);

    // Return generic error response without exposing internal details
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'An error occurred during logout',
      },
      { status: 500 }
    );
  }
}
