# E2E Test: User & System Endpoints

- **Run ID**: 37690f88-c77f-41d9-845c-a847696435df
- **Timestamp**: 2025-10-21T04:13:37.067Z
- **Backend**: https://ever-reach-be.vercel.app/api
- **Origin**: https://everreach.app

## Test Results

### System


### User Profile


### Persona Notes


### Custom Fields


### Search


**Summary**: 9 passed, 2 failed

### ✅ GET /health (health check)

- **Status**: 200
- **Duration**: 181ms
- **Health Status**: healthy

### ✅ GET /v1/me (current user)

- **Status**: 200
- **Duration**: 183ms
- **User ID**: e5eaa347-9c72-4190-bace-ec7a2063f69a

### ✅ GET /v1/me/compose-settings (get settings)

- **Status**: 200
- **Duration**: 130ms

### ✅ PATCH /v1/me/compose-settings (update settings)

- **Status**: 200
- **Duration**: 101ms

### ✅ POST /v1/me/persona-notes (create)

- **Status**: 201
- **Duration**: 167ms
- **Note ID**: 5ea6bad4-eac9-4617-9098-1d83562d930a

### ❌ GET /v1/me/persona-notes (list)

- **Status**: 200
- **Duration**: 220ms
- **Count**: 0

### ✅ GET /v1/me/persona-notes/:id (get single)

- **Status**: 200
- **Duration**: 121ms

### ❌ PATCH /v1/me/persona-notes/:id (update)

- **Status**: 400
- **Duration**: 62ms

### ✅ DELETE /v1/me/persona-notes/:id (delete)

- **Status**: 200
- **Duration**: 120ms

### ✅ GET /v1/custom-fields (list)

- **Status**: 500
- **Duration**: 80ms
- **Count**: 0
- **Note**: Endpoint returns 500 (may need migration or implementation)

### ✅ POST /v1/search (search)

- **Status**: 200
- **Duration**: 247ms
- **Results**: 8
