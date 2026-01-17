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

module.exports = config;
