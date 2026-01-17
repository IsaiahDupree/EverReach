-- Populate message_goals table with default goals
-- These are used as fallback suggestions when no contact-specific overrides exist

INSERT INTO message_goals (
  id, user_id, name, description, is_active, is_global, popularity_score, created_at, updated_at
)
VALUES
  -- Re-engagement goals
  (
    gen_random_uuid(),
    (SELECT id FROM auth.users WHERE email = 'isaiahdupree33@gmail.com' LIMIT 1),
    'Re-engage after period of silence',
    'Reconnect with contacts you haven''t spoken to recently',
    true,
    true,
    95,
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    (SELECT id FROM auth.users WHERE email = 'isaiahdupree33@gmail.com' LIMIT 1),
    'Check in and catch up',
    'Send a friendly check-in message to maintain the relationship',
    true,
    true,
    90,
    NOW(),
    NOW()
  ),
  
  -- Nurture goals
  (
    gen_random_uuid(),
    (SELECT id FROM auth.users WHERE email = 'isaiahdupree33@gmail.com' LIMIT 1),
    'Share relevant article or resource',
    'Provide value by sharing helpful content',
    true,
    true,
    85,
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    (SELECT id FROM auth.users WHERE email = 'isaiahdupree33@gmail.com' LIMIT 1),
    'Offer help or support',
    'Reach out to see how you can assist them',
    true,
    true,
    80,
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    (SELECT id FROM auth.users WHERE email = 'isaiahdupree33@gmail.com' LIMIT 1),
    'Congratulate on recent achievement',
    'Celebrate their wins and show you''re paying attention',
    true,
    true,
    75,
    NOW(),
    NOW()
  ),
  
  -- Professional goals
  (
    gen_random_uuid(),
    (SELECT id FROM auth.users WHERE email = 'isaiahdupree33@gmail.com' LIMIT 1),
    'Schedule coffee or meeting',
    'Propose an in-person or virtual meetup',
    true,
    true,
    70,
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    (SELECT id FROM auth.users WHERE email = 'isaiahdupree33@gmail.com' LIMIT 1),
    'Make an introduction',
    'Connect them with someone in your network',
    true,
    true,
    65,
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    (SELECT id FROM auth.users WHERE email = 'isaiahdupree33@gmail.com' LIMIT 1),
    'Follow up on previous conversation',
    'Continue a discussion from your last interaction',
    true,
    true,
    60,
    NOW(),
    NOW()
  ),
  
  -- Conversion goals
  (
    gen_random_uuid(),
    (SELECT id FROM auth.users WHERE email = 'isaiahdupree33@gmail.com' LIMIT 1),
    'Discuss potential collaboration',
    'Explore opportunities to work together',
    true,
    true,
    55,
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    (SELECT id FROM auth.users WHERE email = 'isaiahdupree33@gmail.com' LIMIT 1),
    'Request feedback or advice',
    'Ask for their expertise or opinion',
    true,
    true,
    50,
    NOW(),
    NOW()
  );

SELECT 'Message goals populated!' as status;
SELECT COUNT(*) as total_goals FROM message_goals WHERE is_active = true;
