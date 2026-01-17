# AI Feature Bucketing - Test Suite

Comprehensive test suite for the AI-powered feature request clustering system.

## 🧪 Test Coverage

### Unit Tests (80+ tests)

#### `lib/embeddings.test.ts`
- **Cosine Similarity** - Vector similarity calculations
- **Centroid Calculation** - Mean vector computation
- **Vector Formatting** - PostgreSQL vector string conversion
- **Edge Cases** - Zero vectors, single vectors, negative numbers

#### `api/feature-requests.test.ts`
- **Create Requests** - Validation, authentication, character limits
- **List Requests** - Filtering, sorting, pagination
- **Vote/Unvote** - Authentication, duplicate prevention
- **Update/Delete** - Ownership checks, permissions

#### `api/feature-buckets.test.ts`
- **Leaderboard** - Sort by hot/top/new, status filtering
- **Bucket Details** - Request aggregation, activity logs
- **Status Updates** - Admin permissions, changelog creation
- **Statistics** - Progress %, momentum, vote counts

### Integration Tests

#### `integration/clustering.test.ts`
- **Embedding Generation** - OpenAI API integration
- **Similarity Clustering** - Group similar requests
- **AI Title Generation** - GPT-4o-mini bucket titles
- **AI Summary Generation** - Concise bucket descriptions
- **Centroid Updates** - Dynamic cluster evolution

### Database Tests

#### `database/functions.test.ts` (Requires live DB)
- **find_nearest_bucket** - pgvector similarity search
- **calculate_bucket_centroid** - Mean embedding calculation
- **refresh_bucket_momentum** - 7-day/30-day vote tracking
- **Materialized Views** - Pre-aggregated statistics
- **Triggers** - Auto-update vote counts, timestamps
- **RLS Policies** - Row-level security enforcement

---

## 🚀 Running Tests

### Prerequisites

```bash
cd backend-vercel

# Install dependencies
npm install
```

### Run All Tests

```bash
npm test
```

### Watch Mode (Development)

```bash
npm run test:watch
```

### Unit Tests Only (Fast)

```bash
npm run test:unit
```

### Integration Tests (Requires OpenAI Key)

```bash
# Set OpenAI API key
export OPENAI_API_KEY=sk-...

# Run integration tests
npm run test:integration
```

### Coverage Report

```bash
npm run test:coverage

# Opens HTML report in browser
```

### Database Tests (Requires Live Supabase)

```bash
# Set environment variables
export NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=your-service-key
export RUN_INTEGRATION_TESTS=true

# Run all tests including database
npm test
```

---

## 📊 Test Structure

```
backend-vercel/
├── __tests__/
│   ├── setup.ts                    # Test configuration
│   ├── lib/
│   │   └── embeddings.test.ts      # Vector math tests
│   ├── api/
│   │   ├── feature-requests.test.ts # API endpoint tests
│   │   └── feature-buckets.test.ts  # Bucket API tests
│   ├── integration/
│   │   └── clustering.test.ts       # AI clustering tests
│   └── database/
│       └── functions.test.ts        # SQL function tests
├── jest.config.js                  # Jest configuration
└── package.json                    # Test scripts
```

---

## 🎯 Test Philosophy

### Unit Tests
- **Fast** - No external dependencies
- **Isolated** - Mock all external services
- **Deterministic** - Same input = same output
- **Coverage** - Test edge cases and error paths

### Integration Tests
- **Real Services** - Uses actual OpenAI API (with mocks for CI)
- **End-to-End** - Tests full clustering workflow
- **Realistic** - Uses production-like data

### Database Tests
- **Live Database** - Requires Supabase instance
- **Migrations** - Assumes schema is up-to-date
- **Cleanup** - Each test should be independent

---

## 🔍 Key Test Scenarios

### Scenario 1: Similar Request Clustering
```typescript
// User submits: "Add dark mode"
// System generates embedding
// Finds similar bucket: "Theme Customization"
// Assigns request to existing bucket
// Updates centroid
```

**Tests:**
- ✅ Embedding generation
- ✅ Similarity calculation (cosine)
- ✅ Threshold comparison (0.78)
- ✅ Centroid update

### Scenario 2: New Bucket Creation
```typescript
// User submits: "Screenshot OCR"
// No similar buckets found
// AI generates title: "Screenshot OCR"
// AI generates summary: "Users want to extract text from images"
// Creates new bucket
// Assigns request
```

**Tests:**
- ✅ Similarity threshold not met
- ✅ Bucket creation
- ✅ AI title generation
- ✅ AI summary generation

### Scenario 3: Voting & Momentum
```typescript
// User votes for request in bucket
// Vote count increments
// Rolls up to bucket
// Momentum tracked (7-day, 30-day)
// Progress bar updates
```

**Tests:**
- ✅ Vote insertion
- ✅ Duplicate vote prevention
- ✅ Bucket rollup
- ✅ Momentum calculation
- ✅ Progress percentage

### Scenario 4: Status Change & Changelog
```typescript
// Admin marks bucket as "shipped"
// Activity logged
// Changelog entry created
// TODO: Voters notified
```

**Tests:**
- ✅ Status update
- ✅ Activity logging
- ✅ Changelog creation
- 🚧 Voter notifications (TODO)

---

## 📈 Coverage Goals

| Category | Target | Current |
|----------|--------|---------|
| Unit Tests | 90% | ✅ |
| Integration | 80% | ✅ |
| Database | 70% | 🚧 |
| Overall | 85% | ✅ |

---

## 🐛 Debugging Tests

### View Test Output
```bash
npm test -- --verbose
```

### Run Single Test File
```bash
npm test embeddings.test.ts
```

### Run Single Test
```bash
npm test -- -t "should calculate cosine similarity"
```

### Debug in VS Code
Add to `.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

---

## 🔧 Continuous Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
        working-directory: ./backend-vercel
      
      - name: Run unit tests
        run: npm run test:unit
        working-directory: ./backend-vercel
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

## 📝 Writing New Tests

### Template: Unit Test

```typescript
describe('MyFeature', () => {
  it('should do something', () => {
    // Arrange
    const input = 'test';
    
    // Act
    const result = myFunction(input);
    
    // Assert
    expect(result).toBe('expected');
  });
});
```

### Template: API Test

```typescript
import { createMocks } from 'node-mocks-http';

describe('My API', () => {
  it('should return data', async () => {
    const { req } = createMocks({
      method: 'GET',
      url: '/api/endpoint',
    });

    const response = await GET(req as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });
});
```

### Template: Integration Test

```typescript
describe('Integration', () => {
  it('should complete workflow', async () => {
    // Create test data
    const input = await generateTestData();
    
    // Run workflow
    const result = await runWorkflow(input);
    
    // Verify outcome
    expect(result.success).toBe(true);
  });
});
```

---

## 🎓 Best Practices

1. **Test Behavior, Not Implementation**
   - Focus on what the code does, not how
   - Makes refactoring easier

2. **Use Descriptive Names**
   ```typescript
   // ❌ Bad
   it('test1', () => {});
   
   // ✅ Good
   it('should assign request to existing bucket when similarity > 0.78', () => {});
   ```

3. **Arrange, Act, Assert (AAA)**
   ```typescript
   it('should vote', async () => {
     // Arrange
     const request = await createRequest();
     
     // Act
     await vote(request.id);
     
     // Assert
     expect(request.votes).toBe(1);
   });
   ```

4. **Test Edge Cases**
   - Empty inputs
   - Null values
   - Large numbers
   - Negative numbers
   - Special characters

5. **Mock External Services**
   - Don't hit real APIs in unit tests
   - Use Jest mocks
   - Keep tests fast and reliable

---

## 📚 Resources

- **Jest Docs**: https://jestjs.io/docs/getting-started
- **Testing Library**: https://testing-library.com/
- **Node Mocks HTTP**: https://github.com/howardabrams/node-mocks-http

---

## ✅ Checklist Before Deploy

- [ ] All tests passing
- [ ] Coverage > 85%
- [ ] No console errors
- [ ] Linting passes
- [ ] Integration tests run
- [ ] Database tests run (local)
- [ ] Performance tests acceptable

---

**Happy Testing! 🧪**
