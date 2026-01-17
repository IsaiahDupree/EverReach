# 🤖 ML Architecture - Offense (Marketing) & Defense (Retention)

**Date**: October 22, 2025  
**Source**: ChatGPT conversation insights  
**Status**: Production-ready architecture

---

## 🎯 Overview

Two parallel ML systems working together:
- **OFFENSE**: Outbound marketing optimization (acquisition, conversion)
- **DEFENSE**: User retention & engagement (activation, churn prevention)

Both use the same event data, feature store, and control loop—but optimize different objectives.

---

## ⚔️ OFFENSE: Marketing Optimization (Sim Consumers)

**Objective**: Maximize CAC ↔ LTV efficiency and qualified activations.

### **Models (4)**

#### **1. Creative Ranker** (Ad Selection)
- **Input**: Creative embedding + audience + device + hour
- **Target**: P(click) and P(install), P(qualified_signup)
- **Use**: Pre-launch creative selection; online bandits for budget split

#### **2. Audience Expansion / Lookalike**
- **Input**: Seed user traits (aggregated), platform signals
- **Target**: P(activate_72h) proxy
- **Use**: Build high-quality audience lists; throttle by CAC

#### **3. Landing Page Variant Ranker**
- **Input**: LP variant + traffic source + geo + device
- **Target**: P(lead_captured) and P(install)
- **Use**: Route traffic to best LP; A/B verify

#### **4. Budget Allocator** (Contextual Bandit)
- **Arms**: {campaign × creative × audience}
- **Reward**: qualified_signups/day or est. LTV − spend
- **Constraints**: Daily budget, frequency caps, fairness slices

---

## 🛡️ DEFENSE: Retention & Engagement (Sim Users)

**Objective**: Increase TTFV, weekly warmth, retention; reduce fatigue.

### **Models (6)**

#### **1. Notification Send/What/When Ranker** (PRIMARY)
- **Target**: P(returned_24h | send topic t now) with fatigue penalties
- **Features**: user + notification hygiene + local_hour + topic signals
- **Policy**: max 2/day, min 8h, quiet hours, platform guardrails

#### **2. Suggested Contacts Ranking**
- **Target**: P(outreach_sent | shown) or expected warmth_gain
- **Model**: Gradient-boosted ranker or two-tower (user ↔ contact)

#### **3. Template/Channel Recommender**
- **Target**: P(reply_marked | template, channel, context)
- **Features**: user/channel history, template embedding, local_hour

#### **4. Churn Early-Warning + Playbook Uplift**
- **Target**: P(churn_14d) and uplift from playbooks
- **Use**: Route each at-risk user to best playbook (email vs push vs in-app)

#### **5. Contextual Paywall Net Benefit**
- **Target**: paywall_net_benefit = P(start_trial | view) − λ · P(bounce | view)
- **Use**: Show paywall only when net positive and guardrails safe

#### **6. UI Personalization** (Nav/Modules)
- **Target**: P(core_action | module_promoted)
- **Use**: Re-order nav and home cards per user; re-evaluate weekly

---

## 🔄 Shared Infrastructure

### **Feature Store** (3 levels)

**User Features** (7/28-day windows):
```python
- dau_7, wau_4, avg_session_min_7
- time_since_last_open_hr
- weekly_outreach, contacts_touched_7
- warmth_delta_14d
- is_trialing, days_to_expiry
- platform_ios/android, local_hour
```

**Contact Features**:
```python
- days_since_last_touch
- touches_90, reply_rate_user_est
- mutual_tags_count, importance_score
```

**Interaction Features**:
```python
- template_success_rate_user
- channel_success_rate_user
- ewma_outreach_interval, streak_days
```

### **Offline + Online Store**

- **Offline**: dbt/SQL → parquet (daily/hourly)
- **Online**: Redis/Feast (low-latency KV)
- **SLAs**: user features TTL 48h, notification counters TTL 7d

---

## 📊 Training & Serving

### **Offline Training** (Weekly)
```python
# train_ranker.py
import pandas as pd
from xgboost import XGBClassifier

df = pd.read_parquet('bq_notif_training.parquet')
y = df['returned_24h'].astype(int)
features = ['user_dau_7', 'notif_count_7', 'local_hour', ...]
X = df[features]

model = XGBClassifier(n_estimators=300, max_depth=5)
model.fit(X_train, y_train)
joblib.dump(model, 'notif_ranker_v1.joblib')
```

### **Online Inference** (FastAPI)
```python
# serve_ranker.py
from fastapi import FastAPI
model = joblib.load('notif_ranker_v1.joblib')
policy = json.load(open('policy.json'))

@app.post("/score")
def score(ctx: NotifContext):
    p = float(model.predict_proba(x)[0,1])
    p_adj = p - fatigue_penalty(ctx.sent_in_last_7d)
    
    allowed = (
        ctx.sent_in_last_24h < policy["max_per_day"] and
        ctx.hours_since_last >= policy["min_hours_between"] and
        p_adj >= policy["score_threshold"]
    )
    return {"score": p, "score_adj": p_adj, "send": allowed}
```

---

## 🎮 Control Loop (Sense → Decide → Act → Learn)

```
[SENSE]
Client Events → Stream (Kafka/PostHog) → Warehouse (dbt)

[FEATURES]
Gold Tables → Offline Views → Online KV Store

[DECIDE]
Candidate Gen → Predictors (rankers) → Policy (thresholds/guardrails)

[ACT]
UI/Notifications/Paywall → Product+Users

[MEASURE]
Log exposures + outcomes (ab_exposed, converted)

[LEARN]
Offline Training → Shadow Deploy → Promote → Retrain Weekly
```

---

## 🚀 Implementation Roadmap

### **Week 1: Foundation**
- [ ] Build user_engagement, notif_hygiene, contact_recency feature views
- [ ] Export features to parquet daily
- [ ] Set up Feast online store (Redis)

### **Week 2: First Model**
- [ ] Train notification ranker v1 (supervised, threshold + fatigue)
- [ ] Deploy FastAPI service with policy.yaml
- [ ] Shadow mode: log scores without acting

### **Week 3: A/B Test**
- [ ] 5% canary with kill-switch
- [ ] Monitor: open→action, send volume, opt-outs
- [ ] Ramp to 100% if guardrails pass

### **Week 4: Second Model**
- [ ] Train suggested contacts ranker
- [ ] Integrate into UI
- [ ] Measure outreach lift

---

## 📈 Success Metrics

### **Offense (Marketing)**
- CAC by channel
- Qualified signup rate
- Time-to-trial
- Ad creative CTR by persona
- Budget efficiency (LTV/CAC)

### **Defense (Retention)**
- D1/D7/D28 retention
- Notification open→action rate
- Weekly warmth delta
- Churn rate by cohort
- Paywall net benefit

---

## ✅ Quick Reference

**Offense Models**: Creative, Audience, LP, Budget  
**Defense Models**: Notifications, Contacts, Templates, Churn, Paywall, UI  
**Feature Store**: User (7/28d), Contact, Interaction  
**Training**: Weekly offline (XGBoost/LightGBM)  
**Serving**: FastAPI + policy.yaml (tunable without redeploy)  
**Loop**: Sense → Features → Predict → Act → Learn

---

**From ChatGPT insights - Ready for EverReach CRM**
