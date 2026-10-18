# E2E Test: Templates, Warmth, Pipelines

- **Run ID**: aaf8d5f9-cf21-4cc5-b26b-cc7b1eacc35a
- **Timestamp**: 2025-10-21T03:52:47.582Z
- **Backend**: https://ever-reach-be.vercel.app/api
- **Origin**: https://everreach.app

## Test Results

### Templates


### Warmth


### Pipelines


### Goals


**Summary**: 12 passed, 2 failed

### ❌ POST /v1/templates (create)

- **Status**: 500
- **Duration**: 250ms

### ❌ GET /v1/templates (list)

- **Status**: 500
- **Duration**: 171ms
- **Count**: 0

### ✅ POST /v1/warmth/recompute (with contact_ids)

- **Status**: 200
- **Duration**: 482ms
- **Results Count**: 1

### ✅ POST /v1/contacts/:id/warmth/recompute (single)

- **Status**: 200
- **Duration**: 328ms
- **Warmth Score**: 30

### ✅ POST /v1/pipelines (create)

- **Status**: 201
- **Duration**: 332ms
- **Pipeline ID**: 2732c7c9-14f2-4678-9d83-f23bc688fc2a

### ✅ GET /v1/pipelines (list)

- **Status**: 200
- **Duration**: 104ms
- **Count**: 4

### ✅ GET /v1/pipelines/:id (get single)

- **Status**: 200
- **Duration**: 152ms

### ✅ PATCH /v1/pipelines/:id (update)

- **Status**: 200
- **Duration**: 110ms

### ✅ DELETE /v1/pipelines/:id (delete)

- **Status**: 200
- **Duration**: 184ms

### ✅ POST /v1/goals (create)

- **Status**: 201
- **Duration**: 252ms
- **Goal ID**: 8bc58735-62ca-4ee4-8d99-2ec3acc6942e

### ✅ GET /v1/goals (list)

- **Status**: 200
- **Duration**: 108ms
- **Count**: 1

### ✅ GET /v1/goals/:id (get single)

- **Status**: 200
- **Duration**: 170ms

### ✅ PATCH /v1/goals/:id (update)

- **Status**: 200
- **Duration**: 136ms

### ✅ DELETE /v1/goals/:id (delete)

- **Status**: 200
- **Duration**: 136ms
