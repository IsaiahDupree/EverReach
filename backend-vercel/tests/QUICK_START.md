# Quick Start - Unified Test Suite

Get started with the unified test suite in under 2 minutes!

## 🚀 Installation

First, install the test dependencies:

```bash
cd backend-vercel
npm install
```

This will install:
- `jest` - Test runner
- `ts-jest` - TypeScript support
- `jest-html-reporters` - Beautiful HTML reports
- `jest-junit` - XML reports for CI/CD

## ▶️ Run All Tests

```bash
npm run test:unified
```

This command runs **all 300+ tests** and generates:
- ✅ Console output with pass/fail results
- 📊 HTML report at `tests/reports/test-report.html`
- 📄 JUnit XML at `tests/reports/junit.xml`

**Expected output:**
```
 PASS  __tests__/api/public-api-auth.test.ts (12.4 s)
 PASS  __tests__/api/public-api-rate-limit.test.ts (8.2 s)
 PASS  __tests__/api/custom-fields.test.ts (6.1 s)
 ...

Test Suites: 19 passed, 19 total
Tests:       308 passed, 308 total
Snapshots:   0 total
Time:        89.234 s
```

## 📊 View Reports

### HTML Report (Recommended)
```bash
# Windows
start tests/reports/test-report.html

# macOS
open tests/reports/test-report.html

# Linux
xdg-open tests/reports/test-report.html
```

The HTML report includes:
- ✅ Visual pass/fail indicators
- 🕒 Test execution times
- 📝 Detailed error messages
- 📚 Grouped by test suite
- 🔍 Expandable test cases

### Coverage Report
```bash
npm run test:unified:coverage

# Then open:
# tests/reports/coverage/lcov-report/index.html
```

## 🎯 Common Commands

| Command | Description | Use When |
|---------|-------------|----------|
| `npm run test:unified` | Run all tests | Before commits |
| `npm run test:unified:coverage` | Run with coverage | Before PRs |
| `npm run test:unified:watch` | Watch mode | During development |
| `npm run test:unified:verbose` | Extra details | Debugging failures |

## 🔍 Run Specific Tests

### Single Test File
```bash
npm run test:unified -- __tests__/api/public-api-auth.test.ts
```

### Single Test Suite
```bash
npm run test:unified -- -t "Authentication"
```

### Pattern Matching
```bash
npm run test:unified -- -t "should authenticate"
```

## 🐛 Troubleshooting

### Tests Timing Out
**Solution:** Increase timeout in test file:
```typescript
jest.setTimeout(60000); // 60 seconds
```

### Database Connection Errors
**Solution:** Check environment variables:
```bash
# Required env vars:
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
OPENAI_API_KEY
```

### Port Already in Use
**Solution:** Kill existing processes:
```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <pid> /F

# macOS/Linux
lsof -ti:3001 | xargs kill
```

### Open Handles Warning
**Solution:** Tests should clean up connections. Check for:
- Unclosed database connections
- Pending HTTP requests
- Timers not cleared

## 📈 Coverage Goals

Current targets:
- **Lines:** 85%
- **Branches:** 75%
- **Functions:** 80%
- **Statements:** 85%

Check coverage:
```bash
npm run test:unified:coverage
```

## 🔄 CI/CD Integration

### GitHub Actions
Add to `.github/workflows/test.yml`:

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          
      - name: Install Dependencies
        run: npm ci
        
      - name: Run Tests
        run: npm run test:unified:ci
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_KEY }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          
      - name: Upload Test Report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-report
          path: tests/reports/test-report.html
          
      - name: Upload Coverage
        uses: codecov/codecov-action@v3
        with:
          files: tests/reports/coverage/lcov.info
```

## 🎓 Best Practices

### Before Committing
```bash
npm run test:unified
```

### Before Pull Request
```bash
npm run test:unified:coverage
```

### During Development
```bash
npm run test:unified:watch
```

### For CI/CD
```bash
npm run test:unified:ci
```

## 📚 Test Structure

```
__tests__/
├── api/              # API endpoint tests (240+ tests)
│   ├── public-api-*  # Public API (128 tests)
│   ├── custom-*      # Custom fields (32 tests)
│   ├── ad-pixels     # Ad tracking (24 tests)
│   └── warmth-*      # Warmth scores (20+ tests)
├── database/         # Database tests (15+ tests)
├── integration/      # Integration tests (25+ tests)
└── lib/              # Library tests (10+ tests)
```

## 💡 Tips

1. **Run tests frequently** - Catch bugs early
2. **Check coverage** - Aim for 85%+ overall
3. **Keep tests fast** - Mock external APIs
4. **Isolate tests** - No shared state
5. **Update snapshots** - When UI changes intentionally

## 🆘 Need Help?

1. Check `tests/reports/test-report.html` for detailed failures
2. Run with `--verbose` flag for extra output
3. Review test documentation in `__tests__/*.md`
4. Search for similar test patterns in codebase

## 🎉 Success!

Once all tests pass, you'll see:
```
✓ All tests passed! (308 tests)
✓ Coverage thresholds met
✓ No skipped tests
✓ No focused tests
✓ Report generated: tests/reports/test-report.html
```

Now you're ready to commit! 🚀
