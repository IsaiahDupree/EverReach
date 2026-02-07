/**
 * Forgot Password Endpoint
 * POST /api/auth/forgot-password
 *
 * Handles password reset requests by sending a password reset email.
 * Uses Supabase Auth's resetPasswordForEmail functionality.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { z } from 'zod';

/**
 * Forgot password request body schema
 */
const ForgotPasswordSchema = z.object({
  email: z.string({ required_error: 'email is required' }).email('Invalid email format').min(1, 'Email cannot be empty'),
});

/**
 * Success response type
 */
interface SuccessResponse {
  success: boolean;
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
 * POST /api/auth/forgot-password
 *
 * Sends a password reset email to the provided email address.
 * For security reasons, always returns success even if the email doesn't exist.
 *
 * Request body:
 * - email: string (valid email format)
 *
 * Response (200):
 * - success: true
 * - message: Confirmation message
 *
 * Error responses:
 * - 400: Invalid request body or validation error
 * - 500: Internal server error
 */
export async function POST(request: NextRequest): Promise<NextResponse<SuccessResponse | ErrorResponse>> {
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
    const validation = ForgotPasswordSchema.safeParse(body);
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

    const { email } = validation.data;

    // Create Supabase client
    const supabase = createServerClient();

    // Get the redirect URL from environment or use default
    const redirectTo = process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`
      : 'http://localhost:3000/reset-password';

    // Send password reset email
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    // For security reasons, we return success even if the email doesn't exist
    // This prevents attackers from discovering which emails are registered
    if (error) {
      // Log error for debugging but don't expose to user
      console.error('Password reset email error:', error);

      // Still return success to prevent email enumeration
      // Only return error for actual service failures
      if (error.status && error.status >= 500) {
        return NextResponse.json(
          {
            error: 'Internal Server Error',
            message: 'Failed to send reset email. Please try again later.',
          },
          { status: 500 }
        );
      }
    }

    // Return success response
    return NextResponse.json(
      {
        success: true,
        message: 'If an account exists with this email, you will receive a password reset email shortly. Please check your inbox.',
      },
      { status: 200 }
    );
  } catch (error) {
    // Log error for debugging (in production, use proper logging service)
    console.error('Forgot password error:', error);

    // Return generic error response without exposing internal details
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'An error occurred while processing your request',
      },
      { status: 500 }
    );
  }
}
