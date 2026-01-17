# E2E Test: Templates, Warmth, Pipelines

- **Run ID**: ca5384bf-7118-47d3-a72b-8513eb6bf2da
- **Timestamp**: 2025-11-21T22:57:55.385Z
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
- **Duration**: 372ms
- **Template ID**: 7bb2a07b-04d4-41e4-a398-0043568341f2

### ✅ GET /v1/templates (list)

- **Status**: 200
- **Duration**: 141ms
- **Count**: 1

### ✅ GET /v1/templates/:id (get single)

- **Status**: 200
- **Duration**: 145ms

### ✅ PATCH /v1/templates/:id (update)

- **Status**: 200
- **Duration**: 114ms

### ✅ DELETE /v1/templates/:id (delete)

- **Status**: 200
- **Duration**: 106ms

### ✅ POST /v1/warmth/recompute (with contact_ids)

- **Status**: 200
- **Duration**: 750ms
- **Results Count**: 1

### ✅ POST /v1/contacts/:id/warmth/recompute (single)

- **Status**: 200
- **Duration**: 698ms
- **Warmth Score**: 30

### ✅ POST /v1/pipelines (create)

- **Status**: 201
- **Duration**: 456ms
- **Pipeline ID**: c8596291-6706-435a-a61d-db0f0fc6cacf

### ✅ GET /v1/pipelines (list)

- **Status**: 200
- **Duration**: 119ms
- **Count**: 4

### ✅ GET /v1/pipelines/:id (get single)

- **Status**: 200
- **Duration**: 242ms

### ✅ PATCH /v1/pipelines/:id (update)

- **Status**: 200
- **Duration**: 133ms

### ✅ DELETE /v1/pipelines/:id (delete)

- **Status**: 200
- **Duration**: 116ms

### ✅ POST /v1/goals (create)

- **Status**: 201
- **Duration**: 665ms
- **Goal ID**: c91c303c-2184-4d0c-a31b-d7ab173df9f5

### ✅ GET /v1/goals (list)

- **Status**: 200
- **Duration**: 173ms
- **Count**: 1

### ✅ GET /v1/goals/:id (get single)

- **Status**: 200
- **Duration**: 260ms

### ✅ PATCH /v1/goals/:id (update)

- **Status**: 200
- **Duration**: 157ms

### ✅ DELETE /v1/goals/:id (delete)

- **Status**: 200
- **Duration**: 180ms
