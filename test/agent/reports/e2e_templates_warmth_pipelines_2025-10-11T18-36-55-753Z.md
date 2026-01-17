# E2E Test: Templates, Warmth, Pipelines

- **Run ID**: 51763961-06d9-4f5e-bb0d-6c86235f45ed
- **Timestamp**: 2025-10-11T18:36:54.149Z
- **Backend**: https://ever-reach-be.vercel.app/api
- **Origin**: https://everreach.app

## Test Results

### Templates


### Warmth


### Pipelines


### Goals


**Summary**: 5 passed, 5 failed

### ❌ POST /v1/templates (create)

- **Status**: 500
- **Duration**: 255ms

### ❌ GET /v1/templates (list)

- **Status**: 200
- **Duration**: 106ms
- **Count**: 0

### ✅ POST /v1/warmth/recompute (with contact_ids)

- **Status**: 0
- **Duration**: 0ms
- **Note**: Skipped - no test contact available

### ❌ POST /v1/pipelines (create)

- **Status**: 405
- **Duration**: 60ms

### ❌ GET /v1/pipelines (list)

- **Status**: 200
- **Duration**: 109ms
- **Count**: 0

### ✅ POST /v1/goals (create)

- **Status**: 201
- **Duration**: 119ms
- **Goal ID**: b1abb45a-ba19-464c-ba16-d35b1b16b888

### ❌ GET /v1/goals (list)

- **Status**: 200
- **Duration**: 106ms
- **Count**: 0

### ✅ GET /v1/goals/:id (get single)

- **Status**: 200
- **Duration**: 175ms

### ✅ PATCH /v1/goals/:id (update)

- **Status**: 200
- **Duration**: 114ms

### ✅ DELETE /v1/goals/:id (delete)

- **Status**: 200
- **Duration**: 133ms
