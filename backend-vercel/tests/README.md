# EverReach Backend Tests

Comprehensive test suite for the EverReach backend with unified reporting.

## 📊 Test Statistics

- **Total Tests:** 300+ tests
- **Test Categories:** 8 categories
- **Coverage Target:** 85%+ overall
- **Estimated Runtime:** ~3-5 minutes

## 🧪 Test Categories

### 1. **API Tests** (`__tests__/api/`)
- Public API authentication & authorization (40 tests)
- Rate limiting (28 tests)
- Context bundles (32 tests)
- Webhooks (28 tests)
- Custom fields (32 tests)
- Ad pixels (24 tests)
- Message generation & scenarios (25+ tests)
- Warmth score computation (20+ tests)

### 2. **Database Tests** (`__tests__/database/`)
- SQL functions and stored procedures
- Triggers and constraints
- RLS policies

### 3. **Integration Tests** (`__tests__/integration/`)
- End-to-end workflows
- Contact lifecycle
- AI agent system
- Clustering and embeddings

### 4. **Library Tests** (`__tests__/lib/`)
- Utility functions
- Embeddings
- Helper modules

## 🚀 Quick Start

### Run All Tests
```bash
npm run test:unified
```

This outputs:
- ✅ Detailed console output with pass/fail
- 📊 Test summary with statistics
- 📄 XML report at `tests/reports/test-report.xml`

### Run with Coverage
```bash
npm run test:unified:coverage
```

### Run in Watch Mode
```bash
npm run test:unified:watch
```

## 📁 Directory Structure

```
backend-vercel/
├── __tests__/                    # All test files (current location)
│   ├── api/                      # API endpoint tests
│   │   ├── public-api-auth.test.ts
│   │   ├── public-api-rate-limit.test.ts
│   │   ├── public-api-context-bundle.test.ts
│   │   ├── public-api-webhooks.test.ts
│   │   ├── custom-fields.test.ts
│   │   ├── ad-pixels.test.ts
│   │   ├── warmth-score.test.ts
│   │   ├── message-send.test.ts
│   │   └── ...
│   ├── database/                 # Database tests
│   ├── integration/              # Integration tests
│   ├── lib/                      # Library tests
│   ├── setup/                    # Test setup utilities
│   └── setup.ts                  # Global test setup
├── tests/                        # Test reports & documentation
│   ├── reports/                  # Generated reports
│   │   ├── test-report.html     # HTML test report
│   │   ├── junit.xml            # JUnit XML report
│   │   └── coverage/            # Coverage reports
│   └── README.md                 # This file
└── jest.config.unified.js        # Unified test configuration
```

## 🎯 Test Commands

### Main Commands
| Command | Description |
|---------|-------------|
| `npm run test:unified` | Run all tests with HTML report |
| `npm run test:unified:coverage` | Run with coverage report |
| `npm run test:unified:watch` | Watch mode for development |

### Category-Specific Commands (Legacy)
| Command | Description |
|---------|-------------|
| `npm run test:public-api` | Public API tests (128 tests) |
| `npm run test:custom-fields` | Custom fields tests (32 tests) |
| `npm run test:ad-pixels` | Ad pixels tests (24 tests) |
| `npm run test:warmth` | Warmth score tests |
| `npm run test:message` | Message tests |

## 📈 Reports

### Console Output (Default)
- Rich colored test results in terminal
- Pass/fail indicators for each test
- Execution time per test suite
- Summary statistics
- Error stack traces for failures

### Coverage Report (`tests/reports/coverage/`)
- Line coverage
- Branch coverage
- Function coverage
- Statement coverage
- Uncovered lines highlighted
- HTML report: Open `coverage/lcov-report/index.html`

### JUnit XML (`tests/reports/test-report.xml`)
- CI/CD integration
- Jenkins/Azure DevOps/GitHub Actions compatible
- Machine-readable format
- Test suite hierarchy

## 🔍 Test Patterns

### API Tests
```typescript
describe('GET /v1/endpoint', () => {
  it('should return data with valid auth', async () => {
    const response = await fetch('/v1/endpoint', {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    expect(response.status).toBe(200);
  });
});
```

### Integration Tests
```typescript
describe('Contact Lifecycle', () => {
  it('should complete full CRUD cycle', async () => {
    // Create → Read → Update → Delete
    const contact = await createContact();
    expect(contact.id).toBeDefined();
  });
});
```

## 🐛 Debugging Failed Tests

### View Detailed Logs
```bash
npm run test:unified -- --verbose
```

### Run Single Test File
```bash
npm run test:unified -- __tests__/api/public-api-auth.test.ts
```

### Run Single Test Suite
```bash
npm run test:unified -- -t "Authentication"
```

### Update Snapshots
```bash
npm run test:unified -- -u
```

## 📊 Coverage Thresholds

| Metric | Threshold |
|--------|-----------|
| Branches | 75% |
| Functions | 80% |
| Lines | 85% |
| Statements | 85% |

## 🔧 Configuration

Tests use `jest.config.unified.js` for configuration:
- **Test Environment:** Node.js
- **Test Timeout:** 30 seconds
- **Max Workers:** 50% of CPUs
- **Test Match:** `**/*.test.ts`
- **Coverage Directory:** `tests/reports/coverage`

## 📝 Test Documentation

Each test category has detailed documentation:
- `__tests__/PUBLIC_API_TESTS.md` - Public API tests
- `__tests__/CUSTOM_FIELDS_TESTS.md` - Custom fields tests
- `__tests__/AD_PIXELS_TESTS.md` - Ad pixels tests
- `__tests__/WARMTH_SCORE_TESTS.md` - Warmth score tests
- `__tests__/CONTEXT_ASSEMBLY_TESTS.md` - Context assembly tests

## 🚨 Pre-Deployment Checklist

Before deploying to production:

- [ ] All tests passing (`npm run test:unified`)
- [ ] Coverage > 85% (`npm run test:unified:coverage`)
- [ ] No skipped tests (search for `.skip`)
- [ ] No focused tests (search for `.only`)
- [ ] Test report reviewed (`tests/reports/test-report.html`)
- [ ] Database migrations run
- [ ] Environment variables set
- [ ] RLS policies verified

## 🔗 CI/CD Integration

### GitHub Actions Example
```yaml
- name: Run Tests
  run: npm run test:unified:coverage

- name: Upload Test Report
  uses: actions/upload-artifact@v3
  with:
    name: test-report
    path: tests/reports/test-report.html

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    files: tests/reports/coverage/lcov.info
```

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [API Testing Guide](https://www.postman.com/api-testing/)

## 🤝 Contributing

When adding new tests:
1. Place in appropriate category directory
2. Follow existing naming conventions (`*.test.ts`)
3. Add test documentation
4. Ensure tests are isolated (no shared state)
5. Update this README if adding new category

## 📞 Support

For test-related issues:
- Check `tests/reports/test-report.html` for details
- Review test logs for errors
- Ensure database is seeded properly
- Verify environment variables are set
