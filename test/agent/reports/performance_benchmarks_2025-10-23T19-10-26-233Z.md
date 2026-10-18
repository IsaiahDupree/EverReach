# Performance Benchmark Report

- **Run ID**: 554ce519-24d5-4d72-9be4-671b2a353fe4
- **Timestamp**: 2025-10-23T19:10:26.232Z
- **Backend**: https://ever-reach-be.vercel.app/api

## Executive Summary

- **Overall Pass Rate**: 5/8 (62.5%)
- **Critical Operations**: 1/2 passing

## ⚠️ CRITICAL PERFORMANCE ISSUES DETECTED

**Action Required**: The following critical operations exceed performance thresholds:

- **Compose Prepare (POST /v1/compose)**: 5368ms (threshold: 2000ms)

## Performance Thresholds

| Priority | Operation | Threshold |
|----------|-----------|-----------|
| 🔴 CRITICAL | Message Generation | < 3000ms |
| 🔴 CRITICAL | Compose Prepare | < 2000ms |
| 🟠 HIGH | Contact Operations | < 500ms |
| 🟠 HIGH | Search | < 1000ms |
| 🟡 MEDIUM | Analysis (Quick) | < 5000ms |

## Detailed Results

| Operation | Priority | Avg | Min | Max | P95 | Threshold | Status |
|-----------|----------|-----|-----|-----|-----|-----------|--------|
| Message Generation (POST /v1/agent/compose/smart) | CRITICAL | 246ms | 82ms | 552ms | 552ms | 3000ms | ✅ |
| Compose Prepare (POST /v1/compose) | CRITICAL | 5368ms | 4855ms | 6353ms | 6353ms | 2000ms | ❌ |
| Contact Create (POST /v1/contacts) | HIGH | 213ms | 213ms | 213ms | 213ms | 500ms | ✅ |
| Contact Get (GET /v1/contacts/:id) | HIGH | 583ms | 583ms | 583ms | 583ms | 500ms | ❌ |
| Contact List (GET /v1/contacts) | HIGH | 130ms | 130ms | 130ms | 130ms | 1000ms | ✅ |
| Search (POST /v1/search) | HIGH | 856ms | 856ms | 856ms | 856ms | 1000ms | ✅ |
| Quick Analysis (POST /v1/agent/analyze/contact) | MEDIUM | 14490ms | 14490ms | 14490ms | 14490ms | 5000ms | ❌ |
| Warmth Recompute (POST /v1/warmth/recompute) | MEDIUM | 759ms | 759ms | 759ms | 759ms | 2000ms | ✅ |

## Performance Ratings

- **Excellent**: < 50% of threshold
- **Good**: 50-75% of threshold
- **Acceptable**: 75-100% of threshold
- **Slow**: > 100% of threshold (FAILING)

- 🟢 **Message Generation (POST /v1/agent/compose/smart)**: 246ms (excellent)
- 🔴 **Compose Prepare (POST /v1/compose)**: 5368ms (slow)
- 🟢 **Contact Create (POST /v1/contacts)**: 213ms (excellent)
- 🔴 **Contact Get (GET /v1/contacts/:id)**: 583ms (slow)
- 🟢 **Contact List (GET /v1/contacts)**: 130ms (excellent)
- 🟠 **Search (POST /v1/search)**: 856ms (acceptable)
- 🔴 **Quick Analysis (POST /v1/agent/analyze/contact)**: 14490ms (slow)
- 🟢 **Warmth Recompute (POST /v1/warmth/recompute)**: 759ms (excellent)

## Recommendations

### Operations Needing Optimization

- **Compose Prepare (POST /v1/compose)** (5368ms)
- **Contact Get (GET /v1/contacts/:id)** (583ms)
  - Add database indexes
  - Optimize RLS policies
  - Implement query result caching
- **Quick Analysis (POST /v1/agent/analyze/contact)** (14490ms)

---

Generated: 2025-10-23T19:10:26.233Z