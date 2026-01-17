# E2E Test: Interactions

- **Run ID**: 4a5bf217-0b0f-4339-8157-1b8ac545e6ac
- **Timestamp**: 2025-10-21T04:13:26.530Z
- **Backend**: https://ever-reach-be.vercel.app/api
- **Origin**: https://everreach.app

- **Test Contact**: f14821e0-669f-4af4-a0cf-3c3d0a5146f8

## Test Results

**Summary**: 2 passed, 4 failed

### ✅ POST /v1/interactions (create)

- **Status**: 200
- **Duration**: 188ms
- **Interaction ID**: c44b8a31-6e0a-4a34-b0be-1b36edc816fc

### ❌ GET /v1/interactions (list)

- **Status**: 200
- **Duration**: 114ms
- **Count**: 0

### ❌ GET /v1/interactions?contact_id= (filter)

- **Status**: 200
- **Duration**: 122ms
- **Count**: 0

### ✅ GET /v1/interactions/:id (get single)

- **Status**: 200
- **Duration**: 193ms
- **Kind**: email

### ❌ PATCH /v1/interactions/:id (update)

- **Status**: 400
- **Duration**: 64ms

### ❌ GET /v1/interactions?kind= (filter by type)

- **Status**: 200
- **Duration**: 103ms
- **Count**: 0
