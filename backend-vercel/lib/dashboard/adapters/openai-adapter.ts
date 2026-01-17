/**
 * OpenAI Service Adapter
 * Health check via Models API using provided API key
 */

import { BaseServiceAdapter } from './base-adapter';
import type { IntegrationAccount, MetricPoint } from '../types';

interface OpenAIConfig {
  api_key: string;
  organization?: string;
}

export class OpenAIAdapter extends BaseServiceAdapter {
  readonly service = 'openai';

  protected async checkHealth(account: IntegrationAccount): Promise<void> {
    const config = account.auth_json as OpenAIConfig;

    if (!config?.api_key) {
      const err: any = new Error('Missing OpenAI API key');
      err.status = 401;
      throw err;
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${config.api_key}`,
    };
    if (config.organization) headers['OpenAI-Organization'] = config.organization;

    // List models as a simple health probe
    await this.fetchApi('https://api.openai.com/v1/models', { method: 'GET' }, headers);
  }

  async fetchMetrics(
    account: IntegrationAccount,
    from: Date,
    to: Date
  ): Promise<MetricPoint[]> {
    // Metrics are logged via openai-logger into metrics_timeseries.
    return [];
  }

  getMetricNames(): string[] {
    // OpenAI metrics are logged directly via openai-logger, not pulled from this adapter
    return [];
  }
}
