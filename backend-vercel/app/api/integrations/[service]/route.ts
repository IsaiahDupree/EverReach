/**
 * Single Integration Management API
 * DELETE /api/integrations/:service - Disconnect a service
 */

import { NextRequest, NextResponse } from 'next/server';
import { getClientOrThrow } from '@/lib/supabase';
import { options, ok, unauthorized, notFound, serverError } from '@/lib/cors';

export const runtime = 'edge';

export function OPTIONS(req: Request) {
  return options(req);
}

/**
 * DELETE /api/integrations/:service
 * 
 * Disconnect a service integration
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { service: string } }
) {
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
      return notFound('Workspace not found', req);
    }

    const workspaceId = profile.workspace_id;
    const service = params.service;

    // Check if integration exists
    const { data: existing } = await supabase
      .from('integration_accounts')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('service', service)
      .single();

    if (!existing) {
      return notFound(`Integration not found: ${service}`, req);
    }

    // Delete the integration
    const { error: deleteError } = await supabase
      .from('integration_accounts')
      .delete()
      .eq('id', existing.id);

    if (deleteError) {
      console.error('[Integrations] Delete error:', deleteError);
      return serverError('Failed to delete integration', req);
    }

    return ok({
      message: `Integration disconnected: ${service}`,
      service,
    }, req);

  } catch (error: any) {
    console.error('[Integrations] DELETE error:', error);
    return serverError(error.message || 'Internal server error', req);
  }
}
