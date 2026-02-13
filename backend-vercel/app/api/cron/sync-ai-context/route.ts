/**
 * Cron Job: Sync AI Context
 * Runs daily to infer user goals from behavior, notes, and profile fields
 * 
 * Schedule: Daily at 2 AM (configured in vercel.json)
 * Auth: CRON_SECRET required
 */

import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { inferUserGoals } from '@/lib/goal-inference';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes max

export async function GET(req: Request) {
  // Verify cron secret (fail-closed)
  const { verifyCron } = await import('@/lib/cron-auth');
  const authError = verifyCron(req);
  if (authError) return authError;

  console.log('[Sync AI Context] Starting daily sync...');
  const startTime = Date.now();

  const supabase = getServiceClient();

  try {
    // Get active users (signed in within last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email')
      .gte('last_sign_in_at', thirtyDaysAgo)
      .limit(100); // Process in batches of 100

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }

    if (!users || users.length === 0) {
      console.log('[Sync AI Context] No active users to process');
      return NextResponse.json({
        success: true,
        processed: 0,
        errors: 0,
        duration_ms: Date.now() - startTime,
        message: 'No active users to process'
      });
    }

    console.log(`[Sync AI Context] Processing ${users.length} active users...`);

    let processed = 0;
    let errors = 0;
    const errorDetails: Array<{ userId: string; error: string }> = [];

    // Process each user
    for (const user of users) {
      try {
        console.log(`[Sync AI Context] Processing user ${user.id}...`);

        // Infer goals from all sources
        const inferredGoals = await inferUserGoals(user.id, supabase);

        console.log(`[Sync AI Context] Found ${inferredGoals.length} goals for user ${user.id}`);

        // Store in ai_user_context
        const { error: upsertError } = await supabase
          .from('ai_user_context')
          .upsert({
            user_id: user.id,
            inferred_goals: inferredGoals,
            last_analyzed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });

        if (upsertError) {
          throw new Error(`Upsert failed: ${upsertError.message}`);
        }

        processed++;
        console.log(`[Sync AI Context] ✓ User ${user.id} processed successfully`);

      } catch (err: any) {
        console.error(`[Sync AI Context] ✗ Error processing user ${user.id}:`, err);
        errors++;
        errorDetails.push({
          userId: user.id,
          error: err.message || 'Unknown error'
        });
      }
    }

    const duration = Date.now() - startTime;
    const result = {
      success: true,
      processed,
      errors,
      duration_ms: duration,
      duration_seconds: Math.round(duration / 1000),
      avg_time_per_user_ms: Math.round(duration / users.length),
      timestamp: new Date().toISOString()
    };

    console.log('[Sync AI Context] Completed:', result);

    // Log any errors
    if (errorDetails.length > 0) {
      console.error('[Sync AI Context] Errors encountered:', errorDetails);
    }

    return NextResponse.json({
      ...result,
      ...(errorDetails.length > 0 && { error_details: errorDetails })
    });

  } catch (error: any) {
    console.error('[Sync AI Context] Fatal error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error',
      duration_ms: Date.now() - startTime,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
