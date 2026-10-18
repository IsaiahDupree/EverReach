/**
 * Web mock for react-native-purchases
 * This provides no-op implementations for web builds
 */

const Purchases = {
  configure: () => {},
  getProducts: async () => [],
  purchaseStoreProduct: async () => ({ 
    customerInfo: { 
      entitlements: { active: {} } 
    } 
  }),
  restorePurchases: async () => ({ 
    entitlements: { active: {} } 
  }),
  logIn: async () => ({ customerInfo: { entitlements: { active: {} } }, created: false }),
  logOut: async () => {},
  getCustomerInfo: async () => ({ entitlements: { active: {} } }),
  addCustomerInfoUpdateListener: () => ({ remove: () => {} }),
  setLogLevel: () => {},
  getOfferings: async () => ({ current: null, all: {} }),
  isConfigured: () => false,
};

export default Purchases;
export { Purchases };

// LOG_LEVEL constant
export const LOG_LEVEL = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

