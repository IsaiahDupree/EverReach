# E2E Test: Templates, Warmth, Pipelines

- **Run ID**: eb5ca55f-d51a-44e5-88f0-54b56fcd516b
- **Timestamp**: 2025-11-21T22:58:00.853Z
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
- **Duration**: 289ms
- **Template ID**: 845695f6-36af-4bae-8a03-4f02772a207e

### ✅ GET /v1/templates (list)

- **Status**: 200
- **Duration**: 144ms
- **Count**: 1

### ✅ GET /v1/templates/:id (get single)

- **Status**: 200
- **Duration**: 168ms

### ✅ PATCH /v1/templates/:id (update)

- **Status**: 200
- **Duration**: 129ms

### ✅ DELETE /v1/templates/:id (delete)

- **Status**: 200
- **Duration**: 115ms

### ✅ POST /v1/warmth/recompute (with contact_ids)

- **Status**: 200
- **Duration**: 309ms
- **Results Count**: 1

### ✅ POST /v1/contacts/:id/warmth/recompute (single)

- **Status**: 200
- **Duration**: 174ms
- **Warmth Score**: 30

### ✅ POST /v1/pipelines (create)

- **Status**: 201
- **Duration**: 257ms
- **Pipeline ID**: 2771880a-e5d9-467f-8de4-fbab856f0012

### ✅ GET /v1/pipelines (list)

- **Status**: 200
- **Duration**: 132ms
- **Count**: 4

### ✅ GET /v1/pipelines/:id (get single)

- **Status**: 200
- **Duration**: 136ms

### ✅ PATCH /v1/pipelines/:id (update)

- **Status**: 200
- **Duration**: 164ms

### ✅ DELETE /v1/pipelines/:id (delete)

- **Status**: 200
- **Duration**: 123ms

### ✅ POST /v1/goals (create)

- **Status**: 201
- **Duration**: 214ms
- **Goal ID**: 5c849095-6adc-4cdc-9143-37dca0a32d4e

### ✅ GET /v1/goals (list)

- **Status**: 200
- **Duration**: 122ms
- **Count**: 1

### ✅ GET /v1/goals/:id (get single)

- **Status**: 200
- **Duration**: 113ms

### ✅ PATCH /v1/goals/:id (update)

- **Status**: 200
- **Duration**: 133ms

### ✅ DELETE /v1/goals/:id (delete)

- **Status**: 200
- **Duration**: 119ms
