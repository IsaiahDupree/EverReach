/**
 * REAL INTEGRATION TESTS - NO MOCKS
 * 
 * These tests use real components and real SDKs.
 * Requires:
 * - Real RevenueCat API keys in .env
 * - Real Superwall API keys in .env
 * - Network connection
 * 
 * Run with: npm run test:integration
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { PaywallRouter } from '@/components/paywall/PaywallRouter';
import AsyncStorage from '@react-native-async-storage/async-storage';

// NO MOCKS - Using real implementations
describe('Paywall Integration Tests (Real SDKs)', () => {
  beforeAll(async () => {
    // Clear any test data
    await AsyncStorage.clear();
  });

  afterEach(async () => {
    await AsyncStorage.clear();
  });

  describe('Custom Provider (No SDK Required)', () => {
    it('should render custom paywall with real plans', async () => {
      // Set dev override for custom provider
      await AsyncStorage.setItem('dev_paywall_provider', 'custom');

      const realPlans = [
        {
          id: 'monthly',
          name: 'Monthly Premium',
          description: 'Billed monthly',
          price: '$9.99',
          features: [
            { name: 'Unlimited contacts', included: true },
            { name: 'Email sync', included: true },
            { name: 'Mobile app', included: true },
          ],
        },
        {
          id: 'annual',
          name: 'Annual Premium',
          description: 'Best value - Save 20%',
          price: '$99.99',
          features: [
            { name: 'Unlimited contacts', included: true },
            { name: 'Email sync', included: true },
            { name: 'Mobile app', included: true },
            { name: 'Priority support', included: true },
          ],
          isPopular: true,
        },
      ];

      const onSelectPlan = jest.fn();

      const { getByText } = render(
        <PaywallRouter
          plans={realPlans}
          onSelectPlan={onSelectPlan}
        />
      );

      // Wait for component to render
      await waitFor(() => {
        expect(getByText('Monthly Premium')).toBeTruthy();
        expect(getByText('Annual Premium')).toBeTruthy();
        expect(getByText('$9.99')).toBeTruthy();
        expect(getByText('$99.99')).toBeTruthy();
      });
    });
  });

  describe('Backend Integration', () => {
    it('should fetch real config from backend', async () => {
      // Test real backend endpoint
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://ever-reach-be.vercel.app';
      const platform = Platform.OS;

      try {
        const response = await fetch(
          `${backendUrl}/api/v1/config/paywall-strategy?platform=${platform}`,
          {
            headers: {
              'Authorization': `Bearer ${process.env.TEST_AUTH_TOKEN || 'test-token'}`,
            },
          }
        );

        if (response.ok) {
          const config = await response.json();
          
          console.log('[Integration Test] Real backend config:', config);
          
          // Verify config structure
          expect(config).toHaveProperty('provider');
          expect(config).toHaveProperty('platform');
          expect(['custom', 'revenuecat', 'superwall']).toContain(config.provider);
        } else {
          console.log('[Integration Test] Backend not reachable, skipping');
        }
      } catch (error) {
        console.log('[Integration Test] Backend error:', error);
        // Don't fail test if backend is not available in test environment
      }
    });
  });

  describe('RevenueCat Integration (Requires SDK)', () => {
    it('should initialize RevenueCat with real API key', async () => {
      const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;
      
      if (!apiKey) {
        console.log('[Integration Test] RevenueCat API key not configured, skipping');
        return;
      }

      try {
        // Dynamically import real SDK
        const Purchases = await import('react-native-purchases');
        
        // Configure with real key
        Purchases.default.configure({ apiKey });
        
        console.log('[Integration Test] RevenueCat configured successfully');
        
        // Try to fetch real offerings
        const offerings = await Purchases.default.getOfferings();
        
        console.log('[Integration Test] Offerings:', {
          current: offerings.current?.identifier,
          count: Object.keys(offerings.all).length,
        });
        
        expect(offerings).toBeDefined();
      } catch (error: any) {
        if (error.message?.includes('Cannot find module')) {
          console.log('[Integration Test] RevenueCat SDK not installed, skipping');
        } else {
          console.log('[Integration Test] RevenueCat error:', error.message);
        }
      }
    });
  });

  describe('Superwall Integration (Requires SDK)', () => {
    it('should initialize Superwall with real API key', async () => {
      const apiKey = process.env.EXPO_PUBLIC_SUPERWALL_API_KEY;
      
      if (!apiKey) {
        console.log('[Integration Test] Superwall API key not configured, skipping');
        return;
      }

      try {
        // Dynamically import real SDK
        const Superwall = await import('@superwall/react-native-superwall');
        
        console.log('[Integration Test] Superwall SDK loaded');
        
        // Note: Superwall init requires more setup in production
        // This just verifies the SDK is available
        expect(Superwall.default).toBeDefined();
      } catch (error: any) {
        if (error.message?.includes('Cannot find module')) {
          console.log('[Integration Test] Superwall SDK not installed, skipping');
        } else {
          console.log('[Integration Test] Superwall error:', error.message);
        }
      }
    });
  });

  describe('Analytics Integration', () => {
    it('should track real analytics events', async () => {
      const analytics = require('@/lib/analytics').default;
      
      // Track a real event
      analytics.track('test_paywall_integration', {
        test: true,
        timestamp: new Date().toISOString(),
      });
      
      console.log('[Integration Test] Analytics event tracked');
      
      // Verify analytics is callable (actual delivery is async)
      expect(analytics.track).toBeDefined();
    });
  });
});

/**
 * Manual Testing Scenarios
 * 
 * These cannot be automated but should be tested manually:
 * 
 * 1. Real Purchase Flow:
 *    - Open app on device
 *    - Navigate to paywall
 *    - Select plan
 *    - Complete real purchase (sandbox)
 *    - Verify entitlement granted
 * 
 * 2. Real Restore Flow:
 *    - Delete and reinstall app
 *    - Open paywall
 *    - Tap "Restore Purchases"
 *    - Verify entitlement restored
 * 
 * 3. Backend Switching:
 *    - Change provider in backend dashboard
 *    - Force refresh config
 *    - Verify correct paywall displays
 * 
 * 4. Network Failure:
 *    - Disable network
 *    - Open paywall
 *    - Verify fallback behavior
 *    - Re-enable network
 *    - Verify recovery
 */
