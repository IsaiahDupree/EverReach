/**
 * Items Search API Route
 *
 * GET /api/items/search - Full-text search across items
 *
 * This endpoint provides full-text search functionality across
 * title and description fields for the authenticated user's items.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withAuth } from '@/lib/auth/middleware';
import type { Item } from '@/types/item';

/**
 * GET /api/items/search
 *
 * Search items for the authenticated user using full-text search.
 *
 * Query Parameters:
 * - q: Search query string (required)
 *
 * Returns:
 * - 200: List of matching items
 * - 400: Bad request (missing or invalid query)
 * - 401: Unauthorized
 * - 500: Server error
 */
export const GET = withAuth(async (request, context) => {
  try {
    const { user } = context;
    const { searchParams } = new URL(request.url);

    // Get and validate search query
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'Missing required query parameter: q',
        },
        { status: 400 }
      );
    }

    // Trim whitespace from query
    const trimmedQuery = query.trim();

    // Reject empty or whitespace-only queries
    if (trimmedQuery.length === 0) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'Query parameter cannot be empty or whitespace',
        },
        { status: 400 }
      );
    }

    // Create Supabase client
    const supabase = createServerClient();

    // Perform full-text search across title and description
    // Using ilike for case-insensitive pattern matching with wildcards
    const searchPattern = `%${trimmedQuery}%`;

    const { data: items, error } = await supabase
      .from('items')
      .select('*')
      .eq('user_id', user.id)
      .or(`title.ilike.${searchPattern},description.ilike.${searchPattern}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error searching items:', error);
      return NextResponse.json(
        {
          error: 'Internal Server Error',
          message: 'Failed to search items',
        },
        { status: 500 }
      );
    }

    // Return search results
    return NextResponse.json(
      {
        data: items || [],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error in GET /api/items/search:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
});
