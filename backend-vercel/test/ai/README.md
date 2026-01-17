# AI Feature Tests

**Real-world E2E and performance tests for AI Goal Inference System**

## Test Structure

This directory follows the proven **plain Node.js test pattern** used in `test/agent/`:

- ✅ **Plain ES modules** (`.mjs`) - no Jest framework overhead
- ✅ **Live API testing** - against deployed backend
- ✅ **Markdown reports** - generated per test with detailed results
- ✅ **Unified runner** - aggregates all test results
- ✅ **Performance benchmarking** - with specific time targets
- ✅ **Easy debugging** - simple, readable test code

## Available Tests

### 1. **goal-inference-explicit.mjs**
Tests explicit goal extraction from user profile fields.

**Coverage:**
- Profile goal setting (business, networking, personal)
- Goal storage in database
- Goal retrieval by AI context
- Goal injection into message generation

**Performance Target:** < 3000ms for complete workflow

---

### 2. **goal-inference-e2e-workflow.mjs**
Complete end-to-end workflow test.

**Coverage:**
- Set explicit goals in profile
- Create persona notes with implicit goals
- Create test contact
- Generate message with AI context
- Verify goal influence on generated message

**Performance Target:** < 5000ms for complete workflow

**Steps:**
1. Set explicit goals → 2. Create strategic note → 3. Create contact → 4. Compose message → 5. Verify goal influence

---

### 3. **goal-inference-performance.mjs**
Performance benchmarking for goal inference system.

**Benchmarks:**
- Profile goal update: < 200ms
- Message composition with goals: < 2000ms  
- Persona note creation: < 300ms
- Rapid requests (3x average): < 1500ms

---

## Running Tests

### Quick Start (Recommended)
```powershell
# PowerShell (Windows)
.\test\ai\run-tests.ps1

# Or CMD
test\ai\run-tests.cmd
```

These scripts automatically set all required environment variables.

### Manual Run (All Tests)
```bash
node test/ai/run-all.mjs
```

### Run Individual Test
```bash
node test/ai/goal-inference-explicit.mjs
node test/ai/goal-inference-e2e-workflow.mjs
node test/ai/goal-inference-performance.mjs
```

### Environment Variables
```bash
# Required
SUPABASE_URL=https://utasetfxiqcrnwyfforx.supabase.co
NEXT_PUBLIC_SUPABASE_URL=https://utasetfxiqcrnwyfforx.supabase.co
BACKEND_BASE=https://ever-reach-be.vercel.app
TEST_EMAIL=isaiahdupree33@gmail.com
TEST_PASSWORD=frogger12

# Optional
TEST_ORIGIN=https://everreach.app
CLEANUP=true  # Set to false to skip cleanup
```

**Note:** Environment variables are pre-configured in `run-tests.ps1` and `run-tests.cmd`

---

## Reports

All tests generate detailed Markdown reports in `test/ai/reports/`:

- **Individual reports**: `goal_inference_explicit_TIMESTAMP.md`
- **Unified report**: `ai_tests_unified_TIMESTAMP.md`

### Report Contents
- ✅ Test status (pass/fail)
- ⏱️ Performance metrics
- 📊 Step-by-step results
- 🔍 Error logs (if failed)
- 📈 Performance analysis

---

## Performance Targets

| Operation | Target | Critical Path |
|-----------|--------|---------------|
| Profile Update | < 200ms | ✅ Yes |
| Goal Inference | < 100ms | Background |
| Message Composition | < 2000ms | ✅ Yes |
| E2E Workflow | < 5000ms | ✅ Yes |

---

## Test Pattern Benefits

### vs Jest
- **Faster**: No framework overhead, direct Node.js execution
- **Simpler**: Plain JavaScript, easy to read and debug
- **Real-world**: Tests against actual deployed API
- **Better reports**: Markdown with detailed analysis
- **Performance-focused**: Built-in benchmarking

### vs Unit Tests
- **Integration**: Tests real API endpoints and database
- **E2E**: Tests complete user workflows
- **Performance**: Measures actual response times
- **Reliability**: Catches issues unit tests miss

---

## Adding New Tests

1. **Create test file** following the pattern:
```javascript
// test/ai/my-new-test.mjs
import { getEnv, getAccessToken, apiFetch, runId, writeReport } from '../agent/_shared.mjs';

async function main() {
  const BACKEND_BASE = await getEnv('BACKEND_BASE', true);
  const token = await getAccessToken();
  
  // Your test logic here
  let passed = false;
  
  // Generate report
  const lines = ['# My New Test', ...];
  await writeReport(lines, 'test/ai/reports', 'my_new_test');
  
  if (!passed) process.exit(1);
}

main().catch(err => {
  console.error('[my-new-test] Fatal error:', err?.message || err);
  process.exit(1);
});
```

2. **Test will auto-run** with `node test/ai/run-all.mjs`

3. **No configuration needed** - runner auto-discovers `.mjs` files

---

## Debugging Failed Tests

### 1. Check Individual Report
```bash
# Find latest report
ls -lt test/ai/reports/goal_inference_*
cat test/ai/reports/goal_inference_explicit_TIMESTAMP.md
```

### 2. Run Test Individually
```bash
node test/ai/goal-inference-explicit.mjs
```

### 3. Check Environment Variables
```bash
echo $BACKEND_BASE
echo $TEST_EMAIL
```

### 4. Review Error Output
Failed tests include:
- Full error stack trace
- Request/response details
- Performance metrics
- Step-by-step progress

---

## CI/CD Integration

### GitHub Actions
```yaml
- name: Run AI Feature Tests
  run: node test/ai/run-all.mjs
  env:
    BACKEND_BASE: ${{ secrets.BACKEND_URL }}
    TEST_EMAIL: ${{ secrets.TEST_EMAIL }}
    TEST_PASSWORD: ${{ secrets.TEST_PASSWORD }}
```

### Vercel Deploy Hook
```bash
# Run tests after deployment
vercel deploy --prod && node test/ai/run-all.mjs
```

---

## Next Tests to Add

- [ ] **goal-inference-behavioral.mjs** - Infer goals from user behavior (contacts, pipeline, interactions)
- [ ] **goal-inference-notes.mjs** - Extract goals from persona notes with OpenAI
- [ ] **goal-inference-deduplication.mjs** - Test goal merging and deduplication logic
- [ ] **goal-inference-context-injection.mjs** - Verify goals appear in AI prompts
- [ ] **goal-inference-stress.mjs** - Test under load (100+ rapid requests)

---

## Comparison: Old vs New Test Structure

### Old (Jest)
```typescript
// __tests__/ai/goal-inference.test.ts
describe('AI Goal Inference', () => {
  beforeAll(async () => { /* complex setup */ });
  afterAll(async () => { /* cleanup */ });
  
  it('should extract goals', async () => {
    // Test logic buried in framework
  });
});
```

**Issues:**
- ❌ Slow (framework overhead)
- ❌ Complex setup/teardown
- ❌ Hard to debug failures
- ❌ No performance metrics
- ❌ Doesn't test real API

### New (Plain Node.js)
```javascript
// test/ai/goal-inference-explicit.mjs
async function main() {
  const token = await getAccessToken();
  const result = await apiFetch(BACKEND_BASE, '/api/endpoint', {...});
  
  const passed = result.status === 200;
  await writeReport([...], 'test/ai/reports', 'test_name');
  
  if (!passed) process.exit(1);
}

main().catch(err => { /* handle */ });
```

**Benefits:**
- ✅ Fast (no framework)
- ✅ Simple (plain JavaScript)
- ✅ Easy debugging
- ✅ Performance metrics built-in
- ✅ Tests real deployed API

---

## Success Criteria

✅ **All tests pass** in < 10 seconds total  
✅ **Individual workflows** meet performance targets  
✅ **Comprehensive reports** generated automatically  
✅ **No test pollution** - proper cleanup  
✅ **Production-ready** - tests real API behavior  

---

**Status**: ✅ Ready for CI/CD integration  
**Last Updated**: October 13, 2025
