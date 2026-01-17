# ⚡ Test Suite Quick Reference

**One-page cheat sheet for running tests**

---

## 🚀 Most Common Commands

```bash
cd backend-vercel

# Run EVERYTHING (recommended before commits)
npm run test:master

# Only unit tests (fast, during development)
npm run test:unified

# Only E2E smoke tests (after deployment)
npm run test:e2e:smoke

# Watch mode (auto-rerun on file changes)
npm run test:unified:watch

# With coverage report
npm run test:unified:coverage
```

---

## 📊 Test Counts

| Type | Count | Runtime | Location |
|------|-------|---------|----------|
| **Unit/Integration** | 300+ | 30-90s | `__tests__/` |
| **E2E Smoke** | 15+ | 10-30s | `tests/e2e/` |
| **Total** | 315+ | 1-2min | Combined |

---

## 📁 Key Files

```
backend-vercel/
├── __tests__/              # Jest tests (300+)
├── tests/
│   ├── e2e/               # E2E smoke tests
│   │   └── api-smoke.mjs  # Run E2E tests
│   ├── reports/           # Generated reports
│   ├── run-all.mjs        # MASTER RUNNER
│   └── *.md               # Documentation
└── jest.config.unified.js  # Jest config
```

---

## 🎯 When to Run What

### During Development
```bash
npm run test:unified:watch
```
Auto-reruns tests on file changes

### Before Committing
```bash
npm run test:master
```
Runs all tests + generates report

### After Deploying
```bash
npm run test:e2e:smoke
```
Validates deployed API works

### Before PR
```bash
npm run test:unified:coverage
```
Check coverage meets thresholds

---

## 📄 Reports Location

All reports saved to: `tests/reports/`

- `unified-test-report-*.md` - Master report (everything)
- `smoke-test-*.md` - E2E results
- `test-report.xml` - JUnit XML (for CI/CD)
- `coverage/` - Coverage reports

---

## ⚙️ Environment Setup

Create `backend-vercel/.env`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://utasetfxiqcrnwyfforx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-key-here
SUPABASE_JWT_SECRET=your-secret-here
OPENAI_API_KEY=your-key-here
TEST_EMAIL=test@example.com
TEST_PASSWORD=your-password
```

---

## 🐛 Quick Fixes

### Tests fail with "Cannot read properties of null"
→ Check `.env` has correct Supabase credentials

### E2E tests: "Missing TEST_EMAIL"
→ Add `TEST_EMAIL` and `TEST_PASSWORD` to `.env`

### All E2E tests return 404
→ Check `BACKEND_BASE` URL is correct

### TypeScript errors in setup
→ Already fixed with `Object.defineProperty()`

---

## 💡 Pro Tips

1. **Use watch mode** during development for instant feedback
2. **Run master suite** before every commit
3. **Check coverage** before PRs (target: 85%+)
4. **Skip E2E** for faster local testing
5. **Read reports** in `tests/reports/` for details

---

## 🔗 Full Documentation

- **Complete Guide:** `tests/MASTER_TEST_SUITE.md`
- **Integration Story:** `tests/INTEGRATION_COMPLETE.md`
- **Test Setup:** `tests/TEST_SETUP_COMPLETE.md`
- **Quick Start:** `tests/README.md`

---

## ✅ Success Criteria

```
✅ All 315+ tests passing
✅ No TypeScript errors
✅ Coverage > 85%
✅ E2E smoke tests pass
✅ Reports generated successfully
```

---

**Last Updated:** 2025-10-10  
**Total Tests:** 315+  
**Pass Rate Target:** 95%+  
**Runtime:** 1-2 minutes
