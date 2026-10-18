# E2E Test: Templates, Warmth, Pipelines

- **Run ID**: bc2a7fae-7d91-494d-ba54-d32ebf8f3680
- **Timestamp**: 2025-10-21T04:13:31.426Z
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
- **Duration**: 216ms

### ❌ GET /v1/templates (list)

- **Status**: 500
- **Duration**: 163ms
- **Count**: 0

### ✅ POST /v1/warmth/recompute (with contact_ids)

- **Status**: 200
- **Duration**: 482ms
- **Results Count**: 1

### ✅ POST /v1/contacts/:id/warmth/recompute (single)

- **Status**: 200
- **Duration**: 294ms
- **Warmth Score**: 30

### ✅ POST /v1/pipelines (create)

- **Status**: 201
- **Duration**: 245ms
- **Pipeline ID**: e8e9fa8d-277c-4007-9fef-44d1b2e10c0b

### ✅ GET /v1/pipelines (list)

- **Status**: 200
- **Duration**: 104ms
- **Count**: 4

### ✅ GET /v1/pipelines/:id (get single)

- **Status**: 200
- **Duration**: 147ms

### ✅ PATCH /v1/pipelines/:id (update)

- **Status**: 200
- **Duration**: 100ms

### ✅ DELETE /v1/pipelines/:id (delete)

- **Status**: 200
- **Duration**: 132ms

### ✅ POST /v1/goals (create)

- **Status**: 201
- **Duration**: 169ms
- **Goal ID**: 3f4cd513-77f8-4603-ac23-bf735c0af39d

### ✅ GET /v1/goals (list)

- **Status**: 200
- **Duration**: 100ms
- **Count**: 1

### ✅ GET /v1/goals/:id (get single)

- **Status**: 200
- **Duration**: 173ms

### ✅ PATCH /v1/goals/:id (update)

- **Status**: 200
- **Duration**: 99ms

### ✅ DELETE /v1/goals/:id (delete)

- **Status**: 200
- **Duration**: 168ms
