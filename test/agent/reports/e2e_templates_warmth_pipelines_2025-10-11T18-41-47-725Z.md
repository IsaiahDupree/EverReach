# E2E Test: Templates, Warmth, Pipelines

- **Run ID**: 7c49577c-d444-41d2-bb7b-c0ce8d301067
- **Timestamp**: 2025-10-11T18:41:46.170Z
- **Backend**: https://ever-reach-be.vercel.app/api
- **Origin**: https://everreach.app

## Test Results

### Templates


### Warmth


### Pipelines


### Goals


**Summary**: 5 passed, 5 failed

### ❌ POST /v1/templates (create)

- **Status**: 500
- **Duration**: 206ms

### ❌ GET /v1/templates (list)

- **Status**: 200
- **Duration**: 116ms
- **Count**: 0

### ✅ POST /v1/warmth/recompute (with contact_ids)

- **Status**: 0
- **Duration**: 0ms
- **Note**: Skipped - no test contact available

### ❌ POST /v1/pipelines (create)

- **Status**: 405
- **Duration**: 64ms

### ❌ GET /v1/pipelines (list)

- **Status**: 200
- **Duration**: 119ms
- **Count**: 0

### ✅ POST /v1/goals (create)

- **Status**: 201
- **Duration**: 125ms
- **Goal ID**: df9441ac-a245-40df-a18b-6c604cbfd560

### ❌ GET /v1/goals (list)

- **Status**: 200
- **Duration**: 112ms
- **Count**: 0

### ✅ GET /v1/goals/:id (get single)

- **Status**: 200
- **Duration**: 108ms

### ✅ PATCH /v1/goals/:id (update)

- **Status**: 200
- **Duration**: 111ms

### ✅ DELETE /v1/goals/:id (delete)

- **Status**: 200
- **Duration**: 130ms
