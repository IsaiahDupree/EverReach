// lib/enrichment/billing.ts
// Usage tracking and Stripe billing integration

import { createClient } from '@supabase/supabase-js';
import { getTierConfig, calculateMonthlyCost } from './tiers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Track enrichment usage for billing
 */
export async function trackUsage(
  workspaceId: string,
  jobId: string,
  usage: {
    unitsUsed: number;
    tokensUsed: number;
    socialRequests: number;
    perplexitySearches: number;
  }
): Promise<void> {
  try {
    // Calculate cost estimate (in cents)
    const perplexityCost = (usage.tokensUsed / 1000) * 0.2; // $0.20 per 1K tokens
    const socialCost = usage.socialRequests * 0.001; // $0.001 per search
    const costEstimateCents = Math.ceil((perplexityCost + socialCost) * 100);

    await supabase.from('enrichment_usage').insert({
      workspace_id: workspaceId,
      job_id: jobId,
      units_used: usage.unitsUsed,
      tokens_used: usage.tokensUsed,
      social_requests: usage.socialRequests,
      perplexity_searches: usage.perplexitySearches,
      cost_estimate_cents: costEstimateCents,
      billed: false,
      status: 'ok',
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Billing] Track usage failed:', error);
    throw error;
  }
}

/**
 * Get monthly usage for a workspace
 */
export async function getMonthlyUsage(
  workspaceId: string
): Promise<{
  unitsUsed: number;
  includedUnits: number;
  overageUnits: number;
  overageCost: number;
  tier: string;
}> {
  try {
    // Get workspace tier
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('tier')
      .eq('id', workspaceId)
      .single();

    const tier = workspace?.tier || 'core';

    // Get this month's usage
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: usage } = await supabase
      .from('enrichment_usage')
      .select('units_used')
      .eq('workspace_id', workspaceId)
      .gte('created_at', startOfMonth.toISOString());

    const unitsUsed = usage?.reduce((sum, row) => sum + row.units_used, 0) || 0;

    // Calculate costs
    const costs = calculateMonthlyCost(tier, unitsUsed);

    return {
      unitsUsed,
      includedUnits: costs.included,
      overageUnits: costs.overage,
      overageCost: costs.overageCost,
      tier
    };
  } catch (error) {
    console.error('[Billing] Get monthly usage failed:', error);
    throw error;
  }
}

/**
 * Report usage to Stripe for metered billing
 * Should be run nightly
 */
export async function reportStripeUsage(
  subscriptionItemId: string,
  quantity: number,
  timestamp?: number
): Promise<void> {
  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

    await stripe.subscriptionItems.createUsageRecord(subscriptionItemId, {
      quantity,
      timestamp: timestamp || Math.floor(Date.now() / 1000),
      action: 'set' // Use 'increment' for additive reporting
    });

    console.log(
      `[Billing] Reported ${quantity} units to Stripe for ${subscriptionItemId}`
    );
  } catch (error) {
    console.error('[Billing] Report to Stripe failed:', error);
    throw error;
  }
}

/**
 * Get unbilled usage records
 */
export async function getUnbilledUsage(
  workspaceId?: string
): Promise<any[]> {
  try {
    let query = supabase
      .from('enrichment_usage')
      .select('*')
      .eq('billed', false);

    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Billing] Get unbilled usage failed:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('[Billing] Get unbilled usage failed:', error);
    return [];
  }
}

/**
 * Mark usage records as billed
 */
export async function markAsBilled(usageIds: string[]): Promise<void> {
  try {
    await supabase
      .from('enrichment_usage')
      .update({ billed: true })
      .in('id', usageIds);

    console.log(`[Billing] Marked ${usageIds.length} records as billed`);
  } catch (error) {
    console.error('[Billing] Mark as billed failed:', error);
    throw error;
  }
}

/**
 * Nightly billing job to report usage to Stripe
 */
export async function runNightlyBilling(): Promise<{
  workspacesProcessed: number;
  totalUnits: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let workspacesProcessed = 0;
  let totalUnits = 0;

  try {
    // Get all workspaces with unbilled usage
    const { data: workspaces } = await supabase
      .from('enrichment_usage')
      .select('workspace_id')
      .eq('billed', false)
      .order('workspace_id');

    if (!workspaces || workspaces.length === 0) {
      console.log('[Billing] No unbilled usage found');
      return { workspacesProcessed: 0, totalUnits: 0, errors: [] };
    }

    // Get unique workspace IDs
    const uniqueWorkspaces = [...new Set(workspaces.map(w => w.workspace_id))];

    for (const workspaceId of uniqueWorkspaces) {
      try {
        // Get unbilled usage for this workspace
        const unbilled = await getUnbilledUsage(workspaceId);
        const units = unbilled.reduce((sum, record) => sum + record.units_used, 0);

        if (units === 0) continue;

        // Get workspace subscription info
        const { data: workspace } = await supabase
          .from('workspaces')
          .select('stripe_subscription_item_id')
          .eq('id', workspaceId)
          .single();

        if (!workspace?.stripe_subscription_item_id) {
          errors.push(`Workspace ${workspaceId}: No Stripe subscription item ID`);
          continue;
        }

        // Report to Stripe
        await reportStripeUsage(workspace.stripe_subscription_item_id, units);

        // Mark as billed
        const usageIds = unbilled.map(record => record.id);
        await markAsBilled(usageIds);

        workspacesProcessed++;
        totalUnits += units;
      } catch (error: any) {
        errors.push(`Workspace ${workspaceId}: ${error.message}`);
      }
    }

    console.log(
      `[Billing] Nightly billing complete: ` +
      `${workspacesProcessed} workspaces, ${totalUnits} units`
    );

    return { workspacesProcessed, totalUnits, errors };
  } catch (error: any) {
    console.error('[Billing] Nightly billing failed:', error);
    return { workspacesProcessed, totalUnits, errors: [error.message] };
  }
}

/**
 * Get usage breakdown for a workspace
 */
export async function getUsageBreakdown(
  workspaceId: string,
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalUnits: number;
  totalTokens: number;
  totalSocialRequests: number;
  totalPerplexitySearches: number;
  costEstimate: number;
  byDay: any[];
}> {
  try {
    let query = supabase
      .from('enrichment_usage')
      .select('*')
      .eq('workspace_id', workspaceId);

    if (startDate) {
      query = query.gte('created_at', startDate.toISOString());
    }

    if (endDate) {
      query = query.lte('created_at', endDate.toISOString());
    }

    const { data: usage } = await query.order('created_at', { ascending: true });

    if (!usage || usage.length === 0) {
      return {
        totalUnits: 0,
        totalTokens: 0,
        totalSocialRequests: 0,
        totalPerplexitySearches: 0,
        costEstimate: 0,
        byDay: []
      };
    }

    const totalUnits = usage.reduce((sum, r) => sum + r.units_used, 0);
    const totalTokens = usage.reduce((sum, r) => sum + r.tokens_used, 0);
    const totalSocialRequests = usage.reduce((sum, r) => sum + r.social_requests, 0);
    const totalPerplexitySearches = usage.reduce((sum, r) => sum + r.perplexity_searches, 0);
    const costEstimate = usage.reduce((sum, r) => sum + r.cost_estimate_cents, 0) / 100;

    // Group by day
    const byDay = usage.reduce((acc: any[], record) => {
      const day = record.created_at.slice(0, 10);
      const existing = acc.find(d => d.date === day);

      if (existing) {
        existing.units += record.units_used;
        existing.tokens += record.tokens_used;
        existing.cost += record.cost_estimate_cents / 100;
      } else {
        acc.push({
          date: day,
          units: record.units_used,
          tokens: record.tokens_used,
          cost: record.cost_estimate_cents / 100
        });
      }

      return acc;
    }, []);

    return {
      totalUnits,
      totalTokens,
      totalSocialRequests,
      totalPerplexitySearches,
      costEstimate,
      byDay
    };
  } catch (error) {
    console.error('[Billing] Get usage breakdown failed:', error);
    throw error;
  }
}
