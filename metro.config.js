const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Static/CI exports need a complete filesystem crawl. Watchman can return a
// partial fresh-instance snapshot after an interrupted FSEvents crawl, which
// makes newly added modules appear absent even though they exist on disk.
if (process.env.CI || process.env.VERCEL) {
  config.resolver.useWatchman = false;
}

// Exclude backend folder (Next.js project) from Metro bundler
config.resolver.blockList = [
  // Block the backend folder which contains Next.js files
  new RegExp(`${path.resolve(__dirname, 'backend').replace(/[/\\]/g, '[/\\\\]')}.*`),
  new RegExp(`${path.resolve(__dirname, 'backend-vercel').replace(/[/\\]/g, '[/\\\\]')}.*`),
  // Also exclude any .next folders
  /.*\.next\/.*/,
];

// On web, redirect native-only modules to stubs
const nativeOnlyModules = ['expo-superwall', 'react-native-purchases'];
const webStubPath = path.resolve(__dirname, 'lib', 'native-stubs.web.js');

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && nativeOnlyModules.includes(moduleName)) {
    return {
      filePath: webStubPath,
      type: 'sourceFile',
    };
  }
  // Fall back to default resolution
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
