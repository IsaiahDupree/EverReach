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
