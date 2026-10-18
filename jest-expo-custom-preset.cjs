const base = require('jest-expo/jest-preset');

module.exports = {
  ...base,
  setupFiles: [
    '<rootDir>/jest/globals.js',
    ...(base.setupFiles || [])
  ],
};
