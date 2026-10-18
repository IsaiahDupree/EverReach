/**
 * Web shim for expo-superwall (native-only module).
 * Metro resolves this on web platform instead of the real native module.
 * All exports used across the codebase are stubbed here.
 */

const noop = () => {};
const noopAsync = () => Promise.resolve();
const PassthroughProvider = ({ children }) => children;
const NullComponent = () => null;

// Hook stubs
const useUser = () => ({
  isLoggedIn: false,
  userId: null,
  account: null,
  user: null,
  subscriptionStatus: 'UNKNOWN',
  identify: noopAsync,
  update: noopAsync,
  signOut: noopAsync,
  setSubscriptionStatus: noop,
  getEntitlements: () => Promise.resolve([]),
});
const useSuperwall = () => ({
  register: noop,
  identify: noopAsync,
  reset: noopAsync,
  getPaywall: noopAsync,
  dismiss: noopAsync,
});
const usePlacement = () => ({
  registerPlacement: noop,
  state: { status: 'idle' },
  dismiss: noopAsync,
  isPresented: false,
  isLoading: false,
  error: null,
});
const useSuperwallEvents = () => {};

module.exports = {
  // Providers
  SuperwallProvider: PassthroughProvider,
  SuperwallLoading: NullComponent,
  SuperwallLoaded: PassthroughProvider,
  CustomPurchaseControllerProvider: PassthroughProvider,
  // Hooks
  useUser,
  useSuperwall,
  usePlacement,
  useSuperwallEvents,
  // Superwall singleton
  Superwall: {
    configure: noopAsync,
    identify: noopAsync,
    reset: noopAsync,
    register: noop,
    dismiss: noopAsync,
    getPaywall: noopAsync,
    setDelegate: noop,
    isConfigured: false,
  },
  // Types/classes (stubs)
  SuperwallDelegate: class {},
  SuperwallEvent: {},
  SuperwallEventInfo: {},
  PaywallInfo: {},
  PaywallResult: {},
  SubscriptionStatus: {},
  RedemptionResult: {},
};
