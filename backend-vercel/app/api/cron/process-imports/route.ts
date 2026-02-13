import { options, ok, unauthorized, serverError } from '@/lib/cors';
import { getServiceClient } from '@/lib/supabase';
import { runImportJob } from '@/lib/imports/runImportJob';
import type { ImportProvider } from '@/lib/imports/types';
import { notifyImportComplete, notifyImportFailed, notifyImportReady } from '@/lib/notifications';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * OPTIONS handler for CORS preflight
 */
export async function OPTIONS(req: Request) {
  return options(req);
}

/**
 * GET /api/cron/process-imports
 * 
 * Processes pending contact import jobs.
 * 
 * Auth:
 * - Vercel Cron (x-vercel-cron header)
 * - Manual trigger with CRON_SECRET (?key= or x-cron-secret)
 * 
 * Logic:
 * - Claims up to 2 pending jobs atomically
 * - Processes each job using runImportJob()
 * - Returns summary of processed/failed jobs
 */
export async function GET(req: Request) {
  // Auth check (fail-closed, Bearer header only)
  const { verifyCron } = await import('@/lib/cron-auth');
  const authError = verifyCron(req);
  if (authError) return authError;

  console.log('[Import Cron] Starting job processor...');
  
  const supabase = getServiceClient();
  const processed: string[] = [];
  const failed: string[] = [];

  try {
    // Get pending jobs (status in fetching|processing, not completed)
    const { data: pendingJobs, error: selectErr } = await supabase
      .from('contact_import_jobs')
      .select('id, provider, access_token')
      .in('status', ['fetching', 'processing'])
      .is('completed_at', null)
      .order('started_at', { ascending: true })
      .limit(2); // Process max 2 jobs per run to stay under timeout

    if (selectErr) {
      console.error('[Import Cron] Failed to fetch pending jobs:', selectErr);
      return serverError('Failed to fetch jobs', req);
    }

    if (!pendingJobs || pendingJobs.length === 0) {
      console.log('[Import Cron] No pending jobs found');
      return ok({
        message: 'No pending jobs',
        processed: 0,
        failed: 0,
      }, req);
    }

    console.log(`[Import Cron] Found ${pendingJobs.length} pending job(s)`);

    // Process each job
    for (const job of pendingJobs) {
      try {
        // Atomic claim: only update if still pending and not completed
        const { data: claimed, error: claimErr } = await supabase
          .from('contact_import_jobs')
          .update({ status: 'processing' })
          .eq('id', job.id)
          .in('status', ['fetching', 'processing'])
          .is('completed_at', null)
          .select('id')
          .maybeSingle();

        if (claimErr || !claimed) {
          console.log(`[Import Cron] Job ${job.id} already claimed by another worker`);
          continue;
        }

        console.log(`[Import Cron] Processing job ${job.id} (${job.provider})...`);

        // Process the job using shared logic
        await runImportJob(job.id, job.provider as ImportProvider, job.access_token);
        
        // Get final job stats to send notification
        const { data: completedJob } = await supabase
          .from('contact_import_jobs')
          .select('user_id, status, total_contacts, imported_contacts, skipped_contacts, failed_contacts')
          .eq('id', job.id)
          .single();

        if (completedJob) {
          // Send notification based on final status
          if (completedJob.status === 'contacts_fetched') {
            await notifyImportReady(
              completedJob.user_id,
              job.id,
              job.provider,
              completedJob.total_contacts || 0
            );
          } else if (completedJob.status === 'completed') {
            await notifyImportComplete(
              completedJob.user_id,
              job.id,
              job.provider,
              {
                total: completedJob.total_contacts || 0,
                imported: completedJob.imported_contacts || 0,
                skipped: completedJob.skipped_contacts || 0,
                failed: completedJob.failed_contacts || 0,
              }
            );
          }
        }
        
        processed.push(job.id);
        console.log(`[Import Cron] ✅ Job ${job.id} completed successfully`);

      } catch (error: any) {
        console.error(`[Import Cron] ❌ Job ${job.id} failed:`, error);
        failed.push(job.id);
        
        // Get user_id to send notification
        const { data: failedJob } = await supabase
          .from('contact_import_jobs')
          .select('user_id')
          .eq('id', job.id)
          .single();

        // Send failure notification
        if (failedJob) {
          await notifyImportFailed(
            failedJob.user_id,
            job.id,
            job.provider,
            error.message || 'Unknown error'
          );
        }
        
        // Mark as failed (runImportJob should have done this, but double-check)
        await supabase
          .from('contact_import_jobs')
          .update({
            status: 'failed',
            error_message: error.message || 'Unknown error during cron processing',
            completed_at: new Date().toISOString(),
          })
          .eq('id', job.id);
      }
    }

    console.log(`[Import Cron] Batch complete: ${processed.length} processed, ${failed.length} failed`);

    return ok({
      message: 'Processing complete',
      processed: processed.length,
      failed: failed.length,
      job_ids: {
        processed,
        failed,
      },
    }, req);

  } catch (error: any) {
    console.error('[Import Cron] Fatal error:', error);
    return serverError("Internal server error", req);
  }
}
