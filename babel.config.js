module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Convert dynamic import() to require() so Jest can intercept with mocks
      '@babel/plugin-transform-dynamic-import',
      // NOTE: react-native-reanimated/plugin MUST be last
      'react-native-reanimated/plugin',
    ],
  };
};
