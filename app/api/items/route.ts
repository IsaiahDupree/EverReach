/**
 * Items API Routes
 *
 * GET /api/items - List items with pagination
 * POST /api/items - Create a new item
 *
 * This is a generic CRUD endpoint that developers should customize
 * for their specific entity type.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withAuth } from '@/lib/auth/middleware';
import type { PaginatedItemsResponse, CreateItemInput } from '@/types/item';

/**
 * GET /api/items
 *
 * List items for the authenticated user with pagination.
 *
 * Query Parameters:
 * - page: Page number (default: 1)
 * - pageSize: Items per page (default: 20, max: 100)
 *
 * Returns:
 * - 200: Paginated list of items
 * - 401: Unauthorized
 * - 500: Server error
 */
export const GET = withAuth(async (request, context) => {
  try {
    const { user } = context;
    const { searchParams } = new URL(request.url);

    // Parse pagination parameters
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10))
    );

    // Calculate range for Supabase query
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Create Supabase client
    const supabase = createServerClient();

    // Query items with pagination
    const { data: items, error, count } = await supabase
      .from('items')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error fetching items:', error);
      return NextResponse.json(
        {
          error: 'Internal Server Error',
          message: 'Failed to fetch items',
        },
        { status: 500 }
      );
    }

    // Calculate pagination metadata
    const total = count || 0;
    const totalPages = Math.ceil(total / pageSize);

    const response: PaginatedItemsResponse = {
      data: items || [],
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in GET /api/items:', error);
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
 * POST /api/items
 *
 * Create a new item for the authenticated user.
 *
 * Request Body:
 * - title: string (required) - The title of the item
 * - description: string | null (optional) - The description of the item
 *
 * Returns:
 * - 201: Created item
 * - 400: Bad request (validation error)
 * - 401: Unauthorized
 * - 500: Server error
 */
export const POST = withAuth(async (request, context) => {
  try {
    const { user } = context;

    // Parse request body
    let body: CreateItemInput;
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

    // Validate required fields
    if (!body || typeof body.title !== 'string') {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'Missing required field: title',
        },
        { status: 400 }
      );
    }

    // Validate title is not empty or just whitespace
    const title = body.title.trim();
    if (title.length === 0) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'Title cannot be empty or whitespace',
        },
        { status: 400 }
      );
    }

    // Create Supabase client
    const supabase = createServerClient();

    // Prepare item data
    const itemData = {
      user_id: user.id,
      title: title,
      description: body.description ?? null,
    };

    // Insert item into database
    const { data: createdItem, error } = await supabase
      .from('items')
      .insert(itemData)
      .select()
      .single();

    if (error) {
      console.error('Error creating item:', error);
      return NextResponse.json(
        {
          error: 'Internal Server Error',
          message: 'Failed to create item',
        },
        { status: 500 }
      );
    }

    // Return created item with 201 status
    return NextResponse.json(createdItem, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/items:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
});
