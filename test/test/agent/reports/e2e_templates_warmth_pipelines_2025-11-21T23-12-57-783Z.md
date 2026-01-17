# E2E Test: Templates, Warmth, Pipelines

- **Run ID**: e74783a2-8f41-45fc-aeeb-d06f45965d2f
- **Timestamp**: 2025-11-21T23:12:53.460Z
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
- **Duration**: 162ms
- **Template ID**: b97e2449-bc53-4ad1-beb1-d42685049c1e

### ✅ GET /v1/templates (list)

- **Status**: 200
- **Duration**: 118ms
- **Count**: 1

### ✅ GET /v1/templates/:id (get single)

- **Status**: 200
- **Duration**: 118ms

### ✅ PATCH /v1/templates/:id (update)

- **Status**: 200
- **Duration**: 117ms

### ✅ DELETE /v1/templates/:id (delete)

- **Status**: 200
- **Duration**: 121ms

### ✅ POST /v1/warmth/recompute (with contact_ids)

- **Status**: 200
- **Duration**: 739ms
- **Results Count**: 1

### ✅ POST /v1/contacts/:id/warmth/recompute (single)

- **Status**: 200
- **Duration**: 586ms
- **Warmth Score**: 30

### ✅ POST /v1/pipelines (create)

- **Status**: 201
- **Duration**: 324ms
- **Pipeline ID**: f53ae652-0a9a-4259-8f0f-0dfdc7c09862

### ✅ GET /v1/pipelines (list)

- **Status**: 200
- **Duration**: 105ms
- **Count**: 4

### ✅ GET /v1/pipelines/:id (get single)

- **Status**: 200
- **Duration**: 189ms

### ✅ PATCH /v1/pipelines/:id (update)

- **Status**: 200
- **Duration**: 105ms

### ✅ DELETE /v1/pipelines/:id (delete)

- **Status**: 200
- **Duration**: 173ms

### ✅ POST /v1/goals (create)

- **Status**: 201
- **Duration**: 472ms
- **Goal ID**: ef6c3ea8-b66c-41aa-9e82-982c1db6b263

### ✅ GET /v1/goals (list)

- **Status**: 200
- **Duration**: 96ms
- **Count**: 1

### ✅ GET /v1/goals/:id (get single)

- **Status**: 200
- **Duration**: 127ms

### ✅ PATCH /v1/goals/:id (update)

- **Status**: 200
- **Duration**: 136ms

### ✅ DELETE /v1/goals/:id (delete)

- **Status**: 200
- **Duration**: 137ms
