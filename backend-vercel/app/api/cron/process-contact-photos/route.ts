/**
 * Contact Photo Download Worker
 * 
 * Cron job that processes pending photo download jobs:
 * 1. Downloads photos from external URLs
 * 2. Optimizes them (resize, WebP format)
 * 3. Uploads to Supabase Storage
 * 4. Updates contact.avatar_url
 * 
 * Schedule: Every 5 minutes
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { downloadAndOptimizePhoto, getContactPhotoStoragePath, isValidImageUrl } from '@/lib/photos';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds max

const BATCH_SIZE = parseInt(process.env.PHOTO_BATCH_SIZE || '10', 10);
const MAX_RETRIES = 3;

interface PhotoJob {
  id: string;
  contact_id: string;
  external_url: string;
  status: string;
  retry_count: number;
}

export async function GET(req: NextRequest) {
  const startTime = Date.now();

  // Auth check (fail-closed)
  const { verifyCron } = await import('@/lib/cron-auth');
  const authError = verifyCron(req);
  if (authError) return authError;

  const supabase = getServiceClient();

  try {
    // Get pending jobs
    const { data: jobs, error: fetchError } = await supabase
      .from('contact_photo_jobs')
      .select('*')
      .eq('status', 'pending')
      .lt('retry_count', MAX_RETRIES)
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE);

    if (fetchError) {
      console.error('[PhotoWorker] Error fetching jobs:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({
        processed: 0,
        message: 'No pending jobs',
        duration_ms: Date.now() - startTime,
      });
    }

    console.log(`[PhotoWorker] Processing ${jobs.length} jobs`);

    const results = await Promise.allSettled(
      jobs.map((job) => processPhotoJob(job as PhotoJob, supabase))
    );

    // Count successes and failures
    const successes = results.filter((r) => r.status === 'fulfilled').length;
    const failures = results.filter((r) => r.status === 'rejected').length;

    const response = {
      processed: jobs.length,
      successes,
      failures,
      duration_ms: Date.now() - startTime,
      results: results.map((r, i) => ({
        job_id: jobs[i].id,
        status: r.status,
        error: r.status === 'rejected' ? r.reason?.message : undefined,
      })),
    };

    console.log(`[PhotoWorker] Complete:`, response);

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[PhotoWorker] Fatal error:', error);
    return NextResponse.json(
      { error: error.message, duration_ms: Date.now() - startTime },
      { status: 500 }
    );
  }
}

async function processPhotoJob(job: PhotoJob, supabase: any): Promise<void> {
  const jobId = job.id;
  const contactId = job.contact_id;

  try {
    console.log(`[PhotoWorker] Processing job ${jobId} for contact ${contactId}`);

    // Validate URL
    if (!isValidImageUrl(job.external_url)) {
      throw new Error('Invalid image URL');
    }

    // Mark as downloading
    await supabase
      .from('contact_photo_jobs')
      .update({
        status: 'downloading',
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    // Download and optimize
    const optimizedBuffer = await downloadAndOptimizePhoto(job.external_url, {
      size: 400,
      quality: 80,
      format: 'webp',
    });

    console.log(`[PhotoWorker] Downloaded and optimized photo (${optimizedBuffer.length} bytes)`);

    // Generate storage path
    const storagePath = getContactPhotoStoragePath(contactId, 'webp');

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('attachments')
      .upload(storagePath, optimizedBuffer, {
        contentType: 'image/webp',
        upsert: true,
        cacheControl: '31536000', // Cache for 1 year
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    console.log(`[PhotoWorker] Uploaded to storage: ${storagePath}`);

    // Update contact with new avatar_url
    const { error: updateError } = await supabase
      .from('contacts')
      .update({
        avatar_url: storagePath,
        updated_at: new Date().toISOString(),
      })
      .eq('id', contactId);

    if (updateError) {
      throw new Error(`Contact update failed: ${updateError.message}`);
    }

    // Mark job as completed
    await supabase
      .from('contact_photo_jobs')
      .update({
        status: 'completed',
        storage_path: storagePath,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    console.log(`[PhotoWorker] Job ${jobId} completed successfully`);
  } catch (error: any) {
    console.error(`[PhotoWorker] Job ${jobId} failed:`, error.message);

    // Increment retry count
    const newRetryCount = job.retry_count + 1;
    const status = newRetryCount >= MAX_RETRIES ? 'failed' : 'pending';

    await supabase
      .from('contact_photo_jobs')
      .update({
        status,
        retry_count: newRetryCount,
        error_message: error.message,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    throw error; // Re-throw so Promise.allSettled catches it
  }
}
