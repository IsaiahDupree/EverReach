# E2E Test: Templates, Warmth, Pipelines

- **Run ID**: f3313c99-573d-477b-af52-28b11180577b
- **Timestamp**: 2025-11-21T22:20:09.439Z
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
- **Duration**: 423ms
- **Template ID**: 9c042fb2-57d6-4ee5-8af5-964628dbe490

### ✅ GET /v1/templates (list)

- **Status**: 200
- **Duration**: 135ms
- **Count**: 1

### ✅ GET /v1/templates/:id (get single)

- **Status**: 200
- **Duration**: 532ms

### ✅ PATCH /v1/templates/:id (update)

- **Status**: 200
- **Duration**: 131ms

### ✅ DELETE /v1/templates/:id (delete)

- **Status**: 200
- **Duration**: 129ms

### ✅ POST /v1/warmth/recompute (with contact_ids)

- **Status**: 200
- **Duration**: 1276ms
- **Results Count**: 1

### ✅ POST /v1/contacts/:id/warmth/recompute (single)

- **Status**: 200
- **Duration**: 1174ms
- **Warmth Score**: 30

### ✅ POST /v1/pipelines (create)

- **Status**: 201
- **Duration**: 523ms
- **Pipeline ID**: c640af5a-1daf-4280-8317-fb6615a21f94

### ✅ GET /v1/pipelines (list)

- **Status**: 200
- **Duration**: 199ms
- **Count**: 4

### ✅ GET /v1/pipelines/:id (get single)

- **Status**: 200
- **Duration**: 883ms

### ✅ PATCH /v1/pipelines/:id (update)

- **Status**: 200
- **Duration**: 154ms

### ✅ DELETE /v1/pipelines/:id (delete)

- **Status**: 200
- **Duration**: 177ms

### ✅ POST /v1/goals (create)

- **Status**: 201
- **Duration**: 301ms
- **Goal ID**: bb2db97d-0768-4f21-a584-74490c090bd0

### ✅ GET /v1/goals (list)

- **Status**: 200
- **Duration**: 93ms
- **Count**: 1

### ✅ GET /v1/goals/:id (get single)

- **Status**: 200
- **Duration**: 398ms

### ✅ PATCH /v1/goals/:id (update)

- **Status**: 200
- **Duration**: 95ms

### ✅ DELETE /v1/goals/:id (delete)

- **Status**: 200
- **Duration**: 161ms
