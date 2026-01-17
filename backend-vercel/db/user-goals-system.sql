-- User Goals System
-- Stores user's personal, business, and networking goals
-- These goals inform AI suggestions and message generation

-- User Goals Table
CREATE TABLE IF NOT EXISTS user_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Goal details
  goal_category VARCHAR(20) NOT NULL CHECK (goal_category IN ('business', 'networking', 'personal')),
  goal_text TEXT NOT NULL,
  goal_description TEXT, -- Optional detailed description
  
  -- Priority & Status
  priority VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  is_active BOOLEAN DEFAULT true,
  
  -- Target metrics (optional)
  target_date DATE,
  target_count INTEGER, -- e.g., "connect with 10 people"
  current_progress INTEGER DEFAULT 0,
  
  -- Metadata
  tags TEXT[], -- For categorization/filtering
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Ensure at least some goal text
  CONSTRAINT goal_text_not_empty CHECK (LENGTH(TRIM(goal_text)) > 0)
);

-- Indexes for fast lookups
CREATE INDEX idx_user_goals_user ON user_goals(user_id);
CREATE INDEX idx_user_goals_active ON user_goals(user_id, is_active, priority DESC);
CREATE INDEX idx_user_goals_category ON user_goals(user_id, goal_category, is_active);
CREATE INDEX idx_user_goals_updated ON user_goals(user_id, updated_at DESC);

-- RLS Policies
ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own goals" ON user_goals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own goals" ON user_goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals" ON user_goals
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals" ON user_goals
  FOR DELETE USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_goals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_goals_updated_at
  BEFORE UPDATE ON user_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_user_goals_updated_at();

-- Goal-Contact Associations (optional - track which goals relate to which contacts)
CREATE TABLE IF NOT EXISTS goal_contact_associations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES user_goals(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Association metadata
  relevance_score INTEGER DEFAULT 5 CHECK (relevance_score BETWEEN 1 AND 10),
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(goal_id, contact_id)
);

CREATE INDEX idx_goal_contact_goal ON goal_contact_associations(goal_id);
CREATE INDEX idx_goal_contact_contact ON goal_contact_associations(contact_id);
CREATE INDEX idx_goal_contact_user ON goal_contact_associations(user_id);

ALTER TABLE goal_contact_associations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own goal associations" ON goal_contact_associations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own goal associations" ON goal_contact_associations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goal associations" ON goal_contact_associations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own goal associations" ON goal_contact_associations
  FOR DELETE USING (auth.uid() = user_id);

-- View for active goals summary
CREATE OR REPLACE VIEW user_goals_summary AS
SELECT 
  user_id,
  goal_category,
  COUNT(*) as total_goals,
  COUNT(*) FILTER (WHERE is_active) as active_goals,
  COUNT(*) FILTER (WHERE priority = 'high') as high_priority_count,
  AVG(current_progress)::INTEGER as avg_progress
FROM user_goals
GROUP BY user_id, goal_category;

-- Grant access to the view
GRANT SELECT ON user_goals_summary TO authenticated;

-- Sample goals for testing (optional - remove in production)
COMMENT ON TABLE user_goals IS 'Stores user personal, business, and networking goals that inform AI suggestions';
COMMENT ON COLUMN user_goals.goal_category IS 'Category: business, networking, or personal';
COMMENT ON COLUMN user_goals.target_count IS 'Optional numeric goal (e.g., connect with 10 people this month)';
COMMENT ON COLUMN user_goals.current_progress IS 'Current progress toward target_count';
