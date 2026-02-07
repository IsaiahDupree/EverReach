const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Exclude backend folder (Next.js project) from Metro bundler
config.resolver.blockList = [
  // Block the backend folder which contains Next.js files
  new RegExp(`${path.resolve(__dirname, 'backend').replace(/[/\\]/g, '[/\\\\]')}.*`),
  new RegExp(`${path.resolve(__dirname, 'backend-vercel').replace(/[/\\]/g, '[/\\\\]')}.*`),
  // Also exclude any .next folders
  /.*\.next\/.*/,
];

// Redirect native-only modules to web shims on web platform
const nativeOnlyShims = {
  'expo-superwall': path.resolve(__dirname, 'lib/shims/expo-superwall.web.js'),
  'react-native-purchases': path.resolve(__dirname, 'lib/shims/react-native-purchases.web.js'),
};

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && nativeOnlyShims[moduleName]) {
    return {
      filePath: nativeOnlyShims[moduleName],
      type: 'sourceFile',
    };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
