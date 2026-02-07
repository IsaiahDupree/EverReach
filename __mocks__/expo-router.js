/**
 * Mock for expo-router
 * Used in Jest tests to avoid importing actual expo-router modules
 */

module.exports = {
  Link: 'Link',
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(),
    setParams: jest.fn(),
  })),
  usePathname: jest.fn(() => '/'),
  useSegments: jest.fn(() => []),
};
