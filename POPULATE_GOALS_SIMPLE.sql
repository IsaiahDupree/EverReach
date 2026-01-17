-- Simple: Populate message_goals with essential fields only
-- Based on what the endpoint actually uses: id, name, is_active, popularity_score

INSERT INTO message_goals (name, is_active, popularity_score)
VALUES
  ('Re-engage after period of silence', true, 95),
  ('Check in and catch up', true, 90),
  ('Share relevant article or resource', true, 85),
  ('Offer help or support', true, 80),
  ('Congratulate on recent achievement', true, 75),
  ('Schedule coffee or meeting', true, 70),
  ('Make an introduction', true, 65),
  ('Follow up on previous conversation', true, 60),
  ('Discuss potential collaboration', true, 55),
  ('Request feedback or advice', true, 50);

SELECT 'Goals populated!' as status;
SELECT COUNT(*) as total_goals FROM message_goals;
