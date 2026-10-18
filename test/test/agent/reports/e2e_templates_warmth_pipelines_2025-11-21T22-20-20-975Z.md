# E2E Test: Templates, Warmth, Pipelines

- **Run ID**: 73574017-fe04-4ab5-ad4f-3a7b03dd37b9
- **Timestamp**: 2025-11-21T22:20:17.314Z
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
- **Duration**: 314ms
- **Template ID**: a1463e0d-fb53-4ea5-ac48-8806b074e5e9

### ✅ GET /v1/templates (list)

- **Status**: 200
- **Duration**: 217ms
- **Count**: 1

### ✅ GET /v1/templates/:id (get single)

- **Status**: 200
- **Duration**: 181ms

### ✅ PATCH /v1/templates/:id (update)

- **Status**: 200
- **Duration**: 114ms

### ✅ DELETE /v1/templates/:id (delete)

- **Status**: 200
- **Duration**: 114ms

### ✅ POST /v1/warmth/recompute (with contact_ids)

- **Status**: 200
- **Duration**: 435ms
- **Results Count**: 1

### ✅ POST /v1/contacts/:id/warmth/recompute (single)

- **Status**: 200
- **Duration**: 220ms
- **Warmth Score**: 30

### ✅ POST /v1/pipelines (create)

- **Status**: 201
- **Duration**: 309ms
- **Pipeline ID**: 298e840a-d083-4d9f-a169-ce8fc84d41bd

### ✅ GET /v1/pipelines (list)

- **Status**: 200
- **Duration**: 119ms
- **Count**: 4

### ✅ GET /v1/pipelines/:id (get single)

- **Status**: 200
- **Duration**: 199ms

### ✅ PATCH /v1/pipelines/:id (update)

- **Status**: 200
- **Duration**: 125ms

### ✅ DELETE /v1/pipelines/:id (delete)

- **Status**: 200
- **Duration**: 115ms

### ✅ POST /v1/goals (create)

- **Status**: 201
- **Duration**: 163ms
- **Goal ID**: f30eceda-94be-4407-acdc-7150d3c80d57

### ✅ GET /v1/goals (list)

- **Status**: 200
- **Duration**: 124ms
- **Count**: 1

### ✅ GET /v1/goals/:id (get single)

- **Status**: 200
- **Duration**: 187ms

### ✅ PATCH /v1/goals/:id (update)

- **Status**: 200
- **Duration**: 115ms

### ✅ DELETE /v1/goals/:id (delete)

- **Status**: 200
- **Duration**: 109ms
