/**
 * Backend API Service Adapter
 * Self-monitoring for our own backend (uptime, latency, error rate)
 */

import { BaseServiceAdapter } from './base-adapter';
import type { IntegrationAccount, MetricPoint } from '../types';
import { MetricNames } from '../types';

interface BackendConfig {
  base_url: string; // Backend URL to monitor
}

export class BackendAdapter extends BaseServiceAdapter {
  readonly service = 'backend';

  protected async checkHealth(account: IntegrationAccount): Promise<void> {
    const config = account.auth_json as BackendConfig;
    
    // Health check: hit our health endpoint
    await this.fetchApi(
      `${config.base_url}/api/health`,
      { method: 'GET' }
    );
  }

  async fetchMetrics(
    account: IntegrationAccount,
    from: Date,
    to: Date
  ): Promise<MetricPoint[]> {
    const config = account.auth_json as BackendConfig;
    const metrics: MetricPoint[] = [];

    try {
      // Fetch uptime percentage
      const uptime = await this.fetchUptime(config, from, to);
      metrics.push({ ts: to.toISOString(), value: uptime });

      // Fetch latency (p50 and p95)
      const { p50, p95 } = await this.fetchLatency(config);
      metrics.push(
        { ts: to.toISOString(), value: p50 },
        { ts: to.toISOString(), value: p95 }
      );

      // Fetch error rate
      const errorRate = await this.fetchErrorRate(config, from, to);
      metrics.push({ ts: to.toISOString(), value: errorRate });

    } catch (error) {
      console.error('[BackendAdapter] Error fetching metrics:', error);
    }

    return metrics;
  }

  private async fetchUptime(config: BackendConfig, from: Date, to: Date): Promise<number> {
    // Simplified: Make multiple health checks and calculate uptime
    // In production, would query from monitoring service or logs
    
    let successCount = 0;
    const totalChecks = 10;
    
    for (let i = 0; i < totalChecks; i++) {
      try {
        await this.fetchApi(`${config.base_url}/api/health`, { method: 'GET' });
        successCount++;
      } catch {
        // Health check failed
      }
    }
    
    return (successCount / totalChecks) * 100;
  }

  private async fetchLatency(config: BackendConfig): Promise<{ p50: number; p95: number }> {
    // Collect latency samples
    const latencies: number[] = [];
    
    for (let i = 0; i < 20; i++) {
      const start = Date.now();
      try {
        await this.fetchApi(`${config.base_url}/api/health`, { method: 'GET' });
        latencies.push(Date.now() - start);
      } catch {
        latencies.push(10000); // Timeout/error
      }
    }
    
    latencies.sort((a, b) => a - b);
    
    return {
      p50: latencies[Math.floor(latencies.length * 0.5)],
      p95: latencies[Math.floor(latencies.length * 0.95)],
    };
  }

  private async fetchErrorRate(config: BackendConfig, from: Date, to: Date): Promise<number> {
    // Simplified: Would query error logs or monitoring service
    // For now, return 0
    return 0;
  }

  getMetricNames(): string[] {
    return [
      MetricNames.BACKEND_UPTIME,
      MetricNames.BACKEND_LATENCY_P50,
      MetricNames.BACKEND_LATENCY_P95,
      MetricNames.BACKEND_ERROR_RATE,
    ];
  }
}
