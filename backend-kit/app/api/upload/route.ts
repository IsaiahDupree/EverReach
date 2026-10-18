/**
 * File Upload API Route
 *
 * POST /api/upload - Upload a file to Supabase Storage
 *
 * This endpoint handles file uploads to Supabase Storage and returns
 * the public URL of the uploaded file.
 *
 * The uploaded files are organized by user ID to ensure proper isolation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { createServerClient } from '@/lib/supabase/server';

/**
 * POST /api/upload
 *
 * Upload a file to Supabase Storage.
 *
 * Request:
 * - Content-Type: multipart/form-data
 * - Body: FormData with 'file' field
 *
 * Returns:
 * - 200: File uploaded successfully
 *   - url: Public URL of the uploaded file
 *   - path: Storage path of the file
 * - 400: Bad request (no file provided)
 * - 401: Unauthorized
 * - 500: Server error
 */
export const POST = withAuth(async (request, context) => {
  try {
    const { user } = context;

    // Parse the multipart form data
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (error) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'Invalid form data',
        },
        { status: 400 }
      );
    }

    // Get the file from the form data
    const file = formData.get('file');

    // Validate that a file was provided
    if (!file) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'No file provided. Please include a file in the "file" field.',
        },
        { status: 400 }
      );
    }

    // Validate that the file is actually a File object
    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'Invalid file format',
        },
        { status: 400 }
      );
    }

    // Get the file extension from the original filename
    const fileExtension = file.name.split('.').pop() || 'bin';

    // Generate a unique filename to prevent collisions
    // Format: timestamp-randomstring.extension
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const uniqueFilename = `${timestamp}-${randomString}.${fileExtension}`;

    // Create the storage path: uploads/{user_id}/{unique_filename}
    const storagePath = `uploads/${user.id}/${uniqueFilename}`;

    // Create Supabase client
    const supabase = createServerClient();

    // Convert the File to ArrayBuffer for upload
    const fileBuffer = await file.arrayBuffer();

    // Upload the file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('uploads') // Bucket name
      .upload(storagePath, fileBuffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false, // Don't overwrite existing files
      });

    if (uploadError) {
      console.error('Error uploading file to Supabase Storage:', uploadError);
      return NextResponse.json(
        {
          error: 'Internal Server Error',
          message: 'Failed to upload file',
        },
        { status: 500 }
      );
    }

    // Get the public URL for the uploaded file
    const { data: urlData } = supabase.storage
      .from('uploads')
      .getPublicUrl(uploadData.path);

    // Return success response with URL and path
    return NextResponse.json(
      {
        url: urlData.publicUrl,
        path: uploadData.path,
        message: 'File uploaded successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error in POST /api/upload:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'An unexpected error occurred while uploading the file',
      },
      { status: 500 }
    );
  }
});
