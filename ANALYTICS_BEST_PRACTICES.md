# 📊 Analytics Best Practices - Production-Scale Event Tracking

**Author**: Insights from ChatGPT conversation  
**Date**: October 22, 2025  
**Status**: Reference Guide  
**Applies to**: EverReach CRM & general production apps

---

## 🎯 Overview

This guide covers production-scale analytics practices used by companies like Facebook/Meta, adapted for startup/scale-up implementation. It answers: **"Do developers usually apply a lot of tracking on their apps?"**

**Short answer**: Yes—most production apps track extensively. But it's not (just) creepy; it's mostly about **reliability and product decisions**.

---

## 📋 What "Tracking" Usually Means

### **1. Product Analytics**
- Screen views
- Key actions (signup, search, add_to_cart, share, paywall_view, subscribe)
- Funnels (conversion paths)
- Retention cohorts
- User segmentation

### **2. Performance & Stability**
- Crash/ANR (Application Not Responding) reports
- Cold/warm start times
- Network error rates
- Slow renders
- API latency (p50, p95, p99)

### **3. Growth/Marketing**
- Install source/attribution
- Campaign parameters (UTM)
- Notification opens
- Deep link tracking
- Referral sources

### **4. Monetization**
- Paywall impressions
- Trials started/converted
- Renewals
- Churn reasons
- Revenue per user (ARPU)

### **5. A/B Testing & Feature Flags**
- Variant exposure
- Outcome events
- Statistical significance
- Guardrail metrics

---

## 📏 How Much is "A Lot"?

### **Early-Stage Apps**
- **10–30 well-defined events**
- Focus on critical user journey
- Example: app_open, signup_completed, core_action, purchase

### **Mature Apps**
- **100–500+ events** with rich properties
- Detailed funnel tracking
- Feature-specific events
- Performance instrumentation

### **Session Replay**
- Less common, used sparingly
- Privacy-invasive, requires consent
- Usually only for debugging specific issues

---

## ✅ What Good Teams Do (Useful & Respectful)

### **1. Data Minimization**
- Only log what influences a decision
- No raw PII in event payloads
- Strip emails, phone numbers, free-text
- Hash sensitive identifiers

**Example - BAD**:
```json
{
  "event": "contact_added",
  "email": "john@example.com",
  "phone": "+1-555-1234"
}
```

**Example - GOOD**:
```json
{
  "event": "contact_added",
  "contact_id": "c_abc123",
  "has_email": true,
  "has_phone": true,
  "source": "manual"
}
```

### **2. Consent-Aware**
- Honor platform rules (iOS ATT for cross-app tracking)
- Show clear privacy/consent flow
- Degrade gracefully if users opt out
- Never track without permission

**Implementation**:
```json
{
  "privacy": {
    "consent_analytics": true,
    "consent_marketing": false,
    "att_status": "authorized"
  }
}
```

### **3. Taxonomy (Naming Convention)**
- **One event list** with naming rules
- Format: `verb_object` (view_paywall, start_trial)
- Schema for properties (types, allowed values)
- Versioning (event_version field)

**Example Convention**:
```
✅ contact_added
✅ outreach_sent
✅ paywall_view
✅ trial_started

❌ addContact (camelCase)
❌ new_contact (passive voice)
❌ contact (no verb)
```

### **4. Redaction & Privacy by Design**
- Strip emails/phone numbers
- Hash IDs where possible
- Never log free-text user content
- Mask screenshots

### **5. Controls**
- Remote kill-switch for telemetry
- Sampling (e.g., 10% for heavy logs)
- Per-feature toggles
- Rate limiting

### **6. Separation of Concerns**

**Different tools for different purposes**:

| Purpose | Tool Examples |
|---------|--------------|
| Product Analytics | Amplitude, Mixpanel, PostHog |
| Crashes | Sentry, Firebase Crashlytics |
| Metrics | Datadog, Grafana |
| Attribution | AppsFlyer, Branch |
| Data Pipeline | Segment, RudderStack (CDP) |

---

## 🔧 Minimal Viable Telemetry (For Your App)

### **Core Events** (12 essential):

#### **Lifecycle**
1. `app_open`
2. `screen_view` - Track navigation
3. `sign_up_started` / `sign_up_completed`

#### **Value Actions**
4. `core_action` - Your app's main value (e.g., `contact_added`, `outreach_sent`)
5. `ha_moment_reached` - "Aha moment" (activation)

#### **Monetization**
6. `paywall_view`
7. `trial_started`
8. `purchase_completed`
9. `purchase_renewed` / `purchase_canceled`

#### **Engagement**
10. `push_received` / `push_opened`

#### **Experimentation**
11. `ab_exposed` - Track experiment exposure
12. `feature_flag_evaluated`

#### **Performance** (via tools, not manual events)
13. `app_start_time` - Cold/warm start
14. `api_error` - Track failures
15. Crashes via Crashlytics/Sentry

---

## 🏗️ Data Pipeline Architecture

### **1. Collect & Store (Pipeline Shape)**

```
Client SDKs (PostHog/Segment)
    ↓
Event Router (RudderStack/Segment/PostHog plugins)
    ↓
Warehouse (BigQuery/Snowflake/Redshift)
    ↓
Columnar Format (Parquet/ORC)
    ↓
Partitioned by event_date
```

### **2. Two Timestamps**

Always track both:
- **`event_time`** - When it happened (UTC)
- **`ingest_time`** - When you received it

**Why?** Handle late-arriving events, clock skew, offline queuing.

### **3. Idempotency**

```json
{
  "event_id": "uuid-v4",  // Stable, client-generated
  "event_name": "contact_added",
  "event_time": "2025-10-20T19:22:00Z"
}
```

**Deduplication**:
```sql
-- Option 1: PRIMARY KEY
PRIMARY KEY (event_id)

-- Option 2: Window function
QUALIFY ROW_NUMBER() OVER (PARTITION BY event_id ORDER BY ingest_time DESC) = 1
```

### **4. Partition & Cluster**

**Partition by**: `event_date` (for time-based queries)  
**Cluster by**: `user_id` (or `anon_id`) + `event_name` (for funnels/cohorts)

**BigQuery Example**:
```sql
CREATE TABLE events
PARTITION BY DATE(event_time)
CLUSTER BY user_id, event_name
AS SELECT ...
```

---

## 📝 Event Definition (Data Contracts)

### **Naming Convention**
- **Format**: `verb_object`
- **Examples**: `view_paywall`, `start_trial`, `send_message`

### **Schema Contract**

Use **versioned JSON Schema** per event. Reject or quarantine unknown properties.

**Example Schema** (`contact_added`):
```json
{
  "$id": "https://everreach/schemas/contact_added.json",
  "version": "1.0.0",
  "type": "object",
  "properties": {
    "event_id": { "type": "string", "format": "uuid" },
    "event_name": { "const": "contact_added" },
    "event_time": { "type": "string", "format": "date-time" },
    "user_id": { "type": ["string", "null"] },
    "anon_id": { "type": "string" },
    "properties": {
      "type": "object",
      "properties": {
        "source": { "enum": ["manual", "phonebook_import", "csv", "google"] },
        "fields_filled": {
          "type": "array",
          "items": { "enum": ["name", "email", "phone", "company", "tags"] }
        }
      },
      "required": ["source"]
    }
  },
  "required": ["event_id", "event_name", "event_time", "anon_id", "properties"]
}
```

### **Minimal Properties**

Include only **decision-making fields**:
- `user_id`, `anon_id`, `session_id`
- `experiment_assignments` (A/B variants)
- `source` (install/campaign/referral)
- `screen` (where it happened)
- Event-specific props

**Example Payload**:
```json
{
  "event_id": "8f2e4d3c-1234-5678-90ab-cdef12345678",
  "event_name": "paywall_view",
  "event_time": "2025-10-20T22:59:12Z",
  "ingest_time": "2025-10-20T22:59:13Z",
  "user_id": "usr_123",
  "anon_id": "dev_abc",
  "session_id": "ses_456",
  "screen": "PaywallV2",
  "source": "push_campaign_fall25",
  "properties": {
    "plan_shown": "pro_monthly",
    "price_cents": 1500,
    "country": "US"
  },
  "experiment_assignments": {
    "pw_copy_test": "B",
    "annual_discount_banner": "on"
  },
  "app": {
    "platform": "ios",
    "version": "1.4.3",
    "build": 143
  },
  "privacy": {
    "consent_analytics": true,
    "consent_ads": false,
    "att_status": "authorized"
  }
}
```

---

## 🔐 Identity, Consent, Privacy

### **1. Identity Graph**

Keep both `anon_id` (device/session) and `user_id` (post-login). Build a stable mapping table to stitch histories.

**Mapping Table**:
```sql
CREATE TABLE identity_graph (
  anon_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (anon_id, user_id)
);
```

**Stitching Query**:
```sql
WITH events AS (
  SELECT *, COALESCE(user_id, 
    (SELECT user_id FROM identity_graph WHERE anon_id = events.anon_id LIMIT 1)
  ) AS resolved_user_id
  FROM raw_events
)
SELECT * FROM events;
```

### **2. Consent Gates**

Log `consent_*` flags on **every event**. Never send ads/attribution data if user opted out.

```json
{
  "privacy": {
    "consent_analytics": true,
    "consent_ads": false,
    "consent_personalization": true,
    "att_status": "denied"
  }
}
```

### **3. PII Rules**

✅ **DO**:
- Store PII in separate, access-controlled `users` table
- Key by `user_id`
- Hash where possible (SHA256, Argon2id)
- Never include PII in event payloads

❌ **DON'T**:
- Log emails, phone numbers, addresses in events
- Include free-text fields (comments, notes)
- Store plaintext passwords (obviously)

### **4. Deletion (GDPR/CCPA)**

Implement **user_id-scoped erasure**:
- Soft-delete with watermark
- Periodic hard-delete jobs
- Cascade to all related tables

**Example**:
```sql
-- Soft delete
UPDATE events SET deleted_at = NOW() WHERE user_id = :user_id;

-- Hard delete (run weekly)
DELETE FROM events WHERE deleted_at < NOW() - INTERVAL '30 days';
```

---

## ✅ Data Quality & Governance

### **1. Contracts & Tests**

**Validate schemas**:
- At the edge (JSON Schema)
- In the warehouse (dbt tests / Great Expectations)

**dbt test example**:
```yaml
version: 2
models:
  - name: cleaned_events
    columns:
      - name: event_id
        tests:
          - unique
          - not_null
      - name: event_time
        tests:
          - not_null
      - name: event_name
        tests:
          - accepted_values:
              values: ['contact_added', 'outreach_sent', 'paywall_view']
```

### **2. Freshness SLAs**

**Dashboard shows**:
- Last successful load
- Alert if late by X minutes

**dbt freshness check**:
```yaml
sources:
  - name: raw_events
    freshness:
      warn_after: {count: 1, period: hour}
      error_after: {count: 6, period: hour}
```

### **3. Observability**

Track daily:
- Event volume
- Distinct users
- Error rate
- Schema drift (unexpected properties)

### **4. Versioning**

- Add `event_version` field
- Never repurpose an event name
- Create `*_v2` if semantics change

---

## 🔄 Transform & Model (for Fast Insights)

### **Bronze/Silver/Gold Layers**

#### **Bronze** (Raw)
- Immutable
- Partitioned by date
- Minimal transformation

#### **Silver** (Cleaned)
- Typed columns
- Deduped
- Identity stitching

#### **Gold** (Marts)
- `fact_events`
- `dim_users`, `dim_devices`
- Ready-to-chart tables (funnels, retention, revenue)

### **Metric Definitions (One Truth)**

Encode DAU/WAU/MAU, activation, retention, conversion, ARPDAU in a **metrics layer** (dbt metrics/Lightdash/Cube).

**dbt metrics example**:
```yaml
metrics:
  - name: dau
    label: Daily Active Users
    model: ref('cleaned_events')
    calculation_method: count_distinct
    expression: user_id
    timestamp: event_time
    time_grains: [day, week, month]
    dimensions: [platform, country]
    filters:
      - field: event_name
        operator: '='
        value: "'app_open'"
```

### **Sessionization**

Build `session_start`/`session_end` with **30-min inactivity gap**.

**SQL Example** (BigQuery):
```sql
WITH events AS (
  SELECT user_id, event_time,
    LAG(event_time) OVER (PARTITION BY user_id ORDER BY event_time) AS prev_event_time
  FROM cleaned_events
),
sessions AS (
  SELECT *,
    CASE 
      WHEN TIMESTAMP_DIFF(event_time, prev_event_time, MINUTE) > 30 
           OR prev_event_time IS NULL 
      THEN 1 ELSE 0 
    END AS is_new_session
  FROM events
)
SELECT *,
  SUM(is_new_session) OVER (PARTITION BY user_id ORDER BY event_time) AS session_number
FROM sessions;
```

---

## 📊 Example Queries

### **Funnel Analysis** (BigQuery)

```sql
WITH base AS (
  SELECT user_id, event_name, event_time::timestamp AS t
  FROM silver.cleaned_events
  WHERE event_name IN ('view_paywall','start_trial','purchase_completed')
    AND event_time::date BETWEEN DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY) 
                              AND CURRENT_DATE()
),
steps AS (
  SELECT user_id,
    MIN(CASE WHEN event_name='view_paywall' THEN t END) AS step1,
    MIN(CASE WHEN event_name='start_trial' THEN t END) AS step2,
    MIN(CASE WHEN event_name='purchase_completed' THEN t END) AS step3
  FROM base 
  GROUP BY 1
)
SELECT
  COUNTIF(step1 IS NOT NULL) AS paywall_views,
  COUNTIF(step2 IS NOT NULL) AS trials,
  COUNTIF(step3 IS NOT NULL) AS purchases,
  SAFE_DIVIDE(COUNTIF(step2 IS NOT NULL), COUNTIF(step1 IS NOT NULL)) AS view_to_trial,
  SAFE_DIVIDE(COUNTIF(step3 IS NOT NULL), COUNTIF(step2 IS NOT NULL)) AS trial_to_purchase
FROM steps;
```

### **Cohort Retention** (D1/D7/D28)

```sql
WITH installs AS (
  SELECT user_id, MIN(event_time::date) AS install_date
  FROM silver.cleaned_events
  WHERE event_name='app_open' 
  GROUP BY 1
),
activity AS (
  SELECT e.user_id, 
         DATE_DIFF(e.event_time::date, i.install_date, DAY) AS day_n
  FROM silver.cleaned_events e 
  JOIN installs i USING (user_id)
  WHERE e.event_name='core_action'
)
SELECT install_date,
  COUNT(DISTINCT i.user_id) AS cohort_size,
  COUNT(DISTINCT IF(a.day_n=1, a.user_id, NULL)) / COUNT(DISTINCT i.user_id) AS d1,
  COUNT(DISTINCT IF(a.day_n=7, a.user_id, NULL)) / COUNT(DISTINCT i.user_id) AS d7,
  COUNT(DISTINCT IF(a.day_n=28, a.user_id, NULL)) / COUNT(DISTINCT i.user_id) AS d28
FROM installs i 
LEFT JOIN activity a USING (user_id)
GROUP BY 1 
ORDER BY 1 DESC;
```

---

## 🎨 Analyze & Experiment (Turn Data into Decisions)

### **4 Core Dashboards**

#### **1. Acquisition**
- Installs
- Sources
- CAC
- SRM checks for experiments

#### **2. Activation**
- A→HA moment funnel
- Time-to-first-value
- Drop-offs

#### **3. Engagement/Retention**
- DAU/WAU/MAU
- Stickiness (DAU/MAU)
- Cohort curves
- Feature usage

#### **4. Monetization**
- Paywall views → trials → conversions
- LTV
- Churn reasons

### **A/B Testing Hygiene**

✅ **DO**:
- Pre-register metrics
- Calculate sample size/power
- Use immutable assignments
- Set guardrails (crash rate, latency, support tickets)
- SRM check on exposure
- Use CUPED or covariate adjustment

❌ **DON'T**:
- Peek at results early (p-hacking)
- Change metrics mid-experiment
- Run too many experiments simultaneously
- Ignore guardrail metrics

### **Slice Everything**

Analyze by:
- Platform (iOS, Android, Web)
- App version
- Country
- Campaign source
- New vs returning users

### **Exploration Loop**

Every chart has:
1. **Owner** - Who's responsible
2. **Target** - What's the goal
3. **Next action** - What to do if off-target

**Weekly review** → **Backlog** → **Shipped change** → **Follow-up read**

---

## ✅ Quick Do/Don't Checklist

### **✅ DO**

- Store raw + cleaned layers
- Keep both `event_time` and `ingest_time`
- Partition by date
- Dedupe by `event_id`
- Use one event naming convention + schema contracts
- Separate PII; tie it by `user_id`
- Implement deletion (GDPR/CCPA)
- Build a single metrics layer (one source of truth)
- Version events (`event_version`)
- Honor user consent

### **❌ DON'T**

- Log free-text or screenshots
- Include PII in event payloads
- Change event meanings without a new version
- Rely only on tool-UI metrics—always keep warehouse truth
- Peek at A/B test results early
- Run experiments without guardrails
- Ignore schema validation
- Mix production and test data

---

## 🚀 Implementation Roadmap for EverReach

### **Phase 1: Foundation** (Week 1)
- [ ] Set up PostHog SDK in mobile app
- [ ] Configure BigQuery export
- [ ] Define core 15 events
- [ ] Implement event envelope with privacy flags

### **Phase 2: Pipeline** (Week 2)
- [ ] Set up dbt bronze/silver models
- [ ] Implement identity stitching
- [ ] Create sessionization logic
- [ ] Build deduplication

### **Phase 3: Metrics** (Week 3)
- [ ] Define dbt metrics (DAU, retention, conversion)
- [ ] Build 4 core dashboards
- [ ] Set up freshness alerts

### **Phase 4: Experimentation** (Week 4)
- [ ] Integrate Statsig for A/B tests
- [ ] Log `ab_exposed` events
- [ ] Set up SRM checks
- [ ] Define guardrail metrics

---

## 📚 References

**Tools**:
- **Product Analytics**: PostHog, Amplitude, Mixpanel
- **Data Warehouse**: BigQuery, Snowflake, Redshift
- **Transformation**: dbt, Dataform
- **CDP**: Segment, RudderStack
- **Crashes**: Sentry, Firebase Crashlytics
- **A/B Testing**: Statsig, Optimizely, LaunchDarkly

**Further Reading**:
- [PostHog Event Tracking Best Practices](https://posthog.com/docs/integrate/client/js#event-best-practices)
- [Amplitude Taxonomy Playbook](https://amplitude.com/blog/event-taxonomy)
- [dbt Best Practices](https://docs.getdbt.com/guides/best-practices)
- [Segment Spec](https://segment.com/docs/connections/spec/)

---

**Built from ChatGPT insights - Production-ready analytics practices for scale**
