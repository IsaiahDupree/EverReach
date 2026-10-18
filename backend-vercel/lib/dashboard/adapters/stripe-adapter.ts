/**
 * Stripe Service Adapter
 * Monitors revenue metrics, MRR/ARR, trials, churn, and failed payments
 */

import { BaseServiceAdapter } from './base-adapter';
import type { IntegrationAccount, MetricPoint } from '../types';
import { MetricNames } from '../types';

interface StripeConfig {
  api_key: string; // Secret key
}

export class StripeAdapter extends BaseServiceAdapter {
  readonly service = 'stripe';

  protected async checkHealth(account: IntegrationAccount): Promise<void> {
    const config = account.auth_json as StripeConfig;
    
    // Simple health check: fetch account balance
    await this.fetchApi(
      'https://api.stripe.com/v1/balance',
      { method: 'GET' },
      { Authorization: `Bearer ${config.api_key}` }
    );
  }

  async fetchMetrics(
    account: IntegrationAccount,
    from: Date,
    to: Date
  ): Promise<MetricPoint[]> {
    const config = account.auth_json as StripeConfig;
    const metrics: MetricPoint[] = [];

    try {
      // Fetch subscriptions for MRR/ARR
      const subs = await this.fetchSubscriptions(config, from, to);
      metrics.push(...this.calculateMRRARR(subs, to));

      // Fetch new trials
      const trials = await this.fetchTrials(config, from, to);
      metrics.push({
        ts: to.toISOString(),
        value: trials.length,
      });

      // Fetch failed payments
      const failed = await this.fetchFailedPayments(config, from, to);
      metrics.push({
        ts: to.toISOString(),
        value: failed.length,
      });

      // Calculate churn rate
      const churnRate = await this.calculateChurnRate(config, from, to);
      metrics.push({
        ts: to.toISOString(),
        value: churnRate,
      });

      // Calculate revenue today
      const revenue = await this.calculateRevenueToday(config);
      metrics.push({
        ts: to.toISOString(),
        value: revenue,
      });

    } catch (error) {
      console.error('[StripeAdapter] Error fetching metrics:', error);
    }

    return metrics;
  }

  /**
   * Fetch active subscriptions
   */
  private async fetchSubscriptions(
    config: StripeConfig,
    from: Date,
    to: Date
  ): Promise<any[]> {
    const params = new URLSearchParams({
      limit: '100',
      status: 'active',
      created: JSON.stringify({
        gte: Math.floor(from.getTime() / 1000),
        lte: Math.floor(to.getTime() / 1000),
      }),
    });

    const response = await this.fetchApi<{ data: any[] }>(
      `https://api.stripe.com/v1/subscriptions?${params}`,
      { method: 'GET' },
      { Authorization: `Bearer ${config.api_key}` }
    );

    return response.data || [];
  }

  /**
   * Calculate MRR and ARR from subscriptions
   */
  private calculateMRRARR(subscriptions: any[], timestamp: Date): MetricPoint[] {
    let totalMRR = 0;

    for (const sub of subscriptions) {
      if (sub.status !== 'active') continue;

      // Get subscription amount
      const amount = sub.items?.data?.[0]?.price?.unit_amount || 0;
      const interval = sub.items?.data?.[0]?.price?.recurring?.interval || 'month';

      // Convert to monthly recurring
      let monthlyAmount = amount / 100; // Convert cents to dollars
      
      if (interval === 'year') {
        monthlyAmount = monthlyAmount / 12;
      } else if (interval === 'week') {
        monthlyAmount = monthlyAmount * 4.33; // Average weeks per month
      } else if (interval === 'day') {
        monthlyAmount = monthlyAmount * 30;
      }

      totalMRR += monthlyAmount;
    }

    const totalARR = totalMRR * 12;

    return [
      {
        ts: timestamp.toISOString(),
        value: totalMRR,
      },
      {
        ts: timestamp.toISOString(),
        value: totalARR,
      },
    ];
  }

  /**
   * Fetch trial subscriptions
   */
  private async fetchTrials(
    config: StripeConfig,
    from: Date,
    to: Date
  ): Promise<any[]> {
    const params = new URLSearchParams({
      limit: '100',
      status: 'trialing',
      created: JSON.stringify({
        gte: Math.floor(from.getTime() / 1000),
        lte: Math.floor(to.getTime() / 1000),
      }),
    });

    const response = await this.fetchApi<{ data: any[] }>(
      `https://api.stripe.com/v1/subscriptions?${params}`,
      { method: 'GET' },
      { Authorization: `Bearer ${config.api_key}` }
    );

    return response.data || [];
  }

  /**
   * Fetch failed payment intents
   */
  private async fetchFailedPayments(
    config: StripeConfig,
    from: Date,
    to: Date
  ): Promise<any[]> {
    const params = new URLSearchParams({
      limit: '100',
      created: JSON.stringify({
        gte: Math.floor(from.getTime() / 1000),
        lte: Math.floor(to.getTime() / 1000),
      }),
    });

    const response = await this.fetchApi<{ data: any[] }>(
      `https://api.stripe.com/v1/payment_intents?${params}`,
      { method: 'GET' },
      { Authorization: `Bearer ${config.api_key}` }
    );

    return (response.data || []).filter((pi) => pi.status === 'requires_payment_method');
  }

  /**
   * Calculate churn rate
   */
  private async calculateChurnRate(
    config: StripeConfig,
    from: Date,
    to: Date
  ): Promise<number> {
    // Get canceled subscriptions in period
    const params = new URLSearchParams({
      limit: '100',
      status: 'canceled',
      canceled_at: JSON.stringify({
        gte: Math.floor(from.getTime() / 1000),
        lte: Math.floor(to.getTime() / 1000),
      }),
    });

    const response = await this.fetchApi<{ data: any[] }>(
      `https://api.stripe.com/v1/subscriptions?${params}`,
      { method: 'GET' },
      { Authorization: `Bearer ${config.api_key}` }
    );

    const canceledCount = response.data?.length || 0;

    // Get total active subscriptions
    const activeResponse = await this.fetchApi<{ data: any[] }>(
      'https://api.stripe.com/v1/subscriptions?status=active&limit=100',
      { method: 'GET' },
      { Authorization: `Bearer ${config.api_key}` }
    );

    const activeCount = activeResponse.data?.length || 0;
    const totalCount = activeCount + canceledCount;

    if (totalCount === 0) return 0;

    return this.calculatePercent(canceledCount, totalCount);
  }

  /**
   * Calculate revenue for today
   */
  private async calculateRevenueToday(config: StripeConfig): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = Math.floor(today.getTime() / 1000);

    const params = new URLSearchParams({
      limit: '100',
      created: JSON.stringify({
        gte: todayTimestamp,
      }),
    });

    const response = await this.fetchApi<{ data: any[] }>(
      `https://api.stripe.com/v1/charges?${params}`,
      { method: 'GET' },
      { Authorization: `Bearer ${config.api_key}` }
    );

    const charges = response.data || [];
    const totalRevenue = charges.reduce((sum, charge) => {
      if (charge.status === 'succeeded') {
        return sum + (charge.amount / 100); // Convert cents to dollars
      }
      return sum;
    }, 0);

    return totalRevenue;
  }

  /**
   * Get metric names supported by this adapter
   */
  getMetricNames(): string[] {
    return [
      MetricNames.STRIPE_MRR,
      MetricNames.STRIPE_ARR,
      MetricNames.STRIPE_NEW_TRIALS,
      MetricNames.STRIPE_CHURN_RATE,
      MetricNames.STRIPE_FAILED_PAYMENTS,
      MetricNames.STRIPE_REVENUE_TODAY,
    ];
  }
}
