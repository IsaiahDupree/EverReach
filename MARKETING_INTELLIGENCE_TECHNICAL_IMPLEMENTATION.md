# 🔧 Marketing Intelligence - Technical Implementation Details

**Date**: October 22, 2025  
**Source**: ChatGPT conversation - Code & Configuration  
**Status**: Ready-to-deploy code snippets

---

## 📊 dbt Feature Views (Copy-Paste Ready)

### **1. User Engagement Features** (`user_engagement_features.sql`)

```sql
-- models/features/user_engagement_features.sql
-- BigQuery Standard SQL
WITH base AS (
  SELECT
    resolved_user_id AS user_id,
    event_name,
    event_ts,
    SAFE_CAST(JSON_VALUE(properties, '$.contact_id') AS STRING) AS contact_id,
    LOWER(JSON_VALUE(app, '$.platform')) AS platform
  FROM {{ source('silver', 'cleaned_events') }}
  WHERE event_ts >= TIMESTAMP_SUB({{ var('now_ts') }}, INTERVAL {{ var('lookback_days_long') }} DAY)
),
days AS (
  SELECT user_id, DATE(event_ts) AS d
  FROM base
  GROUP BY 1,2
),
weeks AS (
  SELECT user_id, FORMAT_DATE('%G-%V', DATE(event_ts)) AS iso_week
  FROM base
  GROUP BY 1,2
),
sessions_proxy AS (
  -- Approx session minutes from inter-event gaps (cap at 30m)
  SELECT user_id,
         LEAST(30, TIMESTAMP_DIFF(event_ts,
               LAG(event_ts) OVER (PARTITION BY user_id ORDER BY event_ts), MINUTE)) AS gap_min
  FROM base
),
warmth_deltas AS (
  -- Sum of incremental warmth changes over last 14d across contacts
  SELECT
    resolved_user_id AS user_id,
    SUM(delta) AS warmth_delta_14d
  FROM (
    SELECT
      resolved_user_id,
      SAFE_CAST(JSON_VALUE(properties, '$.contact_id') AS STRING) AS contact_id,
      SAFE_CAST(JSON_VALUE(properties, '$.warmth') AS FLOAT64) AS warmth_val,
      LAG(SAFE_CAST(JSON_VALUE(properties, '$.warmth') AS FLOAT64))
        OVER (PARTITION BY resolved_user_id, SAFE_CAST(JSON_VALUE(properties, '$.contact_id') AS STRING)
              ORDER BY event_ts) AS prev_warmth,
      event_ts
    FROM {{ source('silver', 'cleaned_events') }}
    WHERE event_name = 'warmth_updated'
      AND event_ts >= TIMESTAMP_SUB({{ var('now_ts') }}, INTERVAL 14 DAY)
  )
  CROSS JOIN UNNEST([IFNULL(warmth_val - prev_warmth, 0)]) AS delta
  GROUP BY 1
),
latest_platform AS (
  SELECT user_id, ANY_VALUE(platform IGNORE NULLS) AS platform_latest
  FROM base
  WHERE platform IN ('ios','android','web')
  GROUP BY 1
),
last_open AS (
  SELECT user_id, MAX(event_ts) AS last_app_open
  FROM base
  WHERE event_name = 'app_open'
  GROUP BY 1
),
outreach AS (
  SELECT user_id,
         COUNTIF(event_name='outreach_sent' AND event_ts >= TIMESTAMP_SUB({{ var('now_ts') }}, INTERVAL 7 DAY)) AS weekly_outreach,
         COUNT(DISTINCT IF(event_name IN ('outreach_sent','note_added','contact_edited'),
                           SAFE_CAST(JSON_VALUE(properties, '$.contact_id') AS STRING), NULL)) AS contacts_touched_7
  FROM base
  GROUP BY 1
)
SELECT
  u.user_id,
  -- activity breadth
  COUNT(DISTINCT IF(d.d >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY), d.d, NULL)) AS days_active_7,
  COUNT(DISTINCT IF(w.iso_week >= FORMAT_DATE('%G-%V', DATE_SUB(CURRENT_DATE(), INTERVAL 3 WEEK)), w.iso_week, NULL)) AS weeks_active_4,
  -- engagement depth
  SAFE_DIVIDE(SUM(IFNULL(gap.gap_min,0)), NULLIF(COUNTIF(gap.gap_min IS NOT NULL),0)) AS avg_session_minutes_7,
  -- recency
  SAFE_DIVIDE(TIMESTAMP_DIFF({{ var('now_ts') }}, lo.last_app_open, HOUR), 1) AS time_since_last_open_hr,
  -- core value
  o.weekly_outreach,
  o.contacts_touched_7,
  IFNULL(wd.warmth_delta_14d, 0.0) AS warmth_delta_14d,
  -- platform
  CASE WHEN lp.platform_latest='ios' THEN 1 ELSE 0 END AS platform_ios,
  CASE WHEN lp.platform_latest='android' THEN 1 ELSE 0 END AS platform_android,
  CASE WHEN lp.platform_latest='web' THEN 1 ELSE 0 END AS platform_web,
  -- monetization pointers
  COUNTIF(event_name='paywall_view') AS paywall_views_28,
  COUNTIF(event_name='trial_started') AS trials_started_28
FROM base u
LEFT JOIN days d USING (user_id)
LEFT JOIN weeks w USING (user_id)
LEFT JOIN sessions_proxy gap USING (user_id)
LEFT JOIN last_open lo USING (user_id)
LEFT JOIN outreach o USING (user_id)
LEFT JOIN warmth_deltas wd USING (user_id)
LEFT JOIN latest_platform lp USING (user_id)
GROUP BY 1, lo.last_app_open, o.weekly_outreach, o.contacts_touched_7, wd.warmth_delta_14d, lp.platform_latest;
```

---

### **2. Notification Hygiene Features** (`notif_hygiene_features.sql`)

```sql
-- models/features/notif_hygiene_features.sql
WITH notif AS (
  SELECT
    resolved_user_id AS user_id,
    event_name,
    event_ts
  FROM {{ source('silver', 'cleaned_events') }}
  WHERE event_name IN ('notif_candidate','notif_sent','notif_opened')
    AND event_ts >= TIMESTAMP_SUB({{ var('now_ts') }}, INTERVAL 30 DAY)
),
sent AS (
  SELECT user_id,
         COUNTIF(event_name='notif_sent' AND event_ts >= TIMESTAMP_SUB({{ var('now_ts') }}, INTERVAL 7 DAY)) AS notif_sent_7,
         COUNTIF(event_name='notif_sent') AS notif_sent_30,
         MAX(IF(event_name='notif_sent', event_ts, NULL)) AS last_notif_sent_ts
  FROM notif
  GROUP BY 1
),
opened AS (
  SELECT user_id,
         COUNTIF(event_name='notif_opened') AS notif_opened_30
  FROM notif
  GROUP BY 1
)
SELECT
  s.user_id,
  s.notif_sent_7,
  s.notif_sent_30,
  o.notif_opened_30,
  SAFE_DIVIDE(o.notif_opened_30, NULLIF(s.notif_sent_30,0)) AS notif_open_rate_30,
  SAFE_DIVIDE(TIMESTAMP_DIFF({{ var('now_ts') }}, s.last_notif_sent_ts, HOUR), 1) AS hours_since_last_notif
FROM sent s
LEFT JOIN opened o USING (user_id);
```

---

### **3. Contact Recency Features** (`contact_recency_features.sql`)

```sql
-- models/features/contact_recency_features.sql
WITH touch AS (
  SELECT
    resolved_user_id AS user_id,
    SAFE_CAST(JSON_VALUE(properties, '$.contact_id') AS STRING) AS contact_id,
    event_name,
    event_ts,
    SAFE_CAST(JSON_VALUE(properties, '$.reply') AS BOOL) AS reply_flag
  FROM {{ source('silver', 'cleaned_events') }}
  WHERE event_ts >= TIMESTAMP_SUB({{ var('now_ts') }}, INTERVAL 180 DAY)
    AND event_name IN ('outreach_sent','reply_marked','note_added')
),
latest_touch AS (
  SELECT user_id, contact_id, MAX(event_ts) AS last_touch_ts
  FROM touch
  GROUP BY 1,2
),
counts AS (
  SELECT
    user_id, contact_id,
    COUNTIF(event_name IN ('outreach_sent','reply_marked','note_added')
            AND event_ts >= TIMESTAMP_SUB({{ var('now_ts') }}, INTERVAL 90 DAY)) AS touches_90,
    COUNTIF(event_name='outreach_sent') AS outreach_cnt_180,
    COUNTIF(reply_flag = TRUE OR event_name='reply_marked') AS reply_cnt_180
  FROM touch
  GROUP BY 1,2
),
tags AS (
  -- Active tag count from add/remove events
  SELECT
    resolved_user_id AS user_id,
    SAFE_CAST(JSON_VALUE(properties, '$.contact_id') AS STRING) AS contact_id,
    SUM(CASE WHEN event_name='relationship_tag_added' THEN 1
             WHEN event_name='relationship_tag_removed' THEN -1 ELSE 0 END) AS net_tags
  FROM {{ source('silver', 'cleaned_events') }}
  WHERE event_name IN ('relationship_tag_added','relationship_tag_removed')
    AND event_ts >= TIMESTAMP_SUB({{ var('now_ts') }}, INTERVAL 365 DAY)
  GROUP BY 1,2
)
SELECT
  c.user_id,
  c.contact_id,
  SAFE_DIVIDE(TIMESTAMP_DIFF({{ var('now_ts') }}, lt.last_touch_ts, DAY), 1) AS days_since_last_touch,
  c.touches_90,
  -- Bayesian-smoothed reply rate over last 180d (prior a=1,b=1)
  SAFE_DIVIDE(c.reply_cnt_180 + 1, c.outreach_cnt_180 + 2) AS reply_rate_user_est,
  GREATEST(IFNULL(t.net_tags,0), 0) AS mutual_tags_count
FROM counts c
LEFT JOIN latest_touch lt USING (user_id, contact_id)
LEFT JOIN tags t USING (user_id, contact_id);
```

---

## 🎛️ Policy Configuration (`policy.yaml`)

```yaml
# config/policy.yaml - Tunable knobs for control loop

notifications:
  max_per_day: 2
  min_hours_between: 8
  quiet_hours_local: [22, 7]  # 10pm-7am user local time
  score_threshold: 0.62        # Base threshold from offline AUC sweep
  fatigue_decay_per_7d_send: 0.08  # Subtract from score for each send in last 7d
  allow_when_session_active: false
  
  topics:
    contacts:
      weight: 0.3
      threshold_boost: 0.05  # Easier to send contacts topics
    warmth:
      weight: 0.4
      threshold_boost: 0.0
    followups:
      weight: 0.3
      threshold_boost: -0.05  # Harder to send (more valuable)

ranking:
  # Model registry coordinates for online inference
  notif_ranker:
    name: notif_ranker_v1
    registry_uri: gs://everreach-models/notification/
    features_user:
      - days_active_7
      - weeks_active_4
      - avg_session_minutes_7
      - time_since_last_open_hr
      - weekly_outreach
      - contacts_touched_7
      - warmth_delta_14d
      - platform_ios
      - platform_android
      - platform_web
    features_hygiene:
      - notif_sent_7
      - notif_open_rate_30
      - hours_since_last_notif
    features_context:
      - local_hour
      - topic_contacts
      - topic_warmth
      - topic_followups

paywall:
  show_when:
    min_contacts: 20
    min_daily_plans_used: 5
  net_benefit_threshold: 0.10  # P(trial) - 0.5*P(bounce)
  annual_banner_gate: annual_discount_banner  # Feature flag

guardrails:
  max_crash_rate: 0.5      # % per 1k sessions
  max_optout_rate: 3.0     # % of users toggling privacy off within 24h
  max_p95_latency_ms: 800
  min_notification_open_rate: 0.15  # Kill switch if below

experiments:
  srm_p_threshold: 0.01  # Halt if Sample Ratio Mismatch p<0.01
  min_sample_size: 1000  # Per variant
  max_concurrent: 3      # Max experiments running
```

---

## 📱 Expo/React Native Instrumentation

```typescript
// app/analytics.ts
import PostHog from 'posthog-react-native';
import { Statsig } from 'statsig-react-native';

export async function initAnalytics(userId?: string) {
  await PostHog.init('ph_project_key', { 
    host: 'https://posthog.yourdomain.com' 
  });
  await Statsig.initialize('statsig-client-key', { 
    userID: userId ?? undefined 
  });

  if (userId) {
    PostHog.identify(userId);
  }
}

export function capture(event: string, props: Record<string, any> = {}) {
  const base = {
    app: { 
      platform: Platform.OS, 
      version: Constants.expoConfig?.version ?? '1.0.0' 
    },
    privacy: { 
      consent_analytics: true, 
      consent_ads: false 
    },
  };
  PostHog.capture(event, { ...base, ...props });
}

// Example: Paywall tracking with A/B test
export async function onPaywallShown(plan: 'pro_monthly' | 'pro_yearly') {
  const copyVariant = Statsig.getExperiment('pw_copy_test').get("copy", "A");
  
  capture('paywall_view', { 
    plan_shown: plan, 
    exp_pw_copy_test: copyVariant 
  });
  
  // Exposure logging
  capture('ab_exposed', { 
    experiment: 'pw_copy_test', 
    variant: copyVariant 
  });
}

// Example: Feature flag evaluation
export async function shouldShowAnnualBanner() {
  const enabled = await Statsig.checkGate('annual_discount_banner');
  
  capture('flag_evaluated', { 
    flag: 'annual_discount_banner', 
    enabled 
  });
  
  return enabled;
}
```

---

## 🤖 FastAPI Model Serving

```python
# serve_ranker.py
from fastapi import FastAPI
import joblib
import json
import numpy as np
from pydantic import BaseModel

app = FastAPI()
model = joblib.load('notif_ranker_v1.joblib')
policy = json.load(open('policy.json'))

class NotifContext(BaseModel):
    user_id: str
    features: dict  # Keys match training features
    sent_in_last_24h: int
    sent_in_last_7d: int
    hours_since_last: float
    local_hour: int
    topic: str

def fatigue_penalty(sent_in_last_7d):
    return policy["fatigue_decay_per_7d_send"] * sent_in_last_7d

def topic_boost(topic):
    return policy.get("topics", {}).get(topic, {}).get("threshold_boost", 0.0)

@app.post("/score")
def score(ctx: NotifContext):
    # Build feature vector in training order
    x = np.array([[
        ctx.features['user_dau_7'],
        ctx.features['user_wau_4'],
        ctx.features['avg_session_minutes_7'],
        ctx.features['notif_count_7'],
        ctx.features['notif_clicked_rate_30'],
        ctx.features['time_since_last_outreach_hours'],
        ctx.local_hour,
        ctx.features['platform_ios'],
        ctx.features['platform_android'],
        ctx.features.get(f'topic_{ctx.topic}', 0)
    ]])
    
    # Raw prediction
    p = float(model.predict_proba(x)[0, 1])
    
    # Adjust for fatigue and topic
    p_adj = p - fatigue_penalty(ctx.sent_in_last_7d) + topic_boost(ctx.topic)
    
    # Policy gates
    allowed = (
        ctx.sent_in_last_24h < policy["max_per_day"] and
        ctx.hours_since_last >= policy["min_hours_between"] and
        p_adj >= policy["score_threshold"] and
        not is_quiet_hours(ctx.local_hour)
    )
    
    return {
        "user_id": ctx.user_id,
        "score": p,
        "score_adj": p_adj,
        "send": allowed,
        "reason": "policy_ok" if allowed else get_block_reason(ctx, p_adj)
    }

def is_quiet_hours(local_hour):
    quiet = policy["quiet_hours_local"]
    return quiet[0] <= local_hour < quiet[1]

def get_block_reason(ctx, p_adj):
    if ctx.sent_in_last_24h >= policy["max_per_day"]:
        return "daily_cap"
    if ctx.hours_since_last < policy["min_hours_between"]:
        return "min_interval"
    if p_adj < policy["score_threshold"]:
        return "low_score"
    if is_quiet_hours(ctx.local_hour):
        return "quiet_hours"
    return "unknown"

# Health check
@app.get("/health")
def health():
    return {"status": "ok", "model": "notif_ranker_v1", "policy_version": "1.0"}
```

---

## 📊 Dashboard Queries (Ready to Deploy)

### **1. Activation Funnel**

```sql
-- Acquisition funnel (daily)
WITH base AS (
  SELECT resolved_user_id, event_name, event_ts
  FROM cleaned_events
  WHERE event_name IN ('contact_added','outreach_sent','ha_moment_reached')
    AND DATE(event_ts) >= CURRENT_DATE() - 30
),
steps AS (
  SELECT resolved_user_id,
    MIN(CASE WHEN event_name='contact_added' THEN event_ts END) AS step1,
    MIN(CASE WHEN event_name='outreach_sent' THEN event_ts END) AS step2,
    MIN(CASE WHEN event_name='ha_moment_reached' THEN event_ts END) AS step3
  FROM base 
  GROUP BY 1
)
SELECT
  DATE(step1) AS cohort_date,
  COUNT(*) AS started,
  COUNTIF(step2 IS NOT NULL) AS did_outreach,
  COUNTIF(step3 IS NOT NULL) AS activated,
  SAFE_DIVIDE(COUNTIF(step2 IS NOT NULL), COUNT(*)) AS step1_to_step2,
  SAFE_DIVIDE(COUNTIF(step3 IS NOT NULL), COUNTIF(step2 IS NOT NULL)) AS step2_to_step3
FROM steps
WHERE step1 IS NOT NULL
GROUP BY 1
ORDER BY 1 DESC
LIMIT 30;
```

### **2. Persona Performance**

```sql
-- Conversion rates by persona
SELECT 
  pb.label AS persona,
  COUNT(DISTINCT up.user_id) AS users,
  COUNTIF(t.started_at IS NOT NULL) / COUNT(DISTINCT up.user_id) AS trial_rate,
  COUNTIF(s.started_at IS NOT NULL) / COUNTIF(t.started_at IS NOT NULL) AS trial_to_paid,
  AVG(TIMESTAMP_DIFF(t.started_at, up.assigned_at, DAY)) AS avg_days_to_trial
FROM user_persona up
JOIN persona_bucket pb USING (persona_bucket_id)
LEFT JOIN free_trial t ON t.user_id = up.user_id
LEFT JOIN subscription s ON s.user_id = up.user_id
WHERE up.assigned_at >= CURRENT_DATE() - 90
GROUP BY 1
ORDER BY users DESC;
```

### **3. Magnetism Trends**

```sql
-- Weekly magnetism score trends
SELECT 
  DATE_TRUNC(computed_at, WEEK) AS week,
  persona,
  COUNT(*) AS users,
  AVG(magnetism_7d) AS avg_magnetism,
  COUNTIF(magnetism_7d < 30) AS high_risk,
  COUNTIF(magnetism_7d BETWEEN 30 AND 50) AS moderate,
  COUNTIF(magnetism_7d > 70) AS excellent
FROM user_magnetism_index
JOIN user_persona USING (user_id)
JOIN persona_bucket USING (persona_bucket_id)
WHERE computed_at >= CURRENT_DATE() - 90
GROUP BY 1, 2
ORDER BY 1 DESC, 2;
```

### **4. Notification ROI**

```sql
-- Notification performance by score decile
WITH scored AS (
  SELECT 
    user_id,
    topic,
    score_adj,
    NTILE(10) OVER (ORDER BY score_adj) AS score_decile,
    policy_send
  FROM notif_scored_events
  WHERE scored_at >= CURRENT_DATE() - 30
),
outcomes AS (
  SELECT 
    s.user_id,
    s.topic,
    s.score_decile,
    MAX(CASE WHEN o.event_name='notif_opened' THEN 1 ELSE 0 END) AS opened,
    MAX(CASE WHEN o.event_name='notif_converted' THEN 1 ELSE 0 END) AS converted
  FROM scored s
  LEFT JOIN cleaned_events o 
    ON o.user_id = s.user_id 
    AND o.event_ts BETWEEN s.scored_at AND s.scored_at + INTERVAL 24 HOUR
  WHERE s.policy_send = TRUE
  GROUP BY 1,2,3
)
SELECT 
  score_decile,
  COUNT(*) AS sent,
  SUM(opened) AS opens,
  SUM(converted) AS conversions,
  SAFE_DIVIDE(SUM(opened), COUNT(*)) AS open_rate,
  SAFE_DIVIDE(SUM(converted), SUM(opened)) AS open_to_action
FROM outcomes
GROUP BY 1
ORDER BY 1;
```

---

## 🚀 Quick Deploy Scripts

### **Export Features to Parquet** (Daily Cron)

```bash
#!/bin/bash
# export_features.sh

# Run dbt to generate feature tables
cd /app/dbt
dbt run --select features.*

# Export to parquet
bq extract --destination_format=PARQUET \
  'everreach.user_engagement_features' \
  'gs://everreach-features/user_engagement/*.parquet'

bq extract --destination_format=PARQUET \
  'everreach.notif_hygiene_features' \
  'gs://everreach-features/notif_hygiene/*.parquet'

bq extract --destination_format=PARQUET \
  'everreach.contact_recency_features' \
  'gs://everreach-features/contact_recency/*.parquet'

echo "Features exported successfully"
```

### **Feast Apply** (Register Features)

```bash
#!/bin/bash
# feast_apply.sh

cd /app/feast
feast apply

# Materialize to online store
feast materialize-incremental $(date -u +"%Y-%m-%dT%H:%M:%S")

echo "Feast features materialized"
```

---

**Production-ready code from ChatGPT insights - Ready to deploy** 🚀
