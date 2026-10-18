# E2E Test: Advanced Features

- **Run ID**: e6e3f029-8cad-461a-bbdf-8d943d7cee82
- **Timestamp**: 2025-10-21T04:13:19.061Z
- **Backend**: https://ever-reach-be.vercel.app/api
- **Origin**: https://everreach.app

## Test Results

- **Setup Error**: Failed to parse URL from undefined/v1/contacts

### Alerts


### Push Tokens


### Feature Requests


### Feature Buckets


### Analysis Endpoints

**Summary**: 6 passed, 1 failed

### ✅ GET /v1/alerts (list)

- **Status**: 200
- **Duration**: 495ms
- **Count**: 0

### ✅ POST /v1/push-tokens (register)

- **Status**: 200
- **Duration**: 387ms

### ✅ GET /v1/push-tokens (list)

- **Status**: 200
- **Duration**: 112ms
- **Count**: 12

### ✅ POST /v1/feature-requests (create)

- **Status**: 201
- **Duration**: 230ms
- **Request ID**: 8e129fa7-4272-4a0d-b6d5-c96ecf1eff90

### ✅ GET /v1/feature-requests (list)

- **Status**: 200
- **Duration**: 175ms
- **Count**: 6

### ❌ POST /v1/feature-requests/:id/vote (vote)

- **Status**: 500
- **Duration**: 81ms

### ✅ GET /v1/feature-buckets (list)

- **Status**: 200
- **Duration**: 133ms
- **Count**: 0
