/**
 * Mock for expo-superwall
 * Used during Jest unit testing
 */

export const useUser = jest.fn(() => ({
  userId: 'test-user-123',
  isAnonymous: false,
}));

export const Superwall = {
  configure: jest.fn(),
  identify: jest.fn(),
  setUserAttributes: jest.fn(),
  register: jest.fn(),
  dismiss: jest.fn(),
  getPresentationResult: jest.fn(),
};

export default Superwall;
