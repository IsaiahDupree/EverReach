/**
 * Health check endpoint for monitoring
 */

import { testConnection } from '../db/supabase';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  checks: {
    database: { status: 'ok' | 'error'; latency?: number; message?: string };
    cache: { status: 'ok' | 'error'; latency?: number };
    disk: { status: 'ok' | 'error'; usage?: number };
  };
  uptime: number;
  version: string;
}

const startTime = Date.now();

export async function getHealthStatus(): Promise<HealthStatus> {
  const checks = {
    database: await checkDatabase(),
    cache: { status: 'ok' as const, latency: 0 },
    disk: { status: 'ok' as const, usage: 0 },
  };

  // Determine overall status
  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  if (checks.database.status === 'error') {
    status = 'unhealthy';
  } else if (checks.cache.status === 'error' || checks.disk.status === 'error') {
    status = 'degraded';
  }

  return {
    status,
    timestamp: Date.now(),
    checks,
    uptime: Date.now() - startTime,
    version: '1.0.0',
  };
}

async function checkDatabase(): Promise<{ status: 'ok' | 'error'; latency?: number; message?: string }> {
  try {
    const start = Date.now();
    const connected = await testConnection();
    const latency = Date.now() - start;

    if (connected) {
      return {
        status: 'ok',
        latency,
      };
    } else {
      return {
        status: 'error',
        message: 'Database connection failed',
      };
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    return {
      status: 'error',
      message: err.message,
    };
  }
}

/**
 * Format HTTP response for health check
 */
export function formatHealthResponse(health: HealthStatus) {
  const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 503 : 500;
  return {
    statusCode,
    body: JSON.stringify(health),
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Access-Control-Allow-Origin': '*',
    },
  };
}
