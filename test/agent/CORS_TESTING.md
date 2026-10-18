# CORS Validation Testing

## Overview

The CORS validation tests ensure that all API endpoints properly return CORS headers for cross-origin requests. This is critical for:

- **Web applications** accessing the API from different domains
- **Browser-based tools** and extensions
- **Development environments** with hot-reloading
- **Mobile web views** making API calls

## What Gets Tested

### 1. **OPTIONS Preflight Requests**
Every endpoint is tested with an OPTIONS request to verify:
- `Access-Control-Allow-Origin` header
- `Access-Control-Allow-Methods` header  
- `Access-Control-Allow-Headers` header
- `Access-Control-Max-Age` header (caching duration)
- `Vary: Origin` header (for proper CDN caching)

### 2. **Success Responses (200, 201)**
Authenticated requests that succeed are checked for:
- `Access-Control-Allow-Origin` header
- `Vary: Origin` header

### 3. **Error Responses (400, 401, 404, 429, 500)**
Failed requests are verified to have CORS headers, ensuring:
- Error responses don't break browser CORS policies
- Clients can read error details even on failures
- 401 Unauthorized responses still allow origin access

## Running the Tests

### Standalone Execution

```bash
# Run CORS tests only
node test-cors.mjs

# Or directly
node test/agent/cors-validation.mjs
```

### Integrated with Full Test Suite

```bash
# Run all tests including CORS
node test/agent/run-all-unified.mjs
```

The CORS tests will automatically be discovered and included in the unified report.

## Configuration

### Environment Variables

```bash
# Test against a specific backend
TEST_BASE_URL=https://your-backend.vercel.app node test-cors.mjs

# Use specific test credentials
TEST_EMAIL=test@example.com TEST_PASSWORD=yourpass node test-cors.mjs
```

## Endpoints Tested

The test suite covers these critical endpoints:

- `GET /api/v1/warmth/summary` - Warmth statistics
- `GET /api/v1/interactions` - List interactions
- `POST /api/v1/interactions` - Create interaction
- `GET /api/v1/contacts` - List contacts
- `GET /api/health` - Health check

## Expected Results

### ✅ Passing Tests

A passing CORS test should show:

```
✅ OPTIONS /api/v1/interactions - PASS
✅ GET /api/v1/interactions (auth) - PASS
✅ GET /api/v1/interactions (401) - PASS
```

Each test validates:
- Response status is appropriate
- `Vary: Origin` header present
- `Access-Control-Allow-Origin` header present (or `*`)
- Additional CORS headers for OPTIONS requests

### ❌ Failing Tests

Common CORS failures:

```
❌ GET /api/v1/warmth/summary (401) - FAIL
  Missing: Access-Control-Allow-Origin header
```

This indicates the endpoint doesn't return CORS headers on error responses.

## Report Output

### Console Output

Real-time test results with pass/fail status:

```
🔒 Starting CORS Validation Tests
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Testing: GET /api/v1/warmth/summary
✅ OPTIONS /api/v1/warmth/summary - PASS
✅ GET /api/v1/warmth/summary (auth) - PASS
✅ GET /api/v1/warmth/summary (401) - PASS

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 CORS Test Results
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Passed: 15
❌ Failed: 0
📈 Total: 15
🎯 Success Rate: 100.0%
```

### Markdown Report

Detailed report saved to `test/agent/reports/cors_validation_[timestamp].md`:

```markdown
# CORS Validation Report

**Generated:** 2025-10-12T23:20:00.000Z
**Backend:** https://ever-reach-be.vercel.app

## Summary

- ✅ **Passed:** 15
- ❌ **Failed:** 0
- 📈 **Total:** 15
- 🎯 **Success Rate:** 100.0%

## Test Details

### ✅ OPTIONS /api/v1/warmth/summary

- **Status:** 204 No Content
- **Headers:**
  - Access-Control-Allow-Origin: `*`
  - Vary: `Origin`
  - Access-Control-Allow-Methods: `GET,POST,PUT,PATCH,DELETE,OPTIONS`
  - Access-Control-Allow-Headers: `Authorization,Content-Type,X-Requested-With`
- **Checks:**
  - ✅ Vary: Origin header
  - ✅ Access-Control-Allow-Origin present
  - ✅ Access-Control-Allow-Methods present
  - ✅ Access-Control-Allow-Headers present
```

## Troubleshooting

### Missing CORS Headers

**Problem:** Tests fail with "Missing: Access-Control-Allow-Origin"

**Solution:** Ensure your API routes use the CORS helper functions:

```typescript
// ❌ Bad - Raw Response
return new Response(JSON.stringify({ error: "Unauthorized" }), {
  status: 401,
  headers: { "Content-Type": "application/json" }
});

// ✅ Good - Using CORS helper
import { unauthorized } from "@/lib/cors";
return unauthorized("Unauthorized", req);
```

### CORS on Error Responses Only

**Problem:** Success responses pass, but 401/500 fail

**Solution:** Make sure ALL response paths use CORS helpers:

```typescript
// Check authentication
if (!user) return unauthorized("Unauthorized", req);

// Check rate limits
if (!rl.allowed) return badRequest("Rate limited", req);

// Handle errors
if (error) return serverError(error.message, req);

// Return success
return ok(data, req);
```

### OPTIONS Requests Failing

**Problem:** OPTIONS requests return 404 or 405

**Solution:** Ensure your route exports an OPTIONS handler:

```typescript
export function OPTIONS(req: Request) {
  return options(req);
}
```

## Integration Points

### With Unified Test Runner

The CORS tests are automatically included when running:

```bash
node test/agent/run-all-unified.mjs
```

The unified report will include:
- CORS test results
- Pass/fail status for each endpoint
- Detailed error logs for failures

### With CI/CD

Add to your CI pipeline:

```yaml
# .github/workflows/test.yml
- name: Run CORS Tests
  run: node test-cors.mjs
  env:
    TEST_BASE_URL: ${{ secrets.API_URL }}
```

## Best Practices

1. **Run CORS tests after any endpoint changes**
2. **Check CORS on both success and error paths**
3. **Verify OPTIONS support for all routes**
4. **Test with actual origin headers** (not just wildcards)
5. **Include CORS tests in PR requirements**

## Additional Resources

- [MDN: CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [lib/cors.ts](../../backend-vercel/lib/cors.ts) - CORS helper functions
- [CORS Best Practices](../../docs/CORS_BEST_PRACTICES.md) (if exists)
