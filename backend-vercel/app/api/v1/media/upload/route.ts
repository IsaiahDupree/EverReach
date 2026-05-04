import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { options } from '@/lib/cors';

export const runtime = 'nodejs';

export function OPTIONS(req: Request) {
  return options(req);
}

// Simple auth using service role to verify user token
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await req.json();
    const {
      file_name,
      mime_type,
      base64_data,
      bucket = 'screenshots',
      folder = `users/${user.id}`,
    } = body || {};

    if (!file_name || !mime_type || !base64_data) {
      return NextResponse.json({ error: 'file_name, mime_type, and base64_data are required' }, { status: 400 });
    }

    // Build storage path
    const ts = Date.now();
    const cleanName = String(file_name).replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${folder.replace(/\/$/, '')}/${ts}-${cleanName}`;

    // Convert base64 to buffer
    const buffer = Buffer.from(base64_data, 'base64');

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, buffer, { contentType: mime_type, upsert: true });

    if (uploadError) {
      console.error('[media/upload] Storage upload error:', uploadError);
      return NextResponse.json({ error: 'upload_failed', details: uploadError.message }, { status: 500 });
    }

    // Generate a signed URL (1 hour) for preview
    const { data: signed, error: urlError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 3600);

    if (urlError) {
      console.warn('[media/upload] Signed URL generation failed:', urlError.message);
    }

    return NextResponse.json({
      path,
      bucket,
      mime_type,
      public_url: signed?.signedUrl || null,
    }, { status: 201 });
  } catch (e: any) {
    console.error('[media/upload] Unexpected error:', e?.message || e);
    return NextResponse.json({ error: 'internal_error', details: e?.message || 'unknown' }, { status: 500 });
  }
}
