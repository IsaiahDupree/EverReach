/**
 * Global Performance Monitor
 * 
 * Tracks:
 * - Memory usage and warnings
 * - Battery drain
 * - Network connectivity
 * - App state changes
 */

import { AppState, Platform } from 'react-native';
import analytics from './analytics';

// Optional NetInfo import (install @react-native-community/netinfo if needed)
let NetInfo: any = null;
try {
  NetInfo = require('@react-native-community/netinfo');
} catch (e) {
  console.log('[PerformanceMonitor] NetInfo not available - network monitoring disabled');
}

// ============================================================================
// Memory Monitoring
// ============================================================================

let lastMemoryWarning = 0;
const MEMORY_WARNING_THROTTLE = 60000; // 1 minute

/**
 * Track memory warnings (iOS/Android)
 */
export function initializeMemoryMonitoring(): void {
  if (Platform.OS === 'ios') {
    // iOS memory warnings
    const memoryWarningListener = () => {
      const now = Date.now();
      if (now - lastMemoryWarning > MEMORY_WARNING_THROTTLE) {
        lastMemoryWarning = now;
        
        analytics.track('memory_warning', {
          platform: 'ios',
          timestamp: new Date().toISOString(),
        });
      }
    };

    // Note: Requires react-native-device-info or similar
    // For now, this is a placeholder for future implementation
  }
}

// ============================================================================
// Network Monitoring
// ============================================================================

let lastNetworkState: string | null = null;

/**
 * Track network connectivity changes
 */
export function initializeNetworkMonitoring(): void {
  if (!NetInfo) {
    return; // NetInfo not available
  }

  NetInfo.addEventListener((state: any) => {
    const currentState = `${state.type}_${state.isConnected}`;
    
    // Only track changes
    if (currentState !== lastNetworkState) {
      lastNetworkState = currentState;
      
      analytics.track('network_state_changed', {
        type: state.type,
        is_connected: state.isConnected,
        is_internet_reachable: state.isInternetReachable,
        details: state.details,
      });

      // Alert on connection loss
      if (!state.isConnected) {
        analytics.track('connection_lost', {
          previous_type: lastNetworkState,
        });
      }
    }
  });
}

// ============================================================================
// App State Monitoring
// ============================================================================

let lastAppState = AppState.currentState;
let appStateStartTime = Date.now();

/**
 * Track app state durations
 */
export function initializeAppStateMonitoring(): void {
  AppState.addEventListener('change', (nextAppState) => {
    const duration = Date.now() - appStateStartTime;
    
    // Track how long app was in previous state
    analytics.track('app_state_duration', {
      state: lastAppState,
      duration_ms: duration,
      next_state: nextAppState,
    });

    lastAppState = nextAppState;
    appStateStartTime = Date.now();
  });
}

// ============================================================================
// Battery Monitoring (Placeholder)
// ============================================================================

/**
 * Track battery level and charging state
 * Requires react-native-device-info or expo-battery
 */
export function initializeBatteryMonitoring(): void {
  // Placeholder for future implementation
  // Would track:
  // - Battery level changes
  // - Charging state changes
  // - Battery drain rate
  // - Power mode changes (low power mode)
}

// ============================================================================
// Performance Budget Alerts
// ============================================================================

interface PerformanceBudget {
  screenRenderMs: number;
  apiCallMs: number;
  operationMs: number;
}

const DEFAULT_BUDGET: PerformanceBudget = {
  screenRenderMs: 2000,
  apiCallMs: 5000,
  operationMs: 1000,
};

/**
 * Check if operation exceeded performance budget
 */
export function checkPerformanceBudget(
  metricName: string,
  duration: number,
  budget: Partial<PerformanceBudget> = {}
): boolean {
  const budgets = { ...DEFAULT_BUDGET, ...budget };
  
  let exceeded = false;
  let budgetValue = 0;

  if (metricName.includes('screen_render')) {
    exceeded = duration > budgets.screenRenderMs;
    budgetValue = budgets.screenRenderMs;
  } else if (metricName.includes('api_call')) {
    exceeded = duration > budgets.apiCallMs;
    budgetValue = budgets.apiCallMs;
  } else {
    exceeded = duration > budgets.operationMs;
    budgetValue = budgets.operationMs;
  }

  if (exceeded) {
    analytics.track('performance_budget_exceeded', {
      metric: metricName,
      duration_ms: duration,
      budget_ms: budgetValue,
      overage_ms: duration - budgetValue,
      overage_pct: Math.round(((duration - budgetValue) / budgetValue) * 100),
    });
  }

  return exceeded;
}

// ============================================================================
// Initialize All Monitors
// ============================================================================

/**
 * Initialize all performance monitoring
 */
export function initializePerformanceMonitoring(): void {
  try {
    initializeMemoryMonitoring();
    initializeNetworkMonitoring();
    initializeAppStateMonitoring();
    initializeBatteryMonitoring();
    
    console.log('[PerformanceMonitor] All monitors initialized');
  } catch (error) {
    console.error('[PerformanceMonitor] Initialization error:', error);
  }
}

export default {
  initialize: initializePerformanceMonitoring,
  checkBudget: checkPerformanceBudget,
};
