/**
 * Screenshot Upload Endpoint
 * 
 * POST /api/v1/screenshots - Upload and analyze screenshot
 * GET /api/v1/screenshots - List user's screenshots
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { screenshot } from '@/lib/analytics';
import { options, unauthorized, badRequest, serverError, buildCorsHeaders } from '@/lib/cors';
import sharp from 'sharp';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const runtime = "nodejs";

/**
 * OPTIONS - CORS preflight
 */
export function OPTIONS(req: Request) { return options(req); }

/**
 * POST - Upload screenshot for analysis
 */
export async function POST(req: NextRequest) {
  try {
    // Get user from JWT
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      const origin = req.headers.get('origin') ?? undefined;
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json', ...buildCorsHeaders(origin) }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      const origin = req.headers.get('origin') ?? undefined;
      return new Response(JSON.stringify({ error: 'Invalid token' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json', ...buildCorsHeaders(origin) }
      });
    }

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const context = formData.get('context') as string || 'general';

    if (!file) {
      const origin = req.headers.get('origin') ?? undefined;
      return new Response(JSON.stringify({ error: 'No file provided' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json', ...buildCorsHeaders(origin) }
      });
    }

    // Validate file
    if (file.size > MAX_FILE_SIZE) {
      const origin = req.headers.get('origin') ?? undefined;
      return new Response(JSON.stringify({ error: 'File too large. Maximum size is 10MB.' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json', ...buildCorsHeaders(origin) }
      });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      const origin = req.headers.get('origin') ?? undefined;
      return new Response(JSON.stringify({ error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json', ...buildCorsHeaders(origin) }
      });
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Get image metadata
    const metadata = await sharp(buffer).metadata();

    // Generate storage keys
    const timestamp = Date.now();
    const screenshotId = `${user.id}-${timestamp}`;
    const ext = file.name.split('.').pop() || 'jpg';
    const storageKey = `${user.id}/${screenshotId}.${ext}`;
    const thumbnailKey = `${user.id}/${screenshotId}_thumb.jpg`;

    // Generate thumbnail (400px wide)
    const thumbnail = await sharp(buffer)
      .resize(400, null, { withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();

    // Upload original to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('screenshots')
      .upload(storageKey, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      const origin = req.headers.get('origin') ?? undefined;
      return new Response(JSON.stringify({ error: 'Failed to upload file' }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json', ...buildCorsHeaders(origin) }
      });
    }

    // Upload thumbnail
    await supabase.storage
      .from('screenshots')
      .upload(thumbnailKey, thumbnail, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    // Create database record
    const { data: screenshotRecord, error: dbError } = await supabase
      .from('screenshots')
      .insert({
        user_id: user.id,
        storage_key: storageKey,
        thumbnail_key: thumbnailKey,
        width: metadata.width,
        height: metadata.height,
        file_size: file.size,
        mime_type: file.type,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      const origin = req.headers.get('origin') ?? undefined;
      return new Response(JSON.stringify({ error: 'Failed to create record' }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json', ...buildCorsHeaders(origin) }
      });
    }

    // Create analysis record
    const { data: analysisRecord } = await supabase
      .from('screenshot_analysis')
      .insert({
        screenshot_id: screenshotRecord.id,
        status: 'queued',
      })
      .select()
      .single();

    // Track analytics event
    await screenshot.uploaded(user.id, screenshotRecord.id, {
      file_size: file.size,
      mime_type: file.type,
      width: metadata.width || 0,
      height: metadata.height || 0,
    });

    // Note: Frontend explicitly triggers analysis via POST /screenshots/:id/analyze
    // No need for auto-trigger here to avoid ECONNREFUSED errors and redundant calls

    const origin = req.headers.get('origin') ?? undefined;
    return new Response(JSON.stringify({
      screenshot_id: screenshotRecord.id,
      id: screenshotRecord.id, // Also include 'id' for consistency
      analysis_id: analysisRecord?.id,
      status: 'uploaded',
      message: 'Screenshot uploaded successfully. Ready for analysis.',
    }), { 
      status: 201,
      headers: { 'Content-Type': 'application/json', ...buildCorsHeaders(origin) }
    });

  } catch (error) {
    console.error('Screenshot upload error:', error);
    const origin = req.headers.get('origin') ?? undefined;
    return new Response(JSON.stringify({ 
      error: 'Upload failed', 
      details: (error as Error).message 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json', ...buildCorsHeaders(origin) }
    });
  }
}

/**
 * GET - List user's screenshots
 */
export async function GET(req: NextRequest) {
  try {
    // Get user from JWT
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      const origin = req.headers.get('origin') ?? undefined;
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json', ...buildCorsHeaders(origin) }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      const origin = req.headers.get('origin') ?? undefined;
      return new Response(JSON.stringify({ error: 'Invalid token' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json', ...buildCorsHeaders(origin) }
      });
    }

    // Parse query params
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Fetch screenshots with analysis
    const { data: screenshots, error } = await supabase
      .from('screenshots')
      .select(`
        *,
        analysis:screenshot_analysis(*)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Query error:', error);
      const origin = req.headers.get('origin') ?? undefined;
      return new Response(JSON.stringify({ error: 'Failed to fetch screenshots' }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json', ...buildCorsHeaders(origin) }
      });
    }

    // Generate signed URLs for images
    const screenshotsWithUrls = await Promise.all(
      (screenshots || []).map(async (screenshot) => {
        const { data: imageUrl } = await supabase.storage
          .from('screenshots')
          .createSignedUrl(screenshot.storage_key, 3600); // 1 hour

        const { data: thumbnailUrl } = await supabase.storage
          .from('screenshots')
          .createSignedUrl(screenshot.thumbnail_key, 3600);

        return {
          ...screenshot,
          image_url: imageUrl?.signedUrl,
          thumbnail_url: thumbnailUrl?.signedUrl,
        };
      })
    );

    const origin = req.headers.get('origin') ?? undefined;
    return new Response(JSON.stringify({
      screenshots: screenshotsWithUrls,
      total: screenshots?.length || 0,
      limit,
      offset,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...buildCorsHeaders(origin) }
    });

  } catch (error) {
    console.error('Get screenshots error:', error);
    const origin = req.headers.get('origin') ?? undefined;
    return new Response(JSON.stringify({ error: 'Failed to fetch screenshots' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json', ...buildCorsHeaders(origin) }
    });
  }
}
