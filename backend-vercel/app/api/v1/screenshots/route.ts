/**
 * Screenshot Upload Endpoint
 * 
 * POST /api/v1/screenshots - Upload and analyze screenshot
 * GET /api/v1/screenshots - List user's screenshots
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { screenshot } from '@/lib/analytics';
import { options, buildCorsHeaders } from '@/lib/cors';

// Force dynamic rendering - don't evaluate at build time
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * POST - Upload screenshot for analysis
 */
export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin') ?? undefined;
  
  try {
    const supabase = getSupabase();
    // Get user from JWT
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { 
        status: 401,
        headers: buildCorsHeaders(origin)
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { 
        status: 401,
        headers: buildCorsHeaders(origin)
      });
    }

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const context = formData.get('context') as string || 'general';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { 
        status: 400,
        headers: buildCorsHeaders(origin)
      });
    }

    // Validate file
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400, headers: buildCorsHeaders(origin) }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' },
        { status: 400, headers: buildCorsHeaders(origin) }
      );
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Get image metadata
    const sharp = (await import('sharp')).default;
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
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500, headers: buildCorsHeaders(origin) }
      );
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
      return NextResponse.json(
        { error: 'Failed to create record' },
        { status: 500, headers: buildCorsHeaders(origin) }
      );
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

    // Trigger analysis asynchronously (fire and forget)
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/screenshots/${screenshotRecord.id}/analyze`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ context }),
    }).catch(err => {
      console.error('Failed to trigger analysis:', err);
    });

    return NextResponse.json({
      screenshot_id: screenshotRecord.id,
      analysis_id: analysisRecord?.id,
      status: 'queued',
      message: 'Screenshot uploaded successfully. Analysis in progress.',
    }, { status: 201, headers: buildCorsHeaders(origin) });

  } catch (error) {
    console.error('Screenshot upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed', details: (error as Error).message },
      { status: 500, headers: buildCorsHeaders(origin) }
    );
  }
}

/**
 * GET - List user's screenshots
 */
export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin') ?? undefined;
  
  try {
    const supabase = getSupabase();
    // Get user from JWT
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { 
        status: 401,
        headers: buildCorsHeaders(origin)
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { 
        status: 401,
        headers: buildCorsHeaders(origin)
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
      return NextResponse.json(
        { error: 'Failed to fetch screenshots' },
        { status: 500, headers: buildCorsHeaders(origin) }
      );
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

    return NextResponse.json({
      screenshots: screenshotsWithUrls,
      total: screenshots?.length || 0,
      limit,
      offset,
    }, { headers: buildCorsHeaders(origin) });

  } catch (error) {
    console.error('Get screenshots error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch screenshots' },
      { status: 500, headers: buildCorsHeaders(origin) }
    );
  }
}

/**
 * OPTIONS - CORS preflight
 */
export async function OPTIONS(req: NextRequest) {
  return options(req);
}
