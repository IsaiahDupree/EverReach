/**
 * GET /api/health/weather-cache
 *
 * Returns weather cache health metrics:
 * - Total cached rows
 * - Oldest/newest entry timestamps
 * - Hit rate (last 24h)
 * - Provider breakdown
 * - Average cache age
 *
 * Used for monitoring cache effectiveness.
 */

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface CacheMetrics {
  total_rows: number;
  oldest_entry: string | null;
  newest_entry: string | null;
  average_age_hours: number | null;
  provider_breakdown: Record<string, number>;
  hit_rate_24h: number | null;
  estimated_hit_count_24h: number;
  estimated_miss_count_24h: number;
  cache_size_estimate_mb: number;
  status: 'healthy' | 'degraded' | 'poor';
}

export async function GET(): Promise<NextResponse> {
  try {
    // 1. Total rows and timestamps
    const { data: rows, error: rowsError } = await supabase
      .from('weather_cache')
      .select('hour_bucket, provider', { count: 'exact' })
      .order('hour_bucket', { ascending: false });

    if (rowsError) {
      throw rowsError;
    }

    const totalRows = rows?.length ?? 0;
    const oldestEntry = rows && rows.length > 0
      ? rows[rows.length - 1]?.hour_bucket
      : null;
    const newestEntry = rows && rows.length > 0
      ? rows[0]?.hour_bucket
      : null;

    // 2. Calculate average age
    let averageAgeHours: number | null = null;
    if (newestEntry) {
      const newestTime = new Date(newestEntry).getTime();
      const now = Date.now();
      averageAgeHours = (now - newestTime) / (1000 * 60 * 60);
    }

    // 3. Provider breakdown
    const providerBreakdown: Record<string, number> = {};
    if (rows) {
      rows.forEach((row) => {
        const provider = row.provider ?? 'unknown';
        providerBreakdown[provider] = (providerBreakdown[provider] ?? 0) + 1;
      });
    }

    // 4. Estimate hit rate from cache table records
    // A hit is when a row was fetched from cache
    // A miss is when a row was created by a new fetch
    // This is approximate based on creation patterns
    const now = new Date();
    const since24hAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const { data: recentRows } = await supabase
      .from('weather_cache')
      .select('*', { count: 'exact' })
      .gte('fetched_at', since24hAgo.toISOString())
      .lte('fetched_at', now.toISOString());

    const recentRowCount = recentRows?.length ?? 0;

    // Estimate: assume each unique (geohash5, hour_bucket) combination
    // that exists means there were hits on that combination
    const { data: uniqueCombos } = await supabase
      .from('weather_cache')
      .select('geohash5, hour_bucket', { count: 'exact' })
      .distinct();

    const uniqueComboCount = uniqueCombos?.length ?? 0;

    // Rough estimate: if we have recent_rows and recent_combos,
    // hit_rate = recent_rows / (recent_combos + duplicates_from_new_requests)
    let hitRate: number | null = null;
    let estimatedHits = 0;
    let estimatedMisses = 0;

    if (uniqueComboCount > 0 && recentRowCount > 0) {
      // Simple heuristic: if we got many rows recently, some are hits
      // Assume first instance is a miss, rest are hits
      estimatedMisses = uniqueComboCount;
      estimatedHits = Math.max(0, recentRowCount - uniqueComboCount);
      const totalRequests = estimatedHits + estimatedMisses;
      hitRate = totalRequests > 0 ? estimatedHits / totalRequests : 0;
    }

    // 5. Estimate cache size (rough)
    // Each weather_cache row ~500 bytes (geohash, timestamps, floats, text)
    const estimatedSizeMB = (totalRows * 500) / (1024 * 1024);

    // 6. Determine health status
    let status: 'healthy' | 'degraded' | 'poor' = 'healthy';
    if (totalRows < 100) {
      status = 'degraded'; // Very small cache
    } else if (totalRows < 50) {
      status = 'poor'; // Tiny cache
    }
    if (hitRate !== null && hitRate < 0.3) {
      status = 'poor'; // Low hit rate
    } else if (hitRate !== null && hitRate < 0.6) {
      status = 'degraded'; // Moderate hit rate
    }
    if (averageAgeHours !== null && averageAgeHours > 48) {
      status = 'degraded'; // Cache data is stale
    }

    const metrics: CacheMetrics = {
      total_rows: totalRows,
      oldest_entry: oldestEntry ?? null,
      newest_entry: newestEntry ?? null,
      average_age_hours: averageAgeHours,
      provider_breakdown: providerBreakdown,
      hit_rate_24h: hitRate,
      estimated_hit_count_24h: estimatedHits,
      estimated_miss_count_24h: estimatedMisses,
      cache_size_estimate_mb: Math.round(estimatedSizeMB * 100) / 100,
      status,
    };

    return NextResponse.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[weather-cache health]', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
