# E2E Test: Advanced Features

- **Run ID**: 9fa1249d-4cbc-4882-9f28-1d2bbaf02067
- **Timestamp**: 2025-10-21T03:52:35.329Z
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
- **Duration**: 334ms
- **Count**: 0

### ✅ POST /v1/push-tokens (register)

- **Status**: 200
- **Duration**: 474ms

### ✅ GET /v1/push-tokens (list)

- **Status**: 200
- **Duration**: 144ms
- **Count**: 11

### ✅ POST /v1/feature-requests (create)

- **Status**: 201
- **Duration**: 316ms
- **Request ID**: a0c3bb00-1aeb-4e8a-8844-45072e40451a

### ✅ GET /v1/feature-requests (list)

- **Status**: 200
- **Duration**: 215ms
- **Count**: 5

### ❌ POST /v1/feature-requests/:id/vote (vote)

- **Status**: 500
- **Duration**: 134ms

### ✅ GET /v1/feature-buckets (list)

- **Status**: 200
- **Duration**: 167ms
- **Count**: 0
