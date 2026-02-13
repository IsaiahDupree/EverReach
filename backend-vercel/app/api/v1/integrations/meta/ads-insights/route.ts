/**
 * Meta Ads Insights - Performance Data Sync
 * GET /api/v1/integrations/meta/ads-insights
 * 
 * Syncs ad performance data from Meta Marketing API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth-utils';

const FB_GRAPH_API = 'https://graph.facebook.com/v24.0';

function getSupabase() { return getServiceClient(); }

function getAdsToken() {
  return process.env.FB_ADS_ACCESS_TOKEN;
}

function getAdAccountId() {
  return process.env.FB_ADS_ACCOUNT_ID || 'act_1130334212412487';
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase();
    
    // Verify authentication
    const auth = await verifyAuth(req);
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = getAdsToken();
    const adAccountId = getAdAccountId();

    if (!token) {
      return NextResponse.json(
        { error: 'Facebook Ads API token not configured' },
        { status: 500 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const startDate = searchParams.get('start_date') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = searchParams.get('end_date') || new Date().toISOString().split('T')[0];
    const level = searchParams.get('level') || 'campaign'; // campaign, adset, ad
    const limit = searchParams.get('limit') || '100';

    // Build insights query
    const fields = [
      'campaign_id',
      'campaign_name',
      'adset_id',
      'adset_name',
      'ad_id',
      'ad_name',
      'spend',
      'impressions',
      'clicks',
      'cpc',
      'cpm',
      'ctr',
      'reach',
      'frequency',
      'actions',
      'action_values',
      'conversions',
      'conversion_values',
    ].join(',');

    const params = new URLSearchParams({
      access_token: token,
      fields,
      time_range: JSON.stringify({ since: startDate, until: endDate }),
      level,
      limit,
      time_increment: '1', // Daily breakdown
    });

    // Fetch insights from Meta
    const response = await fetch(
      `${FB_GRAPH_API}/${adAccountId}/insights?${params}`
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        `Meta Ads API error: ${data.error?.message || 'Unknown error'}`
      );
    }

    const insights = data.data || [];
    
    // Store insights in database
    const insightsToInsert = [];
    
    for (const insight of insights) {
      // Parse actions (conversions, etc.)
      const actions: any = {};
      if (insight.actions) {
        for (const action of insight.actions) {
          actions[action.action_type] = parseFloat(action.value);
        }
      }

      // Parse action values (revenue, etc.)
      const actionValues: any = {};
      if (insight.action_values) {
        for (const actionValue of insight.action_values) {
          actionValues[actionValue.action_type] = parseFloat(actionValue.value);
        }
      }

      insightsToInsert.push({
        ad_account_id: adAccountId,
        platform_campaign_id: insight.campaign_id,
        platform_adset_id: insight.adset_id,
        platform_ad_id: insight.ad_id,
        date: insight.date_start,
        spend: parseFloat(insight.spend || 0),
        impressions: parseInt(insight.impressions || 0),
        clicks: parseInt(insight.clicks || 0),
        cpc: parseFloat(insight.cpc || 0),
        cpm: parseFloat(insight.cpm || 0),
        ctr: parseFloat(insight.ctr || 0),
        conversions: actions.offsite_conversion || actions.purchase || 0,
        conversion_value: actionValues.offsite_conversion || actionValues.purchase || 0,
        actions: actions,
        metadata: {
          campaign_name: insight.campaign_name,
          adset_name: insight.adset_name,
          ad_name: insight.ad_name,
          reach: parseInt(insight.reach || 0),
          frequency: parseFloat(insight.frequency || 0),
        },
      });
    }

    // Upsert to database
    if (insightsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('ad_performance')
        .upsert(insightsToInsert, {
          onConflict: 'ad_account_id,platform_campaign_id,date',
        });

      if (insertError) {
        console.error('Failed to insert insights:', insertError);
      }
    }

    // Calculate summary metrics
    const summary = {
      total_spend: insights.reduce((sum: number, i: any) => sum + parseFloat(i.spend || 0), 0),
      total_impressions: insights.reduce((sum: number, i: any) => sum + parseInt(i.impressions || 0), 0),
      total_clicks: insights.reduce((sum: number, i: any) => sum + parseInt(i.clicks || 0), 0),
      total_conversions: insightsToInsert.reduce((sum: number, i: any) => sum + i.conversions, 0),
      average_cpc: insights.length > 0 
        ? insights.reduce((sum: number, i: any) => sum + parseFloat(i.cpc || 0), 0) / insights.length 
        : 0,
      average_cpm: insights.length > 0
        ? insights.reduce((sum: number, i: any) => sum + parseFloat(i.cpm || 0), 0) / insights.length
        : 0,
    };

    return NextResponse.json({
      success: true,
      insights_count: insights.length,
      date_range: { start_date: startDate, end_date: endDate },
      level,
      summary,
      insights: insights.slice(0, 10), // Return first 10 for preview
      synced_to_database: insightsToInsert.length,
    });

  } catch (error) {
    console.error('Ads insights error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch ads insights',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
