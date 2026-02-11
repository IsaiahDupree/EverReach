// Mock for expo-router in test environment
const React = require('react');

const useRouter = jest.fn(() => ({
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  canGoBack: jest.fn(() => true),
  setParams: jest.fn(),
}));

const useLocalSearchParams = jest.fn(() => ({}));
const useGlobalSearchParams = jest.fn(() => ({}));
const useSegments = jest.fn(() => []);
const usePathname = jest.fn(() => '/');
const useFocusEffect = jest.fn();
const useNavigation = jest.fn(() => ({
  navigate: jest.fn(),
  goBack: jest.fn(),
  setOptions: jest.fn(),
}));

const Link = jest.fn(({ children }) => children);
const Redirect = jest.fn(() => null);

const Stack = jest.fn(({ children }) => children);
Stack.Screen = jest.fn(() => null);

const Tabs = jest.fn(({ children }) => children);
Tabs.Screen = jest.fn(() => null);

const Slot = jest.fn(() => null);

module.exports = {
  useRouter,
  useLocalSearchParams,
  useGlobalSearchParams,
  useSegments,
  usePathname,
  useFocusEffect,
  useNavigation,
  Link,
  Redirect,
  Stack,
  Tabs,
  Slot,
};
