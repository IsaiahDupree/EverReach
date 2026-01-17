# 🎯 Marketing Intelligence System - Complete Overview

**Version**: 2.0  
**Date**: October 22, 2025  
**Status**: Implementation Ready with Unified Enrichment System  
**Scope**: Intent-based attribution, persona bucketing, magnetism tracking, lifecycle optimization  
**Cost**: 84% cheaper than Clay ($0.041 vs $0.25 per enrichment)

---

## 📋 System Components

### 1. Intent-Based Attribution (Unified Enrichment System)
**Purpose**: Track complete user journey from ad impression → email capture → enrichment → conversion → retention

**Replaces Clay with**:
- ✅ **RapidAPI Social Links Search** - Email → 9 social platforms ($0.001/enrichment)
- ✅ **Perplexity AI** - Company intelligence & research ($0.01/enrichment)
- ✅ **OpenAI GPT-4** - Persona analysis & bucketing ($0.03/enrichment)

**Key Features**:
- Email capture triggers automatic enrichment
- Social media profiles linked to user identity
- Weighted intent scoring (0-100 scale)
- Multi-touch attribution tracking
- Anonymous → identified user linking
- Last-touch attribution before conversion

**Intent Weight System**:
- Ad click: 10 points
- Page scroll >50%: 8 points
- Email submitted: 30 points
- Identity enriched: 10 points
- Email click: 15 points
- Onboarding step: 12 points
- Trial started: 25 points
- Feature used: 10 points
- Return to ad/social: 6-8 points

### 2. Persona Intelligence (AI-Powered Bucketing)
**Purpose**: Analyze social profiles to create ICP buckets and enable personalized outreach

**6 Predefined Persona Buckets**:
1. **Automation Pro / Marketing Strategist** (High intent)
   - Active on LinkedIn/Twitter, shares AI/tech content, ROI-focused
   
2. **Creative in Transition** (Medium intent)
   - Instagram-first, aesthetic focus, visual storytelling
   
3. **Tech Entrepreneur / Product Builder** (High intent)
   - Cross-platform, product-focused, technical discussions
   
4. **Corporate Executive** (Medium intent)
   - LinkedIn-dominant, thought leader, formal tone
   
5. **Student / Early Career** (Low intent)
   - Learning-focused, seeks mentorship, multi-platform
   
6. **Networking Enthusiast** (Medium intent)
   - High connections, event-focused, relationship-builder

**AI-Powered Analysis**:
- Content topic extraction (AI, marketing, tech, lifestyle)
- Tone analysis (educational, casual, motivational, technical)
- Audience type detection (peers, followers, customers)
- Professional focus identification
- Automatic bucket assignment with confidence score (0-1)

**Key Features**:
- Automated persona assignment via OpenAI
- Confidence scoring for each assignment
- Self-improving through conversion data feedback
- Persona-specific email templates and timing
- Campaign optimization per persona

### 3. Magnetism Index (Brand Resonance Score)
**Purpose**: Measure brand "stickiness" and user engagement post-onboarding

**Formula** (0-100 scale):
```javascript
magnetism_index = 
  (intent_score * 0.3) +           // Pre-email intent signals
  (engagement_rate * 0.25) +       // App/feature usage
  (reactivation_rate * 0.2) +      // Successful reactivations
  (email_ctr * 0.15) +             // Email engagement
  (social_return_visits * 0.1)     // Returns to ads/posts
```

**Tracked Over Time Windows**:
- 7-day rolling window (recent engagement)
- 30-day rolling window (monthly trends)
- Computed daily via materialized view

**What It Measures**:
- How "magnetic" your brand is to each user
- Likelihood of continued engagement
- Early warning for churn risk
- Effectiveness of reactivation campaigns
- Brand resonance by persona type

**Usage**:
```sql
-- Get user's current magnetism
SELECT compute_magnetism_index(user_id, '7d');

-- Track trend over time
SELECT computed_at, index_value 
FROM user_magnetism_index 
WHERE user_id = :user_id 
ORDER BY computed_at DESC;
```

**Thresholds**:
- < 30: High churn risk → Trigger intervention
- 30-50: Moderate engagement → Monitor
- 50-70: Good engagement → Maintain
- 70+: Excellent engagement → Potential advocate

### 4. Complete Lifecycle Tracking (10 Phases)

**Phase 1: Anonymous Engagement**
- Ad impressions, clicks, landing views
- Page scroll depth tracking
- Return visits to ads/posts
- Time on page metrics

**Phase 2: Email Capture (Identity Threshold)**
- Email submission event
- Anonymous → identified linking
- Trigger enrichment workflow
- Snapshot pre-email intent score

**Phase 3: Identity Enrichment**
- Social profile discovery (9 platforms)
- Company intelligence gathering
- Persona classification
- Audience size detection

**Phase 4: Onboarding Journey**
- App open tracking
- Step-by-step completion
- Feature usage depth
- Drop-off point identification

**Phase 5: Trial Activation**
- Activation source attribution
- Time-to-trial measurement
- Onboarding completion tracking
- Feature adoption patterns

**Phase 6: Email Engagement**
- Open rates by template
- Best open time per user
- Click-through rates
- Personalized send time optimization

**Phase 7: Magnetism Measurement**
- Post-onboarding engagement tracking
- Reactivation campaign effectiveness
- Return visit patterns
- Brand resonance scoring

**Phase 8: Conversion to Paid**
- Purchase attribution
- Full journey analysis (ad → purchase)
- MRR tracking
- Plan selection patterns

**Phase 9: Retention & Reactivation**
- Inactive user detection
- Reactivation campaign triggers
- Churn risk scoring
- Win-back sequences

**Phase 10: Lifecycle Campaigns**
- Persona-specific messaging
- Seasonal promotions
- Anniversary rewards
- Student/age-based offers
- Feedback surveys (quarterly)
- Cancellation prevention

---

## 🏗️ Implementation Status

### ✅ What We Have (Complete)

**Enrichment System** (NEW!):
- ✅ Unified Enrichment Client (4 providers)
- ✅ RapidAPI Social Links Search integration
- ✅ Perplexity AI company intelligence
- ✅ OpenAI persona bucketing
- ✅ 40+ comprehensive tests
- ✅ Rate limiting & queuing
- ✅ Cost optimization (84% cheaper than Clay)
- ✅ Batch processing support
- ✅ Statistics tracking

**Backend Infrastructure**:
- ✅ PostHog event tracking infrastructure
- ✅ Supabase database with RLS
- ✅ Admin dashboard system
- ✅ Event mirroring (`app_events` table ready)
- ✅ Developer dashboard with analytics
- ✅ Marketing intelligence schema (15 tables)
- ✅ Intent weight system
- ✅ Magnetism calculator function
- ✅ Attribution query views

**Documentation**:
- ✅ Complete system design
- ✅ Detailed flow documentation
- ✅ SQL schema with examples
- ✅ Integration tests
- ✅ Cost analysis
- ✅ Migration guide from Clay

### 🚧 What We Need (Implementation)

**1. API Endpoints** (6 new):
- [ ] POST `/api/v1/marketing/enrich` - Trigger enrichment
- [ ] POST `/api/v1/marketing/persona` - Assign/update persona
- [ ] GET `/api/v1/marketing/magnetism/:userId` - Get magnetism score
- [ ] POST `/api/v1/marketing/events/ingest` - Webhook receiver
- [ ] GET `/api/v1/marketing/attribution/:userId` - Journey analysis
- [ ] POST `/api/v1/marketing/reactivate` - Trigger reactivation

**2. Webhook Integrations** (4):
- [ ] PostHog → Supabase event mirroring
- [ ] Resend/Flodesk → Email tracking
- [ ] Meta/Google Ads → Impression/click tracking
- [ ] Stripe → Subscription webhooks

**3. Automation Workflows** (Make.com/n8n):
- [ ] Email submitted → Enrich with Unified System
- [ ] Enrichment complete → Assign persona
- [ ] Trial start → Calculate attribution
- [ ] User inactive 7d → Trigger reactivation
- [ ] Churn risk detected → Send retention offer
- [ ] Anniversary reached → Send loyalty email

**4. Dashboard Queries** (8 views):
- [ ] Acquisition funnel (daily)
- [ ] Persona performance (conversion rates)
- [ ] Campaign attribution (last-touch)
- [ ] Email performance by persona
- [ ] Magnetism trends
- [ ] Churn risk leaderboard
- [ ] A/B test results
- [ ] Reactivation effectiveness

**5. Scheduled Jobs** (3 cron):
- [ ] Refresh materialized views (hourly)
- [ ] Compute magnetism snapshots (daily)
- [ ] Process enrichment queue (every 5 min)

**Note**: Schema already created in `marketing-intelligence-schema.sql`

### 📱 What We Need (Mobile/Web)

**Enhanced Event Tracking** (22 new events):

**Pre-Email Phase**:
- [ ] `ad_impression` - Ad shown to user
- [ ] `ad_click` - User clicked ad
- [ ] `landing_view` - Landing page viewed
- [ ] `page_scroll` - Scroll depth (25%, 50%, 75%, 100%)

**Identity Phase**:
- [ ] `email_submitted` - Email captured (CRITICAL)
- [ ] `identity_enriched` - Enrichment completed

**Email Engagement**:
- [ ] `email_open` - Email opened (from ESP webhook)
- [ ] `email_click` - Link clicked in email

**Onboarding**:
- [ ] `app_open` - App launched
- [ ] `onboarding_step` - Step completed
- [ ] `feature_used` - Feature interaction

**Conversion**:
- [ ] `trial_started` - Free trial activated
- [ ] `trial_completed` - Trial ended
- [ ] `purchase` - Subscription purchased
- [ ] `subscription_renewal` - Auto-renewal

**Engagement**:
- [ ] `return_to_ad` - User returned to ad after signup
- [ ] `return_to_social` - User returned to social post
- [ ] `reactivation` - User returned after inactivity

**Social** (optional):
- [ ] `social_comment` - User commented on post
- [ ] `social_like` - User liked post
- [ ] `social_share` - User shared post

**Churn**:
- [ ] `churn_intent` - Churn risk detected
- [ ] `cancel` - User canceled subscription

**Note**: No UI changes needed - all events fire automatically

---

## 📊 Priority Assessment

### 🔴 CRITICAL (Must Have)
1. Basic event tracking (ad click → email → trial)
2. Campaign attribution
3. Email open/click tracking

### 🟡 HIGH (Should Have)
1. Clay enrichment integration
2. Persona bucketing
3. Magnetism index calculation
4. Reactivation campaigns

### 🟢 MEDIUM (Nice to Have)
1. Perplexity social analysis
2. A/B test tracking
3. Survey integration
4. Seasonal campaigns

### ⚪ LOW (Future)
1. Predictive modeling
2. Auto-generated creative
3. Advanced segmentation

---

## ⏱️ Estimated Effort

### Backend Implementation
- Schema & migrations: **8-10 hours**
- API endpoints: **12-16 hours**
- Clay integration: **4-6 hours**
- Webhooks (ESP, ads): **6-8 hours**
- Testing: **8-10 hours**

**Total Backend**: ~40-50 hours (1-2 weeks full-time)

### Mobile Implementation  
- Event tracking: **6-8 hours**
- Testing: **4-6 hours**

**Total Mobile**: ~10-14 hours (2-3 days)

### External Integrations
- Clay setup: **2-4 hours**
- Perplexity API: **3-5 hours**
- ESP webhooks: **4-6 hours**
- Ad platform pixels: **6-8 hours**

**Total Integrations**: ~15-23 hours (3-4 days)

---

## 🎯 Recommended Approach

### Phase 1: Foundation (Week 1)
**Goal**: Basic attribution tracking

1. Create marketing schema (6 tables)
2. Add event ingestion API
3. Track ad clicks & email captures
4. Basic attribution queries

**Deliverables**:
- Can answer: "Which ad drove this trial?"
- Can answer: "What's our email → trial conversion rate?"

### Phase 2: Enrichment (Week 2)
**Goal**: Clay integration & persona bucketing

1. Clay webhook integration
2. Persona bucket table
3. Manual persona assignment UI (admin)
4. Magnetism index calculation

**Deliverables**:
- Enriched user profiles with social handles
- Basic persona segments (3-5 buckets)
- Magnetism score per user

### Phase 3: Intelligence (Week 3)
**Goal**: Automated analysis & personalization

1. Perplexity social analysis
2. Auto-persona assignment
3. Personalized email templates
4. Reactivation campaigns

**Deliverables**:
- Automated ICP bucketing
- Persona-specific messaging
- Reactivation workflows

### Phase 4: Optimization (Week 4)
**Goal**: A/B testing & continuous learning

1. A/B test tracking
2. Survey integration
3. Predictive models
4. Dashboard refinement

**Deliverables**:
- Complete marketing dashboard
- Self-optimizing campaigns
- Churn prediction

---

## 🚧 Blockers & Dependencies

### External Dependencies
1. **Clay Account** - Needed for enrichment
   - Cost: ~$0.10-$0.50 per contact
   - Setup time: 1-2 hours

2. **Perplexity API** - Needed for social analysis
   - Cost: ~$0.01-$0.05 per analysis
   - Setup time: 2-3 hours

3. **ESP Webhooks** - Flodesk/Resend integration
   - Already have Resend configured ✅
   - Need webhook handlers

4. **Ad Platform Pixels**
   - Meta Pixel (already exists?)
   - Google Analytics 4
   - TikTok Pixel

### Technical Blockers
1. Need to decide on Clay vs manual enrichment
2. Need to define persona buckets (data-driven)
3. Need ESP webhook access/configuration
4. Need ad platform tracking IDs

---

## 💰 Cost Analysis

### Monthly Operational Costs
| Service | Cost | Notes |
|---------|------|-------|
| Clay | ~$200-500/mo | 1k-5k enrichments |
| Perplexity | ~$50-150/mo | 5k-15k analyses |
| PostHog | Included | Already configured |
| Supabase | Included | Existing plan |
| **Total** | **~$250-650/mo** | Scales with users |

### Development Costs
- Backend: 40-50 hours × rate
- Mobile: 10-14 hours × rate
- Integration: 15-23 hours × rate
- **Total**: ~65-87 hours

---

## ✅ Decision Points

### Before Starting Implementation

**Decision 1: Scope**
- [ ] Full system (4 weeks) OR
- [ ] Phase 1 only (1 week) OR
- [ ] Custom hybrid

**Decision 2: Enrichment Strategy**
- [ ] Automatic Clay enrichment (costs $)
- [ ] Manual enrichment (free, slower)
- [ ] Hybrid (enrich high-intent only)

**Decision 3: Persona Strategy**
- [ ] Automated via Perplexity (costs $)
- [ ] Manual assignment (free)
- [ ] Rule-based (free, less accurate)

**Decision 4: Priority**
- [ ] Start now (pause other work)
- [ ] After current sprint
- [ ] Defer to Q1 2026

---

## 📁 Related Documents

**To Be Created**:
1. `MARKETING_SCHEMA_DESIGN.md` - Complete SQL schema
2. `MARKETING_API_SPEC.md` - API endpoint definitions
3. `MARKETING_TRACKING_EVENTS.md` - Event catalog
4. `MARKETING_INTEGRATION_GUIDE.md` - Clay/Perplexity setup

**See Also**:
- `MASTER_TODO_LIST.md` - Overall project roadmap
- `ANALYTICS_IMPLEMENTATION_PLAN.md` - Basic analytics
- `SESSION_SUMMARY_ANALYTICS_OCT21.md` - Today's work

---

**Next Step**: Decide on scope, then I'll create detailed implementation docs.
