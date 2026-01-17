# Admin Dashboard API Documentation

Complete API reference for developer dashboard endpoints.

## Overview

The Admin Dashboard API provides analytics, feature flags, A/B testing, and marketing tracking for EverReach developers. All endpoints require admin authentication.

**Base URL**: `https://ever-reach-be.vercel.app/api/admin`

**Authentication**: All requests must include an admin session token:
```
Authorization: Bearer {admin_session_token}
```

---

## Authentication

### Sign In

Authenticate an admin user and receive a session token.

**Endpoint**: `POST /api/admin/auth/signin`

**Request Body**:
```json
{
  "email": "admin@everreach.app",
  "password": "your_password"
}
```

**Response** (200 OK):
```json
{
  "user": {
    "id": "uuid",
    "email": "admin@everreach.app",
    "name": "Admin User",
    "role": "super_admin",
    "is_active": true,
    "last_login_at": "2025-10-21T18:00:00Z",
    "created_at": "2025-10-01T12:00:00Z"
  },
  "token": "abc123...",
  "expiresAt": "2025-10-28T18:00:00Z"
}
```

**Roles**:
- `super_admin` - Full access (create users, delete data)
- `admin` - Manage flags, experiments, view all data
- `analyst` - View only, export data
- `viewer` - Read-only dashboard access

---

### Request Password Reset

Send a password reset email via Resend.

**Endpoint**: `POST /api/admin/auth/request-reset`

**Request Body**:
```json
{
  "email": "admin@everreach.app"
}
```

**Response** (200 OK):
```json
{
  "success": true
}
```

**Note**: Always returns success to prevent email enumeration. Reset link expires in 1 hour.

---

### Sign Out

Invalidate the current session token.

**Endpoint**: `POST /api/admin/auth/signout`

**Headers**:
```
Authorization: Bearer {token}
```

**Response** (200 OK):
```json
{
  "success": true
}
```

---

## Dashboard Stats

### Get Overview

Get high-level metrics for the admin dashboard.

**Endpoint**: `GET /api/admin/dashboard/overview`

**Query Parameters**:
- `days` (optional) - Number of days to aggregate (default: 30)

**Headers**:
```
Authorization: Bearer {token}
```

**Response** (200 OK):
```json
{
  "period": {
    "days": 30,
    "start_date": "2025-09-21T00:00:00Z",
    "end_date": "2025-10-21T18:00:00Z"
  },
  "app_health": {
    "total_requests": 125000,
    "total_errors": 320,
    "success_rate": 99.74,
    "avg_response_time_ms": 87.5,
    "trend": [
      {
        "date": "2025-10-21",
        "total_requests": 5200,
        "success_rate": 99.8,
        "avg_response_time": 85.2
      }
    ]
  },
  "user_growth": {
    "total_signups": 1250,
    "trend": [
      {
        "date": "2025-10-21",
        "unique_users": 45
      }
    ]
  },
  "experiments": {
    "active_count": 3,
    "enabled_flags_count": 12
  },
  "marketing": {
    "email": {
      "campaigns_sent": 5,
      "total_sent": 50000,
      "total_opens": 12500,
      "total_clicks": 2500,
      "avg_open_rate": 25.0,
      "avg_click_rate": 5.0
    },
    "social": {
      "total_posts": 15,
      "total_impressions": 250000,
      "total_engagement": 12500,
      "avg_engagement_rate": 5.0
    }
  }
}
```

---

## Feature Flags

### List Feature Flags

Get all feature flags with usage statistics.

**Endpoint**: `GET /api/admin/feature-flags`

**Query Parameters**:
- `environment` (optional) - Filter by environment: `production`, `staging`, `development` (default: `production`)
- `enabled` (optional) - Filter by enabled status: `true`, `false`

**Headers**:
```
Authorization: Bearer {token}
```

**Response** (200 OK):
```json
{
  "flags": [
    {
      "id": "uuid",
      "key": "new_ai_composer",
      "name": "New AI Message Composer",
      "description": "Redesigned composer with better UX",
      "is_enabled": true,
      "rollout_percentage": 25,
      "target_user_ids": null,
      "target_segments": ["pro_users"],
      "target_platforms": ["web"],
      "enabled_at": "2025-10-15T10:00:00Z",
      "disabled_at": null,
      "owner_email": "admin@everreach.app",
      "tags": ["ai", "composer"],
      "environment": "production",
      "created_at": "2025-10-15T10:00:00Z",
      "updated_at": "2025-10-20T14:30:00Z",
      "usage": {
        "total_evaluations": 15000,
        "unique_users": 450,
        "avg_enabled_percentage": 24.8
      }
    }
  ]
}
```

---

### Create Feature Flag

Create a new feature flag.

**Endpoint**: `POST /api/admin/feature-flags`

**Required Role**: `super_admin` or `admin`

**Request Body**:
```json
{
  "key": "new_ai_composer",
  "name": "New AI Message Composer",
  "description": "Redesigned composer with better UX",
  "rollout_percentage": 10,
  "target_user_ids": ["user-uuid-1", "user-uuid-2"],
  "target_segments": ["pro_users", "early_adopters"],
  "target_platforms": ["web", "ios"],
  "is_enabled": true,
  "environment": "production",
  "owner_email": "admin@everreach.app",
  "tags": ["ai", "composer", "beta"]
}
```

**Response** (201 Created):
```json
{
  "flag": {
    "id": "uuid",
    "key": "new_ai_composer",
    "name": "New AI Message Composer",
    ...
  }
}
```

**Validation**:
- `key` and `name` are required
- `rollout_percentage` must be between 0 and 100
- `key` must be unique

---

### Get Feature Flag Details

Get detailed information about a specific feature flag.

**Endpoint**: `GET /api/admin/feature-flags/{key}`

**Headers**:
```
Authorization: Bearer {token}
```

**Response** (200 OK):
```json
{
  "flag": {
    "id": "uuid",
    "key": "new_ai_composer",
    "name": "New AI Message Composer",
    ...
  },
  "usage": {
    "daily_stats": [
      {
        "flag_key": "new_ai_composer",
        "date": "2025-10-21",
        "total_evaluations": 1200,
        "unique_users": 85,
        "enabled_percentage": 25.0
      }
    ],
    "recent_evaluations": [
      {
        "id": "uuid",
        "flag_key": "new_ai_composer",
        "user_id": "user-uuid",
        "is_enabled": true,
        "reason": "rollout_percentage",
        "platform": "web",
        "evaluated_at": "2025-10-21T18:45:00Z"
      }
    ]
  }
}
```

---

### Update Feature Flag

Update an existing feature flag.

**Endpoint**: `PATCH /api/admin/feature-flags/{key}`

**Required Role**: `super_admin` or `admin`

**Request Body** (all fields optional):
```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "rollout_percentage": 50,
  "target_user_ids": ["new-user-uuid"],
  "target_segments": ["all_users"],
  "target_platforms": ["web", "ios", "android"],
  "is_enabled": true,
  "tags": ["production", "stable"]
}
```

**Response** (200 OK):
```json
{
  "flag": {
    "id": "uuid",
    "key": "new_ai_composer",
    ...updated fields...
  }
}
```

**Notes**:
- Setting `is_enabled: true` updates `enabled_at`
- Setting `is_enabled: false` updates `disabled_at`

---

### Delete Feature Flag

Delete a feature flag.

**Endpoint**: `DELETE /api/admin/feature-flags/{key}`

**Required Role**: `super_admin`

**Response** (200 OK):
```json
{
  "success": true
}
```

---

## A/B Testing

### List Experiments

Get all A/B test experiments.

**Endpoint**: `GET /api/admin/experiments`

**Query Parameters**:
- `status` (optional) - Filter by status: `draft`, `running`, `paused`, `completed`, `archived`

**Headers**:
```
Authorization: Bearer {token}
```

**Response** (200 OK):
```json
{
  "experiments": [
    {
      "id": "uuid",
      "key": "pricing_layout_test",
      "name": "Pricing Page Layout Test",
      "description": "Test simplified pricing page",
      "hypothesis": "Simplified layout increases conversions by 15%",
      "status": "running",
      "control_variant": {
        "key": "control",
        "name": "Current Layout",
        "weight": 50
      },
      "treatment_variants": [
        {
          "key": "simple_layout",
          "name": "Simplified Layout",
          "weight": 50
        }
      ],
      "traffic_allocation": 100,
      "primary_metric": "checkout_started",
      "secondary_metrics": ["page_time", "scroll_depth"],
      "minimum_sample_size": 1000,
      "confidence_level": 0.95,
      "started_at": "2025-10-15T00:00:00Z",
      "ended_at": null,
      "winning_variant": null,
      "statistical_significance": false,
      "created_at": "2025-10-14T12:00:00Z",
      "results": [
        {
          "variant_key": "control",
          "total_users": 520,
          "converted_users": 45,
          "conversion_rate": 8.65
        },
        {
          "variant_key": "simple_layout",
          "total_users": 480,
          "converted_users": 58,
          "conversion_rate": 12.08
        }
      ],
      "total_users": 1000
    }
  ]
}
```

---

### Create Experiment

Create a new A/B test experiment.

**Endpoint**: `POST /api/admin/experiments`

**Required Role**: `super_admin` or `admin`

**Request Body**:
```json
{
  "key": "pricing_layout_test",
  "name": "Pricing Page Layout Test",
  "description": "Test simplified pricing page design",
  "hypothesis": "Simplified layout increases conversions",
  "control_variant": {
    "key": "control",
    "name": "Current Layout",
    "weight": 50
  },
  "treatment_variants": [
    {
      "key": "simple_layout",
      "name": "Simplified Layout",
      "weight": 50
    }
  ],
  "traffic_allocation": 100,
  "primary_metric": "checkout_started",
  "secondary_metrics": ["page_time"],
  "minimum_sample_size": 1000,
  "confidence_level": 0.95,
  "minimum_detectable_effect": 0.05,
  "target_segments": ["all_users"],
  "target_platforms": ["web"],
  "owner_email": "admin@everreach.app",
  "tags": ["pricing", "conversion"]
}
```

**Response** (201 Created):
```json
{
  "experiment": {
    "id": "uuid",
    "key": "pricing_layout_test",
    "status": "draft",
    ...
  }
}
```

**Validation**:
- `key`, `name`, `control_variant`, `treatment_variants`, `primary_metric` are required
- Variant weights must sum to 100
- `traffic_allocation` must be between 0 and 100

---

### Get Experiment Details

Get detailed information and results for an experiment.

**Endpoint**: `GET /api/admin/experiments/{key}`

**Headers**:
```
Authorization: Bearer {token}
```

**Response** (200 OK):
```json
{
  "experiment": {
    "id": "uuid",
    "key": "pricing_layout_test",
    ...
  },
  "results": [
    {
      "experiment_key": "pricing_layout_test",
      "variant_key": "control",
      "total_users": 520,
      "converted_users": 45,
      "conversion_rate": 8.65,
      "avg_metric_value": 1.2,
      "total_metric_value": 624
    }
  ],
  "recent_assignments": [
    {
      "variant_key": "simple_layout",
      "platform": "web",
      "assigned_at": "2025-10-21T18:30:00Z"
    }
  ],
  "recent_metric_events": [
    {
      "experiment_key": "pricing_layout_test",
      "variant_key": "control",
      "metric_name": "checkout_started",
      "metric_value": 1,
      "occurred_at": "2025-10-21T18:35:00Z"
    }
  ]
}
```

---

### Update Experiment

Update an experiment (change status, declare winner, etc.).

**Endpoint**: `PATCH /api/admin/experiments/{key}`

**Required Role**: `super_admin` or `admin`

**Request Body** (all fields optional):
```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "status": "running",
  "traffic_allocation": 50,
  "winning_variant": "simple_layout",
  "statistical_significance": true
}
```

**Response** (200 OK):
```json
{
  "experiment": {
    "id": "uuid",
    "key": "pricing_layout_test",
    ...updated fields...
  }
}
```

**Notes**:
- Changing `status` from `draft` to `running` sets `started_at`
- Changing `status` from `running` to `completed` sets `ended_at`

---

### Delete/Archive Experiment

Archive an experiment (soft delete).

**Endpoint**: `DELETE /api/admin/experiments/{key}`

**Required Role**: `super_admin`

**Response** (200 OK):
```json
{
  "success": true
}
```

**Note**: Sets `status` to `archived` rather than deleting.

---

## Data Ingestion

### Ingest Email Campaign

Manually create or update email campaign data.

**Endpoint**: `POST /api/admin/ingest/email-campaign`

**Required Role**: `super_admin` or `admin`

**Request Body**:
```json
{
  "campaign_id": "campaign_123",
  "name": "Weekly Newsletter - Oct 21",
  "subject": "New Features This Week",
  "preview_text": "Check out what's new",
  "from_email": "noreply@everreach.app",
  "from_name": "EverReach Team",
  "campaign_type": "newsletter",
  "segment_name": "All Users",
  "sent_at": "2025-10-21T10:00:00Z",
  "status": "sent",
  "is_ab_test": false,
  "metrics": {
    "sent_count": 10000,
    "delivered_count": 9800,
    "bounce_count": 200,
    "hard_bounce_count": 50,
    "soft_bounce_count": 150,
    "open_count": 3000,
    "unique_open_count": 2450,
    "click_count": 600,
    "unique_click_count": 490,
    "unsubscribe_count": 25,
    "spam_complaint_count": 5,
    "revenue": 5000
  }
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "campaign": {
    "campaign_id": "campaign_123",
    "name": "Weekly Newsletter - Oct 21",
    ...
  }
}
```

**Campaign Types**:
- `newsletter` - Regular newsletter
- `promotional` - Promotional/sales email
- `transactional` - Transactional email
- `drip` - Drip campaign
- `welcome` - Welcome series
- `other` - Other type

**Calculated Metrics** (auto-computed):
- `delivery_rate` = delivered / sent * 100
- `open_rate` = unique_opens / delivered * 100
- `click_rate` = unique_clicks / delivered * 100
- `click_to_open_rate` = unique_clicks / unique_opens * 100
- `unsubscribe_rate` = unsubscribes / delivered * 100
- `revenue_per_email` = revenue / sent

---

## Error Responses

All endpoints may return the following errors:

**401 Unauthorized**:
```json
{
  "error": "Missing authorization token"
}
```

**403 Forbidden**:
```json
{
  "error": "Insufficient permissions"
}
```

**404 Not Found**:
```json
{
  "error": "Feature flag not found"
}
```

**409 Conflict**:
```json
{
  "error": "Feature flag with this key already exists"
}
```

**500 Internal Server Error**:
```json
{
  "error": "Internal server error"
}
```

---

## Rate Limits

All endpoints are rate-limited per admin user:
- **100 requests per minute** for read operations
- **20 requests per minute** for write operations

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1698080400
```

---

## Webhooks & Cron Jobs

The dashboard automatically syncs data via cron jobs:

**PostHog Event Sync** - `GET /api/cron/sync-posthog-events`
- Schedule: Every 15 minutes
- Pulls events from PostHog API
- Aggregates into `posthog_events_cache`

**Email Metrics Sync** - `GET /api/cron/sync-email-metrics`
- Schedule: Daily at 6 AM UTC
- Fetches email campaign metrics
- Updates `email_campaign_metrics`

**Dashboard Views Refresh** - `GET /api/cron/refresh-dashboard-views`
- Schedule: Every hour
- Refreshes all materialized views
- Updates aggregated metrics

**Cron Authentication**:
```
Authorization: Bearer {CRON_SECRET}
```

---

## Best Practices

### Feature Flags
1. Start with low rollout (10-25%)
2. Monitor usage stats before increasing
3. Use `target_segments` for beta testers
4. Always set an `owner_email`
5. Tag flags for easy filtering

### A/B Testing
1. Wait for `minimum_sample_size` before declaring winner
2. Check `statistical_significance` before decisions
3. Run for at least 7 days to account for weekly patterns
4. Document `hypothesis` for future reference
5. Archive completed experiments

### Security
1. Rotate admin passwords every 90 days
2. Use `super_admin` role sparingly
3. Audit admin actions via session logs
4. Revoke sessions on password change
5. Monitor failed login attempts

---

## SDK Examples

### JavaScript/TypeScript
```typescript
const ADMIN_TOKEN = 'your_admin_token';
const BASE_URL = 'https://ever-reach-be.vercel.app/api/admin';

// Get dashboard overview
const overview = await fetch(`${BASE_URL}/dashboard/overview?days=30`, {
  headers: {
    'Authorization': `Bearer ${ADMIN_TOKEN}`
  }
}).then(r => r.json());

// Create feature flag
const flag = await fetch(`${BASE_URL}/feature-flags`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${ADMIN_TOKEN}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    key: 'new_feature',
    name: 'New Feature',
    rollout_percentage: 25,
    is_enabled: true
  })
}).then(r => r.json());
```

### Python
```python
import requests

ADMIN_TOKEN = 'your_admin_token'
BASE_URL = 'https://ever-reach-be.vercel.app/api/admin'

# Get feature flags
response = requests.get(
    f'{BASE_URL}/feature-flags',
    headers={'Authorization': f'Bearer {ADMIN_TOKEN}'}
)
flags = response.json()

# Update experiment status
response = requests.patch(
    f'{BASE_URL}/experiments/pricing_test',
    headers={
        'Authorization': f'Bearer {ADMIN_TOKEN}',
        'Content-Type': 'application/json'
    },
    json={'status': 'running'}
)
```

---

## Support

- **Documentation**: https://docs.everreach.app/admin
- **Issues**: https://github.com/everreach/api/issues
- **Email**: admin@everreach.app
