/**
 * Config Constants Tests
 * Feature: IOS-THEME-003
 *
 * Tests for app configuration constants following TDD approach.
 * These tests verify that DEV_MODE flag, API URLs, and feature flags are properly defined.
 */

import { Config, isDevelopment, isProduction } from '../../constants/config';

describe('Config Constants', () => {
  describe('Basic Configuration', () => {
    it('should define APP_NAME', () => {
      expect(Config.APP_NAME).toBeDefined();
      expect(typeof Config.APP_NAME).toBe('string');
      expect(Config.APP_NAME.length).toBeGreaterThan(0);
    });

    it('should define APP_VERSION', () => {
      expect(Config.APP_VERSION).toBeDefined();
      expect(typeof Config.APP_VERSION).toBe('string');
      expect(Config.APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/); // Semver format
    });

    it('should define DEV_MODE', () => {
      expect(Config.DEV_MODE).toBeDefined();
      expect(typeof Config.DEV_MODE).toBe('boolean');
    });
  });

  describe('API Configuration', () => {
    it('should define SUPABASE_URL', () => {
      expect(Config.SUPABASE_URL).toBeDefined();
      expect(typeof Config.SUPABASE_URL).toBe('string');
    });

    it('should define SUPABASE_ANON_KEY', () => {
      expect(Config.SUPABASE_ANON_KEY).toBeDefined();
      expect(typeof Config.SUPABASE_ANON_KEY).toBe('string');
    });

    it('should define API_URL', () => {
      expect(Config.API_URL).toBeDefined();
      expect(typeof Config.API_URL).toBe('string');
    });
  });

  describe('Feature Flags', () => {
    it('should define ENABLE_ANALYTICS feature flag', () => {
      expect(Config.ENABLE_ANALYTICS).toBeDefined();
      expect(typeof Config.ENABLE_ANALYTICS).toBe('boolean');
    });

    it('should define ENABLE_CRASH_REPORTING feature flag', () => {
      expect(Config.ENABLE_CRASH_REPORTING).toBeDefined();
      expect(typeof Config.ENABLE_CRASH_REPORTING).toBe('boolean');
    });

    it('should define ENABLE_PUSH_NOTIFICATIONS feature flag', () => {
      expect(Config.ENABLE_PUSH_NOTIFICATIONS).toBeDefined();
      expect(typeof Config.ENABLE_PUSH_NOTIFICATIONS).toBe('boolean');
    });
  });

  describe('Payment Configuration', () => {
    it('should define REVENUECAT_IOS_KEY', () => {
      expect(Config.REVENUECAT_IOS_KEY).toBeDefined();
      expect(typeof Config.REVENUECAT_IOS_KEY).toBe('string');
    });

    it('should define REVENUECAT_ANDROID_KEY', () => {
      expect(Config.REVENUECAT_ANDROID_KEY).toBeDefined();
      expect(typeof Config.REVENUECAT_ANDROID_KEY).toBe('string');
    });
  });

  describe('Environment Helpers', () => {
    it('should provide isDevelopment helper function', () => {
      expect(isDevelopment).toBeDefined();
      expect(typeof isDevelopment).toBe('function');
      const result = isDevelopment();
      expect(typeof result).toBe('boolean');
    });

    it('should provide isProduction helper function', () => {
      expect(isProduction).toBeDefined();
      expect(typeof isProduction).toBe('function');
      const result = isProduction();
      expect(typeof result).toBe('boolean');
    });

    it('isDevelopment should be opposite of isProduction', () => {
      expect(isDevelopment()).toBe(!isProduction());
    });

    it('isDevelopment should match DEV_MODE', () => {
      expect(isDevelopment()).toBe(Config.DEV_MODE);
    });
  });

  describe('Configuration Validation', () => {
    it('should have valid Supabase URL format', () => {
      // Allow placeholder or valid URL
      const isPlaceholder = Config.SUPABASE_URL.includes('your-project');
      const isValidUrl = Config.SUPABASE_URL.startsWith('https://') &&
                        Config.SUPABASE_URL.includes('.supabase.co');
      expect(isPlaceholder || isValidUrl).toBe(true);
    });

    it('should have valid API URL format', () => {
      // Allow localhost or https URL
      const isLocalhost = Config.API_URL.startsWith('http://localhost');
      const isHttps = Config.API_URL.startsWith('https://');
      expect(isLocalhost || isHttps).toBe(true);
    });

    it('should have sensible defaults for feature flags', () => {
      // In dev mode, feature flags can be any value
      // In production, analytics and crash reporting should typically be enabled
      if (isProduction()) {
        // This is a recommendation, not a hard requirement
        expect(typeof Config.ENABLE_ANALYTICS).toBe('boolean');
        expect(typeof Config.ENABLE_CRASH_REPORTING).toBe('boolean');
      }
      expect(typeof Config.ENABLE_PUSH_NOTIFICATIONS).toBe('boolean');
    });
  });

  describe('Export Structure', () => {
    it('should export Config as default export structure', () => {
      expect(Config).toBeDefined();
      expect(typeof Config).toBe('object');
    });

    it('should include all required config keys', () => {
      const requiredKeys = [
        'APP_NAME',
        'APP_VERSION',
        'DEV_MODE',
        'SUPABASE_URL',
        'SUPABASE_ANON_KEY',
        'API_URL',
        'ENABLE_ANALYTICS',
        'ENABLE_CRASH_REPORTING',
        'ENABLE_PUSH_NOTIFICATIONS',
        'REVENUECAT_IOS_KEY',
        'REVENUECAT_ANDROID_KEY',
      ];

      requiredKeys.forEach((key) => {
        expect(Config).toHaveProperty(key);
      });
    });
  });
});
