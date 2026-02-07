/**
 * Login Endpoint
 * POST /api/auth/login
 *
 * Handles email/password authentication using Supabase Auth.
 * Returns access and refresh tokens on successful authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { z } from 'zod';

/**
 * Login request body schema
 */
const LoginSchema = z.object({
  email: z.string({ required_error: 'email is required' }).email('Invalid email format'),
  password: z.string({ required_error: 'password is required' }).min(1, 'Password is required'),
});

/**
 * Login response type
 */
interface LoginResponse {
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
 * POST /api/auth/login
 *
 * Authenticates a user with email and password.
 *
 * Request body:
 * - email: string (valid email format)
 * - password: string (required)
 *
 * Response (200):
 * - access_token: JWT access token
 * - refresh_token: JWT refresh token
 * - expires_in: Token expiration time in seconds
 * - token_type: "bearer"
 * - user: User object
 *
 * Error responses:
 * - 400: Invalid request body or validation error
 * - 401: Invalid credentials
 * - 500: Internal server error
 */
export async function POST(request: NextRequest): Promise<NextResponse<LoginResponse | ErrorResponse>> {
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
    const validation = LoginSchema.safeParse(body);
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

    // Attempt to sign in with email and password
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // Handle authentication errors
    if (error || !data.session || !data.user) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: error?.message || 'Invalid login credentials',
        },
        { status: 401 }
      );
    }

    // Return successful login response with tokens
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
    console.error('Login error:', error);

    // Return generic error response without exposing internal details
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'An error occurred during login',
      },
      { status: 500 }
    );
  }
}
