/**
 * Analytics aggregation - convert events to metrics
 */

import { Event } from '../types/event';
import { generateTimeBuckets, TimeUnit } from '../db/timeseries-utils';

export interface Metric {
  name: string;
  value: number;
  timestamp: number;
  dimensions: Record<string, string>;
}

export function aggregateEvents(events: Event[], unit: TimeUnit = 'day'): Metric[] {
  if (events.length === 0) return [];

  const metrics: Metric[] = [];
  const minTime = Math.min(...events.map((e) => e.timestamp));
  const maxTime = Math.max(...events.map((e) => e.timestamp));

  const buckets = generateTimeBuckets(minTime, maxTime, unit);

  // Count events per bucket
  buckets.forEach((bucket) => {
    const bucketEvents = events.filter((e) => e.timestamp >= bucket.start && e.timestamp <= bucket.end);
    if (bucketEvents.length > 0) {
      metrics.push({
        name: 'event_count',
        value: bucketEvents.length,
        timestamp: bucket.start,
        dimensions: {
          bucket: bucket.label,
        },
      });
    }
  });

  // Group by event type
  const eventTypes = [...new Set(events.map((e) => e.event))];
  eventTypes.forEach((eventType) => {
    buckets.forEach((bucket) => {
      const bucketEvents = events.filter(
        (e) => e.event === eventType && e.timestamp >= bucket.start && e.timestamp <= bucket.end
      );
      if (bucketEvents.length > 0) {
        metrics.push({
          name: `event_count_${eventType}`,
          value: bucketEvents.length,
          timestamp: bucket.start,
          dimensions: {
            bucket: bucket.label,
            eventType,
          },
        });
      }
    });
  });

  // Count unique users
  buckets.forEach((bucket) => {
    const bucketEvents = events.filter((e) => e.timestamp >= bucket.start && e.timestamp <= bucket.end);
    const uniqueUsers = new Set(bucketEvents.map((e) => e.userId || e.anonymousId));
    metrics.push({
      name: 'unique_users',
      value: uniqueUsers.size,
      timestamp: bucket.start,
      dimensions: {
        bucket: bucket.label,
      },
    });
  });

  return metrics;
}

export function calculateConversionRate(
  events: Event[],
  conversionEvent: string
): number {
  if (events.length === 0) return 0;

  const conversionCount = events.filter((e) => e.event === conversionEvent).length;
  return (conversionCount / events.length) * 100;
}

export function calculateEventMetrics(
  events: Event[]
): {
  totalEvents: number;
  uniqueUsers: number;
  avgEventsPerUser: number;
  eventTypes: Record<string, number>;
} {
  if (events.length === 0) {
    return {
      totalEvents: 0,
      uniqueUsers: 0,
      avgEventsPerUser: 0,
      eventTypes: {},
    };
  }

  const uniqueUsers = new Set(events.map((e) => e.userId || e.anonymousId));
  const eventTypes: Record<string, number> = {};

  events.forEach((e) => {
    eventTypes[e.event] = (eventTypes[e.event] || 0) + 1;
  });

  return {
    totalEvents: events.length,
    uniqueUsers: uniqueUsers.size,
    avgEventsPerUser: events.length / uniqueUsers.size,
    eventTypes,
  };
}
