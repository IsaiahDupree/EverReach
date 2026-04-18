/**
 * Web stubs for native-only modules (expo-superwall, react-native-purchases).
 * Metro resolves these modules to this file on web platform via metro.config.js.
 */

// Superwall stubs
export const SuperwallProvider = ({ children }) => children;
export const SuperwallLoading = () => null;
export const SuperwallLoaded = ({ children }) => children;
export const CustomPurchaseControllerProvider = ({ children }) => children;
export function usePlacement() { return { trigger: () => {}, isActive: false }; }
export function useUser() { return { userId: null }; }
export function useSuperwallEvents() { return []; }

// react-native-purchases stubs
export function getProducts() { return Promise.resolve([]); }
export function purchaseStoreProduct() { return Promise.resolve({ customerInfo: { entitlements: { active: {} } } }); }
export function restorePurchases() { return Promise.resolve({ entitlements: { active: {} } }); }
export function addCustomerInfoUpdateListener() { return { remove: () => {} }; }

// Default export for react-native-purchases
export default {
  getProducts,
  purchaseStoreProduct,
  restorePurchases,
  addCustomerInfoUpdateListener,
};
