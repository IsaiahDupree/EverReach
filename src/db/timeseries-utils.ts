/**
 * Time-series utility functions for efficient event data handling
 */

export type TimeUnit = 'minute' | 'hour' | 'day' | 'week' | 'month';

export interface TimeRange {
  startTime: number;
  endTime: number;
}

export interface TimeBucket {
  start: number;
  end: number;
  label: string;
}

/**
 * Convert timestamp to bucket start time
 */
export function getBucketStart(timestamp: number, unit: TimeUnit): number {
  const date = new Date(timestamp);

  switch (unit) {
    case 'minute':
      date.setSeconds(0, 0);
      return date.getTime();
    case 'hour':
      date.setMinutes(0, 0, 0);
      return date.getTime();
    case 'day':
      date.setHours(0, 0, 0, 0);
      return date.getTime();
    case 'week': {
      const day = date.getDay();
      const diff = date.getDate() - day;
      date.setDate(diff);
      date.setHours(0, 0, 0, 0);
      return date.getTime();
    }
    case 'month':
      date.setDate(1);
      date.setHours(0, 0, 0, 0);
      return date.getTime();
  }
}

/**
 * Get the next bucket start time
 */
export function getNextBucketStart(bucketStart: number, unit: TimeUnit): number {
  const date = new Date(bucketStart);

  switch (unit) {
    case 'minute':
      date.setMinutes(date.getMinutes() + 1);
      break;
    case 'hour':
      date.setHours(date.getHours() + 1);
      break;
    case 'day':
      date.setDate(date.getDate() + 1);
      break;
    case 'week':
      date.setDate(date.getDate() + 7);
      break;
    case 'month':
      date.setMonth(date.getMonth() + 1);
      break;
  }

  return date.getTime();
}

/**
 * Generate time buckets for a time range
 */
export function generateTimeBuckets(startTime: number, endTime: number, unit: TimeUnit): TimeBucket[] {
  const buckets: TimeBucket[] = [];
  let current = getBucketStart(startTime, unit);

  while (current <= endTime) {
    const next = getNextBucketStart(current, unit);
    buckets.push({
      start: current,
      end: Math.min(next, endTime),
      label: formatBucketLabel(current, unit),
    });
    current = next;
  }

  return buckets;
}

/**
 * Format bucket label for display
 */
function formatBucketLabel(timestamp: number, unit: TimeUnit): string {
  const date = new Date(timestamp);

  switch (unit) {
    case 'minute':
      return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    case 'hour':
      return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    case 'day':
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    case 'week': {
      const endDate = new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000);
      return `${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
    }
    case 'month':
      return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
  }
}

/**
 * Calculate bucket retention policy
 * Returns which unit should be used to store events for a given age
 */
export function getBucketingStrategy(ageMs: number): TimeUnit {
  const dayMs = 24 * 60 * 60 * 1000;
  const monthMs = 30 * dayMs;

  if (ageMs < dayMs) {
    return 'minute';
  } else if (ageMs < 7 * dayMs) {
    return 'hour';
  } else if (ageMs < monthMs) {
    return 'day';
  } else if (ageMs < 12 * monthMs) {
    return 'week';
  } else {
    return 'month';
  }
}

/**
 * Create partitioning clause for Postgres table
 * This helps with performance for very large event tables
 */
export function getPartitionClause(columnName: string = 'timestamp'): string {
  return `PARTITION BY RANGE (${columnName}) (
    PARTITION p_2024_01 VALUES LESS THAN ('2024-02-01'),
    PARTITION p_2024_02 VALUES LESS THAN ('2024-03-01'),
    PARTITION p_2024_03 VALUES LESS THAN ('2024-04-01'),
    PARTITION p_2024_04 VALUES LESS THAN ('2024-05-01'),
    PARTITION p_2024_05 VALUES LESS THAN ('2024-06-01'),
    PARTITION p_future VALUES LESS THAN (MAXVALUE)
  )`;
}

/**
 * Format time range for SQL WHERE clause
 */
export function formatTimeRangeSql(startTime: number, endTime: number, columnName: string = 'timestamp'): string {
  return `${columnName} >= ${startTime} AND ${columnName} <= ${endTime}`;
}

/**
 * Calculate optimal index for time range queries
 */
export function getOptimalIndex(startTime: number, endTime: number, unit: TimeUnit): string {
  const bucketStart = getBucketStart(startTime, unit);
  const bucketEnd = getBucketStart(endTime, unit);

  // Suggest composite index structure for better query performance
  return `CREATE INDEX idx_events_${unit}_composite ON events (${unit}_bucket, user_id, event_type) WHERE timestamp >= ${bucketStart} AND timestamp <= ${bucketEnd}`;
}
