# 📋 Marketing Intelligence System - Complete Implementation Plan

**Date**: October 22, 2025  
**Duration**: 12 weeks (3 months)  
**Team**: 2-3 engineers  
**Status**: Ready to execute

---

## 🎯 Executive Summary

Transform EverReach into a **data-driven, AI-optimized growth machine** with:
- **84% cost savings** on enrichment (vs Clay)
- **Complete user journey tracking** (10 phases)
- **ML-powered optimization** (marketing + retention)
- **Control loop automation** (self-improving system)

**Total Investment**: ~500 engineering hours  
**Expected ROI**: $75k saved over 3 years + 15-20% retention improvement

---

## 📊 Current State Analysis

### **✅ What We Have**
- ✅ Unified Enrichment System (RapidAPI + Perplexity + OpenAI)
- ✅ Marketing Intelligence Schema (15 tables, 850 lines SQL)
- ✅ PostHog event tracking (basic)
- ✅ Supabase backend with RLS
- ✅ 60+ comprehensive tests
- ✅ Complete documentation (6 docs, ~5,000 lines)

### **❌ What's Missing**
- ❌ Event tracking integration (22+ new events)
- ❌ dbt data pipeline (Bronze/Silver/Gold)
- ❌ Feature store (offline + online)
- ❌ ML models (6 defense, 4 offense)
- ❌ Control loop automation
- ❌ Dashboards & monitoring
- ❌ A/B testing framework

---

## 🗓️ 12-Week Implementation Roadmap

### **Phase 1: Foundation** (Weeks 1-3)

#### **Week 1: Data Infrastructure**
**Goal**: Set up data pipeline foundation

**Tasks**:
- [ ] Deploy marketing intelligence schema to production Supabase
- [ ] Configure PostHog → BigQuery export (or Snowflake)
- [ ] Set up dbt project structure (Bronze/Silver/Gold layers)
- [ ] Create initial event catalog (22 core events)
- [ ] Implement event envelope structure

**Deliverables**:
- ✅ `marketing-intelligence-schema.sql` deployed
- ✅ PostHog exporting to warehouse
- ✅ dbt project initialized
- ✅ Event catalog documented

**Effort**: 40 hours (2 engineers)

---

#### **Week 2: Event Tracking**
**Goal**: Instrument core user journey events

**Mobile App** (React Native):
- [ ] Add 22 core events to `services/analytics.ts`
- [ ] Implement consent flow (`consent_analytics_changed`)
- [ ] Add experiment exposure logging (`ab_exposed`)
- [ ] Test event flow (PostHog Live Events)

**Backend**:
- [ ] Set up webhook receiver (`/api/posthog-webhook`)
- [ ] Implement property whitelist validation
- [ ] Create `ingest_event()` RPC for Supabase mirroring

**Deliverables**:
- ✅ 22 events firing in production
- ✅ Events mirrored to Supabase
- ✅ Privacy flags honored

**Effort**: 40 hours (2 engineers)

---

#### **Week 3: dbt Models (Bronze → Silver)**
**Goal**: Clean and structure event data

**Tasks**:
- [ ] Create `bronze/raw_events.sql` (immutable source)
- [ ] Build `silver/cleaned_events.sql` (deduped, typed)
- [ ] Implement identity stitching (anon_id → user_id)
- [ ] Add sessionization logic (30-min inactivity)
- [ ] Set up freshness alerts

**Deliverables**:
- ✅ `cleaned_events` table live
- ✅ Identity graph working
- ✅ Sessions computed
- ✅ Freshness monitoring

**Effort**: 40 hours (2 engineers)

---

### **Phase 2: Feature Engineering** (Weeks 4-5)

#### **Week 4: Gold Layer + Feature Views**
**Goal**: Create ML-ready feature tables

**Tasks**:
- [ ] Deploy `user_engagement_features.sql` (from technical doc)
- [ ] Deploy `notif_hygiene_features.sql`
- [ ] Deploy `contact_recency_features.sql`
- [ ] Create materialized views for performance
- [ ] Set up daily refresh cron job

**Deliverables**:
- ✅ 3 feature views live
- ✅ Features refreshing daily
- ✅ Sample features validated

**Effort**: 30 hours (2 engineers)

---

#### **Week 5: Feature Store Setup**
**Goal**: Enable online ML inference

**Tasks**:
- [ ] Install Feast (or Redis + custom code)
- [ ] Define feature views in `features.py`
- [ ] Export features to Parquet (offline store)
- [ ] Sync to Redis (online store)
- [ ] Create `/api/features/:user_id` endpoint

**Deliverables**:
- ✅ Feast repository initialized
- ✅ Features in online store (< 50ms latency)
- ✅ API endpoint working

**Effort**: 30 hours (1-2 engineers)

---

### **Phase 3: ML Models - Defense** (Weeks 6-8)

#### **Week 6: Notification Ranker (Model #1)**
**Goal**: Ship first ML model to production

**Tasks**:
- [ ] Extract training data (last 4 weeks)
- [ ] Label: `returned_24h_after_notif` (binary)
- [ ] Train XGBoost model (offline)
- [ ] Evaluate: AUC > 0.65 target
- [ ] Save model + `policy.yaml`

**Deliverables**:
- ✅ `notif_ranker_v1.joblib` trained
- ✅ AUC documented
- ✅ Policy configuration created

**Effort**: 40 hours (1 ML engineer)

---

#### **Week 7: Model Serving + Shadow Mode**
**Goal**: Deploy model without affecting users

**Tasks**:
- [ ] Build FastAPI service (from technical doc)
- [ ] Deploy to Vercel/Railway/Fly.io
- [ ] Create `/score` endpoint
- [ ] Implement shadow mode (log scores, don't act)
- [ ] Monitor: score distribution, latency

**Deliverables**:
- ✅ Model serving API live
- ✅ Shadow scores logged
- ✅ 7 days of shadow data

**Effort**: 30 hours (1 backend engineer)

---

#### **Week 8: Canary Rollout + Monitoring**
**Goal**: Ship to 5% of users, monitor closely

**Tasks**:
- [ ] Implement policy gates (max 2/day, min 8h, quiet hours)
- [ ] Deploy to 5% of users (feature flag)
- [ ] Set up monitoring dashboards (Grafana/Retool)
- [ ] Track: send volume, open rate, opt-outs, crashes
- [ ] Validate guardrails not breached

**Deliverables**:
- ✅ 5% canary live
- ✅ Guardrails passing
- ✅ Dashboards built

**Effort**: 30 hours (2 engineers)

---

### **Phase 4: Control Loop + Optimization** (Weeks 9-10)

#### **Week 9: PI Controller Implementation**
**Goal**: Automate notification intensity

**Tasks**:
- [ ] Implement PI controller (from control systems doc)
- [ ] Set targets (D7 retention = 45%, notif ROI = 30%)
- [ ] Configure Kp = 0.05, Ki = 0.01
- [ ] Add anti-windup logic
- [ ] Create weekly review dashboard

**Deliverables**:
- ✅ Controller running
- ✅ Weekly adjustments automated
- ✅ Targets tracked

**Effort**: 20 hours (1 engineer)

---

#### **Week 10: Additional Defense Models**
**Goal**: Deploy 2-3 more retention models

**Models to Ship**:
1. **Suggested Contacts Ranking** (20 hours)
   - Target: P(outreach_sent | shown)
   - Integration: Home screen widget

2. **Churn Early Warning** (15 hours)
   - Target: P(churn_14d)
   - Integration: Email campaign trigger

3. **Contextual Paywall** (15 hours)
   - Target: Net benefit (trial - bounce)
   - Integration: Threshold triggers

**Deliverables**:
- ✅ 3 models deployed
- ✅ Integrated into product

**Effort**: 50 hours (1 ML engineer)

---

### **Phase 5: Marketing Optimization** (Weeks 11-12)

#### **Week 11: Offense Models (Marketing)**
**Goal**: Optimize ad spend and creative

**Models**:
1. **Creative Ranker** (20 hours)
   - Input: Creative embedding + audience
   - Target: P(click), P(install)
   - Integration: Pre-launch testing

2. **Budget Allocator** (20 hours)
   - Contextual bandit
   - Arms: campaign × creative × audience
   - Reward: qualified_signups/day

**Deliverables**:
- ✅ Creative testing automated
- ✅ Budget optimizer live

**Effort**: 40 hours (1 ML engineer)

---

#### **Week 12: Dashboards + Handoff**
**Goal**: Ship production dashboards and documentation

**Dashboards** (Retool/Metabase/Grafana):
1. **Acquisition Funnel** (ad → email → trial → paid)
2. **Persona Performance** (conversion rates by bucket)
3. **Magnetism Trends** (7d/30d rolling)
4. **Notification ROI** (by score decile)
5. **Campaign Attribution** (multi-touch)
6. **Churn Risk Leaderboard**
7. **A/B Test Results** (live experiments)

**Documentation**:
- [ ] Update README with architecture
- [ ] Create runbook (troubleshooting)
- [ ] Document weekly ops cadence
- [ ] Train team on dashboards

**Deliverables**:
- ✅ 7 dashboards live
- ✅ Team trained
- ✅ Docs complete

**Effort**: 40 hours (2 engineers)

---

## 📈 Success Metrics (Track Weekly)

### **Phase 1-3 Metrics** (Foundation + Features)
- [ ] Events flowing: 22+ event types, 10k+ events/day
- [ ] Data freshness: < 1 hour lag
- [ ] Feature store latency: < 50ms p95
- [ ] Data quality: 95%+ events pass validation

### **Phase 4-5 Metrics** (ML + Optimization)
- [ ] Notification model AUC: > 0.65
- [ ] D7 retention: +3-5 percentage points
- [ ] Notification open→action: > 30%
- [ ] Churn risk accuracy: > 70%
- [ ] Campaign CAC: -15% improvement
- [ ] Guardrails: 0 breaches

---

## 💰 Cost Analysis

### **Infrastructure Costs** (Monthly)

| Service | Cost | Purpose |
|---------|------|---------|
| BigQuery/Snowflake | $200-500 | Data warehouse |
| PostHog | $0-200 | Event tracking (10M events free) |
| Redis (Upstash) | $0-50 | Feature store online |
| Model Serving | $50-100 | Vercel/Railway for FastAPI |
| RapidAPI | $4-41 | Enrichment (100-1k signups/mo) |
| Perplexity | $0-100 | Company intel |
| OpenAI | $30-300 | Persona analysis + embeddings |
| **Total** | **$284-1,291** | **Scales with usage** |

**Break-Even**: ~200 signups/month (vs Clay at $0.25 each)

### **Engineering Investment**

| Phase | Hours | Cost @ $100/hr |
|-------|-------|----------------|
| Phase 1 (Foundation) | 120 | $12,000 |
| Phase 2 (Features) | 60 | $6,000 |
| Phase 3 (ML Defense) | 100 | $10,000 |
| Phase 4 (Control Loop) | 70 | $7,000 |
| Phase 5 (Marketing) | 80 | $8,000 |
| **Total** | **430** | **$43,000** |

**3-Year ROI**: $75k saved (enrichment) + ~$50k retention value = **$125k return on $43k investment = 2.9x**

---

## ⚠️ Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Data quality issues** | High | Implement schema validation, freshness alerts, dbt tests |
| **Model underperforms** | Medium | Start with simple thresholds, A/B test before rollout |
| **User fatigue/opt-outs** | High | Strict guardrails (max 2/day), monitor opt-out rate |
| **Performance degradation** | Medium | SLOs on latency, feature store caching, kill switches |
| **Incomplete event tracking** | High | Phase 1 focus, comprehensive testing before Phase 2 |
| **Team capacity** | Medium | Prioritize defense models (retention) over offense (marketing) |

---

## 🎯 Decision Points (Go/No-Go Gates)

### **After Week 3** (Foundation Complete)
**Required**:
- ✅ 22 events firing reliably
- ✅ Data pipeline latency < 1 hour
- ✅ Identity stitching working

**Go/No-Go**: If data quality < 90%, pause and fix before Phase 2

---

### **After Week 5** (Features Ready)
**Required**:
- ✅ Features refreshing daily
- ✅ Online store latency < 50ms
- ✅ Sample predictions validated

**Go/No-Go**: If feature quality issues, fix before training models

---

### **After Week 8** (First Model Live)
**Required**:
- ✅ AUC > 0.65
- ✅ Guardrails passing (crash, opt-out, latency)
- ✅ 7 days canary with no incidents

**Go/No-Go**: If guardrails breached, roll back and retune

---

### **After Week 10** (Control Loop Running)
**Required**:
- ✅ D7 retention trending up (+2pp minimum)
- ✅ Controller stable (no oscillation)
- ✅ Team comfortable with ops

**Go/No-Go**: If retention flat, investigate before Phase 5

---

## 🚀 Quick Start (Week 1 Kickoff)

### **Day 1: Setup**
1. Create `#marketing-intelligence` Slack channel
2. Set up weekly sync (Mondays 10am)
3. Clone repo, create branch: `feat/marketing-intelligence`
4. Deploy schema: `psql $DATABASE_URL -f marketing-intelligence-schema.sql`

### **Day 2: Infrastructure**
1. Set up PostHog project (or existing)
2. Configure BigQuery/Snowflake
3. Enable PostHog → Warehouse export
4. Test: Send test event, verify in warehouse

### **Day 3-5: dbt Kickoff**
1. Install dbt: `pip install dbt-bigquery`
2. Initialize project: `dbt init everreach_analytics`
3. Create sources.yml (point to PostHog export)
4. Build bronze/raw_events model
5. Run: `dbt run --select raw_events`

---

## 📚 Resources & Documentation

### **Key Documents** (In This Repo)
1. `ANALYTICS_BEST_PRACTICES.md` - Event tracking guide
2. `ML_ARCHITECTURE_OFFENSE_DEFENSE.md` - Model architecture
3. `CONTROL_SYSTEMS_PRODUCT_OPTIMIZATION.md` - Control loop design
4. `EVENT_TAXONOMY_COMPLETE.md` - 100+ event catalog
5. `MARKETING_INTELLIGENCE_TECHNICAL_IMPLEMENTATION.md` - Code & SQL
6. `MARKETING_INTELLIGENCE_COMPLETE_SUMMARY.md` - Executive overview

### **External References**
- **dbt Best Practices**: https://docs.getdbt.com/guides/best-practices
- **PostHog Docs**: https://posthog.com/docs
- **Feast Guide**: https://docs.feast.dev
- **XGBoost Tutorial**: https://xgboost.readthedocs.io
- **Statsig Docs**: https://docs.statsig.com

---

## ✅ Final Checklist (Before Launch)

### **Phase 1 Complete**
- [ ] Schema deployed to production
- [ ] 22+ events firing
- [ ] Data flowing to warehouse
- [ ] dbt pipeline running
- [ ] Identity stitching working

### **Phase 2 Complete**
- [ ] 3 feature views built
- [ ] Features in online store
- [ ] API endpoint < 50ms
- [ ] Daily refresh working

### **Phase 3 Complete**
- [ ] Notification ranker AUC > 0.65
- [ ] Model serving in production
- [ ] Guardrails configured
- [ ] 5% canary successful

### **Phase 4 Complete**
- [ ] Controller running
- [ ] Targets tracked weekly
- [ ] 3+ models deployed
- [ ] Retention trending up

### **Phase 5 Complete**
- [ ] Marketing models live
- [ ] 7 dashboards built
- [ ] Team trained
- [ ] Documentation complete

---

## 🎉 Expected Outcomes (After 12 Weeks)

### **Quantitative**
- ✅ **D7 Retention**: +3-5 percentage points (42% → 45-47%)
- ✅ **Notification ROI**: 30%+ open→action rate
- ✅ **CAC Reduction**: -15% via creative optimization
- ✅ **Enrichment Cost**: $0.041 vs $0.25 (84% savings)
- ✅ **Churn Prediction**: 70%+ accuracy

### **Qualitative**
- ✅ **Data-Driven Culture**: Weekly metric reviews, A/B tests
- ✅ **Self-Improving System**: Control loops auto-adjust
- ✅ **Actionable Insights**: Real-time dashboards
- ✅ **Reduced Manual Work**: Automated optimization
- ✅ **Competitive Advantage**: ML-powered growth

---

## 🔄 Post-Launch: Continuous Improvement

### **Weekly Ops Cadence**
- **Monday 10am**: Review metrics (30 min)
  - D7 retention, magnetism, notif ROI, churn risk
- **Monday 11am**: Adjust controllers (15 min)
  - Update policy.yaml if off-target
- **Tuesday**: Ship experiments (2-3 per week)
- **Friday**: Review experiment results
- **Monthly**: Retrain models, update documentation

### **Quarterly Reviews**
- [ ] Refresh persona buckets (new data)
- [ ] Update intent weights
- [ ] Audit feature importance
- [ ] Review model performance (AUC, precision/recall)
- [ ] Optimize costs (warehouse, APIs)

---

**Ready to transform EverReach into a data-driven growth machine** 🚀

**Questions?** Open an issue or ping in `#marketing-intelligence`
