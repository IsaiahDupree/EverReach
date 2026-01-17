# E2E Test: Templates, Warmth, Pipelines

- **Run ID**: 29b8fb04-b96a-4292-ad0b-cf80b4cfd12d
- **Timestamp**: 2025-10-11T19:11:58.724Z
- **Backend**: https://ever-reach-be.vercel.app/api
- **Origin**: https://everreach.app

## Test Results

### Templates


### Warmth


### Pipelines


### Goals


**Summary**: 6 passed, 5 failed

### ❌ POST /v1/templates (create)

- **Status**: 500
- **Duration**: 188ms

### ❌ GET /v1/templates (list)

- **Status**: 200
- **Duration**: 115ms
- **Count**: 0

### ✅ POST /v1/warmth/recompute (with contact_ids)

- **Status**: 200
- **Duration**: 310ms
- **Results Count**: 1

### ✅ POST /v1/contacts/:id/warmth/recompute (single)

- **Status**: 200
- **Duration**: 214ms

### ❌ POST /v1/pipelines (create)

- **Status**: 405
- **Duration**: 58ms

### ❌ GET /v1/pipelines (list)

- **Status**: 200
- **Duration**: 118ms
- **Count**: 0

### ✅ POST /v1/goals (create)

- **Status**: 201
- **Duration**: 108ms
- **Goal ID**: b6bdcefb-2388-4694-93cc-e4bf3943cf26

### ❌ GET /v1/goals (list)

- **Status**: 200
- **Duration**: 131ms
- **Count**: 0

### ✅ GET /v1/goals/:id (get single)

- **Status**: 200
- **Duration**: 107ms

### ✅ PATCH /v1/goals/:id (update)

- **Status**: 200
- **Duration**: 107ms

### ✅ DELETE /v1/goals/:id (delete)

- **Status**: 200
- **Duration**: 236ms
