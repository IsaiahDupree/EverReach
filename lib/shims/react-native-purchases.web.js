/** Explicitly unavailable on web; never report a simulated purchase or entitlement. */
const unsupported = () => {
  throw new Error('RevenueCat purchases are available only on native iOS and Android.');
};
const unsupportedAsync = async () => unsupported();
const Purchases = {
  configure: unsupportedAsync,
  getOfferings: unsupportedAsync,
  getProducts: unsupportedAsync,
  purchaseStoreProduct: unsupportedAsync,
  purchasePackage: unsupportedAsync,
  restorePurchases: unsupportedAsync,
  getCustomerInfo: unsupportedAsync,
  logIn: unsupportedAsync,
  logOut: unsupportedAsync,
  setEmail: unsupported,
  setAttributes: unsupported,
  addCustomerInfoUpdateListener: unsupported,
  isConfigured: () => false,
  LOG_LEVEL: { VERBOSE: 0, DEBUG: 1, INFO: 2, WARN: 3, ERROR: 4 },
};
module.exports = Purchases;
module.exports.default = Purchases;
module.exports.LOG_LEVEL = Purchases.LOG_LEVEL;
