/**
 * Cron Job: Process Pending Embeddings
 * 
 * Runs periodically to:
 * - Generate embeddings for requests without them
 * - Assign requests to buckets via AI clustering
 * - Update bucket centroids
 * - Refresh momentum stats
 * 
 * Schedule: Every 5 minutes (or on-demand)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const CRON_SECRET = process.env.CRON_SECRET || 'dev-secret';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const providedSecret = authHeader?.replace('Bearer ', '');
    
    if (providedSecret !== CRON_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const results = {
      processed: 0,
      errors: 0,
      skipped: 0,
    };

    console.log('[CronEmbeddings] Starting embedding processing...');

    // Find requests without embeddings
    const { data: requests, error } = await supabase
      .from('feature_requests')
      .select('id, title, description')
      .is('bucket_id', null) // Only process unbucketed requests
      .limit(50); // Process in batches

    if (error) {
      console.error('[CronEmbeddings] Query error:', error);
      return NextResponse.json(
        { error: 'Failed to query requests' },
        { status: 500 }
      );
    }

    if (!requests || requests.length === 0) {
      console.log('[CronEmbeddings] No pending requests to process');
      return NextResponse.json({
        success: true,
        message: 'No pending requests',
        results,
      });
    }

    console.log('[CronEmbeddings] Found', requests.length, 'requests to process');

    // Process each request
    for (const req of requests) {
      try {
        // Call the process-embedding endpoint
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_BASE || 'http://localhost:3000'}/api/v1/feature-requests/${req.id}/process-embedding`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${CRON_SECRET}`,
            },
          }
        );

        if (response.ok) {
          results.processed++;
          console.log('[CronEmbeddings] Processed:', req.id);
        } else {
          results.errors++;
          console.error('[CronEmbeddings] Failed to process:', req.id, await response.text());
        }

        // Rate limit: Wait 100ms between requests to avoid overwhelming OpenAI
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        results.errors++;
        console.error('[CronEmbeddings] Error processing:', req.id, error);
      }
    }

    // Refresh momentum stats
    try {
      await supabase.rpc('refresh_bucket_momentum');
      console.log('[CronEmbeddings] Refreshed momentum stats');
    } catch (e) {
      console.error('[CronEmbeddings] Failed to refresh momentum:', e);
    }

    console.log('[CronEmbeddings] Complete:', results);

    return NextResponse.json({
      success: true,
      message: 'Embedding processing complete',
      results,
    });
  } catch (error: any) {
    console.error('[CronEmbeddings] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
