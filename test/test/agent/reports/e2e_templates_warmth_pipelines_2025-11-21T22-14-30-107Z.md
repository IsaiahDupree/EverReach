# E2E Test: Templates, Warmth, Pipelines

- **Run ID**: 67dae966-95dd-4fe8-a272-10846f3c81aa
- **Timestamp**: 2025-11-21T22:14:29.309Z
- **Backend**: https://ever-reach-be.vercel.app
- **Origin**: https://everreach.app

## Test Results

### Templates


### Warmth


### Pipelines


### Goals


**Summary**: 1 passed, 6 failed

### ❌ POST /v1/templates (create)

- **Status**: 405
- **Duration**: 126ms

### ❌ GET /v1/templates (list)

- **Status**: 404
- **Duration**: 42ms
- **Count**: 0

### ✅ POST /v1/warmth/recompute (with contact_ids)

- **Status**: 0
- **Duration**: 0ms
- **Note**: Skipped - no test contact available

### ❌ POST /v1/pipelines (create)

- **Status**: 405
- **Duration**: 38ms

### ❌ GET /v1/pipelines (list)

- **Status**: 404
- **Duration**: 46ms
- **Count**: 0

### ❌ POST /v1/goals (create)

- **Status**: 405
- **Duration**: 38ms

### ❌ GET /v1/goals (list)

- **Status**: 404
- **Duration**: 42ms
- **Count**: 0
