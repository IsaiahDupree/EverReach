/**
 * PATCH/DELETE /v1/contacts/:id/channels/:channelId
 * 
 * Update or delete a specific channel
 */

import { options } from "@/lib/cors";
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase';
import {
  authenticateRequest,
  requireScope,
  setTenantContext,
  verifyResourceOwnership,
  logApiRequest,
  generateRequestId,
  getIpAddress,
} from '@/lib/api/auth';
import {
  checkMultipleRateLimits,
  addRateLimitHeaders,
} from '@/lib/api/rate-limit';
import {
  buildErrorResponse,
  NotFoundError,
  ValidationError,
  logError,
} from '@/lib/api/errors';


// ============================================================================
// PATCH - Update Channel
// ============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; channelId: string } }
): Promise<NextResponse> {
  const startTime = Date.now();
  const requestId = generateRequestId();
  const ipAddress = getIpAddress(request);
  const userAgent = request.headers.get('user-agent') || '';

  try {
    // Authenticate
    const principal = await authenticateRequest(
      request.headers.get('authorization'),
      ipAddress,
      userAgent
    );

    // Check scope
    requireScope(principal, 'contacts:write');

    // Rate limiting
    const rateLimitResult = await checkMultipleRateLimits(
      principal.apiKeyId,
      principal.orgId,
      ipAddress
    );

    if (!rateLimitResult.success) {
      const response = NextResponse.json({
        type: 'https://docs.everreach.app/errors/rate-limit',
        title: 'Rate limit exceeded',
        status: 429,
      }, { status: 429 });
      addRateLimitHeaders(response.headers, rateLimitResult);
      return response;
    }

    // Set tenant context
    await setTenantContext(principal.orgId);

    // Verify resource ownership
    const owned = await verifyResourceOwnership(principal.orgId, 'contacts', params.id);
    if (!owned) {
      throw new NotFoundError('Contact', params.id);
    }

    // Verify channel exists and belongs to contact
    const { data: existingChannel, error: fetchError } = await getSupabaseServiceClient()
      .from('contact_channels')
      .select('*')
      .eq('id', params.channelId)
      .eq('contact_id', params.id)
      .single();

    if (fetchError || !existingChannel) {
      throw new NotFoundError('Channel', params.channelId);
    }

    // Parse body
    const body = await request.json();

    // Build updates
    const updates: any = {};

    if (body.address !== undefined) updates.address = body.address;
    if (body.is_verified !== undefined) updates.is_verified = body.is_verified;
    if (body.is_default !== undefined) updates.is_default = body.is_default;
    
    if (body.opt_status !== undefined) {
      if (!['opted_in', 'opted_out', 'unknown'].includes(body.opt_status)) {
        throw new ValidationError('Invalid opt_status', [{ field: 'opt_status', message: 'Must be opted_in, opted_out, or unknown' }]);
      }
      updates.opt_status = body.opt_status;
      updates.opt_event_at = new Date().toISOString();
      
      if (body.opt_event_reason) {
        updates.opt_event_reason = body.opt_event_reason;
      }
    }

    if (body.deliverability_score !== undefined) {
      if (body.deliverability_score < 0 || body.deliverability_score > 100) {
        throw new ValidationError('Invalid deliverability_score', [{ field: 'deliverability_score', message: 'Must be between 0 and 100' }]);
      }
      updates.deliverability_score = body.deliverability_score;
    }

    if (body.affinity_score !== undefined) {
      if (body.affinity_score < 0 || body.affinity_score > 100) {
        throw new ValidationError('Invalid affinity_score', [{ field: 'affinity_score', message: 'Must be between 0 and 100' }]);
      }
      updates.affinity_score = body.affinity_score;
    }

    // Update channel
    const { data: updated, error: updateError } = await getSupabaseServiceClient()
      .from('contact_channels')
      .update(updates)
      .eq('id', params.channelId)
      .eq('contact_id', params.id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Log API request
    const responseTimeMs = Date.now() - startTime;
    await logApiRequest({
      requestId,
      apiKeyId: principal.apiKeyId,
      orgId: principal.orgId,
      method: 'PATCH',
      path: `/v1/contacts/${params.id}/channels/${params.channelId}`,
      statusCode: 200,
      responseTimeMs,
      ipAddress,
      userAgent,
      resourceType: 'contact_channels',
      resourceId: params.channelId,
      action: 'update',
    });

    // Emit webhook events
    if (body.is_default === true) {
      await getSupabaseServiceClient().rpc('emit_webhook_event', {
        p_org_id: principal.orgId,
        p_event_type: 'contact.channel.default.changed',
        p_payload: {
          contact_id: params.id,
          channel_id: params.channelId,
          channel: updated!.channel,
        },
      });
    }

    if (body.opt_status && body.opt_status !== existingChannel.opt_status) {
      await getSupabaseServiceClient().rpc('emit_webhook_event', {
        p_org_id: principal.orgId,
        p_event_type: 'contact.channel.opt_status.changed',
        p_payload: {
          contact_id: params.id,
          channel_id: params.channelId,
          channel: updated!.channel,
          old_status: existingChannel.opt_status,
          new_status: body.opt_status,
          reason: body.opt_event_reason,
        },
      });
    }

    const result = NextResponse.json({
      id: updated!.id,
      channel: updated!.channel,
      address: updated!.address,
      is_verified: updated!.is_verified,
      is_default: updated!.is_default,
      opt_status: updated!.opt_status,
      opt_event_at: updated!.opt_event_at,
      updated_at: updated!.updated_at,
    });

    addRateLimitHeaders(result.headers, rateLimitResult);
    result.headers.set('X-Request-Id', requestId);
    return result;

  } catch (error) {
    const responseTimeMs = Date.now() - startTime;
    logError(error as Error, {
      requestId,
      method: 'PATCH',
      path: `/v1/contacts/${params.id}/channels/${params.channelId}`,
    });
    return buildErrorResponse(error as Error, requestId);
  }
}

// ============================================================================
// DELETE - Remove Channel
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; channelId: string } }
): Promise<NextResponse> {
  const startTime = Date.now();
  const requestId = generateRequestId();
  const ipAddress = getIpAddress(request);
  const userAgent = request.headers.get('user-agent') || '';

  try {
    // Authenticate
    const principal = await authenticateRequest(
      request.headers.get('authorization'),
      ipAddress,
      userAgent
    );

    // Check scope
    requireScope(principal, 'contacts:write');

    // Rate limiting
    const rateLimitResult = await checkMultipleRateLimits(
      principal.apiKeyId,
      principal.orgId,
      ipAddress
    );

    if (!rateLimitResult.success) {
      const response = NextResponse.json({
        type: 'https://docs.everreach.app/errors/rate-limit',
        title: 'Rate limit exceeded',
        status: 429,
      }, { status: 429 });
      addRateLimitHeaders(response.headers, rateLimitResult);
      return response;
    }

    // Set tenant context
    await setTenantContext(principal.orgId);

    // Verify resource ownership
    const owned = await verifyResourceOwnership(principal.orgId, 'contacts', params.id);
    if (!owned) {
      throw new NotFoundError('Contact', params.id);
    }

    // Verify channel exists
    const { data: channel } = await getSupabaseServiceClient()
      .from('contact_channels')
      .select('channel')
      .eq('id', params.channelId)
      .eq('contact_id', params.id)
      .single();

    if (!channel) {
      throw new NotFoundError('Channel', params.channelId);
    }

    // Delete channel
    const { error: deleteError } = await getSupabaseServiceClient()
      .from('contact_channels')
      .delete()
      .eq('id', params.channelId)
      .eq('contact_id', params.id);

    if (deleteError) throw deleteError;

    // Log API request
    const responseTimeMs = Date.now() - startTime;
    await logApiRequest({
      requestId,
      apiKeyId: principal.apiKeyId,
      orgId: principal.orgId,
      method: 'DELETE',
      path: `/v1/contacts/${params.id}/channels/${params.channelId}`,
      statusCode: 204,
      responseTimeMs,
      ipAddress,
      userAgent,
      resourceType: 'contact_channels',
      resourceId: params.channelId,
      action: 'delete',
    });

    // Emit webhook event
    await getSupabaseServiceClient().rpc('emit_webhook_event', {
      p_org_id: principal.orgId,
      p_event_type: 'contact.channel.removed',
      p_payload: {
        contact_id: params.id,
        channel_id: params.channelId,
        channel: channel.channel,
      },
    });

    const result = new NextResponse(null, { status: 204 });
    addRateLimitHeaders(result.headers, rateLimitResult);
    result.headers.set('X-Request-Id', requestId);
    return result;

  } catch (error) {
    const responseTimeMs = Date.now() - startTime;
    logError(error as Error, {
      requestId,
      method: 'DELETE',
      path: `/v1/contacts/${params.id}/channels/${params.channelId}`,
    });
    return buildErrorResponse(error as Error, requestId);
  }
}

// ============================================================================
// OPTIONS (CORS)
// ============================================================================

export function OPTIONS(req: Request) {
  return options(req);
}
