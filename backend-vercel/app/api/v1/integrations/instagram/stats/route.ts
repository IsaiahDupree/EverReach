/**
 * Instagram Business API - Get Account Stats
 * GET /api/v1/integrations/instagram/stats
 * 
 * Retrieves Instagram account statistics and insights
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-utils';

const INSTAGRAM_GRAPH_API = 'https://graph.facebook.com/v22.0';

function getInstagramToken() {
  return process.env.INSTAGRAM_ACCESS_TOKEN;
}

export async function GET(req: NextRequest) {
  try {
    // Verify authentication
    const auth = await verifyAuth(req);
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = getInstagramToken();
    if (!token) {
      return NextResponse.json(
        { error: 'Instagram API token not configured' },
        { status: 500 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const accountId = searchParams.get('account_id');

    // Get Instagram Business Account info
    const endpoint = accountId 
      ? `${INSTAGRAM_GRAPH_API}/${accountId}`
      : `${INSTAGRAM_GRAPH_API}/me/accounts`;

    const params = new URLSearchParams({
      access_token: token,
      fields: 'id,name,username,followers_count,follows_count,media_count,profile_picture_url',
    });

    const response = await fetch(`${endpoint}?${params}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        `Instagram API error: ${data.error?.message || 'Unknown error'}`
      );
    }

    // Get recent media insights if account ID provided
    let mediaInsights = null;
    if (accountId) {
      try {
        const mediaResponse = await fetch(
          `${INSTAGRAM_GRAPH_API}/${accountId}/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count&limit=10&access_token=${token}`
        );
        const mediaData = await mediaResponse.json();
        if (mediaResponse.ok) {
          mediaInsights = mediaData.data;
        }
      } catch (e) {
        console.warn('Failed to fetch media insights:', e);
      }
    }

    return NextResponse.json({
      success: true,
      account: data,
      recent_media: mediaInsights,
      fetched_at: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Instagram stats error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch Instagram stats',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
