/**
 * GET/PATCH /v1/contacts/:id/preferences
 * 
 * Manage contact communication preferences
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

// Build-safe: Supabase client created lazily inside request handlers

// ============================================================================
// GET - Fetch Contact Preferences
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

    // Fetch preferences (create default if not exists)
    let { data: prefs, error } = await getSupabaseServiceClient()
      .from('contact_preferences')
      .select('*')
      .eq('contact_id', params.id)
      .single();

    if (error && error.code === 'PGRST116') {
      // Not found, create default
      const { data: created, error: createError } = await getSupabaseServiceClient()
        .from('contact_preferences')
        .insert({
          contact_id: params.id,
          timezone: 'America/New_York',
          contact_frequency: 'normal',
          allow_ai_outreach: true,
        })
        .select()
        .single();

      if (createError) throw createError;
      prefs = created;
    } else if (error) {
      throw error;
    }

    // Format response
    const response = {
      preferred_channel: prefs!.preferred_channel,
      backup_channels: prefs!.backup_channels || [],
      quiet_hours: prefs!.quiet_hours_start ? {
        tz: prefs!.timezone,
        start: prefs!.quiet_hours_start,
        end: prefs!.quiet_hours_end,
      } : null,
      locale: prefs!.locale,
      contact_frequency: prefs!.contact_frequency,
      allow_ai_outreach: prefs!.allow_ai_outreach,
      content: {
        tone: prefs!.content_tone,
        length: prefs!.content_length,
        topics_blocklist: prefs!.topics_blocklist || [],
      },
      scheduling: {
        preferred_days: prefs!.preferred_days || [],
        preferred_hours: prefs!.preferred_hours_start?.map((start: string, i: number) => ({
          start,
          end: prefs!.preferred_hours_end?.[i],
        })) || [],
      },
      escalation: prefs!.escalation_enabled ? {
        no_reply_hours: prefs!.escalation_no_reply_hours,
        channel: prefs!.escalation_channel,
      } : null,
      accessibility: {
        alt_text_required: prefs!.alt_text_required,
        html_email_ok: prefs!.html_email_ok,
      },
      privacy: {
        double_opt_in_required: prefs!.double_opt_in_required || {},
      },
      extras: prefs!.extras || {},
      last_confirmed_at: prefs!.last_confirmed_at,
    };

    // Log API request
    const responseTimeMs = Date.now() - startTime;
    await logApiRequest({
      requestId,
      apiKeyId: principal.apiKeyId,
      orgId: principal.orgId,
      method: 'GET',
      path: `/v1/contacts/${params.id}/preferences`,
      statusCode: 200,
      responseTimeMs,
      ipAddress,
      userAgent,
      resourceType: 'contact_preferences',
      resourceId: params.id,
      action: 'read',
    });

    const result = NextResponse.json(response);
    addRateLimitHeaders(result.headers, rateLimitResult);
    result.headers.set('X-Request-Id', requestId);
    return result;

  } catch (error) {
    const responseTimeMs = Date.now() - startTime;
    logError(error as Error, {
      requestId,
      method: 'GET',
      path: `/v1/contacts/${params.id}/preferences`,
    });
    return buildErrorResponse(error as Error, requestId);
  }
}

// ============================================================================
// PATCH - Update Contact Preferences (JSON Merge Patch)
// ============================================================================

export async function PATCH(
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

    // Build update object
    const updates: any = {};

    if (body.preferred_channel !== undefined) {
      updates.preferred_channel = body.preferred_channel;
    }
    if (body.backup_channels !== undefined) {
      updates.backup_channels = body.backup_channels;
    }
    if (body.locale !== undefined) {
      updates.locale = body.locale;
    }
    if (body.contact_frequency !== undefined) {
      updates.contact_frequency = body.contact_frequency;
    }
    if (body.allow_ai_outreach !== undefined) {
      updates.allow_ai_outreach = body.allow_ai_outreach;
    }

    // Quiet hours
    if (body.quiet_hours !== undefined) {
      if (body.quiet_hours === null) {
        updates.quiet_hours_start = null;
        updates.quiet_hours_end = null;
        updates.timezone = 'America/New_York';
      } else {
        updates.timezone = body.quiet_hours.tz || 'America/New_York';
        updates.quiet_hours_start = body.quiet_hours.start;
        updates.quiet_hours_end = body.quiet_hours.end;
      }
    }

    // Content preferences
    if (body.content) {
      if (body.content.tone !== undefined) updates.content_tone = body.content.tone;
      if (body.content.length !== undefined) updates.content_length = body.content.length;
      if (body.content.topics_blocklist !== undefined) updates.topics_blocklist = body.content.topics_blocklist;
    }

    // Scheduling
    if (body.scheduling) {
      if (body.scheduling.preferred_days !== undefined) {
        updates.preferred_days = body.scheduling.preferred_days;
      }
      if (body.scheduling.preferred_hours !== undefined) {
        updates.preferred_hours_start = body.scheduling.preferred_hours.map((h: any) => h.start);
        updates.preferred_hours_end = body.scheduling.preferred_hours.map((h: any) => h.end);
      }
    }

    // Escalation
    if (body.escalation !== undefined) {
      if (body.escalation === null) {
        updates.escalation_enabled = false;
        updates.escalation_no_reply_hours = null;
        updates.escalation_channel = null;
      } else {
        updates.escalation_enabled = true;
        updates.escalation_no_reply_hours = body.escalation.no_reply_hours;
        updates.escalation_channel = body.escalation.channel;
      }
    }

    // Accessibility
    if (body.accessibility) {
      if (body.accessibility.alt_text_required !== undefined) {
        updates.alt_text_required = body.accessibility.alt_text_required;
      }
      if (body.accessibility.html_email_ok !== undefined) {
        updates.html_email_ok = body.accessibility.html_email_ok;
      }
    }

    // Privacy
    if (body.privacy?.double_opt_in_required !== undefined) {
      updates.double_opt_in_required = body.privacy.double_opt_in_required;
    }

    // Extras (JSON Merge Patch)
    if (body.extras !== undefined) {
      // Fetch current extras
      const { data: current } = await getSupabaseServiceClient()
        .from('contact_preferences')
        .select('extras')
        .eq('contact_id', params.id)
        .single();

      updates.extras = {
        ...(current?.extras || {}),
        ...body.extras,
      };
    }

    // Upsert preferences
    const { data: updated, error: updateError } = await getSupabaseServiceClient()
      .from('contact_preferences')
      .upsert({
        contact_id: params.id,
        ...updates,
      }, {
        onConflict: 'contact_id',
      })
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
      path: `/v1/contacts/${params.id}/preferences`,
      statusCode: 200,
      responseTimeMs,
      ipAddress,
      userAgent,
      resourceType: 'contact_preferences',
      resourceId: params.id,
      action: 'update',
    });

    // Emit webhook event
    await getSupabaseServiceClient().rpc('emit_webhook_event', {
      p_org_id: principal.orgId,
      p_event_type: 'contact.preferences.updated',
      p_payload: {
        contact_id: params.id,
        updated_fields: Object.keys(updates),
      },
    });

    const result = NextResponse.json({
      success: true,
      contact_id: params.id,
      updated_fields: Object.keys(updates),
    });
    addRateLimitHeaders(result.headers, rateLimitResult);
    result.headers.set('X-Request-Id', requestId);
    return result;

  } catch (error) {
    const responseTimeMs = Date.now() - startTime;
    logError(error as Error, {
      requestId,
      method: 'PATCH',
      path: `/v1/contacts/${params.id}/preferences`,
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
