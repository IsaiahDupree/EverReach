/**
 * Resend Service Adapter
 * Monitors email delivery, opens, clicks, bounces, and spam
 */

import { BaseServiceAdapter } from './base-adapter';
import type { IntegrationAccount, MetricPoint } from '../types';
import { MetricNames } from '../types';

interface ResendConfig {
  api_key: string;
}

export class ResendAdapter extends BaseServiceAdapter {
  readonly service = 'resend';

  protected async checkHealth(account: IntegrationAccount): Promise<void> {
    const config = account.auth_json as ResendConfig;
    
    // Health check: fetch domains
    await this.fetchApi(
      'https://api.resend.com/domains',
      { method: 'GET' },
      { Authorization: `Bearer ${config.api_key}` }
    );
  }

  async fetchMetrics(
    account: IntegrationAccount,
    from: Date,
    to: Date
  ): Promise<MetricPoint[]> {
    const config = account.auth_json as ResendConfig;
    const metrics: MetricPoint[] = [];

    try {
      // Fetch all emails in time range
      const emails = await this.fetchEmails(config, from, to);
      
      // Count statuses
      let sent = 0, delivered = 0, opened = 0, clicked = 0, bounced = 0, spam = 0;
      
      for (const email of emails) {
        if (email.status === 'sent') sent++;
        if (email.status === 'delivered') delivered++;
        if (email.opened_at) opened++;
        if (email.clicked_at) clicked++;
        if (email.status === 'bounced') bounced++;
        if (email.status === 'complained') spam++;
      }

      metrics.push(
        { ts: to.toISOString(), value: sent },
        { ts: to.toISOString(), value: delivered },
        { ts: to.toISOString(), value: opened },
        { ts: to.toISOString(), value: clicked },
        { ts: to.toISOString(), value: bounced },
        { ts: to.toISOString(), value: spam }
      );

    } catch (error) {
      console.error('[ResendAdapter] Error fetching metrics:', error);
    }

    return metrics;
  }

  private async fetchEmails(config: ResendConfig, from: Date, to: Date): Promise<any[]> {
    const response = await this.fetchApi<{ data: any[] }>(
      `https://api.resend.com/emails?from=${from.toISOString()}&to=${to.toISOString()}&limit=1000`,
      { method: 'GET' },
      { Authorization: `Bearer ${config.api_key}` }
    );

    return response.data || [];
  }

  getMetricNames(): string[] {
    return [
      MetricNames.RESEND_SENT,
      MetricNames.RESEND_DELIVERED,
      MetricNames.RESEND_OPENED,
      MetricNames.RESEND_CLICKED,
      MetricNames.RESEND_BOUNCED,
      MetricNames.RESEND_SPAM,
    ];
  }
}
