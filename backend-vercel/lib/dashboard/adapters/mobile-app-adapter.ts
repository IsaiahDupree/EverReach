/**
 * Mobile App Service Adapter
 * Monitors app health, crash rate, and active sessions
 */

import { BaseServiceAdapter } from './base-adapter';
import type { IntegrationAccount, MetricPoint } from '../types';
import { MetricNames } from '../types';

interface MobileAppConfig {
  health_check_url?: string; // Optional health check endpoint
  app_store_id?: string;      // Apple App Store ID
  play_store_id?: string;     // Google Play Store ID
}

export class MobileAppAdapter extends BaseServiceAdapter {
  readonly service = 'mobile_app';

  protected async checkHealth(account: IntegrationAccount): Promise<void> {
    const config = account.auth_json as MobileAppConfig;
    
    if (config.health_check_url) {
      // If health check URL is provided, ping it
      await this.fetchApi(
        config.health_check_url,
        { method: 'GET' },
        {}
      );
    } else {
      // Otherwise, check via Supabase user_sessions table
      // This checks if the database is reachable and has recent app activity
      const supabaseUrl = process.env.SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error('SUPABASE_URL environment variable not set');
      }
      
      const response = await this.fetchApi(
        `${supabaseUrl}/rest/v1/user_sessions?select=count&ended_at=is.null`,
        { method: 'GET' },
        {
          'apikey': process.env.SUPABASE_ANON_KEY || '',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        }
      );
      
      // If we get a response, app backend is healthy
      if (!response) {
        throw new Error('No active sessions data available');
      }
    }
  }

  async fetchMetrics(
    account: IntegrationAccount,
    from: Date,
    to: Date
  ): Promise<MetricPoint[]> {
    const metrics: MetricPoint[] = [];

    try {
      // These would typically come from PostHog, Firebase, or App Store/Play Store APIs
      // For now, we'll fetch from Supabase user_sessions table
      
      // Fetch active sessions count
      const activeSessions = await this.fetchActiveSessions();
      metrics.push({
        ts: to.toISOString(),
        value: activeSessions,
      });

      // Fetch crash rate from user_sessions (sessions that ended unexpectedly)
      const crashRate = await this.fetchCrashRate(from, to);
      metrics.push({
        ts: to.toISOString(),
        value: crashRate,
      });

      // Fetch average session duration
      const avgSessionDuration = await this.fetchAvgSessionDuration(from, to);
      metrics.push({
        ts: to.toISOString(),
        value: avgSessionDuration,
      });

    } catch (error) {
      console.error('[MobileAppAdapter] Error fetching metrics:', error);
    }

    return metrics;
  }

  /**
   * Fetch currently active sessions count
   */
  private async fetchActiveSessions(): Promise<number> {
    try {
      const response = await this.fetchApi<{ count: number }>(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/count_active_sessions`,
        { method: 'POST', body: JSON.stringify({}) },
        {
          'apikey': process.env.SUPABASE_ANON_KEY || '',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        }
      );

      return response.count || 0;
    } catch {
      // Fallback: count sessions with no end time
      const response = await this.fetchApi<any[]>(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/user_sessions?select=id&ended_at=is.null`,
        { method: 'GET' },
        {
          'apikey': process.env.SUPABASE_ANON_KEY || '',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        }
      );

      return response?.length || 0;
    }
  }

  /**
   * Calculate crash rate (sessions ending within 1 minute as % of total)
   */
  private async fetchCrashRate(from: Date, to: Date): Promise<number> {
    try {
      // Sessions that lasted less than 60 seconds might indicate crashes
      const response = await this.fetchApi<any[]>(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/user_sessions?select=duration_seconds&started_at=gte.${from.toISOString()}&started_at=lte.${to.toISOString()}&duration_seconds=not.is.null`,
        { method: 'GET' },
        {
          'apikey': process.env.SUPABASE_ANON_KEY || '',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        }
      );

      if (!response || response.length === 0) return 0;

      const crashedSessions = response.filter(s => (s.duration_seconds || 0) < 60).length;
      return (crashedSessions / response.length) * 100;
    } catch {
      return 0;
    }
  }

  /**
   * Calculate average session duration in minutes
   */
  private async fetchAvgSessionDuration(from: Date, to: Date): Promise<number> {
    try {
      const response = await this.fetchApi<any[]>(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/user_sessions?select=duration_seconds&started_at=gte.${from.toISOString()}&started_at=lte.${to.toISOString()}&duration_seconds=not.is.null`,
        { method: 'GET' },
        {
          'apikey': process.env.SUPABASE_ANON_KEY || '',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        }
      );

      if (!response || response.length === 0) return 0;

      const totalSeconds = response.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
      return totalSeconds / response.length / 60; // Convert to minutes
    } catch {
      return 0;
    }
  }

  /**
   * Get metric names supported by this adapter
   */
  getMetricNames(): string[] {
    return [
      MetricNames.APP_STORE_CRASHES,  // Reusing for crash rate
      MetricNames.POSTHOG_TIME_IN_APP_AVG,  // Reusing for session duration
    ];
  }
}
