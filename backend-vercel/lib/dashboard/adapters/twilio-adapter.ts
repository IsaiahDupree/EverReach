/**
 * Twilio Service Adapter
 * Checks account health via Twilio REST API
 */

import { BaseServiceAdapter } from './base-adapter';
import type { IntegrationAccount, MetricPoint } from '../types';

interface TwilioConfig {
  account_sid: string;
  auth_token: string;
}

export class TwilioAdapter extends BaseServiceAdapter {
  readonly service = 'twilio';

  protected async checkHealth(account: IntegrationAccount): Promise<void> {
    const config = account.auth_json as TwilioConfig;

    if (!config?.account_sid || !config?.auth_token) {
      const err: any = new Error('Missing Twilio credentials');
      err.status = 401;
      throw err;
    }

    const credentials = typeof btoa !== 'undefined'
      ? btoa(`${config.account_sid}:${config.auth_token}`)
      : (typeof Buffer !== 'undefined'
        ? Buffer.from(`${config.account_sid}:${config.auth_token}`).toString('base64')
        : '');

    await this.fetchApi(
      `https://api.twilio.com/2010-04-01/Accounts/${config.account_sid}.json`,
      { method: 'GET' },
      { Authorization: `Basic ${credentials}` }
    );
  }

  async fetchMetrics(
    account: IntegrationAccount,
    from: Date,
    to: Date
  ): Promise<MetricPoint[]> {
    // Optional: implement if needed later for Twilio usage metrics
    return [];
  }

  getMetricNames(): string[] {
    // Twilio doesn't export metrics yet, but method is required by interface
    return [];
  }
}
