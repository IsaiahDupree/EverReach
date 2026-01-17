-- ============================================================================
-- Production Campaigns (5 Ready-to-Ship Campaigns + A/B Templates)
-- ============================================================================
-- 
-- Each campaign includes:
-- 1. Campaign definition with entry_sql
-- 2. A/B template variants (email + SMS)
-- 3. Video script for content creation
-- 
-- A/B Testing: Uses hashtextextended for deterministic variant assignment
-- Deep Links: Include variant tracking for attribution
-- 
-- Run after: lifecycle-automation-system.sql
-- ============================================================================

-- ============================================================================
-- CAMPAIGN 1: Onboarding Stuck (24h)
-- ============================================================================
-- Goal/KPI: Finish signup, reduce time-to-first-value (TTFV)
-- Trigger: User completed at least one onboarding step but not signup_completed within 24h

INSERT INTO campaigns (id, name, description, channel, entry_sql, cooldown_hours, holdout_pct, max_sends_per_day, enabled)
VALUES (
  'a1b2c3d4-1111-4444-8888-111111111111',
  'Onboarding Stuck (24h)',
  'Users who started onboarding but didn''t complete signup within 24h',
  'email',
  $$
-- Returns: user_id, variant_key, context_json
with last_step as (
  select
    e.user_id,
    max(e.ts) as last_step_ts,
    max(e.properties->>'step_id') filter (where e.ts = max(e.ts) over (partition by e.user_id)) as last_step_id
  from event_log e
  where e.event_name = 'onboarding_step_completed'
  group by e.user_id
),
signed_up as (
  select user_id, max(ts) as signed_up_ts
  from event_log
  where event_name = 'signup_completed'
  group by user_id
)
select
  ls.user_id,
  case when mod(abs(hashtextextended(ls.user_id::text || 'onboarding_stuck', 0)), 2) = 0 then 'A' else 'B' end as variant_key,
  jsonb_build_object(
    'reason','onboarding_stuck',
    'step_hint', coalesce(ls.last_step_id,''),
    'deep_link', 'https://everreach.app/dl?to=onboarding&step='||coalesce(ls.last_step_id,'')||
                 '&v='||(case when mod(abs(hashtextextended(ls.user_id::text || 'onboarding_stuck',0)),2)=0 then 'A' else 'B' end)
  ) as context_json
from last_step ls
left join signed_up su on su.user_id = ls.user_id
where su.signed_up_ts is null
  and now() - ls.last_step_ts > interval '24 hours'
  $$,
  48, -- Cooldown: 48 hours
  10, -- Holdout: 10%
  1,  -- Max 1 per day
  true
);

-- Template Variant A: Urgency
INSERT INTO templates (id, campaign_id, variant_key, subject, body_md, sms_text, video_script_md)
VALUES (
  'a1b2c3d4-aaaa-4444-8888-111111111111',
  'a1b2c3d4-1111-4444-8888-111111111111',
  'A',
  'Finish setup in 2 minutes → unlock smart follow-ups',
  'Hey {{first_name}}, you''re one tap away from EverReach doing the remembering for you. Pick up at step {{step_hint}} → {{deep_link}}',
  'Pick up EverReach setup at step {{step_hint}} → {{deep_link}}',
  '**30–45s Video Script (Variant A: Urgency)**

**Hook:** "Two minutes now = zero ''who do I owe a text?'' later."

**Show:** 
- Tap through final onboarding step
- Auto-organized ''Close Circle'' list appears
- One-tap reach-outs ready to send

**CTA:** On-screen button "Resume setup"'
);

-- Template Variant B: Value Proof
INSERT INTO templates (id, campaign_id, variant_key, subject, body_md, sms_text, video_script_md)
VALUES (
  'a1b2c3d4-bbbb-4444-8888-111111111111',
  'a1b2c3d4-1111-4444-8888-111111111111',
  'B',
  'Your contacts, organized automatically.',
  'Finish setup and EverReach will tag close contacts, queue warm reach-outs, and log replies—no spreadsheets. Resume at step {{step_hint}} → {{deep_link}}',
  'Pick up EverReach setup at step {{step_hint}} → {{deep_link}}',
  '**30–45s Video Script (Variant B: Value Proof)**

**Hook:** "Your contacts, organized without the spreadsheet."

**Show:** 
- Complete final setup step
- Contacts auto-tagged by closeness
- Reach-out queue populated automatically

**CTA:** On-screen button "Finish setup"'
);

-- ============================================================================
-- CAMPAIGN 2: Paywall Abandoned (2h)
-- ============================================================================
-- Goal/KPI: Increase paywall_presented → purchase_started CTR and conversion
-- Trigger: User saw paywall in last 24h, no purchase_started within 2h

INSERT INTO campaigns (id, name, description, channel, entry_sql, cooldown_hours, holdout_pct, max_sends_per_day, enabled)
VALUES (
  'b2c3d4e5-2222-4444-8888-222222222222',
  'Paywall Abandoned (2h)',
  'Users who saw paywall but didn''t start checkout within 2 hours',
  'email',
  $$
with last_pw as (
  select distinct on (user_id)
    user_id, ts as pw_ts,
    properties->>'variant' as variant_seen
  from event_log
  where event_name = 'paywall_presented'
  order by user_id, ts desc
),
started as (
  select user_id, min(ts) as first_checkout_ts
  from event_log
  where event_name = 'purchase_started'
  group by user_id
)
select
  lp.user_id,
  coalesce(lp.variant_seen,
    case when mod(abs(hashtextextended(lp.user_id::text || 'paywall_abandoned',0)),2)=0 then 'A' else 'B' end
  ) as variant_key,
  jsonb_build_object(
    'reason','paywall_abandoned',
    'deep_link','https://everreach.app/dl?to=paywall&src=abandoned&v='||
      coalesce(lp.variant_seen,
        case when mod(abs(hashtextextended(lp.user_id::text || 'paywall_abandoned',0)),2)=0 then 'A' else 'B' end)
  ) as context_json
from last_pw lp
left join started s on s.user_id = lp.user_id
where lp.pw_ts > now() - interval '24 hours'
  and (s.first_checkout_ts is null or s.first_checkout_ts > lp.pw_ts + interval '2 hours')
  $$,
  72, -- Cooldown: 72 hours
  10, -- Holdout: 10%
  1,  -- Max 1 per day
  true
);

-- Template Variant A: Trial-led
INSERT INTO templates (id, campaign_id, variant_key, subject, body_md, sms_text, video_script_md)
VALUES (
  'b2c3d4e5-aaaa-4444-8888-222222222222',
  'b2c3d4e5-2222-4444-8888-222222222222',
  'A',
  'Try EverReach free—cancel anytime',
  'Spin up your Close-Circle in minutes. Start your 7-day trial now → {{deep_link}}',
  'Still deciding? Your trial is ready → {{deep_link}}',
  '**30–45s Video Script (Variant A: Trial-led)**

**Hook:** "Try it free, no strings."

**Show:** 
- Tap "Start Free Trial"
- Contacts imported in seconds
- First warm reach-out suggested

**CTA:** "Start 7-day trial"'
);

-- Template Variant B: Social Proof
INSERT INTO templates (id, campaign_id, variant_key, subject, body_md, sms_text, video_script_md)
VALUES (
  'b2c3d4e5-bbbb-4444-8888-222222222222',
  'b2c3d4e5-2222-4444-8888-222222222222',
  'B',
  'People like you are meeting +3 friends this month',
  'EverReach users send 2–3 meaningful check-ins weekly without thinking about it. See how it feels → {{deep_link}}',
  'Still deciding? Your trial is ready → {{deep_link}}',
  '**30–45s Video Script (Variant B: Social Proof)**

**Hook:** "Want more real conversations, fewer ''we should catch up'' texts?"

**Show:** 
- Warmth score board with trending contacts
- Suggested reach-outs (3 shown)
- Quick win: one tap to send

**CTA:** "Start free trial"'
);

-- ============================================================================
-- CAMPAIGN 3: Payment Failed (48h)
-- ============================================================================
-- Goal/KPI: Recover billing within 72h
-- Trigger: payment_failed event within 48h, no successful charge after

INSERT INTO campaigns (id, name, description, channel, entry_sql, cooldown_hours, holdout_pct, max_sends_per_day, enabled)
VALUES (
  'c3d4e5f6-3333-4444-8888-333333333333',
  'Payment Failed (48h)',
  'Users with payment failure in last 48h, not yet resolved',
  'email',
  $$
with failed as (
  select distinct on (user_id)
    user_id, ts as fail_ts
  from event_log
  where event_name = 'payment_failed'
  order by user_id, ts desc
),
fixed as (
  select user_id, min(ts) as fixed_ts
  from event_log
  where event_name in ('purchase_succeeded','subscription_status_change')
    and (properties->>'status') in ('active','trialing','paid')
  group by user_id
)
select
  f.user_id,
  case when mod(abs(hashtextextended(f.user_id::text || 'payment_failed',0)),2)=0 then 'A' else 'B' end as variant_key,
  jsonb_build_object(
    'reason','payment_failed',
    'deep_link','https://everreach.app/dl?to=billing&reason=payment_failed&v='||
      (case when mod(abs(hashtextextended(f.user_id::text || 'payment_failed',0)),2)=0 then 'A' else 'B' end)
  ) as context_json
from failed f
left join fixed x on x.user_id = f.user_id
where f.fail_ts > now() - interval '48 hours'
  and (x.fixed_ts is null or x.fixed_ts < f.fail_ts)
  $$,
  24, -- Cooldown: 24 hours (urgent)
  5,  -- Holdout: 5% (smaller for high-value recovery)
  2,  -- Max 2 per day (allow reminders)
  true
);

-- Template Variant A: Reassure + 15s how-to
INSERT INTO templates (id, campaign_id, variant_key, subject, body_md, sms_text, video_script_md)
VALUES (
  'c3d4e5f6-aaaa-4444-8888-333333333333',
  'c3d4e5f6-3333-4444-8888-333333333333',
  'A',
  'We''ll save your settings—update card securely',
  'Looks like a card hiccup. Your data and settings are safe. Update in 15s → {{deep_link}}',
  'EverReach payment issue—update card here: {{deep_link}} (secure)',
  '**30–45s Video Script (Variant A: Reassure + How-to)**

**Hook:** "This takes 15 seconds."

**Show:** 
- Billing screen (clean, simple)
- Tap "Update card"
- Success toast appears

**CTA:** "Update now"'
);

-- Template Variant B: Value reminder
INSERT INTO templates (id, campaign_id, variant_key, subject, body_md, sms_text, video_script_md)
VALUES (
  'c3d4e5f6-bbbb-4444-8888-333333333333',
  'c3d4e5f6-3333-4444-8888-333333333333',
  'B',
  'Keep your Close-Circle active ❤️',
  'Don''t lose your warm reach-out queue and notes. Update billing here → {{deep_link}}',
  'EverReach payment issue—update card here: {{deep_link}} (secure)',
  '**30–45s Video Script (Variant B: Value Reminder)**

**Hook:** "Don''t lose your momentum."

**Show:** 
- Quick montage: notes, reach-outs queued, warmth scores
- Card update screen
- "All saved" confirmation

**CTA:** "Keep your progress—update card"'
);

-- ============================================================================
-- CAMPAIGN 4: Inactive 7 Days
-- ============================================================================
-- Goal/KPI: Reactivation (session_started within 48h)
-- Trigger: No session_started in 7 days

INSERT INTO campaigns (id, name, description, channel, entry_sql, cooldown_hours, holdout_pct, max_sends_per_day, enabled)
VALUES (
  'd4e5f6a7-4444-4444-8888-444444444444',
  'Inactive 7 Days',
  'Users with no session in 7 days (re-engagement)',
  'email',
  $$
with last_seen as (
  select user_id, max(ts) as last_ts
  from event_log
  where event_name in ('session_started','app_opened')
  group by user_id
)
select
  l.user_id,
  case when mod(abs(hashtextextended(l.user_id::text || 'inactive_7d',0)),2)=0 then 'A' else 'B' end as variant_key,
  jsonb_build_object(
    'reason','inactive_7d',
    'deep_link','https://everreach.app/dl?to=home&cta=quick_win&v='||
      (case when mod(abs(hashtextextended(l.user_id::text || 'inactive_7d',0)),2)=0 then 'A' else 'B' end)
  ) as context_json
from last_seen l
where l.last_ts < now() - interval '7 days'
  $$,
  168, -- Cooldown: 7 days (weekly max)
  10,  -- Holdout: 10%
  1,   -- Max 1 per day
  true
);

-- Template Variant A: Quick win
INSERT INTO templates (id, campaign_id, variant_key, subject, body_md, sms_text, video_script_md)
VALUES (
  'd4e5f6a7-aaaa-4444-8888-444444444444',
  'd4e5f6a7-4444-4444-8888-444444444444',
  'A',
  '60-second reset: send one warm check-in',
  'Tap once, send one meaningful message, feel caught up. Try this → {{deep_link}}',
  'Try a 1-tap reach-out now → {{deep_link}}',
  '**30–45s Video Script (Variant A: Quick Win)**

**Hook:** "60 seconds to feel caught up."

**Show:** 
- Open app
- Tap suggested contact
- Send pre-written check-in
- Done—contact reached

**CTA:** "Send one message"'
);

-- Template Variant B: Feature tour
INSERT INTO templates (id, campaign_id, variant_key, subject, body_md, sms_text, video_script_md)
VALUES (
  'd4e5f6a7-bbbb-4444-8888-444444444444',
  'd4e5f6a7-4444-4444-8888-444444444444',
  'B',
  '3 power moves you''ll love (60s)',
  'Autonotes from voice, warmth scoring, and 1-tap scripts. Reopen here → {{deep_link}}',
  'Try a 1-tap reach-out now → {{deep_link}}',
  '**30–45s Video Script (Variant B: Feature Tour)**

**Hook:** "Three features that remove the mental load."

**Show:** 
- Voice note → auto note created
- Warmth list with trending contacts
- One-tap script send

**CTA:** "Open EverReach"'
);

-- ============================================================================
-- CAMPAIGN 5: Heavy Users (VIP Nurture)
-- ============================================================================
-- Goal/KPI: Referrals, reviews, early-access cohort
-- Trigger: days_active_28d >= 16 or sessions_7d >= 7

INSERT INTO campaigns (id, name, description, channel, entry_sql, cooldown_hours, holdout_pct, max_sends_per_day, enabled)
VALUES (
  'e5f6a7b8-5555-4444-8888-555555555555',
  'Heavy Users (VIP Nurture)',
  'Top 5% power users for referrals and reviews',
  'email',
  $$
select
  ut.user_id,
  case when mod(abs(hashtextextended(ut.user_id::text || 'vip_heavy',0)),2)=0 then 'A' else 'B' end as variant_key,
  jsonb_build_object(
    'reason','vip_heavy',
    'deep_link','https://everreach.app/dl?to=vip&v='||
      (case when mod(abs(hashtextextended(ut.user_id::text || 'vip_heavy',0)),2)=0 then 'A' else 'B' end)
  ) as context_json
from user_traits ut
where ut.is_heavy_user is true
  $$,
  336, -- Cooldown: 14 days (rare VIP outreach)
  0,   -- No holdout (small segment)
  1,   -- Max 1 per day
  true
);

-- Template Variant A: Referral ask
INSERT INTO templates (id, campaign_id, variant_key, subject, body_md, sms_text, video_script_md)
VALUES (
  'e5f6a7b8-aaaa-4444-8888-555555555555',
  'e5f6a7b8-5555-4444-8888-555555555555',
  'A',
  'You''re top 5%—want VIP perks?',
  'Invite 2 friends who''d love calmer comms. You get early access + perks. Start here → {{deep_link}}',
  'VIP perks unlocked. Invite 2 friends → {{deep_link}}',
  '**30–45s Video Script (Variant A: Referral Ask)**

**Hook:** "You''re building an intentional life—let''s amplify it."

**Show:** 
- VIP badge appears
- Perks screen (early features, exclusive support)
- Referral flow (simple share)

**CTA:** "Invite friends"'
);

-- Template Variant B: Review/Case study
INSERT INTO templates (id, campaign_id, variant_key, subject, body_md, sms_text, video_script_md)
VALUES (
  'e5f6a7b8-bbbb-4444-8888-555555555555',
  'e5f6a7b8-5555-4444-8888-555555555555',
  'B',
  'Can we feature your workflow?',
  'We''re spotlighting power users. 2-min form to share your tips → {{deep_link}}',
  'VIP perks unlocked. Share your story → {{deep_link}}',
  '**30–45s Video Script (Variant B: Case Study)**

**Hook:** "You''ve cracked the code—help others do it too."

**Show:** 
- "Power user spotlight" screen
- Quick form preview
- "Featured in EverReach stories" badge

**CTA:** "Share your tips"'
);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- 
-- Verify all campaigns and templates were created:
-- 
-- SELECT id, name, channel, enabled FROM campaigns ORDER BY name;
-- SELECT campaign_id, variant_key, subject FROM templates ORDER BY campaign_id, variant_key;
-- 
-- Test entry_sql for each campaign (replace CAMPAIGN_NAME):
-- 
-- SELECT * FROM (
--   <paste entry_sql here>
-- ) sample_users LIMIT 5;
-- 
-- ============================================================================
