# API Endpoint Audit - Quick Reference Card

## ⚡ Quick Commands

```bash
# Run audit
npm run audit:endpoints

# Save to file
npm run audit:endpoints > audit-$(date +%Y%m%d).txt

# Count unused
npm run audit:endpoints | grep -c "⚠"

# Count missing
npm run audit:endpoints | grep -c "✗"
```

---

## 📊 Reading the Output

| Symbol | Meaning | Action |
|--------|---------|--------|
| ✓ GREEN | Used endpoint | ✅ Keep it |
| ⚠ YELLOW | Unused endpoint | 🔍 Investigate |
| ✗ RED | Missing backend | 🔨 Implement |

---

## 🎯 Decision Tree

```
Unused Endpoint Found
    │
    ├─→ Used by webhook/cron?
    │   └─→ YES → Document + Keep
    │
    ├─→ Planned for future?
    │   └─→ YES → Add TODO comment + Keep
    │
    ├─→ Found in git history?
    │   └─→ YES → Check if feature removed
    │       ├─→ Removed → Delete endpoint
    │       └─→ Still exists → Investigate
    │
    └─→ None of the above?
        └─→ Dead code → Delete
```

---

## 🔍 Investigation Commands

```bash
# Search codebase for endpoint
git grep "api/v1/contacts/merge"

# Check git history
git log --all --oneline --grep="merge"

# Check all branches
git grep "endpoint-name" $(git branch -r)

# Production logs
grep "/api/v1/old-endpoint" production.log
```

---

## 📝 Health Metrics

### Score Calculation
```
Health Score = (Used / Total Backend) × 100

90-100%  🟢 Excellent - Clean codebase
70-89%   🟡 Good - Minor cleanup needed  
50-69%   🟠 Fair - Significant cleanup needed
< 50%    🔴 Poor - Major dead code issue
```

### Target Goals
- ✓ Used Endpoints: **Maximize**
- ⚠ Unused Endpoints: **< 10%** of total
- ✗ Missing Endpoints: **0**

---

## 🏷️ Common Patterns

### External Endpoints (Keep)
```typescript
// ✓ Webhook receivers
POST /api/webhooks/stripe
POST /api/webhooks/github

// ✓ Cron jobs  
GET /api/cron/daily-digest
POST /api/cron/warmth-decay

// ✓ Health checks
GET /api/health
GET /api/status
```

### Legacy Endpoints (Review)
```typescript
// ⚠ Old versions
GET /api/v1/...  (if v2 exists)
POST /api/legacy/...

// ⚠ Deprecated features
GET /api/experiments/...
POST /api/beta/...
```

### Dead Code (Delete)
```typescript
// ✗ Test endpoints in production
GET /api/test/dummy
POST /api/debug/...

// ✗ Removed features
GET /api/old-feature/...
DELETE /api/deprecated/...
```

---

## 🚨 Red Flags

| Issue | Severity | Example |
|-------|----------|---------|
| Missing endpoint called in production code | 🔴 Critical | `fetch('/api/v1/missing')` |
| 50%+ endpoints unused | 🟠 High | 30 unused / 60 total |
| Test endpoints in production | 🟠 High | `/api/test/debug` |
| Outdated API versions | 🟡 Medium | v1 exists but not used |

---

## ✅ Best Practices Checklist

- [ ] Run audit monthly
- [ ] Document external endpoints
- [ ] Remove test/debug endpoints from production
- [ ] Implement missing endpoints within 1 sprint
- [ ] Keep health score > 70%
- [ ] Track metrics over time
- [ ] Add to CI/CD pipeline
- [ ] Review before major releases

---

## 🔧 Quick Fixes

### Mark External Endpoint
```typescript
/**
 * @external Stripe webhook
 * Called by Stripe when payment succeeds
 * @see https://stripe.com/docs/webhooks
 */
export async function POST(request: Request) {
  // ...
}
```

### Deprecate Endpoint
```typescript
/**
 * @deprecated Use /api/v2/contacts instead
 * Will be removed in v3.0
 */
export async function GET(request: Request) {
  return NextResponse.json(
    { error: 'Deprecated' },
    { status: 410 }
  );
}
```

### Add TODO for Missing
```typescript
// TODO: Implement /api/v1/contacts/:id/merge
// Ticket: #123
// Priority: High
// Due: Sprint 12
```

---

## 📞 When to Ask for Help

- **Can't determine if endpoint is used** → Ask team
- **Endpoint has complex business logic** → Don't delete without review
- **External service dependency unclear** → Check with DevOps
- **Large number of missing endpoints** → Architectural review needed

---

## 🎓 Learn More

- Full Guide: `/docs/ENDPOINT_AUDIT_GUIDE.md`
- Script Source: `/scripts/audit-endpoints.js`
- Run: `npm run audit:endpoints`
