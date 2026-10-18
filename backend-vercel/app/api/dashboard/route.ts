/**
 * Dashboard Management API
 * GET /api/dashboard - Get user's dashboard layout and widgets
 */

import { NextRequest, NextResponse } from 'next/server';
import { getClientOrThrow } from '@/lib/supabase';
import { options, ok, unauthorized, serverError } from '@/lib/cors';
import type { Dashboard } from '@/lib/dashboard/types';
import { jwtVerify } from 'jose';

export const runtime = 'edge';

export function OPTIONS(req: Request) {
  return options(req);
}

/**
 * Verify dashboard JWT token
 */
async function verifyDashboardToken(req: NextRequest): Promise<boolean> {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return false;
    
    const token = authHeader.substring(7);
    const secret = new TextEncoder().encode(
      process.env.DASHBOARD_JWT_SECRET || 'your-secret-key-change-in-production'
    );
    
    const { payload } = await jwtVerify(token, secret);
    return payload.dashboard === true;
  } catch {
    return false;
  }
}

/**
 * GET /api/dashboard
 * 
 * Returns the user's dashboard configuration (layout + widgets)
 * If no dashboard exists, returns a default one
 */
export async function GET(req: NextRequest) {
  // Check for dashboard JWT token
  const isDashboardAuth = await verifyDashboardToken(req);
  
  if (isDashboardAuth) {
    // Return dev dashboard for custom JWT auth
    return ok(getDefaultDashboard('dev-user', 'dev-workspace'), req);
  }

  // Fall back to Supabase user auth
  const supabase = getClientOrThrow(req);

  try {
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return unauthorized('Authentication required', req);
    }

    // Get user's workspace
    const { data: profile } = await supabase
      .from('profiles')
      .select('workspace_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.workspace_id) {
      return ok(getDefaultDashboard(user.id, 'default'), req);
    }

    const workspaceId = profile.workspace_id;

    // Fetch user's dashboard (or default dashboard if no custom one)
    const { data: dashboards } = await supabase
      .from('dashboards')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .limit(1);

    if (!dashboards || dashboards.length === 0) {
      // Return default dashboard
      return ok(getDefaultDashboard(user.id, workspaceId), req);
    }

    return ok(dashboards[0], req);

  } catch (error: any) {
    console.error('[Dashboard] GET error:', error);
    return serverError("Internal server error", req);
  }
}

/**
 * Default dashboard configuration
 */
function getDefaultDashboard(userId: string, workspaceId: string): Dashboard {
  return {
    id: 'default',
    workspace_id: workspaceId,
    user_id: userId,
    name: 'My Dashboard',
    layout: [
      // Top row - KPI cards
      { i: 'mrr-card', x: 0, y: 0, w: 3, h: 2 },
      { i: 'dau-card', x: 3, y: 0, w: 3, h: 2 },
      { i: 'churn-card', x: 6, y: 0, w: 3, h: 2 },
      { i: 'uptime-card', x: 9, y: 0, w: 3, h: 2 },
      
      // Second row - Charts
      { i: 'revenue-chart', x: 0, y: 2, w: 6, h: 4 },
      { i: 'users-chart', x: 6, y: 2, w: 6, h: 4 },
      
      // Third row - Status grid
      { i: 'health-grid', x: 0, y: 6, w: 12, h: 3 },
    ],
    widgets: [
      {
        id: 'mrr-card',
        title: 'Monthly Recurring Revenue',
        kind: 'kpi',
        query: {
          metric_name: 'stripe.mrr_usd',
          from: 'now-30d',
          to: 'now',
          agg: 'avg',
        },
        renderer: 'stat',
      },
      {
        id: 'dau-card',
        title: 'Daily Active Users',
        kind: 'kpi',
        query: {
          metric_name: 'posthog.dau',
          from: 'now-1d',
          to: 'now',
          agg: 'sum',
        },
        renderer: 'stat',
      },
      {
        id: 'churn-card',
        title: 'Churn Rate',
        kind: 'kpi',
        query: {
          metric_name: 'stripe.churn_rate',
          from: 'now-30d',
          to: 'now',
          agg: 'avg',
        },
        renderer: 'stat',
      },
      {
        id: 'uptime-card',
        title: 'Backend Uptime',
        kind: 'kpi',
        query: {
          metric_name: 'backend.uptime_percent',
          from: 'now-24h',
          to: 'now',
          agg: 'avg',
        },
        renderer: 'stat',
      },
      {
        id: 'revenue-chart',
        title: 'Revenue Trend (30d)',
        kind: 'timeseries',
        query: {
          metric_name: 'stripe.revenue_today',
          from: 'now-30d',
          to: 'now',
          interval: '1d',
          agg: 'sum',
        },
        renderer: 'line',
      },
      {
        id: 'users-chart',
        title: 'Active Users (7d)',
        kind: 'timeseries',
        query: {
          metric_name: 'posthog.dau',
          from: 'now-7d',
          to: 'now',
          interval: '1d',
          agg: 'sum',
        },
        renderer: 'area',
      },
      {
        id: 'health-grid',
        title: 'Service Health',
        kind: 'status',
        query: null,
        renderer: 'grid',
      },
    ],
    is_default: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}
