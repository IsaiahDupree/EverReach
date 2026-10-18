# E2E Test: Templates, Warmth, Pipelines

- **Run ID**: 44794a18-913c-4007-9c67-28aa7134a761
- **Timestamp**: 2025-11-21T23:04:35.199Z
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
- **Duration**: 228ms
- **Template ID**: 2823710c-c6ad-41d5-987a-10a09dbad10e

### ✅ GET /v1/templates (list)

- **Status**: 200
- **Duration**: 127ms
- **Count**: 1

### ✅ GET /v1/templates/:id (get single)

- **Status**: 200
- **Duration**: 121ms

### ✅ PATCH /v1/templates/:id (update)

- **Status**: 200
- **Duration**: 125ms

### ✅ DELETE /v1/templates/:id (delete)

- **Status**: 200
- **Duration**: 109ms

### ✅ POST /v1/warmth/recompute (with contact_ids)

- **Status**: 200
- **Duration**: 312ms
- **Results Count**: 1

### ✅ POST /v1/contacts/:id/warmth/recompute (single)

- **Status**: 200
- **Duration**: 164ms
- **Warmth Score**: 30

### ✅ POST /v1/pipelines (create)

- **Status**: 201
- **Duration**: 252ms
- **Pipeline ID**: 780f5718-a091-4d29-9692-a628ed8a3e5f

### ✅ GET /v1/pipelines (list)

- **Status**: 200
- **Duration**: 110ms
- **Count**: 4

### ✅ GET /v1/pipelines/:id (get single)

- **Status**: 200
- **Duration**: 115ms

### ✅ PATCH /v1/pipelines/:id (update)

- **Status**: 200
- **Duration**: 134ms

### ✅ DELETE /v1/pipelines/:id (delete)

- **Status**: 200
- **Duration**: 149ms

### ✅ POST /v1/goals (create)

- **Status**: 201
- **Duration**: 160ms
- **Goal ID**: d531bc68-53bb-4df0-9d36-247e7af589fa

### ✅ GET /v1/goals (list)

- **Status**: 200
- **Duration**: 113ms
- **Count**: 1

### ✅ GET /v1/goals/:id (get single)

- **Status**: 200
- **Duration**: 139ms

### ✅ PATCH /v1/goals/:id (update)

- **Status**: 200
- **Duration**: 111ms

### ✅ DELETE /v1/goals/:id (delete)

- **Status**: 200
- **Duration**: 118ms
