/**
 * Dashboard Overview API
 * GET /api/v1/dashboard/overview
 * 
 * Unified endpoint for dashboard displaying:
 * - Feature requests (with votes, status, categories)
 * - Endpoint health checks and test results
 * - Service status monitoring
 * - API performance metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getUser } from '@/lib/auth';

export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * GET /api/v1/dashboard/overview
 * 
 * Returns comprehensive dashboard data:
 * - feature_requests: List of feature requests with vote counts
 * - endpoint_health: Status of all API endpoints
 * - service_status: Health of dependent services
 * - test_results: Latest test execution results
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getUser(req);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Parallel queries for performance
    const [
      featureRequestsResult,
      featureBucketsResult,
      serviceStatusResult,
      endpointHealthResult,
    ] = await Promise.allSettled([
      // Feature Requests (top 20 by votes)
      supabase
        .from('feature_requests')
        .select('id, title, description, status, category, votes_count, created_at, updated_at')
        .order('votes_count', { ascending: false })
        .limit(20),
      
      // Feature Buckets (AI-clustered requests)
      supabase
        .from('feature_bucket_rollups')
        .select('*')
        .order('votes_count', { ascending: false })
        .limit(10),
      
      // Service Status (from health checks)
      supabase
        .from('latest_service_status')
        .select('*')
        .order('checked_at', { ascending: false }),
      
      // Endpoint Health (mock data - will be replaced with actual test results)
      Promise.resolve({ data: generateEndpointHealthData(), error: null }),
    ]);

    // Extract data from settled promises
    const featureRequests = featureRequestsResult.status === 'fulfilled' 
      ? featureRequestsResult.value.data || []
      : [];
    
    const featureBuckets = featureBucketsResult.status === 'fulfilled'
      ? featureBucketsResult.value.data || []
      : [];
    
    const serviceStatus = serviceStatusResult.status === 'fulfilled'
      ? serviceStatusResult.value.data || []
      : [];
    
    const endpointHealth = endpointHealthResult.status === 'fulfilled'
      ? endpointHealthResult.value.data || []
      : [];

    // Calculate summary statistics
    const summary = {
      total_feature_requests: featureRequests.length,
      pending_requests: featureRequests.filter((r: any) => r.status === 'backlog').length,
      in_progress_requests: featureRequests.filter((r: any) => r.status === 'in_progress').length,
      completed_requests: featureRequests.filter((r: any) => r.status === 'shipped').length,
      total_votes: featureRequests.reduce((sum: number, r: any) => sum + (r.votes_count || 0), 0),
      
      healthy_endpoints: endpointHealth.filter((e: any) => e.status === 'healthy').length,
      degraded_endpoints: endpointHealth.filter((e: any) => e.status === 'degraded').length,
      down_endpoints: endpointHealth.filter((e: any) => e.status === 'down').length,
      total_endpoints: endpointHealth.length,
      
      healthy_services: serviceStatus.filter((s: any) => s.is_healthy).length,
      total_services: serviceStatus.length,
    };

    return NextResponse.json({
      success: true,
      data: {
        summary,
        feature_requests: featureRequests,
        feature_buckets: featureBuckets,
        endpoint_health: endpointHealth,
        service_status: serviceStatus,
      },
      generated_at: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('[Dashboard] Overview error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Generate endpoint health data
 * This will be replaced with actual test results from your test suite
 */
function generateEndpointHealthData() {
  const endpoints = [
    // Authentication & User
    { path: '/api/v1/me', method: 'GET', category: 'auth', tests_passing: 5, tests_total: 5 },
    { path: '/api/v1/me/entitlements', method: 'GET', category: 'auth', tests_passing: 3, tests_total: 3 },
    { path: '/api/v1/me/trial-stats', method: 'GET', category: 'auth', tests_passing: 4, tests_total: 4 },
    
    // Contacts
    { path: '/api/v1/contacts', method: 'GET', category: 'contacts', tests_passing: 8, tests_total: 8 },
    { path: '/api/v1/contacts', method: 'POST', category: 'contacts', tests_passing: 6, tests_total: 6 },
    { path: '/api/v1/contacts/:id', method: 'GET', category: 'contacts', tests_passing: 5, tests_total: 5 },
    { path: '/api/v1/contacts/:id', method: 'PATCH', category: 'contacts', tests_passing: 7, tests_total: 7 },
    { path: '/api/v1/contacts/:id', method: 'DELETE', category: 'contacts', tests_passing: 3, tests_total: 3 },
    
    // Warmth
    { path: '/api/v1/warmth/summary', method: 'GET', category: 'warmth', tests_passing: 4, tests_total: 4 },
    { path: '/api/v1/contacts/:id/warmth/recompute', method: 'POST', category: 'warmth', tests_passing: 6, tests_total: 6 },
    { path: '/api/v1/warmth/alerts', method: 'GET', category: 'warmth', tests_passing: 5, tests_total: 5 },
    
    // Interactions
    { path: '/api/v1/interactions', method: 'GET', category: 'interactions', tests_passing: 7, tests_total: 7 },
    { path: '/api/v1/interactions', method: 'POST', category: 'interactions', tests_passing: 8, tests_total: 8 },
    
    // Messages
    { path: '/api/v1/messages/prepare', method: 'POST', category: 'messages', tests_passing: 5, tests_total: 6 },
    { path: '/api/v1/messages/send', method: 'POST', category: 'messages', tests_passing: 4, tests_total: 5 },
    
    // AI Agent
    { path: '/api/v1/agent/chat', method: 'POST', category: 'ai', tests_passing: 10, tests_total: 10 },
    { path: '/api/v1/agent/analyze/contact', method: 'POST', category: 'ai', tests_passing: 6, tests_total: 6 },
    { path: '/api/v1/contacts/:id/context-bundle', method: 'GET', category: 'ai', tests_passing: 32, tests_total: 32 },
    
    // Feature Requests
    { path: '/api/v1/feature-requests', method: 'GET', category: 'features', tests_passing: 4, tests_total: 4 },
    { path: '/api/v1/feature-requests', method: 'POST', category: 'features', tests_passing: 6, tests_total: 6 },
    { path: '/api/v1/feature-requests/:id', method: 'GET', category: 'features', tests_passing: 2, tests_total: 2 },
    { path: '/api/v1/feature-requests/:id/vote', method: 'POST', category: 'features', tests_passing: 2, tests_total: 2 },
    
    // Analytics
    { path: '/api/v1/analytics/dashboard', method: 'GET', category: 'analytics', tests_passing: 5, tests_total: 5 },
    { path: '/api/v1/analytics/magnetism-summary', method: 'GET', category: 'analytics', tests_passing: 3, tests_total: 3 },
    
    // Goals
    { path: '/api/v1/goals', method: 'GET', category: 'goals', tests_passing: 3, tests_total: 4 },
    { path: '/api/v1/goals', method: 'POST', category: 'goals', tests_passing: 2, tests_total: 4 },
    
    // Custom Fields
    { path: '/api/v1/custom-fields', method: 'GET', category: 'custom_fields', tests_passing: 8, tests_total: 8 },
    { path: '/api/v1/contacts/:id/custom', method: 'PATCH', category: 'custom_fields', tests_passing: 7, tests_total: 7 },
    
    // Voice Notes
    { path: '/api/v1/me/persona-notes', method: 'GET', category: 'voice_notes', tests_passing: 5, tests_total: 5 },
    { path: '/api/v1/me/persona-notes', method: 'POST', category: 'voice_notes', tests_passing: 6, tests_total: 6 },
    
    // Health & Ops
    { path: '/api/health', method: 'GET', category: 'ops', tests_passing: 2, tests_total: 2 },
    { path: '/api/v1/ops/config-status', method: 'GET', category: 'ops', tests_passing: 3, tests_total: 3 },
  ];

  return endpoints.map(endpoint => {
    const pass_rate = endpoint.tests_passing / endpoint.tests_total;
    let status: 'healthy' | 'degraded' | 'down';
    
    if (pass_rate === 1) {
      status = 'healthy';
    } else if (pass_rate >= 0.7) {
      status = 'degraded';
    } else {
      status = 'down';
    }

    return {
      ...endpoint,
      status,
      pass_rate: Math.round(pass_rate * 100),
      last_tested: new Date(Date.now() - Math.random() * 3600000).toISOString(), // Random time in last hour
      avg_response_time: Math.round(50 + Math.random() * 200), // 50-250ms
    };
  });
}
