/**
 * GET/POST /v1/contacts/:id/channels
 * 
 * Manage contact communication channels (endpoints)
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
  validateRequired,
  logError,
} from '@/lib/api/errors';


// ============================================================================
// GET - List Contact Channels
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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
    requireScope(principal, 'contacts:read');

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

    // Fetch channels
    const { data: channels, error } = await getSupabaseServiceClient()
      .from('contact_channels')
      .select('*')
      .eq('contact_id', params.id)
      .order('is_default', { ascending: false })
      .order('affinity_score', { ascending: false, nullsFirst: false });

    if (error) throw error;

    // Format response
    const response = (channels || []).map((ch: any) => ({
      id: ch.id,
      channel: ch.channel,
      address: ch.address,
      is_verified: ch.is_verified,
      is_default: ch.is_default,
      opt_status: ch.opt_status,
      opt_event_at: ch.opt_event_at,
      opt_event_reason: ch.opt_event_reason,
      performance: {
        last_interaction_at: ch.last_interaction_at,
        deliverability_score: ch.deliverability_score,
        affinity_score: ch.affinity_score,
        reply_rate: ch.reply_rate,
        avg_reply_time_minutes: ch.avg_reply_time_minutes,
      },
      created_at: ch.created_at,
      updated_at: ch.updated_at,
    }));

    // Log API request
    const responseTimeMs = Date.now() - startTime;
    await logApiRequest({
      requestId,
      apiKeyId: principal.apiKeyId,
      orgId: principal.orgId,
      method: 'GET',
      path: `/v1/contacts/${params.id}/channels`,
      statusCode: 200,
      responseTimeMs,
      ipAddress,
      userAgent,
      resourceType: 'contact_channels',
      resourceId: params.id,
      action: 'list',
    });

    const result = NextResponse.json({ channels: response });
    addRateLimitHeaders(result.headers, rateLimitResult);
    result.headers.set('X-Request-Id', requestId);
    return result;

  } catch (error) {
    const responseTimeMs = Date.now() - startTime;
    logError(error as Error, {
      requestId,
      method: 'GET',
      path: `/v1/contacts/${params.id}/channels`,
    });
    return buildErrorResponse(error as Error, requestId);
  }
}

// ============================================================================
// POST - Add Contact Channel
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    // Parse body
    const body = await request.json();

    // Validate required fields
    validateRequired(body, ['channel', 'address']);

    // Validate channel type
    const validChannels = [
      'sms', 'email', 'call', 'whatsapp', 'telegram',
      'ig_dm', 'x_dm', 'linkedin_dm', 'facebook_messenger',
      'discord', 'slack', 'other'
    ];
    if (!validChannels.includes(body.channel)) {
      throw new ValidationError('Invalid channel', [{ field: 'channel', message: `Must be one of: ${validChannels.join(', ')}` }]);
    }

    // Validate opt_status
    if (body.opt_status && !['opted_in', 'opted_out', 'unknown'].includes(body.opt_status)) {
      throw new ValidationError('Invalid opt_status', [{ field: 'opt_status', message: 'Must be opted_in, opted_out, or unknown' }]);
    }

    // Insert channel
    const { data: channel, error: insertError } = await getSupabaseServiceClient()
      .from('contact_channels')
      .insert({
        contact_id: params.id,
        channel: body.channel,
        address: body.address,
        is_verified: body.is_verified || false,
        is_default: body.is_default || false,
        opt_status: body.opt_status || 'unknown',
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === '23505') { // Unique violation
        throw new ValidationError('Duplicate channel', [{ field: 'channel', message: 'This channel and address already exist for this contact' }]);
      }
      throw insertError;
    }

    // Log API request
    const responseTimeMs = Date.now() - startTime;
    await logApiRequest({
      requestId,
      apiKeyId: principal.apiKeyId,
      orgId: principal.orgId,
      method: 'POST',
      path: `/v1/contacts/${params.id}/channels`,
      statusCode: 201,
      responseTimeMs,
      ipAddress,
      userAgent,
      resourceType: 'contact_channels',
      resourceId: channel!.id,
      action: 'create',
    });

    // Emit webhook event
    await getSupabaseServiceClient().rpc('emit_webhook_event', {
      p_org_id: principal.orgId,
      p_event_type: 'contact.channel.added',
      p_payload: {
        contact_id: params.id,
        channel_id: channel!.id,
        channel: body.channel,
        is_default: body.is_default || false,
      },
    });

    const result = NextResponse.json({
      id: channel!.id,
      channel: channel!.channel,
      address: channel!.address,
      is_verified: channel!.is_verified,
      is_default: channel!.is_default,
      opt_status: channel!.opt_status,
      created_at: channel!.created_at,
    }, { status: 201 });

    addRateLimitHeaders(result.headers, rateLimitResult);
    result.headers.set('X-Request-Id', requestId);
    return result;

  } catch (error) {
    const responseTimeMs = Date.now() - startTime;
    logError(error as Error, {
      requestId,
      method: 'POST',
      path: `/v1/contacts/${params.id}/channels`,
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
