/**
 * Superwall Shim for Web
 * 
 * This provides no-op implementations of Superwall exports
 * that can be used on web where the native module doesn't exist.
 */

import { Platform } from 'react-native';

const IS_WEB = (Platform.OS as string) === 'web';

// Types
type ChildrenProp = { children?: React.ReactNode };
type ControllerProp = { controller?: any };

// No-op implementations for web
const NoOpProvider = ({ children }: ChildrenProp) => children;
const NoOpLoading = () => null;
const NoOpLoaded = ({ children }: ChildrenProp) => children;
const NoOpControllerProvider = ({ children }: ChildrenProp & ControllerProp) => children;

// Export either real modules or shims based on platform
let SuperwallProvider = NoOpProvider;
let SuperwallLoading = NoOpLoading;
let SuperwallLoaded = NoOpLoaded;
let CustomPurchaseControllerProvider = NoOpControllerProvider;
let Purchases: any = {
  getProducts: async () => [],
  purchaseStoreProduct: async () => ({ customerInfo: { entitlements: { active: {} } } }),
  restorePurchases: async () => ({ entitlements: { active: {} } }),
};

// Only load native modules on native platforms
if (!IS_WEB) {
  try {
    // These will only be resolved on native builds
    const sw = require('expo-superwall');
    SuperwallProvider = sw.SuperwallProvider;
    SuperwallLoading = sw.SuperwallLoading;
    SuperwallLoaded = sw.SuperwallLoaded;
    CustomPurchaseControllerProvider = sw.CustomPurchaseControllerProvider;
    Purchases = require('react-native-purchases').default;
  } catch (error) {
    console.warn('[SuperwallShim] Native modules not available:', error);
  }
}

export {
  SuperwallProvider,
  SuperwallLoading,
  SuperwallLoaded,
  CustomPurchaseControllerProvider,
  Purchases,
};

