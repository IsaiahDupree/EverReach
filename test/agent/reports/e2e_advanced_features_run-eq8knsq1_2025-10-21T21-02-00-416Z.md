# E2E Test: Advanced Features

- **Run ID**: d6dd4765-0115-4878-a435-7a32e0143589
- **Timestamp**: 2025-10-21T21:01:58.942Z
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
- **Duration**: 308ms
- **Count**: 0

### ✅ POST /v1/push-tokens (register)

- **Status**: 200
- **Duration**: 303ms

### ✅ GET /v1/push-tokens (list)

- **Status**: 200
- **Duration**: 114ms
- **Count**: 13

### ✅ POST /v1/feature-requests (create)

- **Status**: 201
- **Duration**: 296ms
- **Request ID**: f78fc8cc-8563-4cd0-8c25-4e919bc1cfb7

### ✅ GET /v1/feature-requests (list)

- **Status**: 200
- **Duration**: 211ms
- **Count**: 7

### ❌ POST /v1/feature-requests/:id/vote (vote)

- **Status**: 500
- **Duration**: 74ms

### ✅ GET /v1/feature-buckets (list)

- **Status**: 200
- **Duration**: 162ms
- **Count**: 0
