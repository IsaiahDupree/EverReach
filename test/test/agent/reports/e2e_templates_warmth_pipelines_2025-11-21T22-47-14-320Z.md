# E2E Test: Templates, Warmth, Pipelines

- **Run ID**: 3f4c1ef5-3669-495c-80be-72dd8f377d5c
- **Timestamp**: 2025-11-21T22:47:07.498Z
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
- **Duration**: 841ms
- **Template ID**: 1de65d50-8dd6-4aa1-b7d8-e8f98eb651db

### ✅ GET /v1/templates (list)

- **Status**: 200
- **Duration**: 139ms
- **Count**: 1

### ✅ GET /v1/templates/:id (get single)

- **Status**: 200
- **Duration**: 694ms

### ✅ PATCH /v1/templates/:id (update)

- **Status**: 200
- **Duration**: 199ms

### ✅ DELETE /v1/templates/:id (delete)

- **Status**: 200
- **Duration**: 120ms

### ✅ POST /v1/warmth/recompute (with contact_ids)

- **Status**: 200
- **Duration**: 1066ms
- **Results Count**: 1

### ✅ POST /v1/contacts/:id/warmth/recompute (single)

- **Status**: 200
- **Duration**: 689ms
- **Warmth Score**: 30

### ✅ POST /v1/pipelines (create)

- **Status**: 201
- **Duration**: 974ms
- **Pipeline ID**: ee8f830f-aa83-4a10-8dfc-de8ef5ac2245

### ✅ GET /v1/pipelines (list)

- **Status**: 200
- **Duration**: 107ms
- **Count**: 4

### ✅ GET /v1/pipelines/:id (get single)

- **Status**: 200
- **Duration**: 348ms

### ✅ PATCH /v1/pipelines/:id (update)

- **Status**: 200
- **Duration**: 110ms

### ✅ DELETE /v1/pipelines/:id (delete)

- **Status**: 200
- **Duration**: 122ms

### ✅ POST /v1/goals (create)

- **Status**: 201
- **Duration**: 331ms
- **Goal ID**: 8c7021b1-983b-4f8a-9e3e-3511be6a264f

### ✅ GET /v1/goals (list)

- **Status**: 200
- **Duration**: 90ms
- **Count**: 1

### ✅ GET /v1/goals/:id (get single)

- **Status**: 200
- **Duration**: 169ms

### ✅ PATCH /v1/goals/:id (update)

- **Status**: 200
- **Duration**: 108ms

### ✅ DELETE /v1/goals/:id (delete)

- **Status**: 200
- **Duration**: 169ms
