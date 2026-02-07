/**
 * Web shim for react-native-purchases (RevenueCat native-only module).
 * Metro resolves this on web platform instead of the real native module.
 */

const noop = () => {};
const noopAsync = () => Promise.resolve();

const Purchases = {
  configure: noopAsync,
  getOfferings: () => Promise.resolve({ current: null, all: {} }),
  getProducts: () => Promise.resolve([]),
  purchaseStoreProduct: () => Promise.resolve({ customerInfo: {} }),
  restorePurchases: () => Promise.resolve({}),
  getCustomerInfo: () => Promise.resolve({ entitlements: { active: {} } }),
  logIn: noopAsync,
  logOut: noopAsync,
  setEmail: noop,
  setAttributes: noop,
  addCustomerInfoUpdateListener: () => ({ remove: noop }),
  isConfigured: () => false,
  LOG_LEVEL: { VERBOSE: 0, DEBUG: 1, INFO: 2, WARN: 3, ERROR: 4 },
};

module.exports = Purchases;
module.exports.default = Purchases;
module.exports.LOG_LEVEL = Purchases.LOG_LEVEL;
