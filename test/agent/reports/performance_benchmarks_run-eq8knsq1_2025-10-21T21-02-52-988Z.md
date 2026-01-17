# Performance Benchmark Report

- **Run ID**: b7f56a75-2d50-4828-b1e3-02350d77983e
- **Timestamp**: 2025-10-21T21:02:52.987Z
- **Backend**: https://ever-reach-be.vercel.app/api

## Executive Summary

- **Overall Pass Rate**: 6/8 (75.0%)
- **Critical Operations**: 1/2 passing

## ⚠️ CRITICAL PERFORMANCE ISSUES DETECTED

**Action Required**: The following critical operations exceed performance thresholds:

- **Compose Prepare (POST /v1/compose)**: 3965ms (threshold: 2000ms)

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
| Message Generation (POST /v1/agent/compose/smart) | CRITICAL | 223ms | 68ms | 484ms | 484ms | 3000ms | ✅ |
| Compose Prepare (POST /v1/compose) | CRITICAL | 3965ms | 3449ms | 4840ms | 4840ms | 2000ms | ❌ |
| Contact Create (POST /v1/contacts) | HIGH | 87ms | 87ms | 87ms | 87ms | 500ms | ✅ |
| Contact Get (GET /v1/contacts/:id) | HIGH | 473ms | 473ms | 473ms | 473ms | 500ms | ✅ |
| Contact List (GET /v1/contacts) | HIGH | 116ms | 116ms | 116ms | 116ms | 1000ms | ✅ |
| Search (POST /v1/search) | HIGH | 173ms | 173ms | 173ms | 173ms | 1000ms | ✅ |
| Quick Analysis (POST /v1/agent/analyze/contact) | MEDIUM | 10030ms | 10030ms | 10030ms | 10030ms | 5000ms | ❌ |
| Warmth Recompute (POST /v1/warmth/recompute) | MEDIUM | 261ms | 261ms | 261ms | 261ms | 2000ms | ✅ |

## Performance Ratings

- **Excellent**: < 50% of threshold
- **Good**: 50-75% of threshold
- **Acceptable**: 75-100% of threshold
- **Slow**: > 100% of threshold (FAILING)

- 🟢 **Message Generation (POST /v1/agent/compose/smart)**: 223ms (excellent)
- 🔴 **Compose Prepare (POST /v1/compose)**: 3965ms (slow)
- 🟢 **Contact Create (POST /v1/contacts)**: 87ms (excellent)
- 🟠 **Contact Get (GET /v1/contacts/:id)**: 473ms (acceptable)
- 🟢 **Contact List (GET /v1/contacts)**: 116ms (excellent)
- 🟢 **Search (POST /v1/search)**: 173ms (excellent)
- 🔴 **Quick Analysis (POST /v1/agent/analyze/contact)**: 10030ms (slow)
- 🟢 **Warmth Recompute (POST /v1/warmth/recompute)**: 261ms (excellent)

## Recommendations

### Operations Needing Optimization

- **Compose Prepare (POST /v1/compose)** (3965ms)
- **Quick Analysis (POST /v1/agent/analyze/contact)** (10030ms)

---

Generated: 2025-10-21T21:02:52.988Z