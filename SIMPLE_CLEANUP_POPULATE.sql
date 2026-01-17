-- ================================================
-- SIMPLE: Clean Up Test Data & Add Realistic Data
-- ================================================
-- INSTRUCTIONS:
-- 1. Go to: https://supabase.com
-- 2. Open your project: utasetfxiqcrnwyfforx
-- 3. Click "SQL Editor" in left sidebar
-- 4. Click "+ New query"
-- 5. Copy/paste this ENTIRE file
-- 6. Click "Run" (or press Cmd/Ctrl + Enter)
-- ================================================

-- STEP 1: Clean up test data
DELETE FROM interactions 
WHERE contact_id IN (
  SELECT id FROM contacts 
  WHERE display_name LIKE '%Test%' 
    OR display_name LIKE '%Warmth Tracking%'
    OR display_name LIKE '%PW Test%'
    OR tags @> '["e2e_warmth_test"]'::jsonb
);

DELETE FROM contacts 
WHERE display_name LIKE '%Test%' 
  OR display_name LIKE '%Warmth Tracking%'
  OR display_name LIKE '%PW Test%'
  OR tags @> '["e2e_warmth_test"]'::jsonb;

-- STEP 2: Add realistic contacts (with current user_id and org_id)
WITH user_info AS (
  SELECT 
    u.id as user_id,
    (SELECT org_id FROM contacts WHERE user_id = u.id LIMIT 1) as org_id
  FROM auth.users u
  WHERE u.email = 'isaiahdupree33@gmail.com'
  LIMIT 1
)
INSERT INTO contacts (
  user_id, org_id, display_name, emails, phones, company, notes, 
  tags, warmth, warmth_band, pipeline, stage, created_at, updated_at
)
SELECT 
  user_id, org_id, display_name, emails, phones, company, notes,
  tags, warmth, warmth_band, pipeline, stage, created_at, updated_at
FROM user_info, (VALUES
  ('Sarah Chen', 
   ARRAY['sarah.chen@techcorp.com'], 
   ARRAY['+1-555-0123'], 
   'TechCorp Solutions', 
   'Met at tech conference. Interested in our product.', 
   ARRAY['client', 'tech', 'vip'], 
   85, 'hot', 'business', 'qualified',
   NOW() - INTERVAL '30 days', NOW()),
   
  ('Michael Rodriguez', 
   ARRAY['m.rodriguez@startupco.io'], 
   ARRAY['+1-555-0456'], 
   'StartupCo', 
   'Founder of promising startup. Follow up quarterly.', 
   ARRAY['networking', 'founder', 'startup'], 
   72, 'warm', 'networking', 'engaged',
   NOW() - INTERVAL '45 days', NOW() - INTERVAL '10 days'),
   
  ('Emily Watson', 
   ARRAY['emily.watson@gmail.com'], 
   ARRAY['+1-555-0789'], 
   NULL,
   'College friend. Should reconnect.', 
   ARRAY['personal', 'friend'], 
   45, 'cooling', 'personal', NULL,
   NOW() - INTERVAL '60 days', NOW() - INTERVAL '30 days'),
   
  ('David Kim', 
   ARRAY['david.kim@university.edu'], 
   ARRAY['+1-555-0321'], 
   'State University', 
   'Recent grad looking for mentorship. Very engaged.', 
   ARRAY['mentee', 'student', 'networking'], 
   88, 'hot', 'networking', 'active',
   NOW() - INTERVAL '20 days', NOW() - INTERVAL '2 days'),
   
  ('Jennifer Martinez', 
   ARRAY['jen.martinez@design.studio'], 
   NULL,
   'Creative Design Studio', 
   'Designer from previous project. Lost touch.', 
   ARRAY['business', 'designer', 'past-client'], 
   28, 'cold', 'business', NULL,
   NOW() - INTERVAL '180 days', NOW() - INTERVAL '120 days'),
   
  ('Alex Thompson', 
   ARRAY['alex.t@workplace.com'], 
   ARRAY['+1-555-0654'], 
   NULL,
   'Former colleague. Good coffee chat every month.', 
   ARRAY['colleague', 'friend', 'networking'], 
   68, 'warm', 'personal', NULL,
   NOW() - INTERVAL '90 days', NOW() - INTERVAL '15 days')
) AS t(display_name, emails, phones, company, notes, tags, warmth, warmth_band, pipeline, stage, created_at, updated_at);

-- STEP 3: Add recent interactions
WITH user_info AS (
  SELECT 
    u.id as user_id,
    (SELECT org_id FROM contacts WHERE user_id = u.id LIMIT 1) as org_id
  FROM auth.users u
  WHERE u.email = 'isaiahdupree33@gmail.com'
  LIMIT 1
)
INSERT INTO interactions (
  user_id, org_id, contact_id, kind, channel, direction, content, 
  occurred_at, created_at, updated_at
)
SELECT 
  ui.user_id, ui.org_id, c.id, t.kind, t.channel, t.direction, t.content,
  t.occurred_at, t.created_at, t.updated_at
FROM user_info ui, (VALUES
  ('Sarah Chen', 'note', 'in-person', 'outbound',
   'Had coffee to discuss Q4 product roadmap. Sarah is excited about the new features. Follow up next week with demo.',
   NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours'),
   
  ('Michael Rodriguez', 'email', 'email', 'inbound',
   'Michael sent update on their Series A fundraising. Looking good! Asked if I could intro them to investors.',
   NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
   
  ('David Kim', 'call', 'phone', 'outbound',
   'Career advice call. David is preparing for interviews at FAANG companies. Shared some tips and offered to review his resume.',
   NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
   
  ('Alex Thompson', 'dm', 'linkedin', 'inbound',
   'Alex reached out about a job opportunity at their company. Interested but need to think about it.',
   NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
   
  ('Emily Watson', 'note', 'note', 'outbound',
   'Saw Emily posted about her new job on social media. Should send congrats message and catch up.',
   NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days')
) AS t(contact_name, kind, channel, direction, content, occurred_at, created_at, updated_at)
JOIN contacts c ON c.display_name = t.contact_name AND c.user_id = ui.user_id;

-- STEP 4: Show results
SELECT 'Cleanup and population complete! 🎉' as status;
SELECT COUNT(*) as new_contacts FROM contacts WHERE display_name IN ('Sarah Chen', 'Michael Rodriguez', 'Emily Watson', 'David Kim', 'Jennifer Martinez', 'Alex Thompson');
SELECT COUNT(*) as new_interactions FROM interactions WHERE content LIKE '%Sarah%' OR content LIKE '%Michael%' OR content LIKE '%David%' OR content LIKE '%Alex%' OR content LIKE '%Emily%';
