module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  collectCoverageFrom: [
    '**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/__tests__/**',
  ],
  // Transform node_modules that use ESM
  transformIgnorePatterns: [
    'node_modules/(?!(expo-secure-store|@react-native-async-storage|@supabase|react-native|@react-native|@testing-library|expo|expo-router|react-native-purchases)/)',
  ],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react',
      },
    }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@components/(.*)$': '<rootDir>/components/$1',
    '^@hooks/(.*)$': '<rootDir>/hooks/$1',
    '^@lib/(.*)$': '<rootDir>/lib/$1',
    '^@types/(.*)$': '<rootDir>/types/$1',
    '^@providers/(.*)$': '<rootDir>/providers/$1',
    '^@constants/(.*)$': '<rootDir>/constants/$1',
    '^lucide-react-native$': '<rootDir>/__mocks__/lucide-react-native.js',
    '^react-native$': '<rootDir>/__mocks__/react-native.js',
    '^expo-router$': '<rootDir>/__mocks__/expo-router.js',
  },
};
