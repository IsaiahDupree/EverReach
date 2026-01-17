# 🌱 Run Sample Data Seed - Quick Guide

## Step 1: Open Supabase SQL Editor

**Click this link**: https://supabase.com/dashboard/project/utasetfxiqcrnwyfforx/sql/new

## Step 2: Copy the SQL Script

**File**: `backend-vercel/migrations/seed-sample-data.sql`

Or copy this:

```sql
-- =====================================================
-- SAMPLE DATA SEEDING FOR MARKETING INTELLIGENCE
-- =====================================================
-- Run this after the schema migration to add test data
-- Purpose: Populate tables so API endpoints return data

-- Get test user ID
DO $$
DECLARE
  test_user_id UUID;
  test_campaign_id UUID;
  power_user_persona_id INT;
BEGIN
  -- Find test user (must exist in auth.users)
  SELECT id INTO test_user_id 
  FROM auth.users 
  WHERE email = 'isaiahdupree33@gmail.com'
  LIMIT 1;

  IF test_user_id IS NULL THEN
    RAISE EXCEPTION 'Test user not found. Please sign up at the app first.';
  END IF;

  RAISE NOTICE 'Test user ID: %', test_user_id;

  -- 1. Create test campaign
  INSERT INTO campaign (campaign_id, name, channel, objective, start_at)
  VALUES (
    gen_random_uuid(),
    'Email Onboarding Campaign',
    'email',
    'User activation and engagement',
    NOW() - INTERVAL '30 days'
  )
  RETURNING campaign_id INTO test_campaign_id;

  RAISE NOTICE 'Created campaign: %', test_campaign_id;

  -- 2. Insert persona buckets
  INSERT INTO persona_bucket (label, description) VALUES
    ('Power User', 'High engagement users who use the platform daily'),
    ('Casual User', 'Moderate engagement users'),
    ('At-Risk User', 'Low engagement, potential churn risk')
  ON CONFLICT DO NOTHING;

  SELECT persona_bucket_id INTO power_user_persona_id
  FROM persona_bucket
  WHERE label = 'Power User'
  LIMIT 1;

  -- 3. Assign user to persona
  INSERT INTO user_persona (user_id, persona_bucket_id, confidence, assigned_at)
  VALUES (test_user_id, power_user_persona_id, 0.85, NOW())
  ON CONFLICT (user_id, persona_bucket_id) DO NOTHING;

  -- 4. Insert user events (funnel journey)
  -- Email campaign started
  INSERT INTO user_event (user_id, etype, occurred_at, campaign_id, source, intent_weight)
  VALUES
    (test_user_id, 'ad_click', NOW() - INTERVAL '30 days', test_campaign_id, 'email', 10),
    (test_user_id, 'landing_view', NOW() - INTERVAL '30 days', test_campaign_id, 'web', 5),
    (test_user_id, 'email_submitted', NOW() - INTERVAL '29 days', test_campaign_id, 'web', 30),
    (test_user_id, 'identity_enriched', NOW() - INTERVAL '29 days', test_campaign_id, 'web', 10),
    (test_user_id, 'email_open', NOW() - INTERVAL '28 days', test_campaign_id, 'email', 12),
    (test_user_id, 'email_click', NOW() - INTERVAL '28 days', test_campaign_id, 'email', 15),
    (test_user_id, 'trial_started', NOW() - INTERVAL '27 days', test_campaign_id, 'app', 25),
    (test_user_id, 'onboarding_step', NOW() - INTERVAL '27 days', test_campaign_id, 'app', 12),
    (test_user_id, 'feature_used', NOW() - INTERVAL '26 days', test_campaign_id, 'app', 10),
    (test_user_id, 'app_open', NOW() - INTERVAL '25 days', test_campaign_id, 'app', 8);

  -- Recent activity (last 7 days)
  INSERT INTO user_event (user_id, etype, occurred_at, source, intent_weight)
  VALUES
    (test_user_id, 'app_open', NOW() - INTERVAL '7 days', 'app', 8),
    (test_user_id, 'feature_used', NOW() - INTERVAL '6 days', 'app', 10),
    (test_user_id, 'app_open', NOW() - INTERVAL '5 days', 'app', 8),
    (test_user_id, 'feature_used', NOW() - INTERVAL '4 days', 'app', 10),
    (test_user_id, 'email_open', NOW() - INTERVAL '3 days', 'email', 12),
    (test_user_id, 'email_click', NOW() - INTERVAL '3 days', 'email', 15),
    (test_user_id, 'app_open', NOW() - INTERVAL '2 days', 'app', 8),
    (test_user_id, 'feature_used', NOW() - INTERVAL '1 day', 'app', 10),
    (test_user_id, 'app_open', NOW(), 'app', 8);

  RAISE NOTICE 'Inserted % user events', (SELECT COUNT(*) FROM user_event WHERE user_id = test_user_id);

  -- 5. Compute and insert magnetism index
  INSERT INTO user_magnetism_index (user_id, index_value, time_window, computed_at, details)
  VALUES (
    test_user_id,
    compute_magnetism_index(test_user_id, '7d'),
    '7d',
    NOW(),
    jsonb_build_object(
      'high_engagement', true,
      'last_seen', NOW(),
      'events_last_7d', (SELECT COUNT(*) FROM user_event WHERE user_id = test_user_id AND occurred_at >= NOW() - INTERVAL '7 days')
    )
  );

  -- 6. Insert intent scores
  INSERT INTO user_intent_score (user_id, score, source, computed_at, details)
  VALUES (
    test_user_id,
    compute_intent_score(test_user_id, NOW() - INTERVAL '30 days', NOW()),
    'automated_calculation',
    NOW(),
    jsonb_build_object(
      'period', '30d',
      'total_events', (SELECT COUNT(*) FROM user_event WHERE user_id = test_user_id)
    )
  );

  -- 7. Insert user identity enrichment data
  INSERT INTO user_identity (user_id, full_name, company, role_title, linkedin, last_enriched_at, raw_enrichment)
  VALUES (
    test_user_id,
    'Isaiah Dupree',
    'Rork',
    'Founder & CEO',
    'https://linkedin.com/in/isaiah-dupree',
    NOW(),
    jsonb_build_object(
      'enrichment_source', 'clay',
      'confidence', 0.95,
      'audience_size', 5000
    )
  )
  ON CONFLICT (user_id) DO UPDATE SET
    last_enriched_at = NOW(),
    full_name = EXCLUDED.full_name,
    company = EXCLUDED.company,
    role_title = EXCLUDED.role_title;

  RAISE NOTICE '✅ Sample data seeding complete!';
  RAISE NOTICE '';
  RAISE NOTICE 'Summary:';
  RAISE NOTICE '  - Test user: %', test_user_id;
  RAISE NOTICE '  - Campaign: %', test_campaign_id;
  RAISE NOTICE '  - Events: %', (SELECT COUNT(*) FROM user_event WHERE user_id = test_user_id);
  RAISE NOTICE '  - Magnetism index: %', (SELECT index_value FROM user_magnetism_index WHERE user_id = test_user_id ORDER BY computed_at DESC LIMIT 1);
  RAISE NOTICE '  - Intent score: %', (SELECT score FROM user_intent_score WHERE user_id = test_user_id ORDER BY computed_at DESC LIMIT 1);

END $$;

-- Verify data was inserted
SELECT 'User Events' as table_name, COUNT(*) as record_count FROM user_event
UNION ALL
SELECT 'Campaigns', COUNT(*) FROM campaign
UNION ALL
SELECT 'Personas', COUNT(*) FROM persona_bucket
UNION ALL
SELECT 'User Personas', COUNT(*) FROM user_persona
UNION ALL
SELECT 'Magnetism Index', COUNT(*) FROM user_magnetism_index
UNION ALL
SELECT 'Intent Scores', COUNT(*) FROM user_intent_score
UNION ALL
SELECT 'User Identity', COUNT(*) FROM user_identity;
```

## Step 3: Click "RUN" in Supabase

You should see output like:

```
NOTICE: Test user ID: abc123-def456...
NOTICE: Created campaign: xyz789...
NOTICE: Inserted 19 user events
NOTICE: ✅ Sample data seeding complete!

| table_name | record_count |
|------------|--------------|
| User Events | 19 |
| Campaigns | 1 |
| Personas | 3 |
| User Personas | 1 |
| Magnetism Index | 1 |
| Intent Scores | 1 |
| User Identity | 1 |
```

## Expected Result

✅ **19 user events** created  
✅ **1 campaign** created  
✅ **3 personas** created  
✅ **Magnetism index** calculated  
✅ **Intent score** calculated  
✅ **User identity** enriched

---

**Then come back and we'll test the APIs!**
