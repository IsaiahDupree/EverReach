/**
 * Detailed Health Check Endpoint
 *
 * Returns comprehensive health status including:
 * - Database connectivity
 * - Environment variable presence (not values!)
 * - Service uptime
 * - Version information
 *
 * Use for monitoring, debugging, and deployment verification.
 *
 * Returns:
 * - 200 OK: All systems healthy
 * - 503 Service Unavailable: Degraded state (DB down, missing env vars, etc.)
 */

import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

export const runtime = 'edge';

// Uptime tracking (reset on each deployment)
const startTime = Date.now();

// Required environment variables for basic functionality
const REQUIRED_ENV_VARS = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_JWT_SECRET',
] as const;

// Optional but recommended environment variables
const OPTIONAL_ENV_VARS = [
  'META_CONVERSIONS_API_TOKEN',
  'EXPO_PUBLIC_META_PIXEL_ID',
  'REVENUECAT_API_KEY',
  'REVENUECAT_WEBHOOK_SECRET',
  'CRON_SECRET',
  'EXPO_PUBLIC_POSTHOG_API_KEY',
] as const;

interface HealthCheckResult {
  status: 'healthy' | 'degraded';
  timestamp: string;
  uptime: {
    seconds: number;
    formatted: string;
  };
  version: {
    node: string;
    // Add your app version here from package.json or env var
    app?: string;
  };
  database: {
    connected: boolean;
    responseTime?: number; // milliseconds
    error?: string;
  };
  environment: {
    required: Record<string, boolean>;
    optional: Record<string, boolean>;
    missing: string[];
  };
}

export async function GET() {
  const timestamp = new Date().toISOString();
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  const uptimeFormatted = formatUptime(uptimeSeconds);

  let status: 'healthy' | 'degraded' = 'healthy';
  const result: HealthCheckResult = {
    status: 'healthy', // Will be updated if checks fail
    timestamp,
    uptime: {
      seconds: uptimeSeconds,
      formatted: uptimeFormatted,
    },
    version: {
      node: process.version,
      app: process.env.APP_VERSION || undefined,
    },
    database: {
      connected: false,
    },
    environment: {
      required: {},
      optional: {},
      missing: [],
    },
  };

  // Check database connectivity
  try {
    const dbCheckStart = Date.now();
    const supabase = getServiceClient();

    // Simple query to verify connection
    const { error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
      .maybeSingle();

    const responseTime = Date.now() - dbCheckStart;

    if (error) {
      // Query failed but connection might be OK
      // Check if it's an RLS/table error vs connection error
      if (error.message.includes('relation') || error.message.includes('permission')) {
        // Table/RLS issue - connection is OK
        result.database.connected = true;
        result.database.responseTime = responseTime;
      } else {
        // Connection issue
        result.database.connected = false;
        result.database.error = 'Query failed';
        status = 'degraded';
      }
    } else {
      result.database.connected = true;
      result.database.responseTime = responseTime;
    }
  } catch (error: any) {
    result.database.connected = false;
    result.database.error = 'Connection failed';
    status = 'degraded';
  }

  // Check required environment variables (presence only, not values)
  const requiredEnv: Record<string, boolean> = {};
  const missing: string[] = [];

  for (const varName of REQUIRED_ENV_VARS) {
    const isPresent = !!process.env[varName];
    requiredEnv[varName] = isPresent;

    if (!isPresent) {
      missing.push(varName);
      status = 'degraded';
    }
  }

  // Check optional environment variables
  const optionalEnv: Record<string, boolean> = {};

  for (const varName of OPTIONAL_ENV_VARS) {
    optionalEnv[varName] = !!process.env[varName];
  }

  result.environment.required = requiredEnv;
  result.environment.optional = optionalEnv;
  result.environment.missing = missing;
  result.status = status;

  // Return appropriate status code
  const statusCode = status === 'healthy' ? 200 : 503;

  return NextResponse.json(result, { status: statusCode });
}

/**
 * Format uptime in human-readable format
 * e.g., "2h 34m 12s" or "45s"
 */
function formatUptime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts: string[] = [];

  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}
