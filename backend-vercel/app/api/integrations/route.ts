/**
 * Integration Management API
 * GET /api/integrations - List all integrations
 * POST /api/integrations - Connect a new service
 */

import { NextRequest, NextResponse } from 'next/server';
import { getClientOrThrow } from '@/lib/supabase';
import { options, ok, unauthorized, badRequest, serverError } from '@/lib/cors';
import { getRegisteredServices, hasAdapter } from '@/lib/dashboard/adapter-registry';

export const runtime = 'edge';

export function OPTIONS(req: Request) {
  return options(req);
}

/**
 * GET /api/integrations
 * 
 * Returns all configured integrations for the workspace
 */
export async function GET(req: NextRequest) {
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
      return ok({ integrations: [], available_services: getRegisteredServices() }, req);
    }

    const workspaceId = profile.workspace_id;

    // Fetch configured integrations
    const { data: integrations, error: integrationsError } = await supabase
      .from('integration_accounts')
      .select('id, service, scopes, last_refresh, is_active, created_at, updated_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (integrationsError) {
      console.error('[Integrations] GET error:', integrationsError);
      return serverError('Failed to fetch integrations', req);
    }

    // Don't expose auth_json (encrypted credentials)
    const sanitized = (integrations || []).map(int => ({
      ...int,
      has_adapter: hasAdapter(int.service),
    }));

    return ok({
      integrations: sanitized,
      available_services: getRegisteredServices(),
    }, req);

  } catch (error: any) {
    console.error('[Integrations] GET error:', error);
    return serverError("Internal server error", req);
  }
}

/**
 * POST /api/integrations
 * 
 * Connect a new service integration
 * 
 * Body:
 * {
 *   "service": "stripe",
 *   "credentials": { "api_key": "sk_..." },
 *   "scopes": ["read", "write"]
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
    let body: any;
    try {
      body = await req.json();
    } catch {
      return badRequest('Invalid JSON body', req);
    }

    if (!body.service || typeof body.service !== 'string') {
      return badRequest('service is required', req);
    }

    if (!body.credentials || typeof body.credentials !== 'object') {
      return badRequest('credentials object is required', req);
    }

    // Check if service has an adapter
    if (!hasAdapter(body.service)) {
      return badRequest(`No adapter available for service: ${body.service}`, req);
    }

    // Check if integration already exists
    const { data: existing } = await supabase
      .from('integration_accounts')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('service', body.service)
      .single();

    if (existing) {
      // Update existing integration
      const { data: updated, error: updateError } = await supabase
        .from('integration_accounts')
        .update({
          auth_json: body.credentials, // Store encrypted in production
          scopes: body.scopes || [],
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select('id, service, scopes, is_active')
        .single();

      if (updateError) {
        console.error('[Integrations] Update error:', updateError);
        return serverError('Failed to update integration', req);
      }

      return ok({
        ...updated,
        message: 'Integration updated successfully',
      }, req);
    } else {
      // Insert new integration
      const { data: inserted, error: insertError } = await supabase
        .from('integration_accounts')
        .insert({
          workspace_id: workspaceId,
          service: body.service,
          auth_json: body.credentials, // Store encrypted in production
          scopes: body.scopes || [],
          is_active: true,
        })
        .select('id, service, scopes, is_active')
        .single();

      if (insertError) {
        console.error('[Integrations] Insert error:', insertError);
        return serverError('Failed to create integration', req);
      }

      return ok({
        ...inserted,
        message: 'Integration connected successfully',
      }, req);
    }

  } catch (error: any) {
    console.error('[Integrations] POST error:', error);
    return serverError("Internal server error", req);
  }
}
