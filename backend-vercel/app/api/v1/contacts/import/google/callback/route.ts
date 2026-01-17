/**
 * GET /api/v1/contacts/import/google/callback
 * OAuth callback from Google - exchanges code for tokens and fetches contacts
 */

import { options, badRequest, serverError, buildCorsHeaders } from "@/lib/cors";
import { getClientOrThrow } from "@/lib/supabase";
import {
  exchangeCodeForTokens,
  fetchGoogleContacts,
  type GoogleContact
} from "@/lib/google-contacts";
import {
  getImportJobByState,
  updateImportJob
} from "@/lib/import-jobs";

export const runtime = "edge";
export const maxDuration = 60; // Allow up to 60 seconds for large imports

export function OPTIONS(req: Request) { return options(req); }

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  // Handle OAuth errors
  if (error) {
    console.error('[GoogleCallback] OAuth error:', error);
    return new Response(
      `<html><body><h1>Authorization Failed</h1><p>${error}</p></body></html>`,
      { status: 400, headers: { 'Content-Type': 'text/html' } }
    );
  }

  if (!code || !state) {
    return badRequest('Missing code or state parameter');
  }

  try {
    // Find import job by state
    const job = await getImportJobByState(req, state);
    if (!job) {
      return badRequest('Invalid state parameter');
    }

    console.log(`[GoogleCallback] Processing job ${job.id}`);

    // Update job status to authenticating
    await updateImportJob(req, job.id, {
      status: 'authenticating',
      progress_percent: 10,
    });

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);
    
    // Store refresh token (encrypted in production)
    await updateImportJob(req, job.id, {
      refresh_token: tokens.refresh_token,
      status: 'fetching',
      progress_percent: 20,
    });

    console.log(`[GoogleCallback] Fetching contacts for job ${job.id}`);

    // Fetch contacts from Google
    const googleContacts = await fetchGoogleContacts(tokens.access_token);
    
    await updateImportJob(req, job.id, {
      status: 'processing',
      total_contacts: googleContacts.length,
      progress_percent: 50,
    });

    console.log(`[GoogleCallback] Importing ${googleContacts.length} contacts`);

    // Import contacts into Supabase
    const result = await importContactsToSupabase(
      req,
      job.user_id,
      googleContacts,
      job.id
    );

    // Mark job as completed
    await updateImportJob(req, job.id, {
      status: 'completed',
      imported_contacts: result.imported,
      skipped_contacts: result.skipped,
      failed_contacts: result.failed,
      progress_percent: 100,
      completed_at: new Date().toISOString(),
    });

    console.log(`[GoogleCallback] Completed job ${job.id}: ${result.imported} imported, ${result.skipped} skipped`);

    // Redirect back to app with job ID
    const redirectUrl = new URL('/import-third-party', process.env.EXPO_PUBLIC_WEB_URL || 'https://www.everreach.app');
    redirectUrl.searchParams.set('job_id', job.id);
    
    return new Response(null, {
      status: 302,
      headers: {
        'Location': redirectUrl.toString(),
      },
    });

  } catch (error: any) {
    console.error('[GoogleCallback] Import failed:', error);
    
    // Try to update job with error
    try {
      const job = await getImportJobByState(req, state);
      if (job) {
        await updateImportJob(req, job.id, {
          status: 'failed',
          error_message: error?.message || 'Import failed',
          completed_at: new Date().toISOString(),
        });
      }
    } catch (updateError) {
      console.error('[GoogleCallback] Failed to update job with error:', updateError);
    }

    return new Response(
      `<html><body><h1>Import Failed</h1><p>${error?.message || 'Unknown error'}</p></body></html>`,
      { status: 500, headers: { 'Content-Type': 'text/html' } }
    );
  }
}

/**
 * Import Google contacts into Supabase
 */
async function importContactsToSupabase(
  req: Request,
  userId: string,
  googleContacts: GoogleContact[],
  jobId: string
): Promise<{ imported: number; skipped: number; failed: number }> {
  const supabase = getClientOrThrow(req);
  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (const gc of googleContacts) {
    try {
      // Skip contacts without name or email
      if (!gc.name && gc.emails.length === 0) {
        skipped++;
        continue;
      }

      // Check if contact already exists by email
      if (gc.emails.length > 0) {
        const { data: existing } = await supabase
          .from('contacts')
          .select('id')
          .eq('user_id', userId)
          .contains('emails', [gc.emails[0]])
          .maybeSingle();

        if (existing) {
          skipped++;
          continue;
        }
      }

      // Create contact
      const { error } = await supabase
        .from('contacts')
        .insert({
          user_id: userId,
          display_name: gc.name || gc.emails[0] || 'Unknown',
          emails: gc.emails,
          phones: gc.phones,
          company: gc.organization,
          title: gc.title,
          avatar_url: gc.photoUrl,
          tags: ['imported', 'google'],
          import_source: 'google',
          import_job_id: jobId,
        });

      if (error) {
        console.error(`[ImportContacts] Failed to import contact ${gc.name}:`, error);
        failed++;
      } else {
        imported++;
      }

      // Update progress every 10 contacts
      if ((imported + skipped + failed) % 10 === 0) {
        const progress = 50 + Math.floor(((imported + skipped + failed) / googleContacts.length) * 50);
        await updateImportJob(req, jobId, {
          imported_contacts: imported,
          skipped_contacts: skipped,
          failed_contacts: failed,
          progress_percent: progress,
        });
      }
    } catch (error) {
      console.error(`[ImportContacts] Error processing contact:`, error);
      failed++;
    }
  }

  return { imported, skipped, failed };
}
