/**
 * Dashboard Layout API
 * POST /api/dashboard/layout - Save dashboard layout and widgets
 */

import { NextRequest, NextResponse } from 'next/server';
import { getClientOrThrow } from '@/lib/supabase';
import { options, ok, unauthorized, badRequest, serverError } from '@/lib/cors';
import type { SaveDashboardRequest, SaveDashboardResponse } from '@/lib/dashboard/types';

export const runtime = 'edge';

export function OPTIONS(req: Request) {
  return options(req);
}

/**
 * POST /api/dashboard/layout
 * 
 * Body:
 * {
 *   "name": "My Dashboard",
 *   "layout": [...],
 *   "widgets": [...],
 *   "is_default": true
 * }
 */
export async function POST(req: NextRequest) {
  const supabase = getClientOrThrow(req);

  try {
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return unauthorized('Authentication required', req);
    }

    // Get user's workspace
    const { data: profile } = await supabase
      .from('profiles')
      .select('workspace_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.workspace_id) {
      return badRequest('No workspace found for user', req);
    }

    const workspaceId = profile.workspace_id;

    // Parse request body
    let body: SaveDashboardRequest;
    try {
      body = await req.json();
    } catch {
      return badRequest('Invalid JSON body', req);
    }

    if (!body.layout || !Array.isArray(body.layout)) {
      return badRequest('layout array is required', req);
    }

    if (!body.widgets || !Array.isArray(body.widgets)) {
      return badRequest('widgets array is required', req);
    }

    // If setting as default, unset other defaults
    if (body.is_default) {
      await supabase
        .from('dashboards')
        .update({ is_default: false })
        .eq('workspace_id', workspaceId)
        .eq('user_id', user.id);
    }

    // Check if dashboard exists
    const { data: existing } = await supabase
      .from('dashboards')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    let dashboardId: string;

    if (existing) {
      // Update existing dashboard
      const { data: updated, error: updateError } = await supabase
        .from('dashboards')
        .update({
          name: body.name || 'My Dashboard',
          layout: body.layout,
          widgets: body.widgets,
          is_default: body.is_default || false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select('id')
        .single();

      if (updateError) {
        console.error('[Dashboard] Update error:', updateError);
        return serverError('Failed to update dashboard', req);
      }

      dashboardId = updated.id;
    } else {
      // Insert new dashboard
      const { data: inserted, error: insertError } = await supabase
        .from('dashboards')
        .insert({
          workspace_id: workspaceId,
          user_id: user.id,
          name: body.name || 'My Dashboard',
          layout: body.layout,
          widgets: body.widgets,
          is_default: body.is_default || false,
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('[Dashboard] Insert error:', insertError);
        return serverError('Failed to create dashboard', req);
      }

      dashboardId = inserted.id;
    }

    const response: SaveDashboardResponse = {
      id: dashboardId,
      message: 'Dashboard saved successfully',
    };

    return ok(response, req);

  } catch (error: any) {
    console.error('[Dashboard] POST error:', error);
    return serverError("Internal server error", req);
  }
}
