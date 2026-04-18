module.exports = {
  testEnvironment: 'jsdom',
  testMatch: ['**/__tests__/e2e/**/*.test.[jt]s?(x)'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|expo-modules-core|expo-router|expo-blur|expo-constants|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|react-native-url-polyfill|react-native-reanimated|@nkzw|expo-file-system|expo-superwall)/)'
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testTimeout: 30000,
  globals: {
    __DEV__: true,
  },
  maxWorkers: 1,
};
