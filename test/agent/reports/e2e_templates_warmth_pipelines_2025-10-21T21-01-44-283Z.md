# E2E Test: Templates, Warmth, Pipelines

- **Run ID**: ba73c445-4336-4c5d-be7c-06e17e0d0cd1
- **Timestamp**: 2025-10-21T21:01:39.168Z
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
- **Duration**: 245ms
- **Template ID**: 8b550207-9ba6-4a9d-86ee-712be5a320a9

### ✅ GET /v1/templates (list)

- **Status**: 200
- **Duration**: 201ms
- **Count**: 1

### ✅ GET /v1/templates/:id (get single)

- **Status**: 200
- **Duration**: 111ms

### ✅ PATCH /v1/templates/:id (update)

- **Status**: 200
- **Duration**: 171ms

### ✅ DELETE /v1/templates/:id (delete)

- **Status**: 200
- **Duration**: 129ms

### ✅ POST /v1/warmth/recompute (with contact_ids)

- **Status**: 200
- **Duration**: 675ms
- **Results Count**: 1

### ✅ POST /v1/contacts/:id/warmth/recompute (single)

- **Status**: 200
- **Duration**: 532ms
- **Warmth Score**: 30

### ✅ POST /v1/pipelines (create)

- **Status**: 201
- **Duration**: 325ms
- **Pipeline ID**: c1132a4c-fda1-401e-83eb-ae5c610068c5

### ✅ GET /v1/pipelines (list)

- **Status**: 200
- **Duration**: 144ms
- **Count**: 4

### ✅ GET /v1/pipelines/:id (get single)

- **Status**: 200
- **Duration**: 241ms

### ✅ PATCH /v1/pipelines/:id (update)

- **Status**: 200
- **Duration**: 126ms

### ✅ DELETE /v1/pipelines/:id (delete)

- **Status**: 200
- **Duration**: 172ms

### ✅ POST /v1/goals (create)

- **Status**: 201
- **Duration**: 180ms
- **Goal ID**: e78b00ab-d938-481e-8d7c-d80a1bdff3e3

### ✅ GET /v1/goals (list)

- **Status**: 200
- **Duration**: 193ms
- **Count**: 1

### ✅ GET /v1/goals/:id (get single)

- **Status**: 200
- **Duration**: 163ms

### ✅ PATCH /v1/goals/:id (update)

- **Status**: 200
- **Duration**: 138ms

### ✅ DELETE /v1/goals/:id (delete)

- **Status**: 200
- **Duration**: 145ms
