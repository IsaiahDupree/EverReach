/**
 * Health Check Endpoint
 * GET /api/health
 *
 * Returns API health status and checks database connectivity.
 * Used for monitoring, load balancers, and uptime checks.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

/**
 * Health status response type
 */
interface HealthResponse {
  status: 'ok' | 'degraded';
  timestamp: string;
  database: 'connected' | 'disconnected';
  version: string;
}

/**
 * GET /api/health
 *
 * Returns the health status of the API and its dependencies.
 *
 * Response (200):
 * - status: "ok" if all systems operational
 * - timestamp: ISO 8601 timestamp
 * - database: Database connection status
 * - version: API version
 *
 * Response (503):
 * - status: "degraded" if database is unavailable
 * - timestamp: ISO 8601 timestamp
 * - database: "disconnected"
 * - version: API version
 */
export async function GET(request: NextRequest): Promise<NextResponse<HealthResponse>> {
  const timestamp = new Date().toISOString();
  const version = '1.0.0'; // In production, this could come from package.json

  let databaseStatus: 'connected' | 'disconnected' = 'disconnected';
  let overallStatus: 'ok' | 'degraded' = 'degraded';

  try {
    // Create Supabase client
    const supabase = createServerClient();

    // Attempt a simple query to check database connectivity
    // We'll query the users table with a limit to minimize overhead
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    // Check if the query was successful
    if (!error) {
      databaseStatus = 'connected';
      overallStatus = 'ok';
    }
  } catch (error) {
    // Database connection failed
    // Log error for debugging (in production, use proper logging service)
    console.error('Health check database error:', error);
    databaseStatus = 'disconnected';
    overallStatus = 'degraded';
  }

  // Determine HTTP status code based on health
  const httpStatus = overallStatus === 'ok' ? 200 : 503;

  return NextResponse.json(
    {
      status: overallStatus,
      timestamp,
      database: databaseStatus,
      version,
    },
    { status: httpStatus }
  );
}
