// Mock for expo-file-system/legacy
// Prevents native module errors in test environment

module.exports = {
  documentDirectory: '/mock/documents/',
  cacheDirectory: '/mock/cache/',
  readAsStringAsync: jest.fn().mockResolvedValue(''),
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
  getInfoAsync: jest.fn().mockResolvedValue({ exists: false, isDirectory: false, size: 0 }),
  makeDirectoryAsync: jest.fn().mockResolvedValue(undefined),
  moveAsync: jest.fn().mockResolvedValue(undefined),
  copyAsync: jest.fn().mockResolvedValue(undefined),
  downloadAsync: jest.fn().mockResolvedValue({ uri: '', status: 200 }),
  createUploadTask: jest.fn(() => ({
    uploadAsync: jest.fn().mockResolvedValue({ status: 200, body: '{}' }),
    cancelAsync: jest.fn(),
  })),
  createDownloadResumable: jest.fn(() => ({
    downloadAsync: jest.fn().mockResolvedValue({ uri: '' }),
    pauseAsync: jest.fn(),
    resumeAsync: jest.fn(),
    cancelAsync: jest.fn(),
  })),
  EncodingType: {
    UTF8: 'utf8',
    Base64: 'base64',
  },
  FileSystemUploadType: {
    BINARY_CONTENT: 0,
    MULTIPART: 1,
  },
};
