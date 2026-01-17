/**
 * usePaywallEvents Hook - EverReach equivalent to Superwall's useSuperwallEvents
 * 
 * Provides low-level event tracking for paywall and subscription events.
 * Automatically cleans up listeners when component unmounts.
 */

import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';

// Event payload types
export interface PaywallInfo {
  name: string;
  slug?: string;
  presentedAt: string;
  url?: string;
}

export interface PaywallResult {
  type: 'purchased' | 'closed' | 'error';
  error?: string;
}

export interface PaywallSkippedReason {
  reason: 'holdout' | 'no_rule_match' | 'event_not_found' | 'user_is_subscribed';
  message?: string;
}

export interface SubscriptionStatus {
  status: 'UNKNOWN' | 'ACTIVE' | 'INACTIVE' | 'TRIAL' | 'EXPIRED';
  tier?: string;
  trialEndsAt?: string;
  currentPeriodEnd?: string;
}

export interface PaywallEventInfo {
  event: string;
  params: Record<string, any>;
  timestamp: string;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogScope = 'paywall' | 'subscription' | 'events' | 'network' | 'system';

export interface LogParams {
  level: LogLevel;
  scope: LogScope;
  message: string | null;
  info?: Record<string, any> | null;
  error?: string | null;
}

// Event callback types
export interface PaywallEventCallbacks {
  // Paywall lifecycle
  onPaywallPresent?: (info: PaywallInfo) => void;
  onPaywallDismiss?: (info: PaywallInfo, result: PaywallResult) => void;
  onPaywallSkip?: (reason: PaywallSkippedReason) => void;
  onPaywallError?: (error: string) => void;
  
  // Paywall lifecycle (detailed)
  willPresentPaywall?: (info: PaywallInfo) => void;
  didPresentPaywall?: (info: PaywallInfo) => void;
  willDismissPaywall?: (info: PaywallInfo) => void;
  didDismissPaywall?: (info: PaywallInfo) => void;
  
  // Subscription
  onSubscriptionStatusChange?: (status: SubscriptionStatus) => void;
  
  // User actions
  onCustomPaywallAction?: (name: string) => void;
  onPaywallWillOpenURL?: (url: string) => void;
  onPaywallWillOpenDeepLink?: (url: string) => void;
  
  // Generic events
  onPaywallEvent?: (eventInfo: PaywallEventInfo) => void;
  
  // Logging
  onLog?: (params: LogParams) => void;
  
  // Optional handler ID for filtering events
  handlerId?: string;
}

// Global event emitter (simple implementation)
type EventListener = (...args: any[]) => void;
const eventListeners: Map<string, Set<EventListener>> = new Map();

class PaywallEventEmitter {
  static emit(eventName: string, ...args: any[]) {
    const listeners = eventListeners.get(eventName);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(...args);
        } catch (error) {
          console.error(`[PaywallEvents] Error in listener for ${eventName}:`, error);
        }
      });
    }
  }

  static on(eventName: string, listener: EventListener) {
    if (!eventListeners.has(eventName)) {
      eventListeners.set(eventName, new Set());
    }
    eventListeners.get(eventName)!.add(listener);
  }

  static off(eventName: string, listener: EventListener) {
    const listeners = eventListeners.get(eventName);
    if (listeners) {
      listeners.delete(listener);
      if (listeners.size === 0) {
        eventListeners.delete(eventName);
      }
    }
  }

  static removeAllListeners() {
    eventListeners.clear();
  }
}

// Export emitter for use in other modules
export { PaywallEventEmitter };

/**
 * usePaywallEvents Hook
 * 
 * Subscribe to paywall and subscription events. Automatically cleans up on unmount.
 * 
 * @example
 * ```tsx
 * usePaywallEvents({
 *   onPaywallPresent: (info) => {
 *     console.log('Paywall shown:', info.name);
 *     trackAnalytics('paywall_view', { name: info.name });
 *   },
 *   onSubscriptionStatusChange: (status) => {
 *     console.log('Subscription changed:', status.status);
 *     if (status.status === 'ACTIVE') {
 *       showConfetti();
 *     }
 *   },
 *   onPaywallDismiss: (info, result) => {
 *     if (result.type === 'purchased') {
 *       console.log('User purchased!');
 *     }
 *   }
 * });
 * ```
 */
export function usePaywallEvents(callbacks?: PaywallEventCallbacks): void {
  const callbacksRef = useRef(callbacks);

  // Keep callbacks ref up to date
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  // Setup event listeners
  useEffect(() => {
    if (!callbacks) return;

    const listeners: Array<[string, EventListener]> = [];
    const handlerId = callbacks.handlerId;

    // Helper to create filtered listener
    const createListener = (eventName: string, callback?: (...args: any[]) => void) => {
      if (!callback) return null;

      const listener = (...args: any[]) => {
        // Filter by handlerId if provided
        if (handlerId && args[0]?.handlerId && args[0].handlerId !== handlerId) {
          return;
        }
        callback(...args);
      };

      return listener;
    };

    // Register all listeners
    if (callbacks.onPaywallPresent) {
      const listener = createListener('paywall:present', callbacks.onPaywallPresent);
      if (listener) {
        listeners.push(['paywall:present', listener]);
        PaywallEventEmitter.on('paywall:present', listener);
      }
    }

    if (callbacks.onPaywallDismiss) {
      const listener = createListener('paywall:dismiss', callbacks.onPaywallDismiss);
      if (listener) {
        listeners.push(['paywall:dismiss', listener]);
        PaywallEventEmitter.on('paywall:dismiss', listener);
      }
    }

    if (callbacks.onPaywallSkip) {
      const listener = createListener('paywall:skip', callbacks.onPaywallSkip);
      if (listener) {
        listeners.push(['paywall:skip', listener]);
        PaywallEventEmitter.on('paywall:skip', listener);
      }
    }

    if (callbacks.onPaywallError) {
      const listener = createListener('paywall:error', callbacks.onPaywallError);
      if (listener) {
        listeners.push(['paywall:error', listener]);
        PaywallEventEmitter.on('paywall:error', listener);
      }
    }

    if (callbacks.willPresentPaywall) {
      const listener = createListener('paywall:will-present', callbacks.willPresentPaywall);
      if (listener) {
        listeners.push(['paywall:will-present', listener]);
        PaywallEventEmitter.on('paywall:will-present', listener);
      }
    }

    if (callbacks.didPresentPaywall) {
      const listener = createListener('paywall:did-present', callbacks.didPresentPaywall);
      if (listener) {
        listeners.push(['paywall:did-present', listener]);
        PaywallEventEmitter.on('paywall:did-present', listener);
      }
    }

    if (callbacks.willDismissPaywall) {
      const listener = createListener('paywall:will-dismiss', callbacks.willDismissPaywall);
      if (listener) {
        listeners.push(['paywall:will-dismiss', listener]);
        PaywallEventEmitter.on('paywall:will-dismiss', listener);
      }
    }

    if (callbacks.didDismissPaywall) {
      const listener = createListener('paywall:did-dismiss', callbacks.didDismissPaywall);
      if (listener) {
        listeners.push(['paywall:did-dismiss', listener]);
        PaywallEventEmitter.on('paywall:did-dismiss', listener);
      }
    }

    if (callbacks.onSubscriptionStatusChange) {
      const listener = createListener('subscription:status-change', callbacks.onSubscriptionStatusChange);
      if (listener) {
        listeners.push(['subscription:status-change', listener]);
        PaywallEventEmitter.on('subscription:status-change', listener);
      }
    }

    if (callbacks.onCustomPaywallAction) {
      const listener = createListener('paywall:custom-action', callbacks.onCustomPaywallAction);
      if (listener) {
        listeners.push(['paywall:custom-action', listener]);
        PaywallEventEmitter.on('paywall:custom-action', listener);
      }
    }

    if (callbacks.onPaywallWillOpenURL) {
      const listener = createListener('paywall:will-open-url', callbacks.onPaywallWillOpenURL);
      if (listener) {
        listeners.push(['paywall:will-open-url', listener]);
        PaywallEventEmitter.on('paywall:will-open-url', listener);
      }
    }

    if (callbacks.onPaywallWillOpenDeepLink) {
      const listener = createListener('paywall:will-open-deep-link', callbacks.onPaywallWillOpenDeepLink);
      if (listener) {
        listeners.push(['paywall:will-open-deep-link', listener]);
        PaywallEventEmitter.on('paywall:will-open-deep-link', listener);
      }
    }

    if (callbacks.onPaywallEvent) {
      const listener = createListener('paywall:event', callbacks.onPaywallEvent);
      if (listener) {
        listeners.push(['paywall:event', listener]);
        PaywallEventEmitter.on('paywall:event', listener);
      }
    }

    if (callbacks.onLog) {
      const listener = createListener('paywall:log', callbacks.onLog);
      if (listener) {
        listeners.push(['paywall:log', listener]);
        PaywallEventEmitter.on('paywall:log', listener);
      }
    }

    // Cleanup on unmount
    return () => {
      listeners.forEach(([eventName, listener]) => {
        PaywallEventEmitter.off(eventName, listener);
      });
    };
  }, [callbacks]);

  // Track app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (callbacksRef.current?.onLog) {
        callbacksRef.current.onLog({
          level: 'info',
          scope: 'system',
          message: `App state changed to ${nextAppState}`,
          info: { appState: nextAppState },
          error: null,
        });
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);
}

/**
 * Helper functions to emit events from other parts of the app
 */
export const emitPaywallPresent = (info: PaywallInfo) => {
  PaywallEventEmitter.emit('paywall:present', info);
  PaywallEventEmitter.emit('paywall:event', {
    event: 'paywall_present',
    params: info,
    timestamp: new Date().toISOString(),
  });
};

export const emitPaywallDismiss = (info: PaywallInfo, result: PaywallResult) => {
  PaywallEventEmitter.emit('paywall:dismiss', info, result);
  PaywallEventEmitter.emit('paywall:event', {
    event: 'paywall_dismiss',
    params: { ...info, result },
    timestamp: new Date().toISOString(),
  });
};

export const emitSubscriptionStatusChange = (status: SubscriptionStatus) => {
  PaywallEventEmitter.emit('subscription:status-change', status);
  PaywallEventEmitter.emit('paywall:event', {
    event: 'subscription_status_change',
    params: status,
    timestamp: new Date().toISOString(),
  });
};

export const emitPaywallError = (error: string) => {
  PaywallEventEmitter.emit('paywall:error', error);
  PaywallEventEmitter.emit('paywall:log', {
    level: 'error' as LogLevel,
    scope: 'paywall' as LogScope,
    message: 'Paywall error',
    error,
    info: null,
  });
};

export const emitPaywallSkip = (reason: PaywallSkippedReason) => {
  PaywallEventEmitter.emit('paywall:skip', reason);
  PaywallEventEmitter.emit('paywall:event', {
    event: 'paywall_skip',
    params: reason,
    timestamp: new Date().toISOString(),
  });
};
