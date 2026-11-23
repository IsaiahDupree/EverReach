/** Web capability guard for native-only Superwall integrations. */
const unsupported = () => {
  throw new Error('Superwall paywalls are available only on native iOS and Android.');
};
const unsupportedAsync = async () => unsupported();
const PassthroughProvider = ({ children }) => children;
const NullComponent = () => null;
const useUser = () => ({
  isLoggedIn: false,
  userId: null,
  account: null,
  user: null,
  subscriptionStatus: 'UNKNOWN',
  identify: unsupportedAsync,
  update: unsupportedAsync,
  signOut: unsupportedAsync,
  setSubscriptionStatus: unsupported,
  getEntitlements: unsupportedAsync,
});
const useSuperwall = () => ({
  register: unsupported,
  identify: unsupportedAsync,
  reset: unsupportedAsync,
  getPaywall: unsupportedAsync,
  dismiss: unsupportedAsync,
});
const usePlacement = () => ({
  registerPlacement: unsupported,
  state: { status: 'unavailable' },
  dismiss: unsupportedAsync,
  isPresented: false,
  isLoading: false,
  error: new Error('Superwall paywalls are unavailable on web.'),
});
const useSuperwallEvents = () => unsupported();
module.exports = {
  SuperwallProvider: PassthroughProvider,
  SuperwallLoading: NullComponent,
  SuperwallLoaded: PassthroughProvider,
  CustomPurchaseControllerProvider: PassthroughProvider,
  useUser,
  useSuperwall,
  usePlacement,
  useSuperwallEvents,
  Superwall: {
    configure: unsupportedAsync,
    identify: unsupportedAsync,
    reset: unsupportedAsync,
    register: unsupported,
    dismiss: unsupportedAsync,
    getPaywall: unsupportedAsync,
    setDelegate: unsupported,
    isConfigured: false,
  },
  SuperwallDelegate: class {},
  SuperwallEvent: {},
  SuperwallEventInfo: {},
  PaywallInfo: {},
  PaywallResult: {},
  SubscriptionStatus: {},
  RedemptionResult: {},
};
