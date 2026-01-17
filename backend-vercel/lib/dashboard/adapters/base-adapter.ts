/**
 * Base Service Adapter Implementation
 * Provides common functionality for all service adapters
 */

import type {
  ServiceAdapter,
  ServiceHealth,
  MetricPoint,
  IntegrationAccount,
  ServiceStatus,
} from '../types';

export abstract class BaseServiceAdapter implements ServiceAdapter {
  abstract readonly service: string;

  /**
   * Fetch health status with error handling
   */
  async fetchHealth(account: IntegrationAccount): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      // Call implementation-specific health check
      await this.checkHealth(account);
      
      const latency_ms = Date.now() - startTime;
      
      return {
        service: this.service,
        status: 'UP',
        latency_ms,
        last_success: new Date().toISOString(),
        last_check: new Date().toISOString(),
      };
    } catch (error: any) {
      const latency_ms = Date.now() - startTime;
      const status: ServiceStatus = this.determineStatusFromError(error);
      
      return {
        service: this.service,
        status,
        latency_ms,
        last_success: null,
        last_check: new Date().toISOString(),
        message: error.message || 'Unknown error',
        error_details: {
          code: error.code,
          status: error.status,
          statusText: error.statusText,
        },
      };
    }
  }

  /**
   * Implementation-specific health check
   * Should throw if service is unhealthy
   */
  protected abstract checkHealth(account: IntegrationAccount): Promise<void>;

  /**
   * Determine service status from error
   */
  protected determineStatusFromError(error: any): ServiceStatus {
    // Network errors
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return 'DOWN';
    }

    // HTTP status codes
    if (error.status) {
      if (error.status >= 500) return 'DOWN';
      if (error.status === 429) return 'DEGRADED';
      if (error.status === 401 || error.status === 403) return 'DOWN'; // Auth issues
    }

    // Default to degraded for unknown errors
    return 'DEGRADED';
  }

  /**
   * Fetch metrics (default implementation)
   */
  async fetchMetrics(
    account: IntegrationAccount,
    from: Date,
    to: Date
  ): Promise<MetricPoint[]> {
    // Override in subclass
    return [];
  }

  /**
   * Test credentials (default implementation)
   */
  async testCredentials(account: IntegrationAccount): Promise<boolean> {
    try {
      await this.checkHealth(account);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Helper: Make authenticated API request
   */
  protected async fetchApi<T = any>(
    url: string,
    options: RequestInit = {},
    authHeaders: Record<string, string> = {}
  ): Promise<T> {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error: any = new Error(`API request failed: ${response.statusText}`);
      error.status = response.status;
      error.statusText = response.statusText;
      
      try {
        error.data = await response.json();
      } catch {}
      
      throw error;
    }

    return response.json();
  }

  /**
   * Helper: Parse ISO date or return null
   */
  protected parseDate(date: string | null | undefined): Date | null {
    if (!date) return null;
    try {
      return new Date(date);
    } catch {
      return null;
    }
  }

  /**
   * Helper: Format number as currency
   */
  protected formatCurrency(value: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(value);
  }

  /**
   * Helper: Calculate percentage
   */
  protected calculatePercent(value: number, total: number): number {
    if (total === 0) return 0;
    return (value / total) * 100;
  }
}
