/**
 * Analytics query endpoint
 */

import { countEvents, queryEventsByTimeRange } from './event-storage';

export interface AnalyticsQuery {
  metric?: string;
  startTime?: number;
  endTime?: number;
  granularity?: 'minute' | 'hour' | 'day';
  dimension?: string;
}

export interface AnalyticsResult {
  metric: string;
  data: Array<{
    time: number;
    value: number;
    [key: string]: any;
  }>;
  summary: {
    total: number;
    average: number;
    min: number;
    max: number;
  };
}

export async function queryAnalytics(query: AnalyticsQuery): Promise<AnalyticsResult | { error: string }> {
  try {
    const startTime = query.startTime || Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 days default
    const endTime = query.endTime || Date.now();

    const { count, error } = await countEvents(startTime, endTime);

    if (error) {
      return { error };
    }

    // Simple analytics aggregation
    const { events } = await queryEventsByTimeRange(startTime, endTime, 10000);

    // Group events by time bucket
    const buckets: Record<number, number> = {};
    const granularityMs = getGranularityMs(query.granularity || 'hour');

    events.forEach((event) => {
      const bucket = Math.floor(event.timestamp / granularityMs) * granularityMs;
      buckets[bucket] = (buckets[bucket] || 0) + 1;
    });

    const data = Object.entries(buckets)
      .map(([time, value]) => ({
        time: parseInt(time, 10),
        value,
      }))
      .sort((a, b) => a.time - b.time);

    const values = data.map((d) => d.value);
    const total = values.reduce((sum, v) => sum + v, 0);
    const average = values.length > 0 ? total / values.length : 0;
    const min = values.length > 0 ? Math.min(...values) : 0;
    const max = values.length > 0 ? Math.max(...values) : 0;

    return {
      metric: query.metric || 'event_count',
      data,
      summary: {
        total,
        average,
        min,
        max,
      },
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    return {
      error: err.message,
    };
  }
}

function getGranularityMs(granularity: string): number {
  switch (granularity) {
    case 'minute':
      return 60 * 1000;
    case 'hour':
      return 60 * 60 * 1000;
    case 'day':
      return 24 * 60 * 60 * 1000;
    default:
      return 60 * 60 * 1000;
  }
}

/**
 * Format HTTP response for analytics query
 */
export function formatAnalyticsResponse(result: AnalyticsResult | { error: string }) {
  if ('error' in result) {
    return {
      statusCode: 400,
      body: JSON.stringify(result),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify(result),
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'max-age=300',
      'Access-Control-Allow-Origin': '*',
    },
  };
}
