/**
 * Process Enrichment Queue
 * 
 * Runs every 5 minutes to process pending enrichments
 * Batch processes up to 10 users at a time
 * 
 * Configured in vercel.json as cron job
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { UnifiedEnrichmentClient } from '@/lib/enrichment/unified-enrichment-client';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const BATCH_SIZE = 10;
const MAX_RETRIES = 3;

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase();
    // Verify cron secret
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const startTime = Date.now();

    // Fetch pending enrichments (limit to batch size)
    const { data: pendingUsers, error } = await supabase
      .from('user_identity')
      .select('user_id, email_hash, retry_count, app_user!inner(email)')
      .in('status', ['pending', 'failed'])
      .lt('retry_count', MAX_RETRIES)
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE);

    if (error) {
      console.error('Failed to fetch pending enrichments:', error);
      return NextResponse.json(
        { error: 'Database error', details: error.message },
        { status: 500 }
      );
    }

    if (!pendingUsers || pendingUsers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending enrichments',
        processed: 0
      });
    }

    // Initialize enrichment client
    const enrichmentClient = new UnifiedEnrichmentClient({
      rapidApiKey: process.env.RAPIDAPI_KEY,
      perplexityApiKey: process.env.PERPLEXITY_API_KEY,
      openAiApiKey: process.env.OPENAI_API_KEY
    });

    const results = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      errors: [] as string[]
    };

    // Process each user
    for (const user of pendingUsers) {
      try {
        // Mark as processing
        await supabase.from('user_identity').update({
          status: 'processing',
          started_at: new Date().toISOString()
        }).eq('user_id', user.user_id);

        // Get email (from joined app_user table)
        const email = (user.app_user as any)?.email;
        if (!email) {
          throw new Error('Email not found for user');
        }

        // Perform enrichment
        const result = await (enrichmentClient as any).enrichContact({
          email,
          includeCompany: true,
          includePersona: true
        });

        // Store results (same logic as enrich endpoint)
        await storeEnrichmentResults(user.user_id, result, supabase);

        // Update status
        await supabase.from('user_identity').update({
          status: 'completed',
          enriched_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          cost_cents: result.cost * 100
        }).eq('user_id', user.user_id);

        results.succeeded++;
        results.processed++;

      } catch (error) {
        console.error(`Enrichment failed for user ${user.user_id}:`, error);

        // Increment retry count
        const newRetryCount = (user.retry_count || 0) + 1;
        const newStatus = newRetryCount >= MAX_RETRIES ? 'failed_permanent' : 'failed';

        await supabase.from('user_identity').update({
          status: newStatus,
          retry_count: newRetryCount,
          error_message: String(error),
          last_retry_at: new Date().toISOString()
        }).eq('user_id', user.user_id);

        results.failed++;
        results.processed++;
        results.errors.push(`${user.user_id}: ${String(error)}`);
      }
    }

    const duration = Date.now() - startTime;

    console.log(`✅ Enrichment queue processed: ${results.succeeded}/${results.processed} succeeded in ${duration}ms`);

    return NextResponse.json({
      success: true,
      duration_ms: duration,
      ...results
    });

  } catch (error) {
    console.error('Enrichment queue cron error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * Store enrichment results to database
 */
async function storeEnrichmentResults(userId: string, result: any, supabase: ReturnType<typeof getSupabase>) {
  // Store social profiles
  if (result.social && result.social.length > 0) {
    const socialProfiles = result.social.reduce((acc: any, platform: any) => {
      acc[platform.platform] = {
        url: platform.url,
        username: platform.username
      };
      return acc;
    }, {});

    await supabase.from('user_identity').update({
      social_profiles: socialProfiles
    }).eq('user_id', userId);
  }

  // Store company info
  if (result.company) {
    await supabase.from('user_identity').update({
      company_name: result.company.name,
      company_domain: result.company.domain,
      company_industry: result.company.industry
    }).eq('user_id', userId);
  }

  // Store persona
  if (result.persona) {
    const { data: bucket } = await supabase
      .from('persona_bucket')
      .select('persona_bucket_id')
      .eq('slug', result.persona.bucket)
      .single();

    if (bucket) {
      await supabase.from('user_persona').upsert({
        user_id: userId,
        persona_bucket_id: bucket.persona_bucket_id,
        confidence_score: result.persona.confidence,
        assigned_at: new Date().toISOString(),
        assigned_by: 'ai_enrichment'
      }, { onConflict: 'user_id' });
    }
  }

  // Log event
  await supabase.from('user_event').insert({
    user_id: userId,
    etype: 'identity_enriched',
    occurred_at: new Date().toISOString(),
    properties: {
      has_social: !!(result.social && result.social.length > 0),
      has_company: !!result.company,
      has_persona: !!result.persona,
      cost: result.cost
    }
  });
}
