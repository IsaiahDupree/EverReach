# 📊 Marketing Event Tracking Catalog

**Version**: 1.0  
**Date**: October 21, 2025  
**Platform**: Mobile App + Backend

---

## Event Categories

### 1. Ad & Post Engagement (8 events)

#### `ad_impression`
**When**: Ad is shown to user  
**Platform**: Meta/Google/TikTok Ads  
**Properties**:
```typescript
{
  campaign_id: string;
  creative_id: string;
  platform: 'meta' | 'google' | 'tiktok' | 'linkedin';
  placement: 'feed' | 'story' | 'search' | 'display';
  ad_set_id?: string;
  device: 'ios' | 'android' | 'web';
}
```

#### `ad_click`
**When**: User clicks on ad  
**Properties**:
```typescript
{
  campaign_id: string;
  creative_id: string;
  platform: 'meta' | 'google' | 'tiktok' | 'linkedin';
  placement: string;
  landing_url: string;
  device: string;
}
```

#### `landing_view`
**When**: User lands on landing page  
**Properties**:
```typescript
{
  source: 'ad' | 'organic' | 'email' | 'direct';
  campaign_id?: string;
  referrer: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}
```

#### `page_scroll`
**When**: User scrolls >50% of landing page  
**Properties**:
```typescript
{
  page_url: string;
  scroll_depth: number; // 0-100
  time_on_page_ms: number;
}
```

#### `social_comment`
**When**: User comments on organic post  
**Platform**: Instagram/Twitter/TikTok  
**Properties**:
```typescript
{
  post_id: string;
  platform: 'instagram' | 'twitter' | 'tiktok' | 'linkedin';
  sentiment?: 'positive' | 'neutral' | 'negative';
}
```

#### `social_like`
**When**: User likes/reacts to post  
**Properties**:
```typescript
{
  post_id: string;
  platform: string;
  reaction_type?: string;
}
```

#### `social_share`
**When**: User shares post  
**Properties**:
```typescript
{
  post_id: string;
  platform: string;
  share_destination: string;
}
```

#### `return_to_ad`
**When**: User clicks ad again after initial interaction  
**Properties**:
```typescript
{
  campaign_id: string;
  creative_id: string;
  days_since_first_click: number;
  previous_stage: 'email_submitted' | 'trial_started' | 'churned';
}
```

---

### 2. Email Capture & Identity (3 events)

#### `email_submitted`
**When**: User enters email (signup form, quiz, waitlist)  
**CRITICAL**: This triggers Clay enrichment  
**Properties**:
```typescript
{
  email: string;
  source: 'landing' | 'quiz' | 'waitlist' | 'signup';
  campaign_id?: string;
  creative_id?: string;
  form_name: string;
}
```

#### `identity_enriched`
**When**: Clay enrichment completes  
**Backend Only**  
**Properties**:
```typescript
{
  email: string;
  has_linkedin: boolean;
  has_twitter: boolean;
  has_instagram: boolean;
  company?: string;
  role?: string;
  enrichment_source: 'clay' | 'manual';
}
```

#### `persona_assigned`
**When**: User is assigned to ICP bucket  
**Backend Only**  
**Properties**:
```typescript
{
  persona_bucket_id: number;
  persona_label: string;
  confidence: number; // 0-1
  assignment_source: 'ai' | 'manual' | 'rule';
}
```

---

### 3. Email Campaign Tracking (4 events)

#### `email_sent`
**When**: Email is sent via ESP  
**Webhook from Resend**  
**Properties**:
```typescript
{
  email_id: string;
  template_key: string;
  campaign_id?: string;
  segment: string;
  send_time: timestamp;
}
```

#### `email_open`
**When**: User opens email  
**Properties**:
```typescript
{
  email_id: string;
  template_key: string;
  open_time: timestamp;
  device: string;
  client: string; // Gmail, Apple Mail, etc.
}
```

#### `email_click`
**When**: User clicks link in email  
**Properties**:
```typescript
{
  email_id: string;
  template_key: string;
  url: string;
  link_position: number;
  click_time: timestamp;
}
```

#### `email_unsubscribe`
**When**: User unsubscribes  
**Properties**:
```typescript
{
  email_id: string;
  reason?: string;
  alternatives_offered: string[];
}
```

---

### 4. Onboarding & Trial (5 events)

#### `trial_started`
**When**: User starts free trial  
**Properties**:
```typescript
{
  activated_from: 'ad' | 'organic_post' | 'email' | 'direct';
  source_ref: string; // campaign_id, email_id, post_id
  trial_length_days: number;
}
```

#### `onboarding_step_completed`
**When**: User completes onboarding step  
**Properties**:
```typescript
{
  step_number: number;
  step_name: string;
  completion_time_ms: number;
}
```

#### `onboarding_completed`
**When**: User finishes full onboarding  
**Properties**:
```typescript
{
  total_steps: number;
  total_time_ms: number;
  completed_optional_steps: number;
}
```

#### `feature_activated`
**When**: User first uses a key feature  
**Properties**:
```typescript
{
  feature_name: string;
  days_since_trial_start: number;
}
```

#### `trial_converted`
**When**: User converts to paid  
**Properties**:
```typescript
{
  plan_key: string;
  price_cents: number;
  billing_interval: 'monthly' | 'annual';
  activated_from: string;
  days_in_trial: number;
}
```

---

### 5. Reactivation & Retention (6 events)

#### `app_inactive_7d`
**When**: User hasn't opened app in 7 days  
**Backend Trigger**  
**Properties**:
```typescript
{
  last_activity: timestamp;
  features_used_count: number;
  trigger_reactivation_email: boolean;
}
```

#### `reactivation_email_sent`
**When**: Reactivation campaign triggered  
**Properties**:
```typescript
{
  email_id: string;
  template_key: string;
  inactive_days: number;
  personalized_for: string; // persona bucket
}
```

#### `app_reopened_after_inactivity`
**When**: User returns after 7+ days  
**Properties**:
```typescript
{
  inactive_days: number;
  return_source: 'email' | 'notification' | 'organic' | 'ad';
  source_ref?: string;
}
```

#### `churn_risk_detected`
**When**: AI predicts high churn probability  
**Backend Only**  
**Properties**:
```typescript
{
  churn_score: number; // 0-100
  signals: string[]; // ['low_usage', 'support_ticket', 'competitor_search']
  recommended_actions: string[];
}
```

#### `retention_offer_shown`
**When**: Discount/offer shown to prevent churn  
**Properties**:
```typescript
{
  offer_type: 'discount' | 'feature_unlock' | 'extended_trial';
  discount_pct?: number;
  trigger_reason: string;
}
```

#### `retention_offer_accepted`
**When**: User accepts retention offer  
**Properties**:
```typescript
{
  offer_type: string;
  discount_applied_cents: number;
  estimated_ltv_impact: number;
}
```

---

### 6. Subscription Lifecycle (7 events)

#### `subscription_started`
**When**: First paid subscription begins  
**Properties**:
```typescript
{
  plan_key: string;
  interval: 'monthly' | 'annual';
  price_cents: number;
  activated_from: string;
  trial_days_used: number;
}
```

#### `subscription_renewed`
**When**: Subscription auto-renews  
**Properties**:
```typescript
{
  renewal_number: number;
  plan_key: string;
  price_cents: number;
}
```

#### `subscription_upgraded`
**When**: User upgrades plan  
**Properties**:
```typescript
{
  from_plan: string;
  to_plan: string;
  price_increase_cents: number;
  trigger: 'usage_limit' | 'feature_request' | 'promotion';
}
```

#### `subscription_downgraded`
**When**: User downgrades plan  
**Properties**:
```typescript
{
  from_plan: string;
  to_plan: string;
  price_decrease_cents: number;
  reason?: string;
}
```

#### `cancel_survey_shown`
**When**: User clicks cancel, survey appears  
**Properties**:
```typescript
{
  plan_key: string;
  days_subscribed: number;
  offers_shown: string[];
}
```

#### `cancel_survey_submitted`
**When**: User submits cancellation reason  
**Properties**:
```typescript
{
  primary_reason: string;
  secondary_reasons: string[];
  would_recommend: boolean;
  free_text_feedback?: string;
}
```

#### `subscription_cancelled`
**When**: Cancellation confirmed  
**Properties**:
```typescript
{
  plan_key: string;
  days_subscribed: number;
  total_revenue_cents: number;
  cancellation_reason: string;
  save_offer_declined: boolean;
}
```

---

### 7. Social Return Tracking (3 events)

#### `return_to_social`
**When**: User revisits social media post after initial engagement  
**Properties**:
```typescript
{
  platform: string;
  post_id: string;
  days_since_first_view: number;
  previous_engagement: string[]; // ['like', 'comment']
}
```

#### `social_profile_visit`
**When**: User visits brand's social profile  
**Properties**:
```typescript
{
  platform: string;
  source: 'ad' | 'organic' | 'email' | 'app';
  is_follower: boolean;
}
```

#### `social_follow`
**When**: User follows brand account  
**Properties**:
```typescript
{
  platform: string;
  source: string;
  days_since_first_interaction: number;
}
```

---

### 8. Survey & Feedback (5 events)

#### `nps_survey_shown`
**When**: NPS survey displayed (quarterly)  
**Properties**:
```typescript
{
  survey_id: string;
  trigger: 'quarterly' | 'milestone' | 'post_support';
  days_as_customer: number;
}
```

#### `nps_score_submitted`
**When**: User submits NPS score  
**Properties**:
```typescript
{
  survey_id: string;
  score: number; // 0-10
  segment: 'detractor' | 'passive' | 'promoter';
}
```

#### `feature_request_submitted`
**When**: User requests new feature  
**Properties**:
```typescript
{
  feature_title: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  source: 'app' | 'email' | 'survey';
}
```

#### `feature_request_upvoted`
**When**: User votes on existing request  
**Properties**:
```typescript
{
  feature_id: string;
  current_votes: number;
}
```

#### `bug_reported`
**When**: User reports issue  
**Properties**:
```typescript
{
  category: string;
  severity: string;
  has_screenshot: boolean;
}
```

---

### 9. Promotional Campaigns (4 events)

#### `seasonal_offer_shown`
**When**: Seasonal promo displayed  
**Properties**:
```typescript
{
  season: 'back_to_school' | 'holiday' | 'new_year' | 'summer';
  persona_bucket: string;
  discount_pct: number;
}
```

#### `student_discount_requested`
**When**: User clicks student discount link  
**Properties**:
```typescript
{
  verification_required: boolean;
  semester: 'fall' | 'spring' | 'summer';
}
```

#### `referral_link_shared`
**When**: User shares referral link  
**Properties**:
```typescript
{
  channel: 'email' | 'social' | 'sms';
  incentive_type: string;
}
```

#### `referral_converted`
**When**: Referred user converts  
**Properties**:
```typescript
{
  referrer_user_id: string;
  reward_earned_cents: number;
  referred_user_plan: string;
}
```

---

## Event Weight Configuration

For Intent Score calculation:

| Event | Weight | Rationale |
|-------|--------|-----------|
| `ad_click` | 10 | Mild curiosity |
| `page_scroll` | 8 | Engaged reading |
| `email_submitted` | 30 | **Intent threshold** |
| `identity_enriched` | 10 | Verified identity |
| `email_open` | 12 | Email engagement |
| `email_click` | 15 | Strong interest |
| `onboarding_step_completed` | 12 | Active participation |
| `trial_started` | 25 | High commitment |
| `feature_activated` | 10 | Product exploration |
| `return_to_ad` | 8 | Sustained interest |
| `return_to_social` | 6 | Brand recall |
| `app_reopened_after_inactivity` | 15 | Reactivated interest |

---

## Implementation Checklist

### Mobile App (AnalyticsService)
- [ ] Add 15 new tracking methods
- [ ] Update event type definitions
- [ ] Test all event properties
- [ ] Verify PostHog ingestion

### Backend
- [ ] Create `marketing_events` table
- [ ] Add webhook handlers (ESP, Clay)
- [ ] Implement event ingestion API
- [ ] Create intent score calculator

### External Services
- [ ] Configure PostHog custom events
- [ ] Set up Clay webhook
- [ ] Configure ESP webhooks (Resend)
- [ ] Set up ad platform pixels

---

**Total Events**: 45 events across 9 categories  
**Critical Path Events**: 12 (marked with ⭐ in implementation)  
**External Webhook Events**: 8 (email, ad platforms, Clay)
