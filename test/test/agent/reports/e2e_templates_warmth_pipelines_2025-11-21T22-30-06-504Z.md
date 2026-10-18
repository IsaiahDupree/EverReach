# E2E Test: Templates, Warmth, Pipelines

- **Run ID**: ad910967-de75-4516-a0b8-515fdba8abe7
- **Timestamp**: 2025-11-21T22:29:58.776Z
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
- **Duration**: 2213ms
- **Template ID**: 50538521-2639-4065-abfc-1c74b3ca6d85

### ✅ GET /v1/templates (list)

- **Status**: 200
- **Duration**: 110ms
- **Count**: 1

### ✅ GET /v1/templates/:id (get single)

- **Status**: 200
- **Duration**: 195ms

### ✅ PATCH /v1/templates/:id (update)

- **Status**: 200
- **Duration**: 105ms

### ✅ DELETE /v1/templates/:id (delete)

- **Status**: 200
- **Duration**: 104ms

### ✅ POST /v1/warmth/recompute (with contact_ids)

- **Status**: 200
- **Duration**: 1190ms
- **Results Count**: 1

### ✅ POST /v1/contacts/:id/warmth/recompute (single)

- **Status**: 200
- **Duration**: 764ms
- **Warmth Score**: 30

### ✅ POST /v1/pipelines (create)

- **Status**: 201
- **Duration**: 340ms
- **Pipeline ID**: b420811d-ed9b-4cc0-80f8-3dc77ea76ffa

### ✅ GET /v1/pipelines (list)

- **Status**: 200
- **Duration**: 116ms
- **Count**: 4

### ✅ GET /v1/pipelines/:id (get single)

- **Status**: 200
- **Duration**: 176ms

### ✅ PATCH /v1/pipelines/:id (update)

- **Status**: 200
- **Duration**: 120ms

### ✅ DELETE /v1/pipelines/:id (delete)

- **Status**: 200
- **Duration**: 115ms

### ✅ POST /v1/goals (create)

- **Status**: 201
- **Duration**: 271ms
- **Goal ID**: 1d528dc9-e5ec-4316-b667-497d9f48a9bd

### ✅ GET /v1/goals (list)

- **Status**: 200
- **Duration**: 119ms
- **Count**: 1

### ✅ GET /v1/goals/:id (get single)

- **Status**: 200
- **Duration**: 341ms

### ✅ PATCH /v1/goals/:id (update)

- **Status**: 200
- **Duration**: 112ms

### ✅ DELETE /v1/goals/:id (delete)

- **Status**: 200
- **Duration**: 152ms
