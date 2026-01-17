-- Populate message_goals with all required fields
-- kind is required (nurture, re-engage, convert, maintain)

INSERT INTO message_goals (name, kind, is_active, popularity_score)
VALUES
  -- Re-engagement goals (highest priority)
  ('Re-engage after period of silence', 're-engage', true, 95),
  ('Check in and catch up', 're-engage', true, 90),
  
  -- Nurture goals
  ('Share relevant article or resource', 'nurture', true, 85),
  ('Offer help or support', 'nurture', true, 80),
  ('Congratulate on recent achievement', 'nurture', true, 75),
  
  -- Professional/Convert goals
  ('Schedule coffee or meeting', 'convert', true, 70),
  ('Make an introduction', 'convert', true, 65),
  ('Follow up on previous conversation', 'convert', true, 60),
  
  -- Conversion goals
  ('Discuss potential collaboration', 'convert', true, 55),
  ('Request feedback or advice', 'maintain', true, 50);

SELECT 'Goals populated!' as status;
SELECT COUNT(*) as total_goals, COUNT(CASE WHEN is_active THEN 1 END) as active_goals FROM message_goals;
