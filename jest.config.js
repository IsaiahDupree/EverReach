module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|expo-modules-core|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|react-native-url-polyfill|@nkzw)/)'
  ],
  moduleNameMapper: {
    '^@/lib/analytics$': '<rootDir>/__mocks__/analytics.js',
    '^@/(.*)$': '<rootDir>/$1',
    '^expo-constants$': '<rootDir>/__mocks__/expo-constants.js',
    '^expo-superwall$': '<rootDir>/__mocks__/expo-superwall.js',
    '^@react-native-async-storage/async-storage$': '<rootDir>/__mocks__/async-storage.js'
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  globals: {
    __DEV__: true,
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/backend-vercel/',
    '<rootDir>/fifth_pull/',
    '<rootDir>/web/'
  ],
  modulePathIgnorePatterns: [
    '<rootDir>/backend-vercel/',
    '<rootDir>/fifth_pull/',
    '<rootDir>/web/'
  ],
  roots: [
    '<rootDir>/app',
    '<rootDir>/components',
    '<rootDir>/hooks',
    '<rootDir>/providers',
    '<rootDir>/lib',
    '<rootDir>/__tests__',
    '<rootDir>/test'
  ]
};
