/**
 * Individual Screenshot Endpoint
 * 
 * GET /api/v1/screenshots/:id - Get screenshot with analysis
 * DELETE /api/v1/screenshots/:id - Delete screenshot
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { options } from '@/lib/cors';

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * GET - Fetch screenshot with analysis
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = getSupabase();
    // Get user from JWT
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Fetch screenshot with analysis
    const { data: screenshot, error } = await supabase
      .from('screenshots')
      .select(`
        *,
        analysis:screenshot_analysis(*)
      `)
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (error || !screenshot) {
      return NextResponse.json(
        { error: 'Screenshot not found' },
        { status: 404 }
      );
    }

    // Generate signed URLs for images
    const { data: imageUrl } = await supabase.storage
      .from('screenshots')
      .createSignedUrl(screenshot.storage_key, 3600); // 1 hour

    const { data: thumbnailUrl } = await supabase.storage
      .from('screenshots')
      .createSignedUrl(screenshot.thumbnail_key, 3600);

    return NextResponse.json({
      ...screenshot,
      image_url: imageUrl?.signedUrl,
      thumbnail_url: thumbnailUrl?.signedUrl,
    });

  } catch (error) {
    console.error('Get screenshot error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch screenshot' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete screenshot and analysis
 */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = getSupabase();
    // Get user from JWT
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Fetch screenshot to get storage keys
    const { data: screenshot, error: fetchError } = await supabase
      .from('screenshots')
      .select('storage_key, thumbnail_key')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !screenshot) {
      return NextResponse.json(
        { error: 'Screenshot not found' },
        { status: 404 }
      );
    }

    // Delete from storage
    await supabase.storage
      .from('screenshots')
      .remove([screenshot.storage_key, screenshot.thumbnail_key]);

    // Delete from database (cascade will delete analysis)
    const { error: deleteError } = await supabase
      .from('screenshots')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({
      success: true,
      message: 'Screenshot deleted successfully',
    });

  } catch (error) {
    console.error('Delete screenshot error:', error);
    return NextResponse.json(
      { error: 'Failed to delete screenshot' },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS - CORS preflight
 */
export async function OPTIONS(req: NextRequest) {
  return options(req);
}
