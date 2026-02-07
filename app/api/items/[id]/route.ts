/**
 * Item API Routes - Single Item Operations
 *
 * GET /api/items/:id - Get a single item
 * PUT /api/items/:id - Update an item
 * DELETE /api/items/:id - Delete an item
 *
 * This is a generic CRUD endpoint that developers should customize
 * for their specific entity type.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withAuth } from '@/lib/auth/middleware';
import type { Item, UpdateItemInput } from '@/types/item';

/**
 * GET /api/items/:id
 *
 * Retrieve a single item by ID for the authenticated user.
 *
 * Path Parameters:
 * - id: The item ID
 *
 * Returns:
 * - 200: Item found and returned
 * - 400: Bad request (missing ID)
 * - 401: Unauthorized
 * - 404: Item not found
 * - 500: Server error
 */
export const GET = withAuth(async (request, context) => {
  try {
    const { user, params } = context;

    // Validate item ID parameter
    const itemId = params?.id;
    if (!itemId || typeof itemId !== 'string' || itemId.trim().length === 0) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'Item ID is required',
        },
        { status: 400 }
      );
    }

    // Create Supabase client
    const supabase = createServerClient();

    // Query for the specific item
    // RLS policies ensure users can only access their own items
    const { data: item, error } = await supabase
      .from('items')
      .select('*')
      .eq('id', itemId)
      .eq('user_id', user.id)
      .single();

    // Handle not found error specifically (PGRST116 is Supabase's "no rows" error)
    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          {
            error: 'Not Found',
            message: 'Item not found',
          },
          { status: 404 }
        );
      }

      // Handle other database errors
      console.error('Error fetching item:', error);
      return NextResponse.json(
        {
          error: 'Internal Server Error',
          message: 'Failed to fetch item',
        },
        { status: 500 }
      );
    }

    // Return the item
    return NextResponse.json(item, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in GET /api/items/:id:', error);
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
 * PUT /api/items/:id
 *
 * Update an existing item by ID for the authenticated user.
 *
 * Path Parameters:
 * - id: The item ID
 *
 * Request Body:
 * - title: string (optional) - The updated title
 * - description: string | null (optional) - The updated description
 *
 * Returns:
 * - 200: Item updated successfully
 * - 400: Bad request (validation error, missing ID, no fields to update)
 * - 401: Unauthorized
 * - 404: Item not found or doesn't belong to user
 * - 500: Server error
 */
export const PUT = withAuth(async (request, context) => {
  try {
    const { user, params } = context;

    // Validate item ID parameter
    const itemId = params?.id;
    if (!itemId || typeof itemId !== 'string' || itemId.trim().length === 0) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'Item ID is required',
        },
        { status: 400 }
      );
    }

    // Parse request body
    let body: UpdateItemInput;
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

    // Validate that at least one field is provided
    if (!body || (body.title === undefined && body.description === undefined)) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'At least one field (title or description) must be provided',
        },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: Partial<Item> = {};

    // Validate and process title if provided
    if (body.title !== undefined) {
      if (typeof body.title !== 'string') {
        return NextResponse.json(
          {
            error: 'Bad Request',
            message: 'Title must be a string',
          },
          { status: 400 }
        );
      }

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

      updateData.title = title;
    }

    // Process description if provided
    if (body.description !== undefined) {
      updateData.description = body.description;
    }

    // Create Supabase client
    const supabase = createServerClient();

    // Update item in database
    // RLS policies ensure users can only update their own items
    const { data: updatedItem, error } = await supabase
      .from('items')
      .update(updateData)
      .eq('id', itemId)
      .eq('user_id', user.id)
      .select()
      .single();

    // Handle not found error specifically (PGRST116 is Supabase's "no rows" error)
    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          {
            error: 'Not Found',
            message: 'Item not found',
          },
          { status: 404 }
        );
      }

      // Handle other database errors
      console.error('Error updating item:', error);
      return NextResponse.json(
        {
          error: 'Internal Server Error',
          message: 'Failed to update item',
        },
        { status: 500 }
      );
    }

    // Return the updated item
    return NextResponse.json(updatedItem, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in PUT /api/items/:id:', error);
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
 * DELETE /api/items/:id
 *
 * Delete an existing item by ID for the authenticated user.
 *
 * Path Parameters:
 * - id: The item ID
 *
 * Returns:
 * - 200: Item deleted successfully
 * - 400: Bad request (missing ID)
 * - 401: Unauthorized
 * - 404: Item not found or doesn't belong to user
 * - 500: Server error
 */
export const DELETE = withAuth(async (request, context) => {
  try {
    const { user, params } = context;

    // Validate item ID parameter
    const itemId = params?.id;
    if (!itemId || typeof itemId !== 'string' || itemId.trim().length === 0) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'Item ID is required',
        },
        { status: 400 }
      );
    }

    // Create Supabase client
    const supabase = createServerClient();

    // Delete item from database
    // RLS policies ensure users can only delete their own items
    const { data: deletedItem, error } = await supabase
      .from('items')
      .delete()
      .eq('id', itemId)
      .eq('user_id', user.id)
      .select()
      .single();

    // Handle not found error specifically (PGRST116 is Supabase's "no rows" error)
    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          {
            error: 'Not Found',
            message: 'Item not found',
          },
          { status: 404 }
        );
      }

      // Handle other database errors
      console.error('Error deleting item:', error);
      return NextResponse.json(
        {
          error: 'Internal Server Error',
          message: 'Failed to delete item',
        },
        { status: 500 }
      );
    }

    // Return the deleted item with a success message
    return NextResponse.json(
      {
        ...deletedItem,
        message: 'Item deleted successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error in DELETE /api/items/:id:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
});
