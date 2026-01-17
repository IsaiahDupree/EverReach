# E2E Test: Templates, Warmth, Pipelines

- **Run ID**: d3b04fe2-0107-433a-b0d0-df7ed037cf14
- **Timestamp**: 2025-11-21T22:47:14.386Z
- **Backend**: https://ever-reach-be.vercel.app/api
- **Origin**: https://everreach.app

## Test Results

### Templates


### Warmth


### Pipelines


### Goals


**Summary**: 17 passed, 0 failed

### ✅ POST /v1/templates (create)

- **Status**: 201
- **Duration**: 229ms
- **Template ID**: 139363af-c960-4dd3-bcbe-6356efaa21c1

### ✅ GET /v1/templates (list)

- **Status**: 200
- **Duration**: 144ms
- **Count**: 1

### ✅ GET /v1/templates/:id (get single)

- **Status**: 200
- **Duration**: 146ms

### ✅ PATCH /v1/templates/:id (update)

- **Status**: 200
- **Duration**: 128ms

### ✅ DELETE /v1/templates/:id (delete)

- **Status**: 200
- **Duration**: 129ms

### ✅ POST /v1/warmth/recompute (with contact_ids)

- **Status**: 200
- **Duration**: 610ms
- **Results Count**: 1

### ✅ POST /v1/contacts/:id/warmth/recompute (single)

- **Status**: 200
- **Duration**: 254ms
- **Warmth Score**: 30

### ✅ POST /v1/pipelines (create)

- **Status**: 201
- **Duration**: 225ms
- **Pipeline ID**: f42762ba-1fc0-4d84-b62f-e9ff46cae9c6

### ✅ GET /v1/pipelines (list)

- **Status**: 200
- **Duration**: 109ms
- **Count**: 4

### ✅ GET /v1/pipelines/:id (get single)

- **Status**: 200
- **Duration**: 115ms

### ✅ PATCH /v1/pipelines/:id (update)

- **Status**: 200
- **Duration**: 119ms

### ✅ DELETE /v1/pipelines/:id (delete)

- **Status**: 200
- **Duration**: 113ms

### ✅ POST /v1/goals (create)

- **Status**: 201
- **Duration**: 164ms
- **Goal ID**: d9289209-4595-4b10-9be3-a622913588a8

### ✅ GET /v1/goals (list)

- **Status**: 200
- **Duration**: 200ms
- **Count**: 1

### ✅ GET /v1/goals/:id (get single)

- **Status**: 200
- **Duration**: 134ms

### ✅ PATCH /v1/goals/:id (update)

- **Status**: 200
- **Duration**: 107ms

### ✅ DELETE /v1/goals/:id (delete)

- **Status**: 200
- **Duration**: 124ms
