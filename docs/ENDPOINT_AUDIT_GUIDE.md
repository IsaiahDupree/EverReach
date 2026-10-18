# API Endpoint Audit Guide

## Overview

The endpoint audit tool helps you understand which backend API endpoints are actually being used by your frontend code versus which ones are just sitting there unused.

## Quick Start

```bash
# Run the audit
npm run audit:endpoints

# Or directly
node scripts/audit-endpoints.js
```

## What It Does

The audit script:

1. **Scans Backend** - Finds all API route files in `/backend-vercel/app/api`
2. **Scans Frontend** - Finds all API calls in `/app`, `/components`, `/hooks`, `/lib`, `/repos`
3. **Compares** - Matches frontend calls to backend endpoints
4. **Reports** - Shows used, unused, and missing endpoints

## Output Sections

### ✓ Used Endpoints (GREEN)

Endpoints that have both:
- Backend implementation
- Frontend usage

```
✓ /api/v1/contacts/:id
  Methods: GET, PATCH, DELETE
  Backend: ./backend-vercel/app/api/v1/contacts/[id]/route.ts
  Used in 12 file(s):
    - ./app/contact/[id].tsx
    - ./components/ContactCard.tsx
    - ./repos/ContactsRepo.ts
```

**Action:** ✅ Keep these - they're actively used!

---

### ⚠ Unused Endpoints (YELLOW)

Endpoints that have:
- Backend implementation
- NO frontend usage

```
⚠ /api/v1/analytics/export
  Methods: GET
  Backend: ./backend-vercel/app/api/v1/analytics/export/route.ts
```

**Possible Reasons:**
1. **Dead code** - Leftover from removed features
2. **Future feature** - Planned but not implemented yet
3. **External use** - Called by webhooks, cron jobs, or third parties
4. **Missing detection** - Dynamic paths we didn't catch

**Actions:**
- ❌ Remove if truly unused
- 📝 Document if planned for future
- 🔗 Add comment if used externally
- 🧪 Write tests to ensure it works

---

### ✗ Missing Backend Endpoints (RED)

Frontend calls that have:
- Frontend usage
- NO backend implementation

```
✗ /api/v1/contacts/:id/merge
  Called from 2 file(s):
    - ./components/MergeContactsDialog.tsx
    - ./hooks/useContactMerge.ts
  Example calls:
    /api/v1/contacts/${id}/merge
```

**Possible Reasons:**
1. **Not implemented** - Feature code written, backend missing
2. **Typo** - Wrong endpoint path in frontend
3. **Version mismatch** - Using wrong API version
4. **External API** - Calling third-party service

**Actions:**
- 🔨 Implement the backend endpoint
- 🐛 Fix the frontend typo
- 📋 Update to correct version
- 🔍 Verify it's not a third-party call

---

## Understanding the Output

### Summary Stats

```
SUMMARY
========================================

✓ Used Endpoints:        42
⚠ Unused Endpoints:      8
✗ Missing Endpoints:     3
  Total Backend:         50
  Total Frontend Calls:  45
```

**Ideal State:**
- ✓ Used = High number
- ⚠ Unused = 0 or low
- ✗ Missing = 0

---

## Common Patterns

### Dynamic Path Detection

The script normalizes paths:

```
/api/v1/contacts/abc-123-def     →  /api/v1/contacts/:id
/api/v1/contacts/456             →  /api/v1/contacts/:id
/api/v1/contacts/${contactId}    →  /api/v1/contacts/:id
```

All match the same backend endpoint: `/api/v1/contacts/[id]/route.ts`

### False Positives

**Unused endpoints might actually be:**

1. **Webhook Receivers**
   ```typescript
   // Called by Stripe, not your frontend
   POST /api/webhooks/stripe
   ```

2. **Scheduled Jobs**
   ```typescript
   // Called by cron, not your app
   GET /api/cron/daily-digest
   ```

3. **Mobile App Only**
   ```typescript
   // Only used in React Native, not web
   POST /api/v1/push-notifications
   ```

4. **Admin/Internal Tools**
   ```typescript
   // Used in separate admin dashboard
   GET /api/admin/stats
   ```

**Solution:** Add inline comments in code:
```typescript
// Used by: Stripe webhook (external)
export async function POST(request: Request) {
  // ...
}
```

---

## Cleanup Workflow

### Step 1: Review Unused Endpoints

```bash
npm run audit:endpoints | grep "⚠"
```

For each unused endpoint:

1. Search codebase for references
   ```bash
   git grep "api/v1/analytics/export"
   ```

2. Check git history
   ```bash
   git log --all --oneline --grep="analytics"
   ```

3. Decide:
   - **Keep** → Add documentation comment
   - **Remove** → Delete the file
   - **Test** → Write integration test

### Step 2: Implement Missing Endpoints

```bash
npm run audit:endpoints | grep "✗"
```

For each missing endpoint:

1. Verify it's actually called
   ```bash
   git grep "api/v1/contacts.*merge"
   ```

2. Check if it's a typo
   - Should it be `/api/v1/contacts/:id/update`?
   - Is the version wrong?

3. Implement if needed
   ```bash
   # Create the endpoint file
   touch backend-vercel/app/api/v1/contacts/[id]/merge/route.ts
   ```

### Step 3: Document Decisions

Create `ENDPOINT_DECISIONS.md`:

```markdown
# Endpoint Audit Decisions

## Kept (Unused)
- `/api/webhooks/stripe` - External webhook, keep
- `/api/cron/warmth-decay` - Vercel cron, keep

## Removed
- `/api/v1/legacy/import` - Feature removed in v2.0
- `/api/v1/test/dummy` - Leftover from testing

## To Implement
- `/api/v1/contacts/:id/merge` - Ticket #123
- `/api/v1/analytics/export` - Roadmap Q2
```

---

## Advanced Usage

### Save Report to File

```bash
npm run audit:endpoints > audit-report.txt
```

### Filter Specific Sections

```bash
# Only unused
npm run audit:endpoints | sed -n '/UNUSED ENDPOINTS/,/MISSING/p'

# Only missing
npm run audit:endpoints | sed -n '/MISSING BACKEND/,/SUMMARY/p'
```

### Track Over Time

```bash
# Create baseline
npm run audit:endpoints > audits/baseline-$(date +%Y%m%d).txt

# Compare after changes
npm run audit:endpoints > audits/current.txt
diff audits/baseline-*.txt audits/current.txt
```

---

## Integration

### CI/CD Check

Add to GitHub Actions:

```yaml
# .github/workflows/endpoint-audit.yml
name: API Endpoint Audit

on: [pull_request]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm run audit:endpoints
      - run: |
          if npm run audit:endpoints | grep -q "✗ MISSING"; then
            echo "❌ Missing endpoints detected!"
            exit 1
          fi
```

### Pre-commit Hook

```bash
# .husky/pre-commit
#!/bin/sh
npm run audit:endpoints --silent
```

---

## Troubleshooting

### "No backend endpoints found"

**Cause:** Backend directory path is wrong

**Fix:**
```javascript
// In scripts/audit-endpoints.js
const BACKEND_DIR = path.join(__dirname, '../backend-vercel/app/api');
```

Verify the path exists:
```bash
ls backend-vercel/app/api
```

### "Too many false positives"

**Cause:** Dynamic paths not detected

**Fix:** Update normalization patterns in script:
```javascript
function normalizeEndpoint(endpoint) {
  return cleaned
    .replace(/\/[a-f0-9-]{36}/gi, '/:id')  // UUIDs
    .replace(/\/\d+/g, '/:id')              // Numeric IDs
    .replace(/\$\{[^}]+\}/g, ':param')      // Template literals
    .replace(/`[^`]+`/g, ':param');         // Backtick strings
}
```

### "Script runs too slowly"

**Cause:** Scanning large directories like `node_modules`

**Fix:** Already excluded in code, but verify:
```javascript
if (entry.name !== 'node_modules' && entry.name !== '.git') {
  scanDirectory(fullPath, apiCalls);
}
```

---

## Best Practices

### 1. Run Regularly

```bash
# Weekly
npm run audit:endpoints

# Before major releases
npm run audit:endpoints > audit-pre-release.txt
```

### 2. Document Decisions

Don't just delete - understand why first:
- Check git blame
- Review related tickets
- Ask team members

### 3. Keep External Separate

Mark external-only endpoints clearly:
```typescript
/**
 * @external Stripe webhook
 * @see https://stripe.com/docs/webhooks
 */
export async function POST(request: Request) {
  // ...
}
```

### 4. Test Before Deleting

Before removing an "unused" endpoint:
```bash
# 1. Check production logs
grep "/api/v1/old-endpoint" production.log

# 2. Search all branches
git grep "old-endpoint" $(git branch -r)

# 3. Check if external services use it
```

---

## Metrics to Track

### Health Score

```
Health Score = (Used / Total Backend) × 100

90-100%  = Excellent
70-89%   = Good
50-69%   = Needs cleanup
< 50%    = Poor (lots of dead code)
```

### Coverage

```
Coverage = (Used + Documented Unused) / Total Backend

Goal: 100%
```

### Implementation Lag

```
Lag = Missing Endpoints Count

Goal: 0
```

---

## FAQ

**Q: Why are there unused endpoints?**
A: Common reasons:
- Feature was removed from frontend
- External webhooks/cron jobs
- Planned features not yet used
- Deprecated but kept for backwards compatibility

**Q: Should I delete all unused endpoints?**
A: No! Verify first:
1. Check if external services use them
2. Review if they're planned features
3. Confirm they're not in other branches

**Q: What about third-party API calls?**
A: They'll show as "missing" - that's expected:
```typescript
// This will show as missing (it's not your backend!)
await fetch('https://api.stripe.com/v1/charges');
```

**Q: How often should I run this?**
A: 
- After every major feature
- Before releases
- Monthly maintenance
- When cleaning up tech debt

---

## Next Steps

1. ✅ Run your first audit
2. 📝 Document decisions for unused endpoints
3. 🔨 Implement or fix missing endpoints
4. 🧹 Clean up confirmed dead code
5. 📊 Track metrics over time
6. 🔄 Add to CI/CD pipeline
