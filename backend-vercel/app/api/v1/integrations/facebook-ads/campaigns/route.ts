/**
 * Facebook Ads Marketing API - Campaign Management
 * GET /api/v1/integrations/facebook-ads/campaigns - List campaigns
 * POST /api/v1/integrations/facebook-ads/campaigns - Create campaign
 * 
 * Manages Facebook advertising campaigns
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-utils';

const FB_GRAPH_API = 'https://graph.facebook.com/v22.0';
const AD_ACCOUNT_ID = 'act_1130334212412487';

function getFacebookAdsToken() {
  return process.env.FB_ADS_ACCESS_TOKEN;
}

export async function GET(req: NextRequest) {
  try {
    // Verify authentication
    const auth = await verifyAuth(req);
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = getFacebookAdsToken();
    if (!token) {
      return NextResponse.json(
        { error: 'Facebook Ads API token not configured' },
        { status: 500 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const limit = searchParams.get('limit') || '25';

    // Get campaigns for ad account
    const params = new URLSearchParams({
      access_token: token,
      fields: 'id,name,objective,status,daily_budget,lifetime_budget,created_time,updated_time,insights{spend,impressions,clicks,ctr,cpc,cpm}',
      limit,
    });

    const response = await fetch(
      `${FB_GRAPH_API}/${AD_ACCOUNT_ID}/campaigns?${params}`
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        `Facebook Ads API error: ${data.error?.message || 'Unknown error'}`
      );
    }

    return NextResponse.json({
      success: true,
      campaigns: data.data || [],
      paging: data.paging,
      total_count: data.data?.length || 0,
      ad_account_id: AD_ACCOUNT_ID,
    });

  } catch (error) {
    console.error('Facebook Ads campaigns error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch campaigns',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const auth = await verifyAuth(req);
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = getFacebookAdsToken();
    if (!token) {
      return NextResponse.json(
        { error: 'Facebook Ads API token not configured' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const {
      name,
      objective = 'OUTCOME_TRAFFIC',
      status = 'PAUSED',
      special_ad_categories = [],
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Campaign name is required' },
        { status: 400 }
      );
    }

    // Create campaign
    const payload = new URLSearchParams({
      access_token: token,
      name,
      objective,
      status,
      buying_type: 'AUCTION',
      special_ad_categories: JSON.stringify(special_ad_categories),
    });

    const response = await fetch(
      `${FB_GRAPH_API}/${AD_ACCOUNT_ID}/campaigns`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: payload.toString(),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        `Facebook Ads API error: ${data.error?.message || 'Unknown error'}`
      );
    }

    return NextResponse.json({
      success: true,
      campaign_id: data.id,
      name,
      objective,
      status,
      ad_account_id: AD_ACCOUNT_ID,
    });

  } catch (error) {
    console.error('Facebook Ads create campaign error:', error);
    return NextResponse.json(
      {
        error: 'Failed to create campaign',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
