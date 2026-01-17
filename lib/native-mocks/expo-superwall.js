/**
 * Web mock for expo-superwall
 * This provides no-op implementations for web builds
 */

// No-op Provider components
export const SuperwallProvider = ({ children }) => children;
export const SuperwallLoading = () => null;
export const SuperwallLoaded = ({ children }) => children;
export const CustomPurchaseControllerProvider = ({ children }) => children;

// No-op hooks
export const useUser = () => ({
  setSubscriptionStatus: () => {},
  update: async () => {},
});

export const usePlacement = () => ({
  registerPlacement: () => {},
  state: { status: 'idle' },
});

export const useSuperwall = () => ({
  isConfigured: false,
  isPresentingPaywall: false,
});

// Default export
export default {
  SuperwallProvider,
  SuperwallLoading,
  SuperwallLoaded,
  CustomPurchaseControllerProvider,
  useUser,
  usePlacement,
  useSuperwall,
};

