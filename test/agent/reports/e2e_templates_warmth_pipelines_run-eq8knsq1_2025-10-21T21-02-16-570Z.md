# E2E Test: Templates, Warmth, Pipelines

- **Run ID**: fb439813-4209-44b2-8c20-0b76c14beb2b
- **Timestamp**: 2025-10-21T21:02:11.309Z
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
- **Template ID**: 5e48b475-8f27-4bd5-832b-774e376a6ebd

### ✅ GET /v1/templates (list)

- **Status**: 200
- **Duration**: 115ms
- **Count**: 1

### ✅ GET /v1/templates/:id (get single)

- **Status**: 200
- **Duration**: 126ms

### ✅ PATCH /v1/templates/:id (update)

- **Status**: 200
- **Duration**: 114ms

### ✅ DELETE /v1/templates/:id (delete)

- **Status**: 200
- **Duration**: 132ms

### ✅ POST /v1/warmth/recompute (with contact_ids)

- **Status**: 200
- **Duration**: 381ms
- **Results Count**: 1

### ✅ POST /v1/contacts/:id/warmth/recompute (single)

- **Status**: 200
- **Duration**: 302ms
- **Warmth Score**: 30

### ✅ POST /v1/pipelines (create)

- **Status**: 201
- **Duration**: 270ms
- **Pipeline ID**: 3759fce2-4465-4bf7-a642-84015695a6aa

### ✅ GET /v1/pipelines (list)

- **Status**: 200
- **Duration**: 132ms
- **Count**: 4

### ✅ GET /v1/pipelines/:id (get single)

- **Status**: 200
- **Duration**: 132ms

### ✅ PATCH /v1/pipelines/:id (update)

- **Status**: 200
- **Duration**: 135ms

### ✅ DELETE /v1/pipelines/:id (delete)

- **Status**: 200
- **Duration**: 171ms

### ✅ POST /v1/goals (create)

- **Status**: 201
- **Duration**: 162ms
- **Goal ID**: 60173366-2370-463b-bea9-0e3b940c75eb

### ✅ GET /v1/goals (list)

- **Status**: 200
- **Duration**: 425ms
- **Count**: 1

### ✅ GET /v1/goals/:id (get single)

- **Status**: 200
- **Duration**: 134ms

### ✅ PATCH /v1/goals/:id (update)

- **Status**: 200
- **Duration**: 130ms

### ✅ DELETE /v1/goals/:id (delete)

- **Status**: 200
- **Duration**: 141ms
