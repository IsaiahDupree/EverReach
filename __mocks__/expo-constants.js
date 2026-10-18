// Mock for expo-constants

const Constants = {
  expoConfig: {
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_BACKEND_URL || 'https://ever-reach-be.vercel.app',
    },
  },
  manifest: {},
  platform: {
    ios: null,
    android: null,
  },
};

module.exports = Constants;
