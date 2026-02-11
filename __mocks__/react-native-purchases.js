// Mock for react-native-purchases (RevenueCat SDK)
// Used in tests to avoid loading native modules

const PACKAGE_TYPE = {
  MONTHLY: 'MONTHLY',
  ANNUAL: 'ANNUAL',
  LIFETIME: 'LIFETIME',
  SIX_MONTH: 'SIX_MONTH',
  THREE_MONTH: 'THREE_MONTH',
  TWO_MONTH: 'TWO_MONTH',
  WEEKLY: 'WEEKLY',
  UNKNOWN: 'UNKNOWN',
};

const LOG_LEVEL = {
  VERBOSE: 'VERBOSE',
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
};

const mockPurchases = {
  configure: jest.fn().mockResolvedValue(undefined),
  getOfferings: jest.fn().mockResolvedValue({ all: {}, current: null }),
  purchasePackage: jest.fn().mockResolvedValue({ customerInfo: { entitlements: { active: {} } } }),
  restorePurchases: jest.fn().mockResolvedValue({ entitlements: { active: {} } }),
  getCustomerInfo: jest.fn().mockResolvedValue({ entitlements: { active: {} } }),
  logIn: jest.fn().mockResolvedValue({ customerInfo: { entitlements: { active: {} } }, created: false }),
  logOut: jest.fn().mockResolvedValue({ entitlements: { active: {} } }),
  setLogLevel: jest.fn(),
  addCustomerInfoUpdateListener: jest.fn(() => ({ remove: jest.fn() })),
  PACKAGE_TYPE,
  LOG_LEVEL,
};

module.exports = mockPurchases;
module.exports.default = mockPurchases;
