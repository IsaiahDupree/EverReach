# Performance Benchmark Report

- **Run ID**: 60d94f11-1e31-422b-aee9-fd5c9e8863a8
- **Timestamp**: 2025-10-21T03:53:25.938Z
- **Backend**: https://ever-reach-be.vercel.app/api

## Executive Summary

- **Overall Pass Rate**: 6/8 (75.0%)
- **Critical Operations**: 1/2 passing

## ⚠️ CRITICAL PERFORMANCE ISSUES DETECTED

**Action Required**: The following critical operations exceed performance thresholds:

- **Compose Prepare (POST /v1/compose)**: 4408ms (threshold: 2000ms)

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
| Message Generation (POST /v1/agent/compose/smart) | CRITICAL | 285ms | 73ms | 602ms | 602ms | 3000ms | ✅ |
| Compose Prepare (POST /v1/compose) | CRITICAL | 4408ms | 3961ms | 4699ms | 4699ms | 2000ms | ❌ |
| Contact Create (POST /v1/contacts) | HIGH | 60ms | 60ms | 60ms | 60ms | 500ms | ✅ |
| Contact Get (GET /v1/contacts/:id) | HIGH | 253ms | 253ms | 253ms | 253ms | 500ms | ✅ |
| Contact List (GET /v1/contacts) | HIGH | 101ms | 101ms | 101ms | 101ms | 1000ms | ✅ |
| Search (POST /v1/search) | HIGH | 146ms | 146ms | 146ms | 146ms | 1000ms | ✅ |
| Quick Analysis (POST /v1/agent/analyze/contact) | MEDIUM | 8461ms | 8461ms | 8461ms | 8461ms | 5000ms | ❌ |
| Warmth Recompute (POST /v1/warmth/recompute) | MEDIUM | 289ms | 289ms | 289ms | 289ms | 2000ms | ✅ |

## Performance Ratings

- **Excellent**: < 50% of threshold
- **Good**: 50-75% of threshold
- **Acceptable**: 75-100% of threshold
- **Slow**: > 100% of threshold (FAILING)

- 🟢 **Message Generation (POST /v1/agent/compose/smart)**: 285ms (excellent)
- 🔴 **Compose Prepare (POST /v1/compose)**: 4408ms (slow)
- 🟢 **Contact Create (POST /v1/contacts)**: 60ms (excellent)
- 🟡 **Contact Get (GET /v1/contacts/:id)**: 253ms (good)
- 🟢 **Contact List (GET /v1/contacts)**: 101ms (excellent)
- 🟢 **Search (POST /v1/search)**: 146ms (excellent)
- 🔴 **Quick Analysis (POST /v1/agent/analyze/contact)**: 8461ms (slow)
- 🟢 **Warmth Recompute (POST /v1/warmth/recompute)**: 289ms (excellent)

## Recommendations

### Operations Needing Optimization

- **Compose Prepare (POST /v1/compose)** (4408ms)
- **Quick Analysis (POST /v1/agent/analyze/contact)** (8461ms)

---

Generated: 2025-10-21T03:53:25.939Z