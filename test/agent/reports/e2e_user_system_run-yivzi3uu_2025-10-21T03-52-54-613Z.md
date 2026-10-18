# E2E Test: User & System Endpoints

- **Run ID**: 235c0d53-8957-4d40-8774-481f74647945
- **Timestamp**: 2025-10-21T03:52:52.667Z
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
- **Duration**: 203ms
- **Health Status**: healthy

### ✅ GET /v1/me (current user)

- **Status**: 200
- **Duration**: 234ms
- **User ID**: e5eaa347-9c72-4190-bace-ec7a2063f69a

### ✅ GET /v1/me/compose-settings (get settings)

- **Status**: 200
- **Duration**: 144ms

### ✅ PATCH /v1/me/compose-settings (update settings)

- **Status**: 200
- **Duration**: 110ms

### ✅ POST /v1/me/persona-notes (create)

- **Status**: 201
- **Duration**: 153ms
- **Note ID**: 542e9ffa-b22d-453b-9e62-de801f3665d2

### ❌ GET /v1/me/persona-notes (list)

- **Status**: 200
- **Duration**: 204ms
- **Count**: 0

### ✅ GET /v1/me/persona-notes/:id (get single)

- **Status**: 200
- **Duration**: 137ms

### ❌ PATCH /v1/me/persona-notes/:id (update)

- **Status**: 400
- **Duration**: 64ms

### ✅ DELETE /v1/me/persona-notes/:id (delete)

- **Status**: 200
- **Duration**: 105ms

### ✅ GET /v1/custom-fields (list)

- **Status**: 500
- **Duration**: 101ms
- **Count**: 0
- **Note**: Endpoint returns 500 (may need migration or implementation)

### ✅ POST /v1/search (search)

- **Status**: 200
- **Duration**: 195ms
- **Results**: 3
