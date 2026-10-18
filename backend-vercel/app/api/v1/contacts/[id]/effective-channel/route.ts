/**
 * GET /v1/contacts/:id/effective-channel
 * 
 * Returns the best channel to use right now, respecting quiet hours and opt-outs
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
  logError,
} from '@/lib/api/errors';

// Build-safe: Supabase client created lazily inside request handlers

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

    // Call SQL function to get effective channel
    const { data, error } = await getSupabaseServiceClient().rpc('get_effective_channel', {
      p_contact_id: params.id,
      p_now: new Date().toISOString(),
    });

    if (error) throw error;

    const result = data?.[0];

    if (!result) {
      throw new NotFoundError('Contact', params.id);
    }

    // Format response
    const response = {
      channel: result.channel,
      address: result.address,
      can_send: result.can_send,
      reason: result.reason,
      is_quiet_hours: result.is_quiet_hours,
      recommendation: result.can_send 
        ? `Send via ${result.channel} to ${result.address}`
        : `Cannot send: ${result.reason}`,
    };

    // Log API request
    const responseTimeMs = Date.now() - startTime;
    await logApiRequest({
      requestId,
      apiKeyId: principal.apiKeyId,
      orgId: principal.orgId,
      method: 'GET',
      path: `/v1/contacts/${params.id}/effective-channel`,
      statusCode: 200,
      responseTimeMs,
      ipAddress,
      userAgent,
      resourceType: 'contact_channels',
      resourceId: params.id,
      action: 'effective_channel',
    });

    const res = NextResponse.json(response);
    addRateLimitHeaders(res.headers, rateLimitResult);
    res.headers.set('X-Request-Id', requestId);
    return res;

  } catch (error) {
    const responseTimeMs = Date.now() - startTime;
    logError(error as Error, {
      requestId,
      method: 'GET',
      path: `/v1/contacts/${params.id}/effective-channel`,
    });
    return buildErrorResponse(error as Error, requestId);
  }
}

export function OPTIONS(req: Request) {
  return options(req);
}
