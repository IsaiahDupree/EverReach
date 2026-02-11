/**
 * Mock for expo-superwall
 * Used during Jest unit testing
 */

export const useUser = jest.fn(() => ({
  user: { appUserId: 'test-user-123' },
  userId: 'test-user-123',
  isAnonymous: false,
  subscriptionStatus: null,
  identify: jest.fn(),
  setSubscriptionStatus: jest.fn().mockResolvedValue(undefined),
  update: jest.fn().mockResolvedValue(undefined),
}));

export const usePlacement = jest.fn(() => ({
  registerPlacement: jest.fn().mockResolvedValue(undefined),
  state: { status: 'idle' },
}));

export const useSuperwallEvents = jest.fn();

export const Superwall = {
  configure: jest.fn(),
  identify: jest.fn(),
  setUserAttributes: jest.fn(),
  register: jest.fn(),
  dismiss: jest.fn(),
  getPresentationResult: jest.fn(),
};

export default Superwall;
