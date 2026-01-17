# E2E Test: Templates, Warmth, Pipelines

- **Run ID**: ee4b8918-5390-46a1-9e13-ff27c8637727
- **Timestamp**: 2025-11-21T22:30:06.570Z
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
- **Duration**: 275ms
- **Template ID**: c3710018-bd34-4c31-86c5-6d7186f78b2c

### ✅ GET /v1/templates (list)

- **Status**: 200
- **Duration**: 145ms
- **Count**: 1

### ✅ GET /v1/templates/:id (get single)

- **Status**: 200
- **Duration**: 120ms

### ✅ PATCH /v1/templates/:id (update)

- **Status**: 200
- **Duration**: 119ms

### ✅ DELETE /v1/templates/:id (delete)

- **Status**: 200
- **Duration**: 107ms

### ✅ POST /v1/warmth/recompute (with contact_ids)

- **Status**: 200
- **Duration**: 408ms
- **Results Count**: 1

### ✅ POST /v1/contacts/:id/warmth/recompute (single)

- **Status**: 200
- **Duration**: 184ms
- **Warmth Score**: 30

### ✅ POST /v1/pipelines (create)

- **Status**: 201
- **Duration**: 210ms
- **Pipeline ID**: 3d1baea8-09fa-427c-a954-882793078bbf

### ✅ GET /v1/pipelines (list)

- **Status**: 200
- **Duration**: 106ms
- **Count**: 4

### ✅ GET /v1/pipelines/:id (get single)

- **Status**: 200
- **Duration**: 104ms

### ✅ PATCH /v1/pipelines/:id (update)

- **Status**: 200
- **Duration**: 135ms

### ✅ DELETE /v1/pipelines/:id (delete)

- **Status**: 200
- **Duration**: 311ms

### ✅ POST /v1/goals (create)

- **Status**: 201
- **Duration**: 149ms
- **Goal ID**: eaf92366-a4c4-46a6-a2ab-7802e5689b74

### ✅ GET /v1/goals (list)

- **Status**: 200
- **Duration**: 134ms
- **Count**: 1

### ✅ GET /v1/goals/:id (get single)

- **Status**: 200
- **Duration**: 119ms

### ✅ PATCH /v1/goals/:id (update)

- **Status**: 200
- **Duration**: 105ms

### ✅ DELETE /v1/goals/:id (delete)

- **Status**: 200
- **Duration**: 106ms
