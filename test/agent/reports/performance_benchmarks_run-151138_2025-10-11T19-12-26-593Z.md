# Performance Benchmark Report

- **Run ID**: bab88d6e-56f6-4c7b-bb03-440e3757add1
- **Timestamp**: 2025-10-11T19:12:26.592Z
- **Backend**: https://ever-reach-be.vercel.app/api

## Executive Summary

- **Overall Pass Rate**: 6/8 (75.0%)
- **Critical Operations**: 1/2 passing

## ⚠️ CRITICAL PERFORMANCE ISSUES DETECTED

**Action Required**: The following critical operations exceed performance thresholds:

- **Compose Prepare (POST /v1/compose)**: 3824ms (threshold: 2000ms)

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
| Message Generation (POST /v1/agent/compose/smart) | CRITICAL | 95ms | 63ms | 153ms | 153ms | 3000ms | ✅ |
| Compose Prepare (POST /v1/compose) | CRITICAL | 3824ms | 2682ms | 4753ms | 4753ms | 2000ms | ❌ |
| Contact Create (POST /v1/contacts) | HIGH | 74ms | 74ms | 74ms | 74ms | 500ms | ✅ |
| Contact Get (GET /v1/contacts/:id) | HIGH | 260ms | 260ms | 260ms | 260ms | 500ms | ✅ |
| Contact List (GET /v1/contacts) | HIGH | 114ms | 114ms | 114ms | 114ms | 1000ms | ✅ |
| Search (POST /v1/search) | HIGH | 198ms | 198ms | 198ms | 198ms | 1000ms | ✅ |
| Quick Analysis (POST /v1/agent/analyze/contact) | MEDIUM | 9063ms | 9063ms | 9063ms | 9063ms | 5000ms | ❌ |
| Warmth Recompute (POST /v1/warmth/recompute) | MEDIUM | 372ms | 372ms | 372ms | 372ms | 2000ms | ✅ |

## Performance Ratings

- **Excellent**: < 50% of threshold
- **Good**: 50-75% of threshold
- **Acceptable**: 75-100% of threshold
- **Slow**: > 100% of threshold (FAILING)

- 🟢 **Message Generation (POST /v1/agent/compose/smart)**: 95ms (excellent)
- 🔴 **Compose Prepare (POST /v1/compose)**: 3824ms (slow)
- 🟢 **Contact Create (POST /v1/contacts)**: 74ms (excellent)
- 🟡 **Contact Get (GET /v1/contacts/:id)**: 260ms (good)
- 🟢 **Contact List (GET /v1/contacts)**: 114ms (excellent)
- 🟢 **Search (POST /v1/search)**: 198ms (excellent)
- 🔴 **Quick Analysis (POST /v1/agent/analyze/contact)**: 9063ms (slow)
- 🟢 **Warmth Recompute (POST /v1/warmth/recompute)**: 372ms (excellent)

## Recommendations

### Operations Needing Optimization

- **Compose Prepare (POST /v1/compose)** (3824ms)
- **Quick Analysis (POST /v1/agent/analyze/contact)** (9063ms)

---

Generated: 2025-10-11T19:12:26.593Z