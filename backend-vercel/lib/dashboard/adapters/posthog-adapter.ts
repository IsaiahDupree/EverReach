/**
 * PostHog Service Adapter
 * Monitors DAU/MAU/WAU, feature usage, funnels, and session time
 */

import { BaseServiceAdapter } from './base-adapter';
import type { IntegrationAccount, MetricPoint } from '../types';
import { MetricNames } from '../types';

interface PostHogConfig {
  api_key: string;
  project_id: string;
}

export class PostHogAdapter extends BaseServiceAdapter {
  readonly service = 'posthog';

  protected async checkHealth(account: IntegrationAccount): Promise<void> {
    const config = account.auth_json as PostHogConfig;
    
    // Health check: fetch project info
    await this.fetchApi(
      `https://app.posthog.com/api/projects/${config.project_id}`,
      { method: 'GET' },
      { Authorization: `Bearer ${config.api_key}` }
    );
  }

  async fetchMetrics(
    account: IntegrationAccount,
    from: Date,
    to: Date
  ): Promise<MetricPoint[]> {
    const config = account.auth_json as PostHogConfig;
    const metrics: MetricPoint[] = [];

    try {
      // Fetch DAU
      const dau = await this.fetchActiveUsers(config, 'day');
      metrics.push({ ts: to.toISOString(), value: dau });

      // Fetch WAU
      const wau = await this.fetchActiveUsers(config, 'week');
      metrics.push({ ts: to.toISOString(), value: wau });

      // Fetch MAU
      const mau = await this.fetchActiveUsers(config, 'month');
      metrics.push({ ts: to.toISOString(), value: mau });

      // Fetch avg session time
      const avgTime = await this.fetchAvgSessionTime(config, from, to);
      metrics.push({ ts: to.toISOString(), value: avgTime });

    } catch (error) {
      console.error('[PostHogAdapter] Error fetching metrics:', error);
    }

    return metrics;
  }

  private async fetchActiveUsers(config: PostHogConfig, interval: 'day' | 'week' | 'month'): Promise<number> {
    const response = await this.fetchApi<{ result: any[] }>(
      `https://app.posthog.com/api/projects/${config.project_id}/insights/trend`,
      {
        method: 'POST',
        body: JSON.stringify({
          events: [{ id: '$pageview', type: 'events' }],
          interval,
          display: 'ActionsLineGraph',
        }),
      },
      { Authorization: `Bearer ${config.api_key}` }
    );

    return response.result?.[0]?.count || 0;
  }

  private async fetchAvgSessionTime(config: PostHogConfig, from: Date, to: Date): Promise<number> {
    const response = await this.fetchApi<{ result: any }>(
      `https://app.posthog.com/api/projects/${config.project_id}/insights`,
      {
        method: 'POST',
        body: JSON.stringify({
          events: [{ id: '$pageview' }],
          date_from: from.toISOString(),
          date_to: to.toISOString(),
          properties: [{ key: '$session_duration', type: 'event' }],
        }),
      },
      { Authorization: `Bearer ${config.api_key}` }
    );

    return response.result?.average || 0;
  }

  getMetricNames(): string[] {
    return [
      MetricNames.POSTHOG_DAU,
      MetricNames.POSTHOG_WAU,
      MetricNames.POSTHOG_MAU,
      MetricNames.POSTHOG_TIME_IN_APP_AVG,
    ];
  }
}
