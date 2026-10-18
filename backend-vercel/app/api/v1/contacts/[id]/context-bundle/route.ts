/**
 * GET /v1/contacts/:id/context-bundle
 * 
 * Most important endpoint for AI agents!
 * Returns compact, LLM-ready context for a contact
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
  ForbiddenError,
  logError,
} from '@/lib/api/errors';

// Build-safe: Supabase client created lazily inside request handlers

// ============================================================================
// TYPES
// ============================================================================

interface ContextBundle {
  // Core contact info
  contact: {
    id: string;
    name: string;
    emails: string[];
    phones: string[];
    tags: string[];
    warmth_score: number;
    warmth_band: 'hot' | 'warm' | 'cooling' | 'cold';
    last_touch_at: string | null;
    custom_fields: Record<string, any>;
  };
  
  // Recent interactions (summarized)
  interactions: Array<{
    id: string;
    channel: string;
    direction: 'inbound' | 'outbound';
    summary: string;
    sentiment: string | null;
    occurred_at: string;
  }>;
  
  // Current pipeline/stage
  pipeline: {
    pipeline_id: string | null;
    pipeline_name: string | null;
    stage_id: string | null;
    stage_name: string | null;
  };
  
  // Pending tasks (future)
  tasks: Array<{
    id: string;
    title: string;
    due_at: string | null;
  }>;
  
  // AI context helpers
  context: {
    // Token-cheap prompt skeleton
    prompt_skeleton: string;
    
    // Brand do/don't rules
    brand_rules: {
      tone: string;
      do: string[];
      dont: string[];
    };
    
    // Channel preferences
    preferred_channel: string | null;
    quiet_hours: { start: string; end: string } | null;
    
    // Flags
    flags: {
      dnc: boolean; // Do not contact
      requires_approval: boolean;
    };
  };
  
  // Metadata
  meta: {
    generated_at: string;
    token_estimate: number; // Rough token count
  };
}

// ============================================================================
// HANDLER
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
      ipAddress,
      'GET:/v1/contacts/:id/context-bundle'
    );

    if (!rateLimitResult.success) {
      const response = NextResponse.json({
        type: 'https://docs.everreach.app/errors/rate-limit',
        title: 'Rate limit exceeded',
        status: 429,
        detail: 'Too many requests',
        instance: requestId,
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

    // Get query params
    const url = new URL(request.url);
    const interactionsLimit = Math.min(parseInt(url.searchParams.get('interactions') || '20'), 50);

    // Fetch contact
    const { data: contact, error: contactError } = await getSupabaseServiceClient()
      .from('contacts')
      .select('*')
      .eq('id', params.id)
      .single();

    if (contactError || !contact) {
      throw new NotFoundError('Contact', params.id);
    }

    // Fetch recent interactions
    const { data: interactions, error: interactionsError } = await getSupabaseServiceClient()
      .from('interactions')
      .select('id, channel, direction, summary, sentiment, occurred_at')
      .eq('contact_id', params.id)
      .order('occurred_at', { ascending: false })
      .limit(interactionsLimit);

    if (interactionsError) {
      console.error('Failed to fetch interactions:', interactionsError);
    }

    // Fetch pipeline/stage info
    let pipelineInfo = {
      pipeline_id: contact.pipeline_id,
      pipeline_name: null,
      stage_id: contact.stage_id,
      stage_name: null,
    };

    if (contact.pipeline_id) {
      const { data: pipeline } = await getSupabaseServiceClient()
        .from('pipelines')
        .select('name')
        .eq('id', contact.pipeline_id)
        .single();
      
      if (pipeline) {
        pipelineInfo.pipeline_name = pipeline.name;
      }
    }

    if (contact.stage_id) {
      const { data: stage } = await getSupabaseServiceClient()
        .from('stages')
        .select('name')
        .eq('id', contact.stage_id)
        .single();
      
      if (stage) {
        pipelineInfo.stage_name = stage.name;
      }
    }

    // Build prompt skeleton (compact context for LLMs)
    const promptSkeleton = buildPromptSkeleton(contact, interactions || []);

    // Estimate token count (rough heuristic: 1 token ≈ 4 chars)
    const jsonString = JSON.stringify({ contact, interactions, pipelineInfo });
    const tokenEstimate = Math.ceil(jsonString.length / 4);

    // Build context bundle
    const bundle: ContextBundle = {
      contact: {
        id: contact.id,
        name: contact.name,
        emails: contact.emails || [],
        phones: contact.phones || [],
        tags: contact.tags || [],
        warmth_score: contact.warmth_score || 0,
        warmth_band: contact.warmth_band || 'cold',
        last_touch_at: contact.last_touch_at,
        custom_fields: contact.custom || {},
      },
      interactions: (interactions || []).map(i => ({
        id: i.id,
        channel: i.channel,
        direction: i.direction,
        summary: i.summary,
        sentiment: i.sentiment,
        occurred_at: i.occurred_at,
      })),
      pipeline: pipelineInfo,
      tasks: [], // TODO: Fetch tasks when implemented
      context: {
        prompt_skeleton: promptSkeleton,
        brand_rules: {
          tone: 'friendly, professional',
          do: [
            'Be warm and personable',
            'Reference previous interactions',
            'Use their preferred name',
          ],
          dont: [
            'Be overly formal',
            'Send generic templated messages',
            'Contact during quiet hours',
          ],
        },
        preferred_channel: contact.preferred_channel || null,
        quiet_hours: null, // TODO: Fetch from preferences
        flags: {
          dnc: contact.tags?.includes('dnc') || false,
          requires_approval: false, // TODO: Check org policies
        },
      },
      meta: {
        generated_at: new Date().toISOString(),
        token_estimate: tokenEstimate,
      },
    };

    // Log API request
    const responseTimeMs = Date.now() - startTime;
    await logApiRequest({
      requestId,
      apiKeyId: principal.apiKeyId,
      orgId: principal.orgId,
      method: 'GET',
      path: `/v1/contacts/${params.id}/context-bundle`,
      queryParams: { interactions: interactionsLimit },
      statusCode: 200,
      responseTimeMs,
      ipAddress,
      userAgent,
      resourceType: 'contact',
      resourceId: params.id,
      action: 'read',
    });

    const response = NextResponse.json(bundle);
    addRateLimitHeaders(response.headers, rateLimitResult);
    response.headers.set('X-Request-Id', requestId);
    
    return response;

  } catch (error) {
    const responseTimeMs = Date.now() - startTime;
    
    logError(error as Error, {
      requestId,
      method: 'GET',
      path: `/v1/contacts/${params.id}/context-bundle`,
    });

    // Log error request (if we have principal)
    // This will fail if auth failed, but that's OK

    return buildErrorResponse(error as Error, requestId);
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function buildPromptSkeleton(
  contact: any,
  interactions: any[]
): string {
  const parts: string[] = [];

  // Contact summary
  parts.push(`Contact: ${contact.name}`);
  
  if (contact.warmth_band) {
    parts.push(`Warmth: ${contact.warmth_score}/100 (${contact.warmth_band})`);
  }

  if (contact.tags && contact.tags.length > 0) {
    parts.push(`Tags: ${contact.tags.join(', ')}`);
  }

  // Last touch
  if (contact.last_touch_at) {
    const daysSince = Math.floor(
      (Date.now() - new Date(contact.last_touch_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    parts.push(`Last contact: ${daysSince} days ago`);
  } else {
    parts.push(`Last contact: Never`);
  }

  // Recent interactions summary
  if (interactions.length > 0) {
    parts.push(`\nRecent interactions (${interactions.length}):`);
    interactions.slice(0, 5).forEach((interaction, i) => {
      const daysSince = Math.floor(
        (Date.now() - new Date(interaction.occurred_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      parts.push(`  ${i + 1}. [${daysSince}d ago] ${interaction.direction} ${interaction.channel}: ${interaction.summary}`);
    });
  } else {
    parts.push(`\nNo recent interactions`);
  }

  return parts.join('\n');
}

// ============================================================================
// OPTIONS (CORS)
// ============================================================================

export function OPTIONS(req: Request) {
  return options(req);
}
