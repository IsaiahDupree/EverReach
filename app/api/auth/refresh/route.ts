/**
 * Refresh Token Endpoint
 * POST /api/auth/refresh
 *
 * Handles token refresh by accepting a valid refresh token and
 * returning a new access token and refresh token pair.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { z } from 'zod';

/**
 * Refresh token request body schema
 */
const RefreshSchema = z.object({
  refresh_token: z.string({ required_error: 'refresh_token is required' }).min(1, 'refresh_token cannot be empty'),
});

/**
 * Refresh response type
 */
interface RefreshResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
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
 * POST /api/auth/refresh
 *
 * Refreshes an access token using a valid refresh token.
 *
 * Request body:
 * - refresh_token: string (required, non-empty)
 *
 * Response (200):
 * - access_token: New JWT access token
 * - refresh_token: New JWT refresh token
 * - expires_in: Token expiration time in seconds
 * - token_type: "bearer"
 * - user: User object
 *
 * Error responses:
 * - 400: Invalid request body or validation error
 * - 401: Invalid or expired refresh token
 * - 500: Internal server error
 */
export async function POST(request: NextRequest): Promise<NextResponse<RefreshResponse | ErrorResponse>> {
  try {
    // Parse request body
    let body: any;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'Invalid JSON in request body',
        },
        { status: 400 }
      );
    }

    // Validate request body
    const validation = RefreshSchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      return NextResponse.json(
        {
          error: 'Validation Error',
          message: firstError.message,
        },
        { status: 400 }
      );
    }

    const { refresh_token } = validation.data;

    // Create Supabase client
    const supabase = createServerClient();

    // Attempt to refresh the session using the refresh token
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token,
    });

    // Handle refresh errors
    if (error || !data.session || !data.user) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: error?.message || 'Invalid refresh token',
        },
        { status: 401 }
      );
    }

    // Return successful refresh response with new tokens
    return NextResponse.json(
      {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_in: data.session.expires_in || 3600,
        token_type: data.session.token_type || 'bearer',
        user: {
          id: data.user.id,
          email: data.user.email!,
          ...data.user,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    // Log error for debugging (in production, use proper logging service)
    console.error('Refresh token error:', error);

    // Return generic error response without exposing internal details
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'An error occurred during token refresh',
      },
      { status: 500 }
    );
  }
}
