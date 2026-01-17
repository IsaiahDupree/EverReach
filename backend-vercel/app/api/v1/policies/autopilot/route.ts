/**
 * GET/POST /v1/policies/autopilot
 * 
 * Manage organization-wide autopilot policies (guardrails)
 */

import { options } from "@/lib/cors";
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase';
import {
  authenticateRequest,
  requireScope,
  setTenantContext,
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
  ValidationError,
  validateRequired,
  logError,
} from '@/lib/api/errors';

// Build-safe: Supabase client created lazily inside request handlers

// ============================================================================
// GET - Fetch Autopilot Policies
// ============================================================================

export async function GET(
  request: NextRequest
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
    requireScope(principal, 'contacts:read'); // Or create policies:read scope

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

    // Fetch policies (create default if not exists)
    let { data: policies, error } = await getSupabaseServiceClient()
      .from('tenant_policies')
      .select('*')
      .eq('org_id', principal.orgId)
      .single();

    if (error && error.code === 'PGRST116') {
      // Not found, create default
      const { data: created } = await getSupabaseServiceClient().rpc('create_default_tenant_policies', {
        p_org_id: principal.orgId,
      });

      // Fetch the created policies
      const { data: fetchedPolicies } = await getSupabaseServiceClient()
        .from('tenant_policies')
        .select('*')
        .eq('org_id', principal.orgId)
        .single();

      policies = fetchedPolicies;
    } else if (error) {
      throw error;
    }

    // Format response
    const response = {
      version: policies!.version,
      policy_sets: policies!.policy_sets,
      extras: policies!.extras || {},
      updated_at: policies!.updated_at,
    };

    // Log API request
    const responseTimeMs = Date.now() - startTime;
    await logApiRequest({
      requestId,
      apiKeyId: principal.apiKeyId,
      orgId: principal.orgId,
      method: 'GET',
      path: '/v1/policies/autopilot',
      statusCode: 200,
      responseTimeMs,
      ipAddress,
      userAgent,
      resourceType: 'tenant_policies',
      resourceId: principal.orgId,
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
      path: '/v1/policies/autopilot',
    });
    return buildErrorResponse(error as Error, requestId);
  }
}

// ============================================================================
// POST - Upsert Autopilot Policies
// ============================================================================

export async function POST(
  request: NextRequest
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

    // Check scope (require write or admin)
    requireScope(principal, 'contacts:write'); // Or create policies:write scope

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

    // Parse body
    const body = await request.json();

    // Validate required fields
    validateRequired(body, ['policy_sets']);

    if (!Array.isArray(body.policy_sets)) {
      throw new ValidationError('Invalid policy_sets', [{ field: 'policy_sets', message: 'Must be an array' }]);
    }

    // Validate policy_sets structure
    const validKeys = ['send_caps', 'approvals', 'budgets', 'compliance'];
    for (const policySet of body.policy_sets) {
      if (!policySet.key || !validKeys.includes(policySet.key)) {
        throw new ValidationError(
          'Invalid policy_sets',
          [{ field: 'policy_sets', message: `Each policy set must have a key from: ${validKeys.join(', ')}` }]
        );
      }
      if (!policySet.rules) {
        throw new ValidationError('Invalid policy_sets', [{ field: 'policy_sets', message: 'Each policy set must have rules' }]);
      }
    }

    // Get current version
    const { data: current } = await getSupabaseServiceClient()
      .from('tenant_policies')
      .select('version')
      .eq('org_id', principal.orgId)
      .single();

    const newVersion = body.version || (current?.version || 0) + 1;

    // Upsert policies
    const { data: updated, error: upsertError } = await getSupabaseServiceClient()
      .from('tenant_policies')
      .upsert({
        org_id: principal.orgId,
        version: newVersion,
        policy_sets: body.policy_sets,
        extras: body.extras || {},
      }, {
        onConflict: 'org_id',
      })
      .select()
      .single();

    if (upsertError) throw upsertError;

    // Log API request
    const responseTimeMs = Date.now() - startTime;
    await logApiRequest({
      requestId,
      apiKeyId: principal.apiKeyId,
      orgId: principal.orgId,
      method: 'POST',
      path: '/v1/policies/autopilot',
      statusCode: 200,
      responseTimeMs,
      ipAddress,
      userAgent,
      resourceType: 'tenant_policies',
      resourceId: principal.orgId,
      action: 'upsert',
    });

    // Emit webhook event
    await getSupabaseServiceClient().rpc('emit_webhook_event', {
      p_org_id: principal.orgId,
      p_event_type: 'policies.updated',
      p_payload: {
        version: newVersion,
        policy_keys: body.policy_sets.map((ps: any) => ps.key),
      },
    });

    const result = NextResponse.json({
      version: updated!.version,
      policy_sets: updated!.policy_sets,
      extras: updated!.extras,
      updated_at: updated!.updated_at,
    });

    addRateLimitHeaders(result.headers, rateLimitResult);
    result.headers.set('X-Request-Id', requestId);
    return result;

  } catch (error) {
    const responseTimeMs = Date.now() - startTime;
    logError(error as Error, {
      requestId,
      method: 'POST',
      path: '/v1/policies/autopilot',
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
