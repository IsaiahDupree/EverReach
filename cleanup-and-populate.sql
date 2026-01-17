-- ========================================
-- STEP 1: Clean Up Test Data
-- ========================================

-- Delete test interactions first (foreign key constraint)
DELETE FROM interactions 
WHERE contact_id IN (
  SELECT id FROM contacts 
  WHERE display_name LIKE '%Test%' 
    OR display_name LIKE '%Warmth Tracking%'
    OR display_name LIKE '%PW Test%'
    OR tags @> '["e2e_warmth_test"]'::jsonb
);

-- Delete test contacts
DELETE FROM contacts 
WHERE display_name LIKE '%Test%' 
  OR display_name LIKE '%Warmth Tracking%'
  OR display_name LIKE '%PW Test%'
  OR tags @> '["e2e_warmth_test"]'::jsonb;

-- ========================================
-- STEP 2: Insert Realistic Contacts
-- ========================================

-- Note: Replace 'YOUR_USER_ID' with your actual user_id from auth.users
-- You can get it by running: SELECT id FROM auth.users WHERE email = 'isaiahdupree33@gmail.com';

-- Contact 1: Sarah Chen - Hot Contact (Frequent interaction)
INSERT INTO contacts (
  user_id, org_id, display_name, emails, phones, company, notes, 
  tags, warmth, warmth_band, pipeline, stage, created_at, updated_at
) VALUES (
  (SELECT id FROM auth.users WHERE email = 'isaiahdupree33@gmail.com' LIMIT 1),
  (SELECT org_id FROM contacts WHERE user_id = (SELECT id FROM auth.users WHERE email = 'isaiahdupree33@gmail.com' LIMIT 1) LIMIT 1),
  'Sarah Chen',
  ARRAY['sarah.chen@techcorp.com'],
  ARRAY['+1-555-0123'],
  'TechCorp Solutions',
  'Met at tech conference. Interested in our product.',
  ARRAY['client', 'tech', 'vip'],
  85,
  'hot',
  'business',
  'qualified',
  NOW() - INTERVAL '30 days',
  NOW()
);

-- Contact 2: Michael Rodriguez - Warm Contact
INSERT INTO contacts (
  user_id, org_id, display_name, emails, phones, company, notes,
  tags, warmth, warmth_band, pipeline, stage, created_at, updated_at
) VALUES (
  (SELECT id FROM auth.users WHERE email = 'isaiahdupree33@gmail.com' LIMIT 1),
  (SELECT org_id FROM contacts WHERE user_id = (SELECT id FROM auth.users WHERE email = 'isaiahdupree33@gmail.com' LIMIT 1) LIMIT 1),
  'Michael Rodriguez',
  ARRAY['m.rodriguez@startupco.io'],
  ARRAY['+1-555-0456'],
  'StartupCo',
  'Founder of promising startup. Follow up quarterly.',
  ARRAY['networking', 'founder', 'startup'],
  72,
  'warm',
  'networking',
  'engaged',
  NOW() - INTERVAL '45 days',
  NOW() - INTERVAL '10 days'
);

-- Contact 3: Emily Watson - Cool Contact
INSERT INTO contacts (
  user_id, org_id, display_name, emails, phones, notes,
  tags, warmth, warmth_band, pipeline, created_at, updated_at
) VALUES (
  (SELECT id FROM auth.users WHERE email = 'isaiahdupree33@gmail.com' LIMIT 1),
  (SELECT org_id FROM contacts WHERE user_id = (SELECT id FROM auth.users WHERE email = 'isaiahdupree33@gmail.com' LIMIT 1) LIMIT 1),
  'Emily Watson',
  ARRAY['emily.watson@gmail.com'],
  ARRAY['+1-555-0789'],
  'College friend. Should reconnect.',
  ARRAY['personal', 'friend'],
  45,
  'cooling',
  'personal',
  NOW() - INTERVAL '60 days',
  NOW() - INTERVAL '30 days'
);

-- Contact 4: David Kim - Hot Contact (Recent grad)
INSERT INTO contacts (
  user_id, org_id, display_name, emails, phones, company, notes,
  tags, warmth, warmth_band, pipeline, stage, created_at, updated_at
) VALUES (
  (SELECT id FROM auth.users WHERE email = 'isaiahdupree33@gmail.com' LIMIT 1),
  (SELECT org_id FROM contacts WHERE user_id = (SELECT id FROM auth.users WHERE email = 'isaiahdupree33@gmail.com' LIMIT 1) LIMIT 1),
  'David Kim',
  ARRAY['david.kim@university.edu'],
  ARRAY['+1-555-0321'],
  'State University',
  'Recent grad looking for mentorship. Very engaged.',
  ARRAY['mentee', 'student', 'networking'],
  88,
  'hot',
  'networking',
  'active',
  NOW() - INTERVAL '20 days',
  NOW() - INTERVAL '2 days'
);

-- Contact 5: Jennifer Martinez - Cold Contact (Need to reconnect)
INSERT INTO contacts (
  user_id, org_id, display_name, emails, phones, company, notes,
  tags, warmth, warmth_band, pipeline, created_at, updated_at
) VALUES (
  (SELECT id FROM auth.users WHERE email = 'isaiahdupree33@gmail.com' LIMIT 1),
  (SELECT org_id FROM contacts WHERE user_id = (SELECT id FROM auth.users WHERE email = 'isaiahdupree33@gmail.com' LIMIT 1) LIMIT 1),
  'Jennifer Martinez',
  ARRAY['jen.martinez@design.studio'],
  NULL,
  'Creative Design Studio',
  'Designer from previous project. Lost touch.',
  ARRAY['business', 'designer', 'past-client'],
  28,
  'cold',
  'business',
  NOW() - INTERVAL '180 days',
  NOW() - INTERVAL '120 days'
);

-- Contact 6: Alex Thompson - Warm Contact (Colleague)
INSERT INTO contacts (
  user_id, org_id, display_name, emails, phones, notes,
  tags, warmth, warmth_band, pipeline, created_at, updated_at
) VALUES (
  (SELECT id FROM auth.users WHERE email = 'isaiahdupree33@gmail.com' LIMIT 1),
  (SELECT org_id FROM contacts WHERE user_id = (SELECT id FROM auth.users WHERE email = 'isaiahdupree33@gmail.com' LIMIT 1) LIMIT 1),
  'Alex Thompson',
  ARRAY['alex.t@workplace.com'],
  ARRAY['+1-555-0654'],
  'Former colleague. Good coffee chat every month.',
  ARRAY['colleague', 'friend', 'networking'],
  68,
  'warm',
  'personal',
  NOW() - INTERVAL '90 days',
  NOW() - INTERVAL '15 days'
);

-- ========================================
-- STEP 3: Insert Recent Interactions
-- ========================================

-- Interaction 1: Recent coffee chat with Sarah Chen
INSERT INTO interactions (
  user_id, org_id, contact_id, kind, channel, direction, content, 
  occurred_at, created_at, updated_at
) VALUES (
  (SELECT id FROM auth.users WHERE email = 'isaiahdupree33@gmail.com' LIMIT 1),
  (SELECT org_id FROM contacts WHERE user_id = (SELECT id FROM auth.users WHERE email = 'isaiahdupree33@gmail.com' LIMIT 1) LIMIT 1),
  (SELECT id FROM contacts WHERE display_name = 'Sarah Chen' AND user_id = (SELECT id FROM auth.users WHERE email = 'isaiahdupree33@gmail.com' LIMIT 1) LIMIT 1),
  'note',
  'in-person',
  'outbound',
  'Had coffee to discuss Q4 product roadmap. Sarah is excited about the new features. Follow up next week with demo.',
  NOW() - INTERVAL '2 hours',
  NOW() - INTERVAL '2 hours',
  NOW() - INTERVAL '2 hours'
);

-- Interaction 2: Email from Michael Rodriguez
INSERT INTO interactions (
  user_id, org_id, contact_id, kind, channel, direction, content,
  occurred_at, created_at, updated_at
) VALUES (
  (SELECT id FROM auth.users WHERE email = 'isaiahdupree33@gmail.com' LIMIT 1),
  (SELECT org_id FROM contacts WHERE user_id = (SELECT id FROM auth.users WHERE email = 'isaiahdupree33@gmail.com' LIMIT 1) LIMIT 1),
  (SELECT id FROM contacts WHERE display_name = 'Michael Rodriguez' AND user_id = (SELECT id FROM auth.users WHERE email = 'isaiahdupree33@gmail.com' LIMIT 1) LIMIT 1),
  'email',
  'email',
  'inbound',
  'Michael sent update on their Series A fundraising. Looking good! Asked if I could intro them to investors.',
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '1 day'
);

-- Interaction 3: Call with David Kim
INSERT INTO interactions (
  user_id, org_id, contact_id, kind, channel, direction, content,
  occurred_at, created_at, updated_at
) VALUES (
  (SELECT id FROM auth.users WHERE email = 'isaiahdupree33@gmail.com' LIMIT 1),
  (SELECT org_id FROM contacts WHERE user_id = (SELECT id FROM auth.users WHERE email = 'isaiahdupree33@gmail.com' LIMIT 1) LIMIT 1),
  (SELECT id FROM contacts WHERE display_name = 'David Kim' AND user_id = (SELECT id FROM auth.users WHERE email = 'isaiahdupree33@gmail.com' LIMIT 1) LIMIT 1),
  'call',
  'phone',
  'outbound',
  'Career advice call. David is preparing for interviews at FAANG companies. Shared some tips and offered to review his resume.',
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '3 days'
);

-- Interaction 4: LinkedIn message with Alex Thompson
INSERT INTO interactions (
  user_id, org_id, contact_id, kind, channel, direction, content,
  occurred_at, created_at, updated_at
) VALUES (
  (SELECT id FROM auth.users WHERE email = 'isaiahdupree33@gmail.com' LIMIT 1),
  (SELECT org_id FROM contacts WHERE user_id = (SELECT id FROM auth.users WHERE email = 'isaiahdupree33@gmail.com' LIMIT 1) LIMIT 1),
  (SELECT id FROM contacts WHERE display_name = 'Alex Thompson' AND user_id = (SELECT id FROM auth.users WHERE email = 'isaiahdupree33@gmail.com' LIMIT 1) LIMIT 1),
  'dm',
  'linkedin',
  'inbound',
  'Alex reached out about a job opportunity at their company. Interested but need to think about it.',
  NOW() - INTERVAL '5 days',
  NOW() - INTERVAL '5 days',
  NOW() - INTERVAL '5 days'
);

-- Interaction 5: Note about Emily Watson
INSERT INTO interactions (
  user_id, org_id, contact_id, kind, channel, direction, content,
  occurred_at, created_at, updated_at
) VALUES (
  (SELECT id FROM auth.users WHERE email = 'isaiahdupree33@gmail.com' LIMIT 1),
  (SELECT org_id FROM contacts WHERE user_id = (SELECT id FROM auth.users WHERE email = 'isaiahdupree33@gmail.com' LIMIT 1) LIMIT 1),
  (SELECT id FROM contacts WHERE display_name = 'Emily Watson' AND user_id = (SELECT id FROM auth.users WHERE email = 'isaiahdupree33@gmail.com' LIMIT 1) LIMIT 1),
  'note',
  'note',
  'outbound',
  'Saw Emily posted about her new job on social media. Should send congrats message and catch up.',
  NOW() - INTERVAL '1 week',
  NOW() - INTERVAL '1 week',
  NOW() - INTERVAL '1 week'
);

-- ========================================
-- DONE!
-- ========================================

SELECT 'Cleanup and population complete!' as status;
SELECT COUNT(*) as new_contacts FROM contacts WHERE display_name IN ('Sarah Chen', 'Michael Rodriguez', 'Emily Watson', 'David Kim', 'Jennifer Martinez', 'Alex Thompson');
SELECT COUNT(*) as new_interactions FROM interactions WHERE kind IN ('note', 'email', 'call', 'dm');
