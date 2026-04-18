module.exports = {
  testEnvironment: 'jsdom',
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|expo-modules-core|expo-router|expo-blur|expo-constants|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|react-native-url-polyfill|react-native-reanimated|@nkzw|expo-file-system|expo-superwall)/)'
  ],
  moduleNameMapper: {
    '^@/lib/analytics$': '<rootDir>/__mocks__/analytics.js',
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/hooks/(.*)$': '<rootDir>/hooks/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/providers/(.*)$': '<rootDir>/providers/$1',
    '^@/app/(.*)$': '<rootDir>/app/$1',
    '^@/(.*)$': '<rootDir>/$1',
    '^react-native$': '<rootDir>/__mocks__/react-native.js',
    '^react-native-purchases$': '<rootDir>/__mocks__/react-native-purchases.js',
    '^expo$': '<rootDir>/__mocks__/expo.js',
    '^expo-router$': '<rootDir>/__mocks__/expo-router.js',
    '^expo-constants$': '<rootDir>/__mocks__/expo-constants.js',
    '^expo-superwall$': '<rootDir>/__mocks__/expo-superwall.js',
    '^expo/src/winter/runtime.native$': '<rootDir>/__mocks__/expo.js',
    '^@react-native-async-storage/async-storage$': '<rootDir>/__mocks__/async-storage.js',
    '^react-native-url-polyfill/auto$': '<rootDir>/__mocks__/react-native-url-polyfill.js',
    '^react-native-url-polyfill$': '<rootDir>/__mocks__/react-native-url-polyfill.js'
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  globals: {
    __DEV__: true,
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/backend-vercel/',
    '<rootDir>/fifth_pull/',
    '<rootDir>/web/',
    '<rootDir>/test/backend',
    '<rootDir>/test/lifecycle'
  ],
  modulePathIgnorePatterns: [
    '<rootDir>/backend-vercel/',
    '<rootDir>/fifth_pull/',
    '<rootDir>/web/',
    '<rootDir>/test/backend',
    '<rootDir>/test/lifecycle'
  ],
  roots: [
    '<rootDir>/app',
    '<rootDir>/components',
    '<rootDir>/hooks',
    '<rootDir>/providers',
    '<rootDir>/lib',
    '<rootDir>/__tests__'
  ]
};
