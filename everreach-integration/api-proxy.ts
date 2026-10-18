// MetaCoach API Proxy for Everreach
// Place this in: pages/api/meta/[...path].ts (for Pages Router)
// Or: app/api/meta/[...path]/route.ts (for App Router)

import { NextRequest, NextResponse } from 'next/server';

const METACOACH_BASE_URL = process.env.METACOACH_API_URL || 'https://www.matrixloop.app';
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || '';

// In-memory cache (5 minutes)
const cache: Map<string, { data: any; timestamp: number }> = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * API Proxy for MetaCoach endpoints
 * 
 * Usage in Everreach:
 * - GET /api/meta/health - Get Meta API health status
 * - GET /api/meta/metrics - Get performance metrics
 * - GET /api/meta/metrics?from=2025-11-01T00:00:00Z&to=2025-11-08T00:00:00Z
 */
export async function GET(request: NextRequest) {
  try {
    // Extract path from URL
    const path = request.nextUrl.pathname.replace('/api/meta/', '');
    const searchParams = request.nextUrl.searchParams.toString();
    const fullPath = searchParams ? `${path}?${searchParams}` : path;
    
    // Check cache
    const cached = cache.get(fullPath);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data, {
        headers: {
          'X-Cache': 'HIT',
          'X-Cache-Age': `${Math.floor((Date.now() - cached.timestamp) / 1000)}s`
        }
      });
    }

    // Build MetaCoach API URL
    const metaCoachUrl = `${METACOACH_BASE_URL}/api/meta/${fullPath}`;
    
    console.log('[MetaCoach Proxy] Fetching:', metaCoachUrl);

    // Fetch from MetaCoach
    const response = await fetch(metaCoachUrl, {
      headers: {
        'Cookie': `meta_access_token=${META_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('[MetaCoach Proxy] Error:', response.status, response.statusText);
      return NextResponse.json(
        { error: 'Failed to fetch from MetaCoach', status: response.status },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Update cache
    cache.set(fullPath, { data, timestamp: Date.now() });

    return NextResponse.json(data, {
      headers: {
        'X-Cache': 'MISS'
      }
    });

  } catch (error: any) {
    console.error('[MetaCoach Proxy] Exception:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

// For Pages Router (alternative implementation)
export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { path } = req.query;
    const pathString = Array.isArray(path) ? path.join('/') : path;
    const queryString = new URLSearchParams(req.query).toString();
    const fullPath = queryString ? `${pathString}?${queryString}` : pathString;

    // Check cache
    const cached = cache.get(fullPath);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('X-Cache-Age', `${Math.floor((Date.now() - cached.timestamp) / 1000)}s`);
      return res.status(200).json(cached.data);
    }

    // Build MetaCoach API URL
    const metaCoachUrl = `${METACOACH_BASE_URL}/api/meta/${fullPath}`;

    console.log('[MetaCoach Proxy] Fetching:', metaCoachUrl);

    // Fetch from MetaCoach
    const response = await fetch(metaCoachUrl, {
      headers: {
        'Cookie': `meta_access_token=${META_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('[MetaCoach Proxy] Error:', response.status, response.statusText);
      return res.status(response.status).json({
        error: 'Failed to fetch from MetaCoach',
        status: response.status
      });
    }

    const data = await response.json();

    // Update cache
    cache.set(fullPath, { data, timestamp: Date.now() });

    res.setHeader('X-Cache', 'MISS');
    return res.status(200).json(data);

  } catch (error: any) {
    console.error('[MetaCoach Proxy] Exception:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
