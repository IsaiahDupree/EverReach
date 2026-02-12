module.exports = function(api) {
  api.cache(true);

  const plugins = [
    // NOTE: react-native-reanimated/plugin MUST be last
    'react-native-reanimated/plugin',
  ];

  return {
    presets: ['babel-preset-expo'],
    plugins,
    env: {
      test: {
        plugins: [
          // Convert dynamic import() to require() so Jest can intercept with mocks
          '@babel/plugin-transform-dynamic-import',
        ],
      },
    },
  };
};
