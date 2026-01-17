/**
 * Widget Gallery API
 * GET /api/dashboard/widgets - Get available widget templates
 */

import { NextRequest } from 'next/server';
import { getClientOrThrow } from '@/lib/supabase';
import { options, ok, unauthorized } from '@/lib/cors';
import type { WidgetConfig } from '@/lib/dashboard/types';
import { MetricNames } from '@/lib/dashboard/types';

export const runtime = 'edge';

export function OPTIONS(req: Request) {
  return options(req);
}

/**
 * GET /api/dashboard/widgets
 * Returns a gallery of available widget templates
 */
export async function GET(req: NextRequest) {
  const supabase = getClientOrThrow(req);

  try {
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return unauthorized('Authentication required', req);
    }

    const widgets = getWidgetGallery();
    return ok({ widgets }, req);

  } catch (error: any) {
    console.error('[Widgets] GET error:', error);
    return ok({ widgets: [] }, req);
  }
}

/**
 * Widget gallery with pre-configured templates
 */
function getWidgetGallery(): WidgetConfig[] {
  return [
    // Revenue Widgets
    {
      id: 'mrr-card',
      title: 'Monthly Recurring Revenue',
      kind: 'kpi',
      query: { metric_name: MetricNames.STRIPE_MRR, from: 'now-30d', to: 'now', agg: 'avg' },
      renderer: 'stat',
    },
    {
      id: 'arr-card',
      title: 'Annual Recurring Revenue',
      kind: 'kpi',
      query: { metric_name: MetricNames.STRIPE_ARR, from: 'now-30d', to: 'now', agg: 'avg' },
      renderer: 'stat',
    },
    {
      id: 'revenue-chart',
      title: 'Revenue Trend',
      kind: 'timeseries',
      query: { metric_name: MetricNames.STRIPE_REVENUE_TODAY, from: 'now-30d', to: 'now', interval: '1d', agg: 'sum' },
      renderer: 'line',
    },

    // User Analytics Widgets
    {
      id: 'dau-card',
      title: 'Daily Active Users',
      kind: 'kpi',
      query: { metric_name: MetricNames.POSTHOG_DAU, from: 'now-1d', to: 'now', agg: 'sum' },
      renderer: 'stat',
    },
    {
      id: 'mau-card',
      title: 'Monthly Active Users',
      kind: 'kpi',
      query: { metric_name: MetricNames.POSTHOG_MAU, from: 'now-30d', to: 'now', agg: 'avg' },
      renderer: 'stat',
    },
    {
      id: 'users-chart',
      title: 'Active Users Trend',
      kind: 'timeseries',
      query: { metric_name: MetricNames.POSTHOG_DAU, from: 'now-7d', to: 'now', interval: '1d', agg: 'sum' },
      renderer: 'area',
    },

    // Subscription Widgets
    {
      id: 'active-subs-card',
      title: 'Active Subscriptions',
      kind: 'kpi',
      query: { metric_name: MetricNames.REVENUECAT_ACTIVE_SUBS, from: 'now-1d', to: 'now', agg: 'avg' },
      renderer: 'stat',
    },
    {
      id: 'churn-card',
      title: 'Churn Rate',
      kind: 'kpi',
      query: { metric_name: MetricNames.STRIPE_CHURN_RATE, from: 'now-30d', to: 'now', agg: 'avg' },
      renderer: 'stat',
    },
    {
      id: 'conversions-card',
      title: 'Trial Conversions',
      kind: 'kpi',
      query: { metric_name: MetricNames.REVENUECAT_TRIAL_CONVERSIONS, from: 'now-30d', to: 'now', agg: 'sum' },
      renderer: 'stat',
    },

    // Email Widgets
    {
      id: 'email-delivery-card',
      title: 'Email Delivery Rate',
      kind: 'kpi',
      query: { metric_name: MetricNames.RESEND_DELIVERED, from: 'now-7d', to: 'now', agg: 'sum' },
      renderer: 'stat',
    },
    {
      id: 'email-open-card',
      title: 'Email Open Rate',
      kind: 'kpi',
      query: { metric_name: MetricNames.RESEND_OPENED, from: 'now-7d', to: 'now', agg: 'sum' },
      renderer: 'stat',
    },

    // Infrastructure Widgets
    {
      id: 'uptime-card',
      title: 'Backend Uptime',
      kind: 'kpi',
      query: { metric_name: MetricNames.BACKEND_UPTIME, from: 'now-24h', to: 'now', agg: 'avg' },
      renderer: 'stat',
    },
    {
      id: 'latency-card',
      title: 'API Latency (P95)',
      kind: 'kpi',
      query: { metric_name: MetricNames.BACKEND_LATENCY_P95, from: 'now-1h', to: 'now', agg: 'avg' },
      renderer: 'stat',
    },
    {
      id: 'db-latency-card',
      title: 'Database Latency',
      kind: 'kpi',
      query: { metric_name: MetricNames.SUPABASE_DB_LATENCY, from: 'now-1h', to: 'now', agg: 'avg' },
      renderer: 'stat',
    },

    // Status Widget
    {
      id: 'health-grid',
      title: 'Service Health',
      kind: 'status',
      query: null,
      renderer: 'grid',
    },
  ];
}
