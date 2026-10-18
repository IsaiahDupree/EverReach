/**
 * User Profile API Endpoint
 *
 * Handles user profile operations:
 * - GET: Retrieve authenticated user's profile
 * - PUT: Update authenticated user's profile
 * - DELETE: Delete authenticated user's account
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { withAuth } from '@/lib/auth/middleware';
import { z } from 'zod';

/**
 * Validation schema for profile update
 */
const UpdateProfileSchema = z.object({
  name: z.string().max(255).nullable().optional(),
  avatar_url: z.string().url().nullable().optional(),
}).strict(); // Reject unknown fields

/**
 * GET /api/users/profile
 *
 * Retrieves the authenticated user's profile information.
 * Requires valid authentication token in Authorization header.
 *
 * @returns User profile data with status 200
 * @returns 401 if authentication fails
 * @returns 404 if profile not found
 * @returns 500 if database error occurs
 */
export const GET = withAuth(async (request, context) => {
  try {
    const { user } = context;
    const supabase = createServerClient();

    // Fetch user profile from the database
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      // Check if profile not found
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          {
            error: 'Not Found',
            message: 'Profile not found',
          },
          { status: 404 }
        );
      }

      // Database error
      console.error('Database error fetching profile:', error);
      return NextResponse.json(
        {
          error: 'Internal Server Error',
          message: 'Failed to fetch profile',
        },
        { status: 500 }
      );
    }

    // Return profile data
    return NextResponse.json(
      {
        data,
      },
      { status: 200 }
    );
  } catch (error) {
    // Handle unexpected errors
    console.error('Unexpected error in GET /api/users/profile:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
});

/**
 * PUT /api/users/profile
 *
 * Updates the authenticated user's profile information.
 * Requires valid authentication token in Authorization header.
 *
 * @body {name?: string | null} - User's display name (max 255 chars)
 * @body {avatar_url?: string | null} - User's avatar URL (must be valid URL)
 *
 * @returns Updated user profile data with status 200
 * @returns 400 if validation fails
 * @returns 401 if authentication fails
 * @returns 500 if database error occurs
 */
export const PUT = withAuth(async (request, context) => {
  try {
    const { user } = context;
    const supabase = createServerClient();

    // Parse request body
    let body;
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

    // Validate input using Zod schema
    const validation = UpdateProfileSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      return NextResponse.json(
        {
          error: 'Bad Request',
          message: errors.length > 0 ? errors[0].message : 'Validation failed',
          errors,
        },
        { status: 400 }
      );
    }

    // Check if at least one field is being updated
    const updates = validation.data;
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'At least one field must be provided for update',
        },
        { status: 400 }
      );
    }

    // Update user profile in the database
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      // Database error
      console.error('Database error updating profile:', error);
      return NextResponse.json(
        {
          error: 'Internal Server Error',
          message: 'Failed to update profile',
        },
        { status: 500 }
      );
    }

    // Return updated profile data
    return NextResponse.json(
      {
        data,
      },
      { status: 200 }
    );
  } catch (error) {
    // Handle unexpected errors
    console.error('Unexpected error in PUT /api/users/profile:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
});

/**
 * DELETE /api/users/profile
 *
 * Deletes the authenticated user's account and all associated data.
 * This operation is permanent and cannot be undone.
 * Requires valid authentication token in Authorization header.
 *
 * Cascade delete behavior:
 * - User profile (public.users)
 * - User items (public.items) - via ON DELETE CASCADE
 * - User subscription (public.subscriptions) - via ON DELETE CASCADE
 *
 * @returns Success message with status 200
 * @returns 401 if authentication fails
 * @returns 500 if deletion fails
 */
export const DELETE = withAuth(async (request, context) => {
  try {
    const { user } = context;
    const adminClient = createAdminClient();

    // Delete user from auth.users using admin client
    // This will cascade delete:
    // - public.users (via foreign key)
    // - public.items (via ON DELETE CASCADE)
    // - public.subscriptions (via ON DELETE CASCADE)
    const { error } = await adminClient.auth.admin.deleteUser(user.id);

    if (error) {
      // Deletion error
      console.error('Error deleting user account:', error);
      return NextResponse.json(
        {
          error: 'Internal Server Error',
          message: 'Failed to delete account',
        },
        { status: 500 }
      );
    }

    // Return success message
    return NextResponse.json(
      {
        message: 'Account successfully deleted',
      },
      { status: 200 }
    );
  } catch (error) {
    // Handle unexpected errors
    console.error('Unexpected error in DELETE /api/users/profile:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
});
