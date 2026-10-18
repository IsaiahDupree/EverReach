/**
 * Tests for RevenueCat Client Setup
 * Feature: IOS-PAY-001
 *
 * Acceptance Criteria:
 * - SDK initialized successfully
 * - User identified when authenticated
 * - Environment variables are properly loaded
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock react-native-purchases
jest.mock('react-native-purchases', () => ({
  PurchasesOfferings: jest.fn(),
  configure: jest.fn(),
  setAttributes: jest.fn(),
  logIn: jest.fn(),
  logOut: jest.fn(),
  getOfferings: jest.fn(),
  getCustomerInfo: jest.fn(),
  purchasePackage: jest.fn(),
  restorePurchases: jest.fn(),
  LOG_LEVEL: {
    DEBUG: 'DEBUG',
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR',
  },
  setLogLevel: jest.fn(),
}));

describe('RevenueCat Client Setup (IOS-PAY-001)', () => {
  // Set up test environment variables
  beforeEach(() => {
    process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY = 'appl_test_key_12345';
    process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY = 'goog_test_key_12345';
    jest.clearAllMocks();
    jest.resetModules();
  });

  describe('SDK Initialization', () => {
    it('should export a configureRevenueCat function', () => {
      const revenuecatModule = require('../../lib/revenuecat');

      expect(revenuecatModule.configureRevenueCat).toBeDefined();
      expect(typeof revenuecatModule.configureRevenueCat).toBe('function');
    });

    it('should configure RevenueCat with iOS key on iOS platform', async () => {
      const Purchases = require('react-native-purchases');
      const { configureRevenueCat } = require('../../lib/revenuecat');

      await configureRevenueCat();

      expect(Purchases.configure).toHaveBeenCalledWith({
        apiKey: 'appl_test_key_12345',
      });
    });

    it('should throw an error if API key is missing', async () => {
      delete process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;
      delete process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;

      jest.resetModules();

      const { configureRevenueCat } = require('../../lib/revenuecat');

      await expect(configureRevenueCat()).rejects.toThrow();
    });

    it('should set log level in development mode', async () => {
      process.env.DEV_MODE = 'true';

      jest.resetModules();

      const Purchases = require('react-native-purchases');
      const { configureRevenueCat } = require('../../lib/revenuecat');
      await configureRevenueCat();

      expect(Purchases.setLogLevel).toHaveBeenCalled();
    });
  });

  describe('User Identification', () => {
    it('should export an identifyUser function', () => {
      const revenuecatModule = require('../../lib/revenuecat');

      expect(revenuecatModule.identifyUser).toBeDefined();
      expect(typeof revenuecatModule.identifyUser).toBe('function');
    });

    it('should call Purchases.logIn with user ID', async () => {
      const Purchases = require('react-native-purchases');
      const { identifyUser } = require('../../lib/revenuecat');

      const userId = 'user-123-456';
      await identifyUser(userId);

      expect(Purchases.logIn).toHaveBeenCalledWith(userId);
    });

    it('should return customer info after identifying user', async () => {
      const Purchases = require('react-native-purchases');
      const mockCustomerInfo = {
        activeSubscriptions: ['premium_monthly'],
        entitlements: {
          active: {
            premium: {},
          },
        },
      };

      Purchases.logIn.mockResolvedValue({
        customerInfo: mockCustomerInfo,
        created: false,
      });

      const { identifyUser } = require('../../lib/revenuecat');

      const result = await identifyUser('user-123');

      expect(result).toBeDefined();
      expect(result.customerInfo).toEqual(mockCustomerInfo);
    });
  });

  describe('User Logout', () => {
    it('should export a logoutUser function', () => {
      const revenuecatModule = require('../../lib/revenuecat');

      expect(revenuecatModule.logoutUser).toBeDefined();
      expect(typeof revenuecatModule.logoutUser).toBe('function');
    });

    it('should call Purchases.logOut', async () => {
      const Purchases = require('react-native-purchases');
      const { logoutUser } = require('../../lib/revenuecat');

      await logoutUser();

      expect(Purchases.logOut).toHaveBeenCalled();
    });
  });

  describe('Platform Selection', () => {
    it('should use iOS key on iOS platform', async () => {
      const Purchases = require('react-native-purchases');
      const Platform = require('react-native').Platform;
      const { configureRevenueCat } = require('../../lib/revenuecat');

      // Verify we're on iOS (mocked)
      expect(Platform.OS).toBe('ios');

      await configureRevenueCat();

      // Should use iOS key
      expect(Purchases.configure).toHaveBeenCalled();
      const configCall = Purchases.configure.mock.calls[0][0];
      expect(configCall.apiKey).toBe('appl_test_key_12345');
    });
  });

  describe('Module Exports', () => {
    it('should export all required functions', () => {
      const revenuecatModule = require('../../lib/revenuecat');

      expect(revenuecatModule.configureRevenueCat).toBeDefined();
      expect(revenuecatModule.identifyUser).toBeDefined();
      expect(revenuecatModule.logoutUser).toBeDefined();
    });

    it('should be TypeScript compatible', () => {
      // This test verifies that the module is TypeScript-compatible
      // The actual type checking happens at compile time
      const revenuecatModule = require('../../lib/revenuecat');

      expect(revenuecatModule).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle configuration errors gracefully', async () => {
      const Purchases = require('react-native-purchases');
      Purchases.configure.mockImplementation(() => {
        throw new Error('Configuration failed');
      });

      const { configureRevenueCat } = require('../../lib/revenuecat');

      await expect(configureRevenueCat()).rejects.toThrow('Configuration failed');
    });

    it('should handle user identification errors gracefully', async () => {
      const Purchases = require('react-native-purchases');
      Purchases.logIn.mockRejectedValue(new Error('Login failed'));

      const { identifyUser } = require('../../lib/revenuecat');

      await expect(identifyUser('user-123')).rejects.toThrow('Login failed');
    });
  });
});
