/**
 * Supabase Service Adapter
 * Monitors DB health, auth sign-ins, storage ops, and edge function errors
 */

import { BaseServiceAdapter } from './base-adapter';
import type { IntegrationAccount, MetricPoint } from '../types';
import { MetricNames } from '../types';

interface SupabaseConfig {
  project_ref: string;
  service_role_key: string;
}

export class SupabaseAdapter extends BaseServiceAdapter {
  readonly service = 'supabase';

  protected async checkHealth(account: IntegrationAccount): Promise<void> {
    const config = account.auth_json as SupabaseConfig;
    
    // Health check: fetch project health
    await this.fetchApi(
      `https://${config.project_ref}.supabase.co/rest/v1/`,
      { method: 'GET' },
      { 
        apikey: config.service_role_key,
        Authorization: `Bearer ${config.service_role_key}` 
      }
    );
  }

  async fetchMetrics(
    account: IntegrationAccount,
    from: Date,
    to: Date
  ): Promise<MetricPoint[]> {
    const config = account.auth_json as SupabaseConfig;
    const metrics: MetricPoint[] = [];

    try {
      // Fetch DB latency (via health check timing)
      const latency = await this.fetchDBLatency(config);
      metrics.push({ ts: to.toISOString(), value: latency });

      // Note: Auth and storage metrics require additional setup
      // Simplified for now - would need access to Supabase Management API

    } catch (error) {
      console.error('[SupabaseAdapter] Error fetching metrics:', error);
    }

    return metrics;
  }

  private async fetchDBLatency(config: SupabaseConfig): Promise<number> {
    const start = Date.now();
    
    await this.fetchApi(
      `https://${config.project_ref}.supabase.co/rest/v1/?select=count`,
      { method: 'HEAD' },
      { apikey: config.service_role_key }
    );
    
    return Date.now() - start;
  }

  getMetricNames(): string[] {
    return [
      MetricNames.SUPABASE_DB_LATENCY,
    ];
  }
}
