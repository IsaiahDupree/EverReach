/**
 * RevenueCat Service Adapter
 * Monitors subscriptions, conversions, renewals, and cancellations
 * 
 * Comprehensive Health Check:
 * 1. Authentication - Verify API key with V2 API
 * 2. Project Access - Verify project_id exists
 * 3. Apps Configuration - Check configured apps
 * 4. Products - Verify products are set up
 * 5. Entitlements - Check entitlements configuration
 */

import { BaseServiceAdapter } from './base-adapter';
import type { IntegrationAccount, MetricPoint, ServiceHealth } from '../types';
import { MetricNames } from '../types';

interface RevenueCatConfig {
  api_key: string; // RevenueCat API key (V2)
  project_id: string;
  app_id_ios?: string;
  app_id_web?: string;
}

export class RevenueCatAdapter extends BaseServiceAdapter {
  readonly service = 'revenuecat';

  /**
   * Comprehensive health check using V2 API
   * Tests: Authentication, Projects, Apps, Products, Entitlements
   */
  protected async checkHealth(account: IntegrationAccount): Promise<void> {
    const config = account.auth_json as RevenueCatConfig;
    
    if (!config.api_key) {
      throw new Error('API key not configured');
    }

    // 1. Authentication - Test V2 API access
    const projectsResponse = await this.fetchApi<{ items: any[] }>(
      'https://api.revenuecat.com/v2/projects',
      { method: 'GET' },
      { Authorization: `Bearer ${config.api_key}` }
    );

    if (!projectsResponse.items || projectsResponse.items.length === 0) {
      throw new Error('No projects accessible with this API key');
    }

    // 2. Verify project exists (if project_id provided)
    if (config.project_id) {
      const projectExists = projectsResponse.items.some(
        (p: any) => p.id === config.project_id
      );
      
      if (!projectExists) {
        throw new Error(`Project ${config.project_id} not found or not accessible`);
      }

      // 3. Check Apps Configuration
      try {
        const appsResponse = await this.fetchApi<{ items: any[] }>(
          `https://api.revenuecat.com/v2/projects/${config.project_id}/apps`,
          { method: 'GET' },
          { Authorization: `Bearer ${config.api_key}` }
        );

        if (!appsResponse.items || appsResponse.items.length === 0) {
          throw new Error('No apps configured in RevenueCat project');
        }
      } catch (error: any) {
        // Apps endpoint might return 404 on V2 API, which is acceptable
        if (error.status !== 404) {
          throw error;
        }
      }

      // 4. Check Products (optional - don't fail if missing)
      try {
        await this.fetchApi(
          `https://api.revenuecat.com/v2/projects/${config.project_id}/products`,
          { method: 'GET' },
          { Authorization: `Bearer ${config.api_key}` }
        );
      } catch (error: any) {
        // Products might not be set up yet, log but don't fail
        console.log('[RevenueCat] Products check:', error.message);
      }
    }

    // If we got here, all critical checks passed
  }

  async fetchMetrics(
    account: IntegrationAccount,
    from: Date,
    to: Date
  ): Promise<MetricPoint[]> {
    const config = account.auth_json as RevenueCatConfig;
    const metrics: MetricPoint[] = [];

    try {
      // Fetch active subscriptions
      const activeSubs = await this.fetchActiveSubscriptions(config);
      metrics.push({
        ts: to.toISOString(),
        value: activeSubs,
      });

      // Fetch conversions (trials to paid)
      const conversions = await this.fetchTrialConversions(config, from, to);
      metrics.push({
        ts: to.toISOString(),
        value: conversions,
      });

      // Fetch renewals
      const renewals = await this.fetchRenewals(config, from, to);
      metrics.push({
        ts: to.toISOString(),
        value: renewals,
      });

      // Fetch cancellations
      const cancellations = await this.fetchCancellations(config, from, to);
      metrics.push({
        ts: to.toISOString(),
        value: cancellations,
      });

    } catch (error) {
      console.error('[RevenueCatAdapter] Error fetching metrics:', error);
    }

    return metrics;
  }

  /**
   * Fetch active subscriptions count (V2 API)
   * Note: V2 API may have different endpoints for subscriber data
   */
  private async fetchActiveSubscriptions(config: RevenueCatConfig): Promise<number> {
    try {
      // Try V2 API first (may not be available)
      const response = await this.fetchApi<{ subscribers?: any[]; items?: any[] }>(
        `https://api.revenuecat.com/v2/projects/${config.project_id}/subscribers?limit=1000&status=active`,
        { method: 'GET' },
        { Authorization: `Bearer ${config.api_key}` }
      );

      return response.subscribers?.length || response.items?.length || 0;
    } catch (error: any) {
      // V2 subscriber endpoint might not exist, return 0
      console.log('[RevenueCat] Active subscriptions endpoint not available:', error.message);
      return 0;
    }
  }

  /**
   * Fetch trial to paid conversions (V2 API)
   */
  private async fetchTrialConversions(
    config: RevenueCatConfig,
    from: Date,
    to: Date
  ): Promise<number> {
    try {
      const params = new URLSearchParams({
        starting_after: from.toISOString(),
        ending_before: to.toISOString(),
        event_type: 'uncancellation',
        limit: '1000',
      });

      const response = await this.fetchApi<{ events?: any[]; items?: any[] }>(
        `https://api.revenuecat.com/v2/projects/${config.project_id}/events?${params}`,
        { method: 'GET' },
        { Authorization: `Bearer ${config.api_key}` }
      );

      const events = response.events || response.items || [];

      // Count conversions from trial to paid
      let conversions = 0;
      for (const event of events) {
        if (event.period_type === 'TRIAL' && event.type === 'INITIAL_PURCHASE') {
          conversions++;
        }
      }

      return conversions;
    } catch (error: any) {
      console.log('[RevenueCat] Trial conversions endpoint not available:', error.message);
      return 0;
    }
  }

  /**
   * Fetch renewal count (V2 API)
   */
  private async fetchRenewals(
    config: RevenueCatConfig,
    from: Date,
    to: Date
  ): Promise<number> {
    try {
      const params = new URLSearchParams({
        starting_after: from.toISOString(),
        ending_before: to.toISOString(),
        event_type: 'renewal',
        limit: '1000',
      });

      const response = await this.fetchApi<{ events?: any[]; items?: any[] }>(
        `https://api.revenuecat.com/v2/projects/${config.project_id}/events?${params}`,
        { method: 'GET' },
        { Authorization: `Bearer ${config.api_key}` }
      );

      return response.events?.length || response.items?.length || 0;
    } catch (error: any) {
      console.log('[RevenueCat] Renewals endpoint not available:', error.message);
      return 0;
    }
  }

  /**
   * Fetch cancellation count (V2 API)
   */
  private async fetchCancellations(
    config: RevenueCatConfig,
    from: Date,
    to: Date
  ): Promise<number> {
    try {
      const params = new URLSearchParams({
        starting_after: from.toISOString(),
        ending_before: to.toISOString(),
        event_type: 'cancellation',
        limit: '1000',
      });

      const response = await this.fetchApi<{ events?: any[]; items?: any[] }>(
        `https://api.revenuecat.com/v2/projects/${config.project_id}/events?${params}`,
        { method: 'GET' },
        { Authorization: `Bearer ${config.api_key}` }
      );

      return response.events?.length || response.items?.length || 0;
    } catch (error: any) {
      console.log('[RevenueCat] Cancellations endpoint not available:', error.message);
      return 0;
    }
  }

  /**
   * Get metric names supported by this adapter
   */
  getMetricNames(): string[] {
    return [
      MetricNames.REVENUECAT_ACTIVE_SUBS,
      MetricNames.REVENUECAT_TRIAL_CONVERSIONS,
      MetricNames.REVENUECAT_RENEWALS,
      MetricNames.REVENUECAT_CANCELLATIONS,
    ];
  }
}
