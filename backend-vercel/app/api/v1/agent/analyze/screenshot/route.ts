/**
 * AI Agent Screenshot Analysis Endpoint
 * POST /v1/agent/analyze/screenshot
 * 
 * Analyzes screenshots using GPT-4 Vision to extract message goals,
 * OCR text, variables, and provide composition recommendations.
 */

import { options, ok, badRequest, serverError } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { checkRateLimit } from "@/lib/rateLimit";
import { analyzeScreenshot } from "@/lib/screenshot-agent";
import type { ScreenshotAnalysisInput } from "@/lib/screenshot-agent";
import { canUseScreenshots, incrementScreenshotUsage } from "@/lib/usage-limits";
import { z } from 'zod';

export const runtime = "nodejs";

export function OPTIONS(req: Request){ return options(req); }

// ============================================================================
// REQUEST VALIDATION
// ============================================================================

const screenshotAnalysisRequestSchema = z.object({
  image_url: z.string().url().optional(),
  image_base64: z.string().optional(),
  contact_id: z.string().uuid().optional(),
  channel: z.enum(['email', 'sms', 'dm', 'linkedin']).optional(),
  context: z.string().max(500).optional(),
  save_to_database: z.boolean().default(true),
}).refine(
  data => data.image_url || data.image_base64,
  { message: 'Either image_url or image_base64 must be provided' }
);

type ScreenshotAnalysisRequest = z.infer<typeof screenshotAnalysisRequestSchema>;

// ============================================================================
// POST /v1/agent/analyze/screenshot
// ============================================================================

export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }), 
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // Rate limiting: 20 requests per minute
  const rl = checkRateLimit(`u:${user.id}:POST:/v1/agent/analyze/screenshot`, 20, 60_000);
  if (!rl.allowed) {
    return new Response(
      JSON.stringify({ 
        error: { 
          code: 'rate_limited', 
          retryAfter: rl.retryAfter 
        } 
      }), 
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Check tier-based usage limits
  const supabase = getClientOrThrow(req);
  const usageCheck = await canUseScreenshots(supabase, user.id);
  
  if (!usageCheck.allowed) {
    return new Response(
      JSON.stringify({
        error: {
          code: 'usage_limit_exceeded',
          message: usageCheck.reason || 'Monthly screenshot limit reached',
          details: {
            current_usage: usageCheck.current_usage,
            limit: usageCheck.limit,
            remaining: usageCheck.remaining,
            resets_at: usageCheck.resets_at,
            tier: usageCheck.tier,
          },
        },
      }),
      { 
        status: 429, 
        headers: { 
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': String(usageCheck.limit),
          'X-RateLimit-Remaining': String(usageCheck.remaining || 0),
          'X-RateLimit-Reset': usageCheck.resets_at || '',
        } 
      }
    );
  }

  // Parse request body
  let body: unknown;
  try { 
    body = await req.json(); 
  } catch { 
    return badRequest('invalid_json', req); 
  }

  const parsed = screenshotAnalysisRequestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.message, req);
  }

  const input = parsed.data;

  try {
    // Analyze screenshot with AI
    const analysisInput: ScreenshotAnalysisInput = {
      image_url: input.image_url,
      image_base64: input.image_base64,
      contact_id: input.contact_id,
      channel: input.channel,
      context: input.context,
    };

    const analysis = await analyzeScreenshot(analysisInput);

    // Increment usage counter (before saving to ensure it's counted)
    await incrementScreenshotUsage(supabase, user.id);

    // Save to database if requested
    let analysisId: string | null = null;
    if (input.save_to_database) {
      
      const { data, error } = await supabase
        .from('screenshot_analyses')
        .insert([{
          owner_user_id: user.id,
          contact_id: input.contact_id ?? null,
          file_url: input.image_url ?? null,
          status: 'completed',
          ocr_text: analysis.ocr_text,
          inferred_goal_id: null, // Could map to message_goals table
          inferred_goal_text: analysis.inferred_goal.description,
          variables: analysis.variables,
          confidence: analysis.inferred_goal.confidence,
          sentiment: analysis.sentiment,
          urgency: analysis.urgency,
          suggested_template_type: analysis.suggested_template_type,
          key_phrases: analysis.key_phrases,
          processing_metadata: analysis.processing_metadata,
        }])
        .select('id')
        .single();

      if (error) {
        console.error('Failed to save screenshot analysis:', error);
        // Don't fail the request, just log
      } else {
        analysisId = data?.id ?? null;
      }
    }

    // Return analysis result with usage info
    return ok({
      analysis_id: analysisId,
      ocr_text: analysis.ocr_text,
      inferred_goal: analysis.inferred_goal,
      variables: analysis.variables,
      sentiment: analysis.sentiment,
      urgency: analysis.urgency,
      suggested_template_type: analysis.suggested_template_type,
      key_phrases: analysis.key_phrases,
      processing_metadata: analysis.processing_metadata,
      usage: {
        current: (usageCheck.current_usage || 0) + 1,
        limit: usageCheck.limit,
        remaining: Math.max(0, (usageCheck.remaining || 0) - 1),
        resets_at: usageCheck.resets_at,
        tier: usageCheck.tier,
      },
    }, req);

  } catch (e: any) {
    console.error('Screenshot analysis error:', e);
    return serverError(e?.message || 'Internal error', req);
  }
}
