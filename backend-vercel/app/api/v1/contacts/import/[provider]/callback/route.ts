import { NextRequest, NextResponse } from 'next/server';
import { getClientOrThrow, getServiceClient } from "@/lib/supabase";
import { getProvider } from "@/lib/imports/provider";
import { ImportProvider } from "@/lib/imports/types";
import { runImportJob } from "@/lib/imports/runImportJob";

export const runtime = "nodejs";

/**
 * GET /v1/contacts/import/[provider]/callback
 * 
 * OAuth callback endpoint - receives authorization code from provider
 * 
 * This endpoint:
 * 1. Exchanges code for access tokens
 * 2. Saves tokens to database
 * 3. Starts background import job
 * 4. Redirects user to import status page
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { provider: string } }
) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Handle OAuth error
  if (error) {
    console.error('[Import Callback] OAuth error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_FRONTEND_URL}/settings/imports?error=${error}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_FRONTEND_URL}/settings/imports?error=missing_params`
    );
  }

  const providerName = params.provider as ImportProvider;

  try {
    // Decode state to get job_id and user_id
    const stateData = JSON.parse(Buffer.from(state, 'base64url').toString());
    const { job_id, user_id } = stateData;

    // Get provider implementation
    const provider = getProvider(providerName);

    // Exchange code for tokens
    const tokens = await provider.exchangeCodeForTokens(code);

    // Get account info
    const accountInfo = await provider.getAccountInfo(tokens.access_token);

    // Calculate token expiry
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : null;

    // Update import job with tokens and account info
    const supabase = getClientOrThrow(req);
    const { error: updateError } = await supabase
      .from('contact_import_jobs')
      .update({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || null,
        token_expires_at: expiresAt?.toISOString() || null,
        provider_account_id: accountInfo.id,
        provider_account_name: accountInfo.name,
        status: 'fetching',
        started_at: new Date().toISOString(),
      })
      .eq('id', job_id)
      .eq('user_id', user_id);

    if (updateError) {
      console.error('[Import Callback] Failed to update job:', updateError);
      throw new Error(`Database update failed: ${updateError.message}`);
    }

    // Start background import (in a real implementation, use a queue)
    // For now, just redirect and let the user poll for status
    startImportInBackground(job_id, providerName, tokens.access_token);

    // Redirect to success page
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_FRONTEND_URL}/settings/imports/${job_id}`
    );

  } catch (error: any) {
    console.error('[Import Callback] Error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_FRONTEND_URL}/settings/imports?error=callback_failed`
    );
  }
}

/**
 * Start import in background (deprecated - use cron instead)
 * 
 * IMPORTANT: Vercel serverless functions kill background tasks after response is sent.
 * This is a best-effort attempt but is unreliable on Vercel.
 * Production imports are handled by /api/cron/process-imports (runs every minute).
 * 
 * This function is kept for very small imports during development only.
 */
async function startImportInBackground(
  jobId: string,
  providerName: ImportProvider,
  accessToken: string
) {
  console.log('[Import Background] Triggering (will be picked up by cron):', jobId);
  
  // Fire-and-forget (unreliable on Vercel, but cron will pick it up)
  runImportJob(jobId, providerName, accessToken).catch((err) => {
    console.error('[Import Background] Failed (cron will retry):', err);
  });
}
