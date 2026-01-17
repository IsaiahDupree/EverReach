# Backend v1 Endpoint → UI Coverage

**Generated**: 2025-10-19T00:18:48.344Z  
**Source**: backend-vercel\app\api\v1  
**Count**: 55 endpoints (route.ts files)  

## Summary by Resource

| Resource | Endpoints | Example UI | Status |
|---|---:|---|---|
| .well-known | 1 |  |  |
| agent | 1 |  |  |
| analysis | 2 |  |  |
| audit-logs | 1 |  |  |
| billing | 3 |  |  |
| compose | 2 |  |  |
| contacts | 12 |  |  |
| feature-requests | 1 |  |  |
| files | 1 |  |  |
| goals | 3 |  |  |
| interactions | 3 |  |  |
| me | 7 |  |  |
| merge | 1 |  |  |
| messages | 4 |  |  |
| ops | 4 |  |  |
| pipelines | 2 |  |  |
| search | 1 |  |  |
| templates | 2 |  |  |
| warmth | 1 |  |  |
| webhooks | 3 |  |  |

## .well-known

| Method | Path | UI Link | Notes |
|---|---|---|---|
| GET | `/v1/.well-known/openapi.json` |  |  |

## agent

| Method | Path | UI Link | Notes |
|---|---|---|---|
| POST | `/v1/agent/chat` |  |  |

## analysis

| Method | Path | UI Link | Notes |
|---|---|---|---|
| POST | `/v1/analysis/screenshot` |  |  |
| GET | `/v1/analysis/screenshot/:id` |  |  |

## audit-logs

| Method | Path | UI Link | Notes |
|---|---|---|---|
| GET | `/v1/audit-logs` |  |  |

## billing

| Method | Path | UI Link | Notes |
|---|---|---|---|
| POST | `/v1/billing/app-store/transactions` |  |  |
| POST | `/v1/billing/play/transactions` |  |  |
| POST | `/v1/billing/restore` |  |  |

## compose

| Method | Path | UI Link | Notes |
|---|---|---|---|
| POST | `/v1/compose` |  |  |
| POST | `/v1/compose/validate` |  |  |

## contacts

| Method | Path | UI Link | Notes |
|---|---|---|---|
| GET, POST | `/v1/contacts` |  |  |
| DELETE, GET, PATCH, PUT | `/v1/contacts/:id` |  |  |
| GET | `/v1/contacts/:id/context-summary` |  |  |
| POST | `/v1/contacts/:id/files` |  |  |
| GET | `/v1/contacts/:id/goal-suggestions` |  |  |
| GET | `/v1/contacts/:id/messages` |  |  |
| GET, POST | `/v1/contacts/:id/notes` |  |  |
| GET, POST | `/v1/contacts/:id/pipeline` |  |  |
| GET | `/v1/contacts/:id/pipeline/history` |  |  |
| POST | `/v1/contacts/:id/pipeline/move` |  |  |
| POST | `/v1/contacts/:id/tags` |  |  |
| POST | `/v1/contacts/:id/warmth/recompute` |  |  |

## feature-requests

| Method | Path | UI Link | Notes |
|---|---|---|---|
| GET, POST | `/v1/feature-requests` |  |  |

## files

| Method | Path | UI Link | Notes |
|---|---|---|---|
| POST | `/v1/files` |  |  |

## goals

| Method | Path | UI Link | Notes |
|---|---|---|---|
| GET, POST | `/v1/goals` |  |  |
| DELETE, GET, PATCH | `/v1/goals/:id` |  |  |
| POST | `/v1/goals/:id/pin` |  |  |

## interactions

| Method | Path | UI Link | Notes |
|---|---|---|---|
| GET, POST | `/v1/interactions` |  |  |
| GET, PATCH | `/v1/interactions/:id` |  |  |
| POST | `/v1/interactions/:id/files` |  |  |

## me

| Method | Path | UI Link | Notes |
|---|---|---|---|
| GET | `/v1/me` |  |  |
| DELETE | `/v1/me/account` |  |  |
| GET, PATCH | `/v1/me/compose-settings` |  |  |
| GET | `/v1/me/entitlements` |  |  |
| GET, POST | `/v1/me/persona-notes` |  |  |
| DELETE, GET, PATCH | `/v1/me/persona-notes/:id` |  |  |
| POST | `/v1/me/persona-notes/:id/transcribe` |  |  |

## merge

| Method | Path | UI Link | Notes |
|---|---|---|---|
| POST | `/v1/merge/contacts` |  |  |

## messages

| Method | Path | UI Link | Notes |
|---|---|---|---|
| POST | `/v1/messages` |  |  |
| GET | `/v1/messages/:id` |  |  |
| POST | `/v1/messages/prepare` |  |  |
| POST | `/v1/messages/send` |  |  |

## ops

| Method | Path | UI Link | Notes |
|---|---|---|---|
| GET | `/v1/ops/config-status` |  |  |
| GET | `/v1/ops/health` |  |  |
| POST | `/v1/ops/send-test-email` |  |  |
| GET | `/v1/ops/sku-status` |  |  |

## pipelines

| Method | Path | UI Link | Notes |
|---|---|---|---|
| GET | `/v1/pipelines` |  |  |
| GET | `/v1/pipelines/:key/stages` |  |  |

## search

| Method | Path | UI Link | Notes |
|---|---|---|---|
| POST | `/v1/search` |  |  |

## templates

| Method | Path | UI Link | Notes |
|---|---|---|---|
| GET, POST | `/v1/templates` |  |  |
| DELETE, GET, PATCH | `/v1/templates/:id` |  |  |

## warmth

| Method | Path | UI Link | Notes |
|---|---|---|---|
| POST | `/v1/warmth/recompute` |  |  |

## webhooks

| Method | Path | UI Link | Notes |
|---|---|---|---|
| POST | `/v1/webhooks/app-store` |  |  |
| POST | `/v1/webhooks/play` |  |  |
| POST | `/v1/webhooks/test` |  |  |

