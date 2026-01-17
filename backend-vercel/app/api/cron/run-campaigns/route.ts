/**
 * Campaign Scheduler Cron Job
 * 
 * Evaluates enabled campaigns, runs their entry SQL, and queues deliveries.
 * Respects frequency caps, quiet hours, and holdouts.
 * 
 * Trigger: Cron every 15 minutes
 * GET /api/cron/run-campaigns?secret=CRON_SECRET
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );
}

interface CampaignRow {
  user_id: string;
  variant_key?: string;
  reason?: string;
  context_json?: Record<string, any>;
}

async function evaluateCampaign(campaign: any, supabase: ReturnType<typeof getSupabase>): Promise<number> {
  console.log(`[run-campaigns] Evaluating campaign: ${campaign.name}`);
  
  try {
    // Execute the entry SQL via RPC
    const { data: rows, error } = await supabase.rpc('exec_campaign_sql', {
      sql: campaign.entry_sql
    });
    
    if (error) {
      console.error(`[run-campaigns] SQL error for ${campaign.name}:`, error);
      return 0;
    }
    
    if (!rows || rows.length === 0) {
      console.log(`[run-campaigns] No users matched for ${campaign.name}`);
      return 0;
    }
    
    console.log(`[run-campaigns] ${rows.length} users matched for ${campaign.name}`);
    
    let queuedCount = 0;
    
    // Process each matched user
    for (const row of rows as CampaignRow[]) {
      // Apply holdout (randomly exclude X% for control group)
      if (Math.random() * 100 < campaign.holdout_pct) {
        console.log(`[run-campaigns] Holdout: ${row.user_id}`);
        continue;
      }
      
      // Check if user can receive message now (freq caps, quiet hours, consent)
      const { data: canSend } = await supabase.rpc('can_send_now', {
        p_user_id: row.user_id,
        p_campaign_id: campaign.id,
        p_channel: campaign.channel
      });
      
      if (!canSend) {
        console.log(`[run-campaigns] Cannot send to ${row.user_id} (caps/quiet hours)`);
        continue;
      }
      
      // Assign variant (default to A if not specified)
      const variant = row.variant_key || (Math.random() < 0.5 ? "A" : "B");
      
      // Queue delivery
      const { error: insertError } = await supabase.from('deliveries').insert({
        campaign_id: campaign.id,
        user_id: row.user_id,
        variant_key: variant,
        channel: campaign.channel,
        status: 'queued',
        reason: row.reason || campaign.name,
        context_json: row.context_json || {},
        queued_at: new Date().toISOString(),
      });
      
      if (insertError) {
        // Likely a duplicate (cooldown constraint)
        console.log(`[run-campaigns] Skip ${row.user_id}: ${insertError.message}`);
        continue;
      }
      
      queuedCount++;
    }
    
    console.log(`[run-campaigns] Queued ${queuedCount} deliveries for ${campaign.name}`);
    return queuedCount;
    
  } catch (error: any) {
    console.error(`[run-campaigns] Error evaluating ${campaign.name}:`, error);
    return 0;
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase();
    // Verify cron secret
    const secret = req.nextUrl.searchParams.get('secret');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && secret !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('[run-campaigns] Starting campaign evaluation');
    
    // Fetch all enabled campaigns
    const { data: campaigns, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('enabled', true);
    
    if (error) {
      console.error('[run-campaigns] Error fetching campaigns:', error);
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }
    
    if (!campaigns || campaigns.length === 0) {
      console.log('[run-campaigns] No enabled campaigns');
      return NextResponse.json({
        success: true,
        message: 'No campaigns enabled'
      });
    }
    
    // Evaluate each campaign
    const results: Record<string, number> = {};
    
    for (const campaign of campaigns) {
      const count = await evaluateCampaign(campaign, supabase);
      results[campaign.name] = count;
    }
    
    const totalQueued = Object.values(results).reduce((sum, count) => sum + count, 0);
    
    console.log(`[run-campaigns] Done. Queued ${totalQueued} total deliveries`);
    
    return NextResponse.json({
      success: true,
      campaigns_evaluated: campaigns.length,
      total_queued: totalQueued,
      results
    });
    
  } catch (error: any) {
    console.error('[run-campaigns] Fatal error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
