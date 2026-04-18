module.exports = {
  AppLoading: () => null,
  Asset: {
    loadAsync: jest.fn(),
  },
  SplashScreen: {
    hideAsync: jest.fn(),
    preventAutoHideAsync: jest.fn(),
  },
};
