# Performance Benchmark Report

- **Run ID**: 8565f49a-9dab-4c5f-972b-e8d2dac8c275
- **Timestamp**: 2025-10-21T04:14:14.283Z
- **Backend**: https://ever-reach-be.vercel.app/api

## Executive Summary

- **Overall Pass Rate**: 6/8 (75.0%)
- **Critical Operations**: 1/2 passing

## ⚠️ CRITICAL PERFORMANCE ISSUES DETECTED

**Action Required**: The following critical operations exceed performance thresholds:

- **Compose Prepare (POST /v1/compose)**: 4907ms (threshold: 2000ms)

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
| Message Generation (POST /v1/agent/compose/smart) | CRITICAL | 264ms | 74ms | 608ms | 608ms | 3000ms | ✅ |
| Compose Prepare (POST /v1/compose) | CRITICAL | 4907ms | 4193ms | 6208ms | 6208ms | 2000ms | ❌ |
| Contact Create (POST /v1/contacts) | HIGH | 78ms | 78ms | 78ms | 78ms | 500ms | ✅ |
| Contact Get (GET /v1/contacts/:id) | HIGH | 475ms | 475ms | 475ms | 475ms | 500ms | ✅ |
| Contact List (GET /v1/contacts) | HIGH | 290ms | 290ms | 290ms | 290ms | 1000ms | ✅ |
| Search (POST /v1/search) | HIGH | 330ms | 330ms | 330ms | 330ms | 1000ms | ✅ |
| Quick Analysis (POST /v1/agent/analyze/contact) | MEDIUM | 10850ms | 10850ms | 10850ms | 10850ms | 5000ms | ❌ |
| Warmth Recompute (POST /v1/warmth/recompute) | MEDIUM | 346ms | 346ms | 346ms | 346ms | 2000ms | ✅ |

## Performance Ratings

- **Excellent**: < 50% of threshold
- **Good**: 50-75% of threshold
- **Acceptable**: 75-100% of threshold
- **Slow**: > 100% of threshold (FAILING)

- 🟢 **Message Generation (POST /v1/agent/compose/smart)**: 264ms (excellent)
- 🔴 **Compose Prepare (POST /v1/compose)**: 4907ms (slow)
- 🟢 **Contact Create (POST /v1/contacts)**: 78ms (excellent)
- 🟠 **Contact Get (GET /v1/contacts/:id)**: 475ms (acceptable)
- 🟢 **Contact List (GET /v1/contacts)**: 290ms (excellent)
- 🟢 **Search (POST /v1/search)**: 330ms (excellent)
- 🔴 **Quick Analysis (POST /v1/agent/analyze/contact)**: 10850ms (slow)
- 🟢 **Warmth Recompute (POST /v1/warmth/recompute)**: 346ms (excellent)

## Recommendations

### Operations Needing Optimization

- **Compose Prepare (POST /v1/compose)** (4907ms)
- **Quick Analysis (POST /v1/agent/analyze/contact)** (10850ms)

---

Generated: 2025-10-21T04:14:14.284Z