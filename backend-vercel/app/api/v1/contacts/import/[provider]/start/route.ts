import { NextRequest, NextResponse } from 'next/server';
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { options, ok, unauthorized, badRequest, serverError } from "@/lib/cors";
import { getProvider } from "@/lib/imports/provider";
import { ImportProvider } from "@/lib/imports/types";
import crypto from 'crypto';

export const runtime = "nodejs";

export function OPTIONS(req: Request){ return options(req); }

/**
 * POST /v1/contacts/import/[provider]/start
 * 
 * Start OAuth flow for importing contacts from a provider
 * 
 * Supported providers: google, microsoft
 * 
 * Returns authorization URL to redirect user to
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { provider: string } }
) {
  const user = await getUser(req);
  if (!user) return unauthorized("Unauthorized", req);

  const providerName = params.provider as ImportProvider;

  try {
    // Get provider implementation
    const provider = getProvider(providerName);
    
    // Validate OAuth configuration (will throw descriptive error if not configured)
    try {
      provider.getOAuthConfig();
    } catch (configError: any) {
      console.error(`[Import Start] ${providerName} not configured:`, configError.message);
      return badRequest(configError.message, req);
    }
    
    // Generate state for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');
    
    // Create import job in pending state
    const supabase = getClientOrThrow(req);
    const { data: job, error } = await supabase
      .from('contact_import_jobs')
      .insert([{
        user_id: user.id,
        provider: providerName,
        status: 'authenticating',
      }])
      .select('id')
      .single();

    if (error) {
      console.error('[Import Start] Database error:', error);
      return serverError("Internal server error", req);
    }

    // Store state → job_id mapping in session or database
    // For now, encode in state parameter
    const stateData = JSON.stringify({
      job_id: job.id,
      user_id: user.id,
      random: state,
    });
    const encodedState = Buffer.from(stateData).toString('base64url');

    // Get OAuth authorization URL
    const authUrl = provider.getAuthorizationUrl(encodedState);

    return ok({
      job_id: job.id,
      authorization_url: authUrl,
      provider: providerName,
    }, req);

  } catch (error: any) {
    console.error('[Import Start] Error:', error);
    return serverError("Internal server error", req);
  }
}
