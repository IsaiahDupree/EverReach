/**
 * Subscription Logger
 * 
 * Debug logger for subscription state and events.
 * Helps trace subscription lifecycle for debugging.
 */

import type { Entitlements } from '@/providers/EntitlementsProviderV3';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class SubscriptionLogger {
    private enabled = __DEV__;
    private logs: Array<{ level: LogLevel; message: string; data?: any; timestamp: string }> = [];
    private maxLogs = 100;

    /**
     * Log a debug message
     */
    debug(message: string, data?: any) {
        this.log('debug', message, data);
    }

    /**
     * Log an info message
     */
    info(message: string, data?: any) {
        this.log('info', message, data);
    }

    /**
     * Log a warning
     */
    warn(message: string, data?: any) {
        this.log('warn', message, data);
    }

    /**
     * Log an error
     */
    error(message: string, data?: any) {
        this.log('error', message, data);
    }

    /**
     * Log message with level
     */
    private log(level: LogLevel, message: string, data?: any) {
        if (!this.enabled) return;

        const logEntry = {
            level,
            message,
            data,
            timestamp: new Date().toISOString(),
        };

        // Add to logs
        this.logs.push(logEntry);

        // Trim if too many logs
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs);
        }

        // Console output
        const prefix = `[Subscription]`;
        const output = data ? `${prefix} ${message}` : `${prefix} ${message}`;

        switch (level) {
            case 'debug':
                console.debug(output, data || '');
                break;
            case 'info':
                console.log(output, data || '');
                break;
            case 'warn':
                console.warn(output, data || '');
                break;
            case 'error':
                console.error(output, data || '');
                break;
        }
    }

    /**
     * Log entitlements state
     */
    logEntitlements(entitlements: Entitlements | null, source: string) {
        if (!entitlements) {
            this.warn(`Entitlements null from ${source}`);
            return;
        }

        this.info(`Entitlements from ${source}`, {
            tier: entitlements.tier,
            status: entitlements.subscription_status,
            platform: entitlements.payment_platform,
            environment: entitlements.environment,
            trial_ends: entitlements.trial_ends_at,
            period_end: entitlements.current_period_end,
        });
    }

    /**
     * Log purchase attempt
     */
    logPurchaseAttempt(productId: string, source: string) {
        this.info(`Purchase attempt: ${productId}`, { source });
    }

    /**
     * Log purchase result
     */
    logPurchaseResult(success: boolean, productId: string, error?: string) {
        if (success) {
            this.info(`Purchase successful: ${productId}`);
        } else {
            this.error(`Purchase failed: ${productId}`, { error });
        }
    }

    /**
     * Log restore attempt
     */
    logRestoreAttempt(source: string) {
        this.info('Restore purchases attempt', { source });
    }

    /**
     * Log restore result
     */
    logRestoreResult(success: boolean, restored: boolean, tier?: string, error?: string) {
        if (success && restored) {
            this.info('Restore successful', { tier });
        } else if (success && !restored) {
            this.info('Restore completed but no purchases found');
        } else {
            this.error('Restore failed', { error });
        }
    }

    /**
     * Get all logs
     */
    getLogs() {
        return this.logs;
    }

    /**
     * Clear logs
     */
    clearLogs() {
        this.logs = [];
    }

    /**
     * Export logs as JSON
     */
    exportLogs(): string {
        return JSON.stringify(this.logs, null, 2);
    }

    /**
     * Get logs summary
     */
    getSummary(): {
        total: number;
        byLevel: Record<LogLevel, number>;
        lastError?: { message: string; timestamp: string };
    } {
        const byLevel: Record<LogLevel, number> = {
            debug: 0,
            info: 0,
            warn: 0,
            error: 0,
        };

        this.logs.forEach(log => {
            byLevel[log.level]++;
        });

        const lastError = this.logs
            .filter(log => log.level === 'error')
            .pop();

        return {
            total: this.logs.length,
            byLevel,
            lastError: lastError ? {
                message: lastError.message,
                timestamp: lastError.timestamp,
            } : undefined,
        };
    }
}

// Export singleton
export const subscriptionLogger = new SubscriptionLogger();
export default subscriptionLogger;
