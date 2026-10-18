/**
 * Signup Endpoint
 * POST /api/auth/signup
 *
 * Handles user registration using Supabase Auth.
 * Returns access and refresh tokens on successful registration.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { z } from 'zod';

/**
 * Signup request body schema
 */
const SignupSchema = z.object({
  email: z.string({ required_error: 'email is required' }).email('Invalid email format'),
  password: z.string({ required_error: 'password is required' }).min(6, 'Password must be at least 6 characters'),
});

/**
 * Signup response type with tokens
 */
interface SignupResponseWithTokens {
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
 * Signup response type for email confirmation flow
 */
interface SignupResponseWithConfirmation {
  message: string;
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
 * POST /api/auth/signup
 *
 * Registers a new user with email and password.
 *
 * Request body:
 * - email: string (valid email format)
 * - password: string (minimum 6 characters)
 *
 * Response (201):
 * Case 1: Auto-confirm enabled (session created):
 * - access_token: JWT access token
 * - refresh_token: JWT refresh token
 * - expires_in: Token expiration time in seconds
 * - token_type: "bearer"
 * - user: User object
 *
 * Case 2: Email confirmation required (no session):
 * - message: Confirmation message
 * - user: User object (without tokens)
 *
 * Error responses:
 * - 400: Invalid request body, validation error, or duplicate email
 * - 500: Internal server error
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<SignupResponseWithTokens | SignupResponseWithConfirmation | ErrorResponse>> {
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
    const validation = SignupSchema.safeParse(body);
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

    const { email, password } = validation.data;

    // Create Supabase client
    const supabase = createServerClient();

    // Attempt to sign up with email and password
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    // Handle registration errors
    if (error) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: error.message,
        },
        { status: 400 }
      );
    }

    // Check if user was created
    if (!data.user) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'Failed to create user',
        },
        { status: 400 }
      );
    }

    // Case 1: Session created (auto-confirm enabled or email already confirmed)
    if (data.session) {
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
        { status: 201 }
      );
    }

    // Case 2: Email confirmation required
    return NextResponse.json(
      {
        message: 'Please check your email for a confirmation link to complete registration',
        user: {
          id: data.user.id,
          email: data.user.email!,
          ...data.user,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    // Log error for debugging (in production, use proper logging service)
    console.error('Signup error:', error);

    // Return generic error response without exposing internal details
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'An error occurred during signup',
      },
      { status: 500 }
    );
  }
}
