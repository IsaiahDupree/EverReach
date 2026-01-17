# Recent Features Test Suite - Summary Report

**Timestamp**: 2025-10-19T18:29:47.943Z
**Duration**: 3.84s
**Total Tests**: 5
**Passed**: 0 ✅
**Failed**: 5 ❌

## Test Results

### Developer Notifications API ❌

- **File**: `test/agent/dev-notifications-api.mjs`
- **Duration**: 2877ms
- **Exit Code**: 1
- **Report**: [test/agent/reports/dev_notifications_2025-10-19T18-29-46-968Z.md](../../test/agent/reports/dev_notifications_2025-10-19T18-29-46-968Z.md)

**Error:**
```
Error: Supabase sign-in failed: 400 Bad Request
    at getAccessToken (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/test/agent/_shared.mjs:26:11)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async test (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/test/agent/dev-notifications-api.mjs:26:19)

```

### Campaign Automation E2E ❌

- **File**: `test/agent/campaign-automation-e2e.mjs`
- **Duration**: 411ms
- **Exit Code**: 1
- **Report**: [test/agent/reports/campaign_automation_2025-10-19T18-29-47-378Z.md](../../test/agent/reports/campaign_automation_2025-10-19T18-29-47-378Z.md)

**Error:**
```
Error: Supabase sign-in failed: 400 Bad Request
    at getAccessToken (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/test/agent/_shared.mjs:26:11)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async test (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/test/agent/campaign-automation-e2e.mjs:29:19)

```

### Paywall Analytics API ❌

- **File**: `test/agent/paywall-analytics-api.mjs`
- **Duration**: 397ms
- **Exit Code**: 1
- **Report**: [test/agent/reports/paywall_analytics_2025-10-19T18-29-47-774Z.md](../../test/agent/reports/paywall_analytics_2025-10-19T18-29-47-774Z.md)

**Error:**
```
Error: Supabase sign-in failed: 400 Bad Request
    at getAccessToken (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/test/agent/_shared.mjs:26:11)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async test (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/test/agent/paywall-analytics-api.mjs:25:19)

```

### Backend Tracking Events ❌

- **File**: `test/agent/backend-tracking-events.mjs`
- **Duration**: 81ms
- **Exit Code**: 1

### Backend Tracking Identify ❌

- **File**: `test/agent/backend-tracking-identify.mjs`
- **Duration**: 77ms
- **Exit Code**: 1

## Features Tested

1. **Developer Notifications**
   - Activity stats API (`/api/admin/dev-notifications`)
   - Email subscription management
   - Daily digest cron job

2. **Campaign Automation**
   - Campaign configuration (5 campaigns)
   - A/B template variants (10 templates)
   - Segment views (5 views)
   - Delivery tracking
   - Cron workers (run-campaigns, send-email, send-sms)

3. **Paywall Analytics**
   - Impact summary (`/api/me/impact-summary`)
   - Usage tracking (`/api/me/usage-summary`)
   - AI plan recommendations (`/api/me/plan-recommendation`)
   - Paywall rollup cron

4. **Event Tracking**
   - Event logging (`/api/tracking/events`)
   - User identification (`/api/tracking/identify`)
   - Batch event processing
