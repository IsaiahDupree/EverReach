# E2E Test: Templates, Warmth, Pipelines

- **Run ID**: cd2f3b02-61cb-4198-b87a-c0abec7f8ec1
- **Timestamp**: 2025-11-21T23:12:57.822Z
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
- **Duration**: 226ms
- **Template ID**: fc9035d4-1d78-4bbe-8d7d-86a899aa8641

### ✅ GET /v1/templates (list)

- **Status**: 200
- **Duration**: 115ms
- **Count**: 1

### ✅ GET /v1/templates/:id (get single)

- **Status**: 200
- **Duration**: 120ms

### ✅ PATCH /v1/templates/:id (update)

- **Status**: 200
- **Duration**: 133ms

### ✅ DELETE /v1/templates/:id (delete)

- **Status**: 200
- **Duration**: 115ms

### ✅ POST /v1/warmth/recompute (with contact_ids)

- **Status**: 200
- **Duration**: 267ms
- **Results Count**: 1

### ✅ POST /v1/contacts/:id/warmth/recompute (single)

- **Status**: 200
- **Duration**: 169ms
- **Warmth Score**: 30

### ✅ POST /v1/pipelines (create)

- **Status**: 201
- **Duration**: 211ms
- **Pipeline ID**: 38d4b4ac-a116-4c56-bb7e-077b878bc3f3

### ✅ GET /v1/pipelines (list)

- **Status**: 200
- **Duration**: 124ms
- **Count**: 4

### ✅ GET /v1/pipelines/:id (get single)

- **Status**: 200
- **Duration**: 125ms

### ✅ PATCH /v1/pipelines/:id (update)

- **Status**: 200
- **Duration**: 226ms

### ✅ DELETE /v1/pipelines/:id (delete)

- **Status**: 200
- **Duration**: 196ms

### ✅ POST /v1/goals (create)

- **Status**: 201
- **Duration**: 158ms
- **Goal ID**: b85b1b2c-b079-4513-b983-0ec411c93936

### ✅ GET /v1/goals (list)

- **Status**: 200
- **Duration**: 147ms
- **Count**: 1

### ✅ GET /v1/goals/:id (get single)

- **Status**: 200
- **Duration**: 112ms

### ✅ PATCH /v1/goals/:id (update)

- **Status**: 200
- **Duration**: 118ms

### ✅ DELETE /v1/goals/:id (delete)

- **Status**: 200
- **Duration**: 108ms
