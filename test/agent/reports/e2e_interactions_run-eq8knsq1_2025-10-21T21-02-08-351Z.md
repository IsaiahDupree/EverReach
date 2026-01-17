# E2E Test: Interactions

- **Run ID**: 8b702fb3-92ad-40b1-81e6-af5e8e8ee922
- **Timestamp**: 2025-10-21T21:02:06.749Z
- **Backend**: https://ever-reach-be.vercel.app/api
- **Origin**: https://everreach.app

- **Test Contact**: 7b43d580-aed6-4457-a33d-457984d269bb

## Test Results

**Summary**: 2 passed, 4 failed

### ✅ POST /v1/interactions (create)

- **Status**: 200
- **Duration**: 278ms
- **Interaction ID**: 401772f2-3882-4617-ba9a-5b0f120405e2

### ❌ GET /v1/interactions (list)

- **Status**: 200
- **Duration**: 107ms
- **Count**: 0

### ❌ GET /v1/interactions?contact_id= (filter)

- **Status**: 200
- **Duration**: 121ms
- **Count**: 0

### ✅ GET /v1/interactions/:id (get single)

- **Status**: 200
- **Duration**: 232ms
- **Kind**: email

### ❌ PATCH /v1/interactions/:id (update)

- **Status**: 400
- **Duration**: 66ms

### ❌ GET /v1/interactions?kind= (filter by type)

- **Status**: 200
- **Duration**: 127ms
- **Count**: 0
