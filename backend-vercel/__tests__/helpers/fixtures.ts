/**
 * Test Fixtures & Factory Functions
 * Reusable test data generators
 */

export const createTestRequest = (overrides = {}) => ({
  id: `test-req-${Math.random().toString(36).substr(2, 9)}`,
  type: 'feature',
  title: 'Test Feature Request',
  description: 'This is a test feature request',
  status: 'pending',
  votes_count: 0,
  user_id: 'test-user-id',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

export const createTestBucket = (overrides = {}) => ({
  id: `test-bucket-${Math.random().toString(36).substr(2, 9)}`,
  title: 'Test Bucket',
  summary: 'This is a test bucket',
  description: null,
  status: 'backlog',
  priority: 'low',
  goal_votes: 100,
  momentum_7d: 0,
  momentum_30d: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

export const createTestVote = (overrides = {}) => ({
  id: `test-vote-${Math.random().toString(36).substr(2, 9)}`,
  feature_id: 'test-feature-id',
  user_id: 'test-user-id',
  created_at: new Date().toISOString(),
  ...overrides,
});

export const createTestEmbedding = (dimensions = 1536) => {
  return Array(dimensions)
    .fill(0)
    .map((_, i) => Math.sin(i / 100));
};

export const createTestUser = (overrides = {}) => ({
  id: `test-user-${Math.random().toString(36).substr(2, 9)}`,
  email: 'test@example.com',
  created_at: new Date().toISOString(),
  ...overrides,
});

export const createTestActivity = (overrides = {}) => ({
  id: `test-activity-${Math.random().toString(36).substr(2, 9)}`,
  bucket_id: 'test-bucket-id',
  action: 'status_change',
  details: { from: 'backlog', to: 'planned' },
  user_id: 'test-user-id',
  created_at: new Date().toISOString(),
  ...overrides,
});

export const createMockSupabaseClient = () => ({
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(() => ({ data: null, error: null })),
        order: jest.fn(() => ({
          limit: jest.fn(() => ({ data: [], error: null })),
        })),
      })),
      order: jest.fn(() => ({
        limit: jest.fn(() => ({ data: [], error: null })),
      })),
      limit: jest.fn(() => ({ data: [], error: null })),
    })),
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn(() => ({ data: null, error: null })),
      })),
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => ({ data: null, error: null })),
        })),
      })),
    })),
    delete: jest.fn(() => ({
      eq: jest.fn(() => ({ error: null })),
    })),
  })),
  rpc: jest.fn(() => Promise.resolve({ data: null, error: null })),
});

// Sample feature request data
export const sampleRequests = {
  darkMode: {
    title: 'Add dark mode',
    description: 'I want a dark theme option for the app',
    type: 'feature',
  },
  nightTheme: {
    title: 'Night theme option',
    description: 'Black background for night time use',
    type: 'feature',
  },
  screenshotOCR: {
    title: 'Scan receipts',
    description: 'Extract text from images using OCR',
    type: 'feature',
  },
  calendarSync: {
    title: 'Google Calendar sync',
    description: 'Sync contacts with calendar events',
    type: 'feature',
  },
  bugReport: {
    title: 'App crashes on startup',
    description: 'The app crashes when I open it',
    type: 'bug',
  },
  feedback: {
    title: 'Great app!',
    description: 'Love the features',
    type: 'feedback',
  },
};

// Expected bucket clusters
export const expectedClusters = {
  themeCustomization: {
    title: 'Theme Customization',
    summary: 'Users want dark mode and theme options',
    requests: ['darkMode', 'nightTheme'],
  },
  screenshotOCR: {
    title: 'Screenshot OCR',
    summary: 'Users want to extract text from images',
    requests: ['screenshotOCR'],
  },
  calendarIntegration: {
    title: 'Calendar Integration',
    summary: 'Users want calendar sync features',
    requests: ['calendarSync'],
  },
};

// Test embeddings (pre-generated for consistency)
export const testEmbeddings = {
  darkMode: createTestEmbedding(),
  nightTheme: createTestEmbedding(),
  screenshotOCR: createTestEmbedding(),
  calendarSync: createTestEmbedding(),
};
