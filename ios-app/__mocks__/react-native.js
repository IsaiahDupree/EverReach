const React = require('react');

module.exports = {
  ActivityIndicator: React.forwardRef((props, ref) => React.createElement('div', { ref, ...props })),
  Alert: {
    alert: jest.fn(),
  },
  Animated: {
    Value: jest.fn(v => ({
      setValue: jest.fn(),
      getValue: jest.fn(() => v),
      addListener: jest.fn(() => ({ remove: jest.fn() })),
    })),
    createAnimatedComponent: (C) => C,
    timing: jest.fn((...args) => ({
      start: jest.fn((...args) => args[0] && args[0]()),
    })),
  },
  Button: React.forwardRef((props, ref) => React.createElement('button', { ref, ...props })),
  Dimensions: {
    get: jest.fn((dimension) => ({
      width: 375,
      height: 812,
      scale: 2,
      fontScale: 1,
    })),
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
  Image: React.forwardRef((props, ref) => React.createElement('img', { ref, ...props })),
  Platform: {
    OS: 'ios',
    Version: 14,
    select: jest.fn(({ ios, android, native, default: def }) => ios || def),
  },
  PixelRatio: {
    get: jest.fn(() => 2),
    getFontScale: jest.fn(() => 1),
    getPixelSizeForLayoutSize: jest.fn((x) => x),
    roundToNearestPixel: jest.fn((x) => x),
  },
  ScrollView: React.forwardRef((props, ref) => React.createElement('div', { ref, ...props })),
  StyleSheet: {
    create: jest.fn((styles) => styles),
    flatten: jest.fn((style) => style),
    hairlineWidth: 1,
  },
  Text: React.forwardRef((props, ref) => React.createElement('span', { ref, ...props })),
  TextInput: React.forwardRef((props, ref) => React.createElement('input', { ref, type: 'text', ...props })),
  TouchableOpacity: React.forwardRef((props, ref) => React.createElement('div', { ref, ...props })),
  View: React.forwardRef((props, ref) => React.createElement('div', { ref, ...props })),
  useWindowDimensions: jest.fn(() => ({
    width: 375,
    height: 812,
    scale: 2,
    fontScale: 1,
  })),
  useColorScheme: jest.fn(() => 'light'),
};

module.exports.AppState = {
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  removeEventListener: jest.fn(),
  currentState: 'active',
};
