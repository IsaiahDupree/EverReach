# 🧪 Test Architecture Guide

**Purpose:** Ensure all tests follow the same architecture, have required resources, and use consistent configuration.

## 📋 Table of Contents
1. [Test Structure](#test-structure)
2. [Required Resources](#required-resources)
3. [Configuration](#configuration)
4. [Test Patterns](#test-patterns)
5. [Best Practices](#best-practices)

## 🏗️ Test Structure

### File Organization
```
__tests__/
├── setup-env.ts          # Load environment variables FIRST
├── setup.ts              # Global test setup (mocks, matchers)
├── api/                  # API endpoint tests
│   ├── public-api-auth.test.ts
│   ├── public-api-rate-limit.test.ts
│   ├── public-api-webhooks.test.ts
│   └── public-api-context-bundle.test.ts
├── e2e/                  # End-to-end tests
│   └── public-api-context-bundle.e2e.test.ts
└── helpers/              # Test utilities
    └── e2e-client.ts
```

### Standard Test File Template
```typescript
/**
 * [Feature Name] Tests
 * 
 * Tests [description of what's being tested]
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';

// ============================================================================
// SETUP
// ============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Test data - declare at top level
let testOrgId: string;
let testUserId: string;
let testResourceId: string;

beforeAll(async () => {
  // 1. Create test org
  const { data: org } = await supabase.from('orgs').insert({
    name: 'Test Org - [Feature Name]',
  }).select().single();
  testOrgId = org!.id;

  // 2. Create test user
  const { data: { user } } = await supabase.auth.admin.createUser({
    email: `test-${Date.now()}@example.com`,
    password: 'testpass123',
    email_confirm: true,
  });
  testUserId = user!.id;

  // 3. Create test resources
  // ... create any resources needed for tests
});

afterAll(async () => {
  // Cleanup in reverse order
  await supabase.from('orgs').delete().eq('id', testOrgId);
  await supabase.auth.admin.deleteUser(testUserId);
});

// ============================================================================
// TESTS
// ============================================================================

describe('[Feature Name]', () => {
  test('should [expected behavior]', async () => {
    // Arrange
    const input = { /* test data */ };
    
    // Act
    const result = await functionUnderTest(input);
    
    // Assert
    expect(result).toBeDefined();
    expect(result.property).toBe(expectedValue);
  });
});
```

## 🔧 Required Resources

### 1. Environment Variables

**Required in `.env`:**
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://utasetfxiqcrnwyfforx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_JWT_SECRET=your-jwt-secret

# OpenAI
OPENAI_API_KEY=sk-...

# Test Configuration
TEST_EMAIL=isaiahdupree33@gmail.com
TEST_PASSWORD=frogger12
TEST_BASE_URL=https://ever-reach-be.vercel.app
NEXT_PUBLIC_API_URL=https://ever-reach-be.vercel.app/api

# Optional
TEST_SKIP_E2E=false  # Set to true to skip E2E tests
OPENAI_STUB=false    # Set to true to stub OpenAI calls
```

### 2. Database Tables

**Required tables for tests:**
```sql
-- Core tables
orgs
contacts
interactions
pipelines
goals
templates
messages

-- Public API tables
api_keys
api_rate_limits
api_audit_logs
webhooks
webhook_deliveries

-- Custom fields
custom_field_defs

-- Agent tables
agent_conversations
persona_notes
```

### 3. Test Data Setup

**Standard test data pattern:**
```typescript
beforeAll(async () => {
  // 1. Organization
  const { data: org } = await supabase.from('orgs').insert({
    name: `Test Org - ${Date.now()}`,
  }).select().single();
  
  if (!org) throw new Error('Failed to create test org');
  testOrgId = org.id;

  // 2. User
  const { data: { user } } = await supabase.auth.admin.createUser({
    email: `test-${Date.now()}@example.com`,
    password: 'testpass123',
    email_confirm: true,
  });
  
  if (!user) throw new Error('Failed to create test user');
  testUserId = user.id;

  // 3. Contact (if needed)
  const { data: contact } = await supabase.from('contacts').insert({
    org_id: testOrgId,
    user_id: testUserId,
    display_name: 'Test Contact',
    emails: ['test@example.com'],
  }).select().single();
  
  if (!contact) throw new Error('Failed to create test contact');
  testContactId = contact.id;
});
```

## ⚙️ Configuration

### Jest Configuration (`jest.config.js`)
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  setupFiles: ['<rootDir>/__tests__/setup-env.ts'],
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
  testTimeout: 30000, // 30 seconds
};
```

### Setup Files

**`__tests__/setup-env.ts`** (loads FIRST):
```typescript
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Verify required env vars
const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'TEST_EMAIL',
  'TEST_PASSWORD',
];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}`);
  }
}
```

**`__tests__/setup.ts`** (loads AFTER):
```typescript
// Set test environment
Object.defineProperty(process.env, 'NODE_ENV', { 
  value: 'test', 
  writable: true 
});

// Mock console to reduce noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
};

// Custom matchers
expect.extend({
  toBeValidUUID(received: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return {
      pass: uuidRegex.test(received),
      message: () => `expected ${received} to be a valid UUID`,
    };
  },
});
```

## 🎯 Test Patterns

### Pattern 1: Unit Tests (lib functions)
```typescript
import { functionToTest } from '@/lib/module';

describe('functionToTest', () => {
  test('should handle valid input', () => {
    const result = functionToTest('valid-input');
    expect(result).toBe('expected-output');
  });

  test('should throw on invalid input', () => {
    expect(() => functionToTest('invalid')).toThrow('Error message');
  });
});
```

### Pattern 2: API Endpoint Tests (with auth)
```typescript
import { generateApiKey, hashApiKey } from '@/lib/api/auth';

describe('API Endpoint', () => {
  let testApiKey: string;
  let testApiKeyId: string;

  beforeAll(async () => {
    // Create API key
    testApiKey = generateApiKey('test');
    const keyHash = hashApiKey(testApiKey);
    
    const { data: apiKey } = await supabase.from('api_keys').insert({
      org_id: testOrgId,
      key_prefix: testApiKey.substring(0, 12),
      key_hash: keyHash,
      name: 'Test Key',
      environment: 'test',
      scopes: ['contacts:read'],
      user_id: testUserId,
    }).select().single();
    
    testApiKeyId = apiKey!.id;
  });

  test('should require authentication', async () => {
    const response = await fetch(`${apiUrl}/endpoint`);
    expect(response.status).toBe(401);
  });

  test('should work with valid auth', async () => {
    const response = await fetch(`${apiUrl}/endpoint`, {
      headers: {
        'Authorization': `Bearer ${testApiKey}`,
      },
    });
    expect(response.status).toBe(200);
  });
});
```

### Pattern 3: E2E Tests (full flow)
```typescript
describe('E2E: Feature Flow', () => {
  test('should complete full workflow', async () => {
    // 1. Create resource
    const createResponse = await fetch(`${apiUrl}/resource`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Test' }),
    });
    expect(createResponse.status).toBe(201);
    const { id } = await createResponse.json();

    // 2. Fetch resource
    const getResponse = await fetch(`${apiUrl}/resource/${id}`, {
      headers: { 'Authorization': `Bearer ${testApiKey}` },
    });
    expect(getResponse.status).toBe(200);

    // 3. Update resource
    const updateResponse = await fetch(`${apiUrl}/resource/${id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${testApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Updated' }),
    });
    expect(updateResponse.status).toBe(200);

    // 4. Delete resource
    const deleteResponse = await fetch(`${apiUrl}/resource/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${testApiKey}` },
    });
    expect(deleteResponse.status).toBe(204);
  });
});
```

### Pattern 4: Database Tests
```typescript
describe('Database Operations', () => {
  test('should enforce RLS policies', async () => {
    // Try to access resource from different org
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', testContactId)
      .eq('org_id', 'different-org-id')
      .single();

    expect(data).toBeNull();
    expect(error).toBeDefined();
  });

  test('should cascade deletes', async () => {
    // Delete parent
    await supabase.from('contacts').delete().eq('id', testContactId);

    // Check child records deleted
    const { data: interactions } = await supabase
      .from('interactions')
      .select('*')
      .eq('contact_id', testContactId);

    expect(interactions).toHaveLength(0);
  });
});
```

## ✅ Best Practices

### 1. Test Isolation
```typescript
// ✅ GOOD: Each test is independent
test('test 1', async () => {
  const data = await createTestData();
  // ... test logic
  await cleanup(data);
});

test('test 2', async () => {
  const data = await createTestData();
  // ... test logic
  await cleanup(data);
});

// ❌ BAD: Tests depend on each other
let sharedData;
test('test 1', async () => {
  sharedData = await createTestData();
});

test('test 2', async () => {
  // Uses sharedData from test 1
});
```

### 2. Cleanup
```typescript
// ✅ GOOD: Cleanup in afterAll
afterAll(async () => {
  // Cleanup in reverse order of creation
  await supabase.from('interactions').delete().eq('contact_id', testContactId);
  await supabase.from('contacts').delete().eq('id', testContactId);
  await supabase.from('orgs').delete().eq('id', testOrgId);
  await supabase.auth.admin.deleteUser(testUserId);
});

// ❌ BAD: No cleanup (pollutes database)
afterAll(async () => {
  // Nothing
});
```

### 3. Error Handling
```typescript
// ✅ GOOD: Check for errors
const { data, error } = await supabase.from('contacts').insert({...});
if (error || !data) {
  throw new Error(`Failed to create contact: ${error?.message}`);
}

// ❌ BAD: Assume success
const { data } = await supabase.from('contacts').insert({...});
testContactId = data!.id; // May be null!
```

### 4. Descriptive Tests
```typescript
// ✅ GOOD: Clear what's being tested
test('should return 401 when API key is missing', async () => {
  const response = await fetch(url);
  expect(response.status).toBe(401);
});

// ❌ BAD: Unclear intent
test('test auth', async () => {
  const response = await fetch(url);
  expect(response.status).toBe(401);
});
```

### 5. Arrange-Act-Assert Pattern
```typescript
test('should calculate warmth score', () => {
  // Arrange
  const interactions = [
    { occurred_at: '2024-01-01', sentiment: 'positive' },
    { occurred_at: '2024-01-15', sentiment: 'positive' },
  ];

  // Act
  const warmth = calculateWarmth(interactions);

  // Assert
  expect(warmth).toBeGreaterThan(50);
  expect(warmth).toBeLessThanOrEqual(100);
});
```

## 📊 Test Coverage Goals

| Category | Target | Current |
|----------|--------|---------|
| **Authentication** | 95% | 100% ✅ |
| **Rate Limiting** | 90% | 71% 🟡 |
| **Webhooks** | 90% | 91% ✅ |
| **Context Bundle** | 95% | 0% ❌ |
| **Overall** | 90% | 46% 🟡 |

## 🚀 Running Tests

```bash
# All tests
npm run test

# Specific suite
npm run test:public-api-auth
npm run test:public-api-rate-limit
npm run test:public-api-webhooks
npm run test:public-api-context

# Watch mode
npm run test -- --watch

# Coverage
npm run test -- --coverage

# Specific file
npm run test -- __tests__/api/public-api-auth.test.ts
```

## 🔍 Debugging Tests

### Enable Verbose Logging
```typescript
// In test file
beforeAll(() => {
  global.console = console; // Restore console
});
```

### Check Environment
```typescript
test('debug environment', () => {
  console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('API_URL:', process.env.NEXT_PUBLIC_API_URL);
  console.log('TEST_EMAIL:', process.env.TEST_EMAIL);
});
```

### Increase Timeout
```typescript
test('slow operation', async () => {
  // ... slow test
}, 60000); // 60 seconds
```

## 📝 Checklist for New Tests

- [ ] Follows standard file structure
- [ ] Has proper imports
- [ ] Declares test data at top level
- [ ] Has `beforeAll` setup
- [ ] Has `afterAll` cleanup
- [ ] Uses descriptive test names
- [ ] Follows Arrange-Act-Assert pattern
- [ ] Handles errors properly
- [ ] Tests are isolated
- [ ] Cleans up test data
- [ ] Has proper assertions
- [ ] Runs successfully locally
- [ ] Passes in CI/CD

---

**Status:** ✅ Ready to use  
**Last Updated:** 2025-10-10  
**Maintainer:** Backend Team
