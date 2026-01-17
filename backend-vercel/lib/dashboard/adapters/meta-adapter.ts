/**
 * Meta (Facebook) Service Adapter
 * Monitors Graph API health, rate limits, ads performance, and pixel events
 */

import { BaseServiceAdapter } from './base-adapter';
import type { IntegrationAccount, MetricPoint } from '../types';

interface MetaConfig {
  // Option 1: Direct Graph API
  app_id?: string;
  app_secret?: string;
  access_token?: string;
  ad_account_id?: string;  // Optional: act_1234567890
  pixel_id?: string;        // Optional: for Conversions API
  
  // Option 2: Proxy
  proxy_url?: string;
  api_key?: string;
}

export class MetaAdapter extends BaseServiceAdapter {
  readonly service = 'meta';

  protected async checkHealth(account: IntegrationAccount): Promise<void> {
    const config = account.auth_json as MetaConfig;
    
    // Option 1: Direct Graph API
    if (config.access_token) {
      // Ping Graph API /me endpoint
      const url = `https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${config.access_token}`;
      await this.fetchApi(url, { method: 'GET' });
      return;
    }
    
    // Option 2: Proxy
    if (config.proxy_url) {
      await this.fetchApi(
        `${config.proxy_url}/health`,
        { method: 'GET' },
        config.api_key ? { 'X-API-Key': config.api_key } : {}
      );
      return;
    }
    
    throw new Error('Meta config missing: access_token or proxy_url required');
  }

  async fetchMetrics(
    account: IntegrationAccount,
    from: Date,
    to: Date
  ): Promise<MetricPoint[]> {
    const config = account.auth_json as MetaConfig;
    const metrics: MetricPoint[] = [];

    try {
      // If proxy is configured, fetch from proxy
      if (config.proxy_url) {
        const response = await this.fetchApi<{ metrics: MetricPoint[] }>(
          `${config.proxy_url}/metrics?from=${from.toISOString()}&to=${to.toISOString()}`,
          { method: 'GET' },
          config.api_key ? { 'X-API-Key': config.api_key } : {}
        );
        return response.metrics || [];
      }

      // Otherwise, fetch from Graph API directly
      if (config.access_token) {
        // Fetch ad account insights (if ad_account_id provided)
        if (config.ad_account_id) {
          const adMetrics = await this.fetchAdMetrics(config, from, to);
          metrics.push(...adMetrics);
        }

        // Fetch app usage / rate limits
        if (config.app_id) {
          const appMetrics = await this.fetchAppMetrics(config);
          metrics.push(...appMetrics);
        }
      }
    } catch (error) {
      console.error('[MetaAdapter] Error fetching metrics:', error);
    }

    return metrics;
  }

  private async fetchAdMetrics(
    config: MetaConfig,
    from: Date,
    to: Date
  ): Promise<MetricPoint[]> {
    const metrics: MetricPoint[] = [];
    const since = from.toISOString().split('T')[0]; // YYYY-MM-DD
    const until = to.toISOString().split('T')[0];

    try {
      const url = `https://graph.facebook.com/v19.0/${config.ad_account_id}/insights` +
        `?access_token=${config.access_token}` +
        `&time_range={"since":"${since}","until":"${until}"}` +
        `&fields=spend,impressions,clicks,conversions,cpc,ctr` +
        `&level=account`;

      const response = await this.fetchApi<{ data: any[] }>(url, { method: 'GET' });
      
      if (response.data && response.data.length > 0) {
        const insights = response.data[0];
        
        // Ad spend
        metrics.push({
          ts: to.toISOString(),
          value: parseFloat(insights.spend || '0')
        });
        
        // Conversions
        metrics.push({
          ts: to.toISOString(),
          value: parseInt(insights.conversions || '0', 10)
        });
        
        // CPC
        metrics.push({
          ts: to.toISOString(),
          value: parseFloat(insights.cpc || '0')
        });
      }
    } catch (error) {
      console.error('[MetaAdapter] Error fetching ad metrics:', error);
    }

    return metrics;
  }

  private async fetchAppMetrics(config: MetaConfig): Promise<MetricPoint[]> {
    const metrics: MetricPoint[] = [];

    try {
      const url = `https://graph.facebook.com/v19.0/${config.app_id}` +
        `?access_token=${config.access_token}` +
        `&fields=id,name,usage`;

      const response = await this.fetchApi<{ usage: any }>(url, { method: 'GET' });
      
      if (response.usage) {
        // API call count
        metrics.push({
          ts: new Date().toISOString(),
          value: response.usage.call_count || 0
        });
        
        // CPU time used
        metrics.push({
          ts: new Date().toISOString(),
          value: response.usage.total_cputime || 0
        });
      }
    } catch (error) {
      console.error('[MetaAdapter] Error fetching app metrics:', error);
    }

    return metrics;
  }

  getMetricNames(): string[] {
    return [
      'meta.api.latency',
      'meta.api.calls',
      'meta.ads.spend',
      'meta.ads.conversions',
      'meta.ads.cpc',
      'meta.pixel.events_sent',
    ];
  }
}
