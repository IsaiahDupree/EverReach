// Mock for lib/analytics

const analytics = {
  track: jest.fn(),
  identify: jest.fn(),
  page: jest.fn(),
  screen: jest.fn(),
  group: jest.fn(),
  alias: jest.fn(),
  reset: jest.fn(),
};

// Export as default to match the import style
module.exports = analytics;
module.exports.default = analytics;
