// Mock for React Native - used in Jest tests
const actualReactNative = jest.requireActual('react-native');

module.exports = {
  ...actualReactNative,
  AppState: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    removeEventListener: jest.fn(),
    currentState: 'active',
  },
  Platform: {
    OS: 'ios',
    Version: 1,
    isTV: false,
    isPad: false,
    select: jest.fn(({ ios, android, web, default: defaultValue }) => {
      const currentOS = typeof module.exports.Platform.OS === 'string'
        ? module.exports.Platform.OS
        : 'ios';
      if (currentOS === 'ios') return ios;
      if (currentOS === 'android') return android;
      if (currentOS === 'web') return web;
      return defaultValue;
    }),
  },
  View: () => 'View',
  Text: () => 'Text',
  Image: () => 'Image',
  ScrollView: () => 'ScrollView',
  FlatList: () => 'FlatList',
  Pressable: () => 'Pressable',
  ActivityIndicator: () => 'ActivityIndicator',
  StyleSheet: {
    create: jest.fn(x => x),
    flatten: jest.fn(styles => {
      if (Array.isArray(styles)) {
        return styles.reduce((acc, style) => ({ ...acc, ...style }), {});
      }
      return styles || {};
    }),
    hairlineWidth: 1,
  },
  useWindowDimensions: jest.fn(() => ({
    width: 375,
    height: 667,
    fontScale: 1,
    scale: 1,
  })),
  useColorScheme: jest.fn(() => 'light'),
};
