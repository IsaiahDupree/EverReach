# E2E Test: Templates, Warmth, Pipelines

- **Run ID**: 3c61a0ce-3966-4d55-9fcc-d625a821974b
- **Timestamp**: 2025-11-21T23:04:29.217Z
- **Backend**: http://localhost:3000/api
- **Origin**: https://everreach.app

## Test Results

### Templates


### Warmth


### Pipelines


### Goals


**Summary**: 17 passed, 0 failed

### ✅ POST /v1/templates (create)

- **Status**: 201
- **Duration**: 520ms
- **Template ID**: 11120ca7-84b1-4a7a-9c28-f2d8381135a6

### ✅ GET /v1/templates (list)

- **Status**: 200
- **Duration**: 167ms
- **Count**: 1

### ✅ GET /v1/templates/:id (get single)

- **Status**: 200
- **Duration**: 348ms

### ✅ PATCH /v1/templates/:id (update)

- **Status**: 200
- **Duration**: 831ms

### ✅ DELETE /v1/templates/:id (delete)

- **Status**: 200
- **Duration**: 129ms

### ✅ POST /v1/warmth/recompute (with contact_ids)

- **Status**: 200
- **Duration**: 988ms
- **Results Count**: 1

### ✅ POST /v1/contacts/:id/warmth/recompute (single)

- **Status**: 200
- **Duration**: 772ms
- **Warmth Score**: 30

### ✅ POST /v1/pipelines (create)

- **Status**: 201
- **Duration**: 303ms
- **Pipeline ID**: 65090a82-0164-4acd-afa4-a04a9b6b4cd9

### ✅ GET /v1/pipelines (list)

- **Status**: 200
- **Duration**: 203ms
- **Count**: 4

### ✅ GET /v1/pipelines/:id (get single)

- **Status**: 200
- **Duration**: 117ms

### ✅ PATCH /v1/pipelines/:id (update)

- **Status**: 200
- **Duration**: 135ms

### ✅ DELETE /v1/pipelines/:id (delete)

- **Status**: 200
- **Duration**: 168ms

### ✅ POST /v1/goals (create)

- **Status**: 201
- **Duration**: 212ms
- **Goal ID**: d4abe54e-9d41-4a6a-8b98-421e9c901e60

### ✅ GET /v1/goals (list)

- **Status**: 200
- **Duration**: 100ms
- **Count**: 1

### ✅ GET /v1/goals/:id (get single)

- **Status**: 200
- **Duration**: 142ms

### ✅ PATCH /v1/goals/:id (update)

- **Status**: 200
- **Duration**: 116ms

### ✅ DELETE /v1/goals/:id (delete)

- **Status**: 200
- **Duration**: 114ms
