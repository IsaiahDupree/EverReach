# E2E Test: Interactions

- **Run ID**: 1763fc2e-6714-46c7-8e0a-1b77cc3769fd
- **Timestamp**: 2025-10-21T03:52:42.910Z
- **Backend**: https://ever-reach-be.vercel.app/api
- **Origin**: https://everreach.app

- **Test Contact**: 9f798747-249a-44af-bb53-0b952169de50

## Test Results

**Summary**: 2 passed, 4 failed

### ✅ POST /v1/interactions (create)

- **Status**: 200
- **Duration**: 206ms
- **Interaction ID**: e32b15aa-6385-4f06-a471-5ad23e548d34

### ❌ GET /v1/interactions (list)

- **Status**: 200
- **Duration**: 110ms
- **Count**: 0

### ❌ GET /v1/interactions?contact_id= (filter)

- **Status**: 200
- **Duration**: 110ms
- **Count**: 0

### ✅ GET /v1/interactions/:id (get single)

- **Status**: 200
- **Duration**: 209ms
- **Kind**: email

### ❌ PATCH /v1/interactions/:id (update)

- **Status**: 400
- **Duration**: 66ms

### ❌ GET /v1/interactions?kind= (filter by type)

- **Status**: 200
- **Duration**: 110ms
- **Count**: 0
