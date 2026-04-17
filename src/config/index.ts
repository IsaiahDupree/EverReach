/**
 * Environment and configuration management
 */

export interface SunTraceConfig {
  // Supabase
  supabaseUrl: string;
  supabaseAnonKey: string;

  // Event capture
  eventBatchSize: number;
  eventBatchWaitMs: number;
  sessionTimeoutMs: number;
  eventDedupWindowMs: number;

  // Attribution
  attributionWindowDays: number;
  defaultAttributionModel: 'first_touch' | 'last_touch' | 'linear' | 'time_decay' | 'position_based';

  // Logging
  logLevel: 'debug' | 'info' | 'warn' | 'error';

  // Data retention
  eventRetentionDays: number;

  // Feature flags
  enableRealTimeAnalytics: boolean;
  enableGDPR: boolean;
  enablePrivacyMode: boolean;
}

const defaults: SunTraceConfig = {
  supabaseUrl: process.env.REACT_APP_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  supabaseAnonKey: process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',

  eventBatchSize: 50,
  eventBatchWaitMs: 5000,
  sessionTimeoutMs: 30 * 60 * 1000,
  eventDedupWindowMs: 60 * 1000,

  attributionWindowDays: 30,
  defaultAttributionModel: 'last_touch',

  logLevel: 'info',

  eventRetentionDays: 90,

  enableRealTimeAnalytics: false,
  enableGDPR: true,
  enablePrivacyMode: false,
};

let config: SunTraceConfig = { ...defaults };

export function getConfig(): SunTraceConfig {
  return config;
}

export function setConfig(updates: Partial<SunTraceConfig>): void {
  config = { ...config, ...updates };
}

export function resetConfig(): void {
  config = { ...defaults };
}

export default config;
