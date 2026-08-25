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

// Mock native modules on web platform
// These modules don't have web implementations and will crash the app
const nativeMocksDir = path.resolve(__dirname, 'lib/native-mocks');

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Only apply mocks for web platform
  if (platform === 'web') {
    // Mock expo-superwall
    if (moduleName === 'expo-superwall') {
      return {
        filePath: path.resolve(nativeMocksDir, 'expo-superwall.js'),
        type: 'sourceFile',
      };
    }
    
    // Mock react-native-purchases
    if (moduleName === 'react-native-purchases') {
      return {
        filePath: path.resolve(nativeMocksDir, 'react-native-purchases.js'),
        type: 'sourceFile',
      };
    }
  }
  
  // Default resolution
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
