/**
 * SDK Installation Verification Tests
 * 
 * These tests verify that required SDKs are actually installed
 * and can be imported. NO MOCKS - Just checks if packages exist.
 */

describe('SDK Installation Verification', () => {
  describe('RevenueCat SDK', () => {
    it('should have react-native-purchases installed', () => {
      // Try to require the package
      let isInstalled = false;
      let version = 'unknown';
      
      try {
        const pkg = require('react-native-purchases/package.json');
        isInstalled = true;
        version = pkg.version;
      } catch (error) {
        isInstalled = false;
      }
      
      console.log(`[SDK Check] RevenueCat: ${isInstalled ? '✅ INSTALLED' : '❌ NOT INSTALLED'}`);
      if (isInstalled) {
        console.log(`[SDK Check] RevenueCat version: ${version}`);
      }
      
      expect(isInstalled).toBe(true);
    });

    it('should be able to import RevenueCat SDK', async () => {
      try {
        const Purchases = await import('react-native-purchases');
        
        console.log('[SDK Check] RevenueCat SDK imported successfully');
        console.log('[SDK Check] Available methods:', Object.keys(Purchases.default || Purchases));
        
        expect(Purchases).toBeDefined();
        expect(Purchases.default || Purchases).toBeDefined();
      } catch (error: any) {
        console.error('[SDK Check] RevenueCat import failed:', error.message);
        throw error;
      }
    });

    it('should have required RevenueCat methods available', async () => {
      const Purchases = await import('react-native-purchases');
      const SDK = Purchases.default || Purchases;
      
      const requiredMethods = [
        'configure',
        'getOfferings',
        'purchasePackage',
        'restorePurchases',
      ];
      
      const availableMethods = Object.keys(SDK);
      const missingMethods = requiredMethods.filter(
        method => !availableMethods.includes(method)
      );
      
      console.log('[SDK Check] Required methods:', requiredMethods);
      console.log('[SDK Check] Available methods:', availableMethods);
      console.log('[SDK Check] Missing methods:', missingMethods);
      
      expect(missingMethods.length).toBe(0);
    });
  });

  describe('Superwall SDK', () => {
    it('should have @superwall/react-native-superwall installed', () => {
      let isInstalled = false;
      let version = 'unknown';
      
      try {
        const pkg = require('@superwall/react-native-superwall/package.json');
        isInstalled = true;
        version = pkg.version;
      } catch (error) {
        isInstalled = false;
      }
      
      console.log(`[SDK Check] Superwall: ${isInstalled ? '✅ INSTALLED' : '❌ NOT INSTALLED'}`);
      if (isInstalled) {
        console.log(`[SDK Check] Superwall version: ${version}`);
      }
      
      expect(isInstalled).toBe(true);
    });

    it('should be able to import Superwall SDK', async () => {
      try {
        const Superwall = await import('@superwall/react-native-superwall');
        
        console.log('[SDK Check] Superwall SDK imported successfully');
        console.log('[SDK Check] Available exports:', Object.keys(Superwall));
        
        expect(Superwall).toBeDefined();
      } catch (error: any) {
        console.error('[SDK Check] Superwall import failed:', error.message);
        throw error;
      }
    });
  });

  describe('Other Required Packages', () => {
    it('should have AsyncStorage installed', () => {
      let isInstalled = false;
      
      try {
        require.resolve('@react-native-async-storage/async-storage');
        isInstalled = true;
      } catch (error) {
        isInstalled = false;
      }
      
      console.log(`[SDK Check] AsyncStorage: ${isInstalled ? '✅ INSTALLED' : '❌ NOT INSTALLED'}`);
      expect(isInstalled).toBe(true);
    });

    it('should have analytics library available', () => {
      let isInstalled = false;
      
      try {
        require.resolve('@/lib/analytics');
        isInstalled = true;
      } catch (error) {
        isInstalled = false;
      }
      
      console.log(`[SDK Check] Analytics: ${isInstalled ? '✅ INSTALLED' : '❌ NOT INSTALLED'}`);
      expect(isInstalled).toBe(true);
    });
  });

  describe('Package Version Info', () => {
    it('should log all relevant package versions', () => {
      const packages = [
        'react-native',
        'expo',
        'react-native-purchases',
        '@superwall/react-native-superwall',
        '@react-native-async-storage/async-storage',
      ];
      
      console.log('\n[SDK Check] Package Versions:');
      console.log('================================');
      
      packages.forEach(pkgName => {
        try {
          const pkg = require(`${pkgName}/package.json`);
          console.log(`${pkgName}: ${pkg.version}`);
        } catch (error) {
          console.log(`${pkgName}: NOT INSTALLED`);
        }
      });
      
      console.log('================================\n');
      
      // This test always passes, just for logging
      expect(true).toBe(true);
    });
  });
});

/**
 * Run this test with:
 * npm test -- verify-sdk-installation
 * 
 * Expected output if all installed:
 * ✅ RevenueCat: INSTALLED (v9.6.3)
 * ✅ Superwall: INSTALLED (v2.1.7)
 * ✅ AsyncStorage: INSTALLED
 * ✅ Analytics: INSTALLED
 */
