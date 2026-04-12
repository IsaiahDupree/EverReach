/**
 * Discord Worker Cron Job
 *
 * Processes queued Discord deliveries from relay_jobs and sends via
 * the configured Discord Incoming Webhook (DISCORD_WEBHOOK_URL).
 *
 * Trigger: called by /api/cron/process-queues every 5 minutes
 * GET /api/cron/send-discord
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { sendDiscordText } from '@/lib/discord';

const BATCH_SIZE = 25;
const MAX_ATTEMPTS = 3;

async function processJob(job: any, supabase: ReturnType<typeof getServiceClient>): Promise<void> {
  console.log(`[send-discord] Processing job ${job.id} → ${job.recipient_handle}`);

  try {
    const text = job.recipient_handle
      ? `**To:** ${job.recipient_handle}\n${job.message_body}`
      : job.message_body;

    const result = await sendDiscordText(text);

    if (!result.ok) {
      throw new Error(`Discord webhook returned ${result.status}: ${result.error}`);
    }

    await supabase
      .from('relay_jobs')
      .update({
        status: 'sent',
        updated_at: new Date().toISOString(),
      })
      .eq('id', job.id);

    console.log(`[send-discord] Sent job ${job.id}`);
  } catch (error: any) {
    console.error(`[send-discord] Error on job ${job.id}:`, error.message);

    const nextAttempts = (job.attempts || 0) + 1;
    await supabase
      .from('relay_jobs')
      .update({
        status: nextAttempts >= MAX_ATTEMPTS ? 'failed' : 'queued',
        attempts: nextAttempts,
        error_message: error.message,
        updated_at: new Date().toISOString(),
      })
      .eq('id', job.id);
  }
}

export async function GET(req: NextRequest) {
  try {
    const { verifyCron } = await import('@/lib/cron-auth');
    const authError = verifyCron(req);
    if (authError) return authError;

    const supabase = getServiceClient();

    const { data: jobs, error } = await supabase
      .from('relay_jobs')
      .select('*')
      .eq('channel', 'discord')
      .in('status', ['queued', 'processing'])
      .lt('attempts', MAX_ATTEMPTS)
      .lte('scheduled_for', new Date().toISOString())
      .order('priority', { ascending: false })
      .order('scheduled_for', { ascending: true })
      .limit(BATCH_SIZE);

    if (error) throw new Error(`Query error: ${error.message}`);

    if (!jobs || jobs.length === 0) {
      console.log('[send-discord] No queued Discord jobs');
      return NextResponse.json({ success: true, processed: 0 });
    }

    console.log(`[send-discord] Processing ${jobs.length} jobs`);

    for (const job of jobs) {
      await processJob(job, supabase);
    }

    return NextResponse.json({ success: true, processed: jobs.length });
  } catch (error: any) {
    console.error('[send-discord] Fatal error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
