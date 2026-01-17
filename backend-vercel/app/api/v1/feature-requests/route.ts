import { options, ok, badRequest, serverError, created } from '@/lib/cors';
import { getServiceClient } from '@/lib/supabase';

export const runtime = 'nodejs';

// Handle OPTIONS preflight requests
export async function OPTIONS(request: Request) { return options(request); }

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, title, description, email, user_id, metadata } = body as any;

    if (!type || !title || !description) {
      return badRequest('Missing required fields: type, title, description', request);
    }

    if (!['feature', 'feedback', 'bug'].includes(type)) {
      return badRequest('Invalid type. Must be: feature, feedback, or bug', request);
    }

    let supabase;
    try {
      supabase = getServiceClient();
    } catch (e: any) {
      return serverError(e?.message || 'Backend misconfigured: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY', request);
    }

    const { data, error } = await supabase
      .from('feature_requests')
      .insert({
        type,
        title,
        description,
        email,
        user_id,
        metadata,
        status: 'pending',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('[FeatureRequests] Database error:', error);
      return serverError('Failed to save feature request', request);
    }

    console.log('[FeatureRequests] Created:', data.id);

    return created({ success: true, id: data.id, message: 'Feature request submitted successfully' }, request);
  } catch (error: any) {
    console.error('[FeatureRequests] Error:', error);
    return serverError(error?.message || 'Internal server error', request);
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '50');

    let supabase;
    try {
      supabase = getServiceClient();
    } catch (e: any) {
      return serverError(e?.message || 'Backend misconfigured: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY', request);
    }

    let query = supabase
      .from('feature_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[FeatureRequests] Query error:', error);
      return serverError('Failed to fetch feature requests', request);
    }

    return ok({ success: true, items: data, count: data?.length || 0 }, request);
  } catch (error: any) {
    console.error('[FeatureRequests] Error:', error);
    return serverError(error?.message || 'Internal server error', request);
  }
}
