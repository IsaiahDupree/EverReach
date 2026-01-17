import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Support local development and production
const getApiBase = () => {
  // Priority order for API base URL:
  // 1. Explicit environment variable override
  // 2. Constants from expo-constants (uses EXPO_PUBLIC_BACKEND_URL)
  // 3. Direct environment variable
  // 4. Production fallback
  
  const explicitOverride = process.env.EXPO_PUBLIC_LOCAL_API_URL;
  if (explicitOverride) return explicitOverride;

  let apiUrl = 
    Constants.expoConfig?.extra?.apiUrl || 
    process.env.EXPO_PUBLIC_BACKEND_URL || 
    process.env.EXPO_PUBLIC_API_URL || 
    'https://ever-reach-be.vercel.app';

  // Platform-specific URL transformation for LOCAL development
  // Android emulator needs 10.0.2.2, web needs localhost
  if (Platform.OS === 'android' && apiUrl.includes('localhost')) {
    apiUrl = apiUrl.replace('localhost', '10.0.2.2');
    console.log('📱 [PaywallConfig/Android] Converted localhost to 10.0.2.2 for emulator');
  }

  return apiUrl;
};

const API_BASE = getApiBase();
const CONFIG_CACHE_KEY = '@paywall_config';
const CONFIG_CACHE_DURATION = 1000 * 60 * 60; // 1 hour

export interface PaywallConfig {
  strategy: {
    id: string;
    name: string;
    mode: 'hard-hard' | 'hard' | 'hard-soft' | 'soft';
    can_skip: boolean;
    show_at: string; // 'onboarding', 'after_trial', 'after_X_days'
    display_timing?: {
      trigger_type: string;
      trigger_value: number | null;
    };
  };
  presentation: {
    id: string;
    name: string;
    variant: 'static' | 'video' | 'app_store_sheet';
    has_animation: boolean;
    show_features_list: boolean;
    emphasis: string;
  };
  trial: {
    id: string;
    name: string;
    type: 'time_based' | 'usage_based' | 'none';
    duration_days: number | null;
    usage_cap_hours: number | null;
    usage_cap_sessions: number | null;
  };
  permissions: Array<{
    feature_area: string;
    can_access: boolean;
    access_level: string;
  }>;
  trial_ended?: boolean;
  can_show_review_prompt?: boolean;
}

interface CachedConfig {
  config: PaywallConfig;
  timestamp: number;
}

class PaywallConfigService {
  private config: PaywallConfig | null = null;
  private fetchPromise: Promise<PaywallConfig> | null = null;

  /**
   * Fetch paywall config from backend
   */
  async fetchConfig(platform: 'mobile' | 'web' = 'mobile'): Promise<PaywallConfig> {
    const timestamp = new Date().toISOString();
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🔄 [PaywallConfig] FETCH STARTED @ ${timestamp}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`   Platform: ${platform}`);
    console.log(`   API Base: ${API_BASE}`);
    
    try {
      // Check cache first
      const cachedConfig = await this.getCachedConfig();
      if (cachedConfig) {
        console.log('\n✅ [PaywallConfig] Using CACHED config');
        console.log(`   Strategy: ${cachedConfig.strategy?.name || 'unknown'} (${cachedConfig.strategy?.id || 'unknown'})`);
        console.log(`   Mode: ${cachedConfig.strategy?.mode || 'unknown'}`);
        console.log(`   Can Skip: ${cachedConfig.strategy?.can_skip ?? 'unknown'}`);
        console.log(`   Presentation: ${cachedConfig.presentation?.variant || 'unknown'}`);
        console.log(`   Trial: ${cachedConfig.trial?.duration_days || 'N/A'} days`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        this.config = cachedConfig;
        return cachedConfig;
      }

      console.log('💾 Cache MISS - Fetching from backend...\n');

      // Get auth token from AsyncStorage
      const authToken = await AsyncStorage.getItem('@auth_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add auth token if available (for user_id specific data)
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
        console.log('🔑 Auth token found - requesting user-specific config');
      } else {
        console.log('⚠️  No auth token - requesting anonymous config');
      }

      const url = `${API_BASE}/api/v1/config/paywall-strategy?platform=${platform}`;
      console.log(`📡 Fetching from: ${url}\n`);

      const startTime = Date.now();
      const response = await fetch(url, { headers });
      const fetchDuration = Date.now() - startTime;

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const config = await response.json();
      
      console.log(`\n✨ [PaywallConfig] CONFIG FETCHED (${fetchDuration}ms)`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`   Strategy: ${config.strategy?.name || 'unknown'}`);
      console.log(`   ID: ${config.strategy?.id || 'unknown'}`);
      console.log(`   Mode: ${config.strategy?.mode || 'unknown'} ${config.strategy?.can_skip ? '(skippable)' : '(hard)'}`);
      console.log(`   Presentation: ${config.presentation?.variant || 'unknown'}`);
      console.log(`   Trial Type: ${config.trial?.type || 'unknown'}`);
      console.log(`   Trial Duration: ${config.trial?.duration_days || 'N/A'} days`);
      console.log(`   Trial Ended: ${config.trial_ended || false}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      // Cache the config
      await this.cacheConfig(config);
      this.config = config;

      return config;
    } catch (error) {
      console.error('\n❌ [PaywallConfig] FETCH FAILED');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('   Error:', error);
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      // Try to use cached config even if expired
      const cachedConfig = await this.getCachedConfig(true);
      if (cachedConfig) {
        console.log('⚠️  Using EXPIRED cache as fallback');
        console.log(`   Strategy: ${cachedConfig.strategy?.name || 'unknown'}\n`);
        this.config = cachedConfig;
        return cachedConfig;
      }

      // Fallback to default config
      console.log('⚠️  Using DEFAULT hard paywall config as fallback');
      console.log('   This ensures security when backend is unreachable\n');
      return this.getDefaultConfig();
    }
  }

  /**
   * Get config (fetch if not loaded)
   */
  async getConfig(): Promise<PaywallConfig> {
    if (this.config) {
      return this.config;
    }

    // If already fetching, return that promise
    if (this.fetchPromise) {
      return this.fetchPromise;
    }

    // Start fetch
    this.fetchPromise = this.fetchConfig();
    const config = await this.fetchPromise;
    this.fetchPromise = null;

    return config;
  }

  /**
   * Refresh config (force fetch)
   */
  async refreshConfig(): Promise<PaywallConfig> {
    console.log('[PaywallConfig] Forcing config refresh');
    this.config = null;
    this.fetchPromise = null;
    return this.fetchConfig();
  }

  /**
   * Get cached config from AsyncStorage
   */
  private async getCachedConfig(ignoreExpiry = false): Promise<PaywallConfig | null> {
    try {
      const cached = await AsyncStorage.getItem(CONFIG_CACHE_KEY);
      if (!cached) return null;

      const { config, timestamp }: CachedConfig = JSON.parse(cached);
      const age = Date.now() - timestamp;

      // Check if cache is still valid
      if (!ignoreExpiry && age > CONFIG_CACHE_DURATION) {
        console.log('[PaywallConfig] Cache expired (age:', Math.floor(age / 1000 / 60), 'minutes)');
        return null;
      }

      return config;
    } catch (error) {
      console.error('[PaywallConfig] Cache read error:', error);
      return null;
    }
  }

  /**
   * Cache config to AsyncStorage
   */
  private async cacheConfig(config: PaywallConfig): Promise<void> {
    try {
      const cached: CachedConfig = {
        config,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(CONFIG_CACHE_KEY, JSON.stringify(cached));
      console.log('[PaywallConfig] Config cached');
    } catch (error) {
      console.error('[PaywallConfig] Cache write error:', error);
    }
  }

  /**
   * Default fallback config (hard paywall after 7-day trial)
   * This is used when backend is unreachable to prevent unauthorized access
   */
  private getDefaultConfig(): PaywallConfig {
    return {
      strategy: {
        id: 'HARD_AFTER_7D',
        name: 'Hard: 7-Day Trial',
        mode: 'hard',
        can_skip: false, // Cannot dismiss - must subscribe
        show_at: 'after_trial',
        display_timing: {
          trigger_type: 'days_since_install',
          trigger_value: 7,
        },
      },
      presentation: {
        id: 'PAYWALL_STATIC',
        name: 'Static Paywall',
        variant: 'static',
        has_animation: false,
        show_features_list: true,
        emphasis: 'features',
      },
      trial: {
        id: 'TRIAL_7_DAYS',
        name: '7 Day Trial',
        type: 'time_based',
        duration_days: 7,
        usage_cap_hours: null,
        usage_cap_sessions: null,
      },
      permissions: [
        // Allow basic navigation
        { feature_area: 'onboarding', can_access: true, access_level: 'full' },
        { feature_area: 'settings', can_access: true, access_level: 'full' },
        { feature_area: 'contacts_list', can_access: true, access_level: 'view' },
        // Block pro features
        { feature_area: 'contact_details', can_access: false, access_level: 'none' },
        { feature_area: 'voice_notes', can_access: false, access_level: 'none' },
        { feature_area: 'ai_messages', can_access: false, access_level: 'none' },
        { feature_area: 'screenshots', can_access: false, access_level: 'none' },
        { feature_area: 'advanced_analytics', can_access: false, access_level: 'none' },
      ],
      trial_ended: false,
      can_show_review_prompt: false,
    };
  }

  /**
   * Check if user should see paywall based on config
   */
  shouldShowPaywall(
    config: PaywallConfig,
    userState: {
      installDate: Date;
      trialEndDate: Date | null;
      isPremium: boolean;
      isTrialExpired?: boolean;
      usageHours?: number;
      sessionCount?: number;
    }
  ): boolean {
    console.log('\n🎯 [PaywallConfig] EVALUATING PAYWALL DISPLAY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('User State:');
    console.log(`   Premium: ${userState.isPremium}`);
    console.log(`   Trial Expired: ${userState.isTrialExpired !== undefined ? userState.isTrialExpired : 'N/A'}`);
    console.log(`   Install Date: ${userState.installDate.toISOString()}`);
    console.log(`   Trial End: ${userState.trialEndDate?.toISOString() || 'N/A'}`);
    if (userState.usageHours) console.log(`   Usage Hours: ${userState.usageHours}`);
    if (userState.sessionCount) console.log(`   Sessions: ${userState.sessionCount}`);
    
    console.log('\nConfig:');
    console.log(`   Strategy: ${config.strategy?.name || 'unknown'}`);
    console.log(`   Mode: ${config.strategy?.mode || 'unknown'}`);
    console.log(`   Trial Type: ${config.trial?.type || 'unknown'}`);
    console.log(`   Trial Duration: ${config.trial?.duration_days || 'N/A'} days`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Already premium
    if (userState.isPremium) {
      console.log('✅ User is PREMIUM - No paywall');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      return false;
    }

    const { strategy, trial } = config;

    // Safety check - if no strategy defined, don't show paywall
    if (!strategy) {
      console.log('⚠️ No strategy defined in config - defaulting to NO paywall');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      return false;
    }

    // Hard-hard: Always show (except for premium)
    if (strategy.mode === 'hard-hard') {
      console.log('🔒 HARD-HARD mode - SHOWING PAYWALL');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      return true;
    }

    // Check trial status
    // Only show paywall for trial expiration if mode is 'hard' (blocks access after trial)
    // This prevents showing paywall everywhere - only on premium features
    if (strategy.mode === 'hard' || strategy.mode === 'hard-soft') {
      // First check if isTrialExpired is explicitly set (most reliable)
      if (userState.isTrialExpired !== undefined && userState.isTrialExpired === true) {
        console.log('🔒 Trial EXPIRED (from userState) + HARD mode - SHOWING PAYWALL');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        return true;
      }
      
      // Fallback: Calculate from trialEndDate if available
      if (trial.type === 'time_based' && userState.trialEndDate) {
        const now = new Date();
        const trialEnded = now > userState.trialEndDate;
        const daysRemaining = Math.ceil((userState.trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        console.log(`⏱️  Trial Status: ${trialEnded ? 'EXPIRED' : 'ACTIVE'}`);
        if (!trialEnded) {
          console.log(`   Days Remaining: ${daysRemaining}`);
        }
        
        if (trialEnded) {
          console.log('🔒 Trial EXPIRED (from trialEndDate) + HARD mode - SHOWING PAYWALL');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
          return true;
        }
      }
    }

    // Check usage-based trial
    if (trial.type === 'usage_based') {
      if (trial.usage_cap_hours && userState.usageHours) {
        const hoursRemaining = trial.usage_cap_hours - userState.usageHours;
        console.log(`⏱️  Usage: ${userState.usageHours}/${trial.usage_cap_hours} hours`);
        console.log(`   Remaining: ${hoursRemaining} hours`);
        
        if (userState.usageHours >= trial.usage_cap_hours) {
          console.log('🔒 Usage hours EXCEEDED - SHOWING PAYWALL');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
          return true;
        }
      }
      if (trial.usage_cap_sessions && userState.sessionCount) {
        const sessionsRemaining = trial.usage_cap_sessions - userState.sessionCount;
        console.log(`⏱️  Sessions: ${userState.sessionCount}/${trial.usage_cap_sessions}`);
        console.log(`   Remaining: ${sessionsRemaining} sessions`);
        
        if (userState.sessionCount >= trial.usage_cap_sessions) {
          console.log('🔒 Session count EXCEEDED - SHOWING PAYWALL');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
          return true;
        }
      }
    }

    // Check display timing (with safe fallback if missing from backend)
    const daysSinceInstall = Math.floor(
      (Date.now() - userState.installDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Safe access with optional chaining
    if (strategy.display_timing?.trigger_type === 'days_since_install') {
      const threshold = strategy.display_timing.trigger_value || 7;
      console.log(`📅 Days Since Install: ${daysSinceInstall}/${threshold}`);
      
      if (daysSinceInstall >= threshold) {
        console.log('🔒 Days threshold MET - SHOWING PAYWALL');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        return true;
      }
    }

    console.log('✅ No triggers met - NO PAYWALL');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    return false;
  }

  /**
   * Check if a feature is accessible based on config
   */
  canAccessFeature(config: PaywallConfig, featureArea: string, isPremium: boolean): boolean {
    // Premium users can access everything
    if (isPremium) {
      return true;
    }

    // Check permissions in config
    const permission = config.permissions.find(p => p.feature_area === featureArea);
    if (permission) {
      return permission.can_access;
    }

    // Default: soft paywall allows access (if strategy exists)
    return config.strategy?.mode === 'soft';
  }

  /**
   * Clear cache (for testing)
   */
  async clearCache(): Promise<void> {
    await AsyncStorage.removeItem(CONFIG_CACHE_KEY);
    this.config = null;
    console.log('[PaywallConfig] Cache cleared');
  }
}

export const paywallConfigService = new PaywallConfigService();
