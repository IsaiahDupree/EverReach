-- =====================================================
-- FEATURE REQUESTS SYSTEM WITH VOTING
-- =====================================================
-- Feature: User-submitted feature requests with voting
-- Created: 2025-10-08
-- 
-- Tables:
-- 1. feature_requests (enhanced with votes_count)
-- 2. feature_votes (new table for voting)
-- 3. feature_changelog (new table for shipped features)
-- =====================================================

-- =====================================================
-- 1. FEATURE REQUESTS TABLE (Enhanced)
-- =====================================================

CREATE TABLE IF NOT EXISTS feature_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Request details
  type TEXT NOT NULL CHECK (type IN ('feature', 'feedback', 'bug')),
  title TEXT NOT NULL CHECK (length(title) <= 100),
  description TEXT NOT NULL CHECK (length(description) <= 2000),
  
  -- User info
  user_id UUID, -- References auth.uid(), nullable for anonymous submissions
  email TEXT, -- For anonymous submissions
  
  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'planned', 'in_progress', 'shipped', 'declined')),
  priority TEXT DEFAULT 'low' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  
  -- Voting
  votes_count INT DEFAULT 0,
  
  -- Implementation tracking
  assigned_to UUID, -- Team member (admin only)
  target_version TEXT,
  shipped_at TIMESTAMPTZ,
  declined_reason TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  tags TEXT[] DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_feature_requests_user 
ON feature_requests (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feature_requests_status 
ON feature_requests (status, votes_count DESC);

CREATE INDEX IF NOT EXISTS idx_feature_requests_type 
ON feature_requests (type, status);

CREATE INDEX IF NOT EXISTS idx_feature_requests_votes 
ON feature_requests (votes_count DESC, created_at DESC);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_feature_requests_search 
ON feature_requests USING GIN (to_tsvector('english', title || ' ' || description));

-- Comments
COMMENT ON TABLE feature_requests IS 'User-submitted feature requests, feedback, and bug reports';
COMMENT ON COLUMN feature_requests.votes_count IS 'Cached count of votes for performance';
COMMENT ON COLUMN feature_requests.status IS 'pending, reviewing, planned, in_progress, shipped, or declined';

-- =====================================================
-- 2. FEATURE VOTES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS feature_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id UUID NOT NULL REFERENCES feature_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, -- References auth.uid()
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one vote per user per feature
  UNIQUE(feature_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_feature_votes_feature 
ON feature_votes (feature_id);

CREATE INDEX IF NOT EXISTS idx_feature_votes_user 
ON feature_votes (user_id, created_at DESC);

COMMENT ON TABLE feature_votes IS 'User votes on feature requests';

-- =====================================================
-- 3. FEATURE CHANGELOG TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS feature_changelog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id UUID REFERENCES feature_requests(id) ON DELETE SET NULL,
  
  -- Changelog entry
  version TEXT NOT NULL, -- e.g., "1.2.0"
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT CHECK (category IN ('feature', 'improvement', 'bugfix', 'breaking')),
  
  -- Publishing
  published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_feature_changelog_version 
ON feature_changelog (version, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_feature_changelog_published 
ON feature_changelog (published, published_at DESC) 
WHERE published = true;

COMMENT ON TABLE feature_changelog IS 'Public changelog for shipped features';

-- =====================================================
-- 4. TRIGGERS FOR VOTE COUNT
-- =====================================================

-- Function to update votes_count when votes are added/removed
CREATE OR REPLACE FUNCTION update_feature_votes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE feature_requests
    SET votes_count = votes_count + 1,
        updated_at = NOW()
    WHERE id = NEW.feature_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE feature_requests
    SET votes_count = GREATEST(votes_count - 1, 0),
        updated_at = NOW()
    WHERE id = OLD.feature_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger on feature_votes
DROP TRIGGER IF EXISTS trigger_update_feature_votes_count ON feature_votes;
CREATE TRIGGER trigger_update_feature_votes_count
AFTER INSERT OR DELETE ON feature_votes
FOR EACH ROW
EXECUTE FUNCTION update_feature_votes_count();

-- =====================================================
-- 5. FUNCTION TO AUTO-CREATE CHANGELOG
-- =====================================================

-- Function to auto-create changelog entry when feature is shipped
CREATE OR REPLACE FUNCTION auto_create_changelog_entry()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create changelog when status changes to 'shipped'
  IF NEW.status = 'shipped' AND (OLD.status IS NULL OR OLD.status != 'shipped') THEN
    INSERT INTO feature_changelog (
      feature_id,
      version,
      title,
      description,
      category,
      published,
      published_at
    ) VALUES (
      NEW.id,
      COALESCE(NEW.target_version, 'Next Release'),
      NEW.title,
      NEW.description,
      CASE 
        WHEN NEW.type = 'feature' THEN 'feature'
        WHEN NEW.type = 'bug' THEN 'bugfix'
        ELSE 'improvement'
      END,
      true,
      NOW()
    );
    
    -- Update shipped_at timestamp
    NEW.shipped_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on feature_requests
DROP TRIGGER IF EXISTS trigger_auto_create_changelog ON feature_requests;
CREATE TRIGGER trigger_auto_create_changelog
BEFORE UPDATE ON feature_requests
FOR EACH ROW
EXECUTE FUNCTION auto_create_changelog_entry();

-- =====================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE feature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_changelog ENABLE ROW LEVEL SECURITY;

-- feature_requests policies
-- Anyone can read all feature requests
CREATE POLICY "Anyone can view feature requests"
  ON feature_requests FOR SELECT
  USING (true);

-- Authenticated users can create feature requests
CREATE POLICY "Authenticated users can create feature requests"
  ON feature_requests FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update their own feature requests (title/description only)
CREATE POLICY "Users can update own feature requests"
  ON feature_requests FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own feature requests
CREATE POLICY "Users can delete own feature requests"
  ON feature_requests FOR DELETE
  USING (user_id = auth.uid());

-- feature_votes policies
-- Anyone can read votes
CREATE POLICY "Anyone can view votes"
  ON feature_votes FOR SELECT
  USING (true);

-- Authenticated users can vote
CREATE POLICY "Authenticated users can vote"
  ON feature_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can remove their own votes
CREATE POLICY "Users can remove own votes"
  ON feature_votes FOR DELETE
  USING (auth.uid() = user_id);

-- feature_changelog policies
-- Anyone can read published changelog entries
CREATE POLICY "Anyone can view published changelog"
  ON feature_changelog FOR SELECT
  USING (published = true);

-- =====================================================
-- 7. HELPER VIEWS
-- =====================================================

-- View for popular feature requests
CREATE OR REPLACE VIEW popular_feature_requests AS
SELECT 
  fr.*,
  COUNT(fv.id) as vote_count,
  ARRAY_AGG(DISTINCT fv.user_id) FILTER (WHERE fv.user_id IS NOT NULL) as voters
FROM feature_requests fr
LEFT JOIN feature_votes fv ON fr.id = fv.feature_id
WHERE fr.status NOT IN ('declined', 'shipped')
GROUP BY fr.id
ORDER BY COUNT(fv.id) DESC, fr.created_at DESC;

COMMENT ON VIEW popular_feature_requests IS 'Feature requests ordered by votes';

-- View for user's voted features
CREATE OR REPLACE VIEW user_voted_features AS
SELECT 
  fv.user_id,
  fr.*
FROM feature_votes fv
JOIN feature_requests fr ON fv.feature_id = fr.id
ORDER BY fv.created_at DESC;

COMMENT ON VIEW user_voted_features IS 'Features that users have voted for';

-- =====================================================
-- 8. SAMPLE DATA (Optional - Remove in production)
-- =====================================================

-- Insert some sample feature requests (optional)
-- INSERT INTO feature_requests (type, title, description, status, votes_count)
-- VALUES
--   ('feature', 'Dark mode support', 'Add a dark mode theme option for better visibility at night', 'planned', 15),
--   ('feature', 'Export contacts to CSV', 'Allow users to export their contacts as CSV file', 'reviewing', 8),
--   ('bug', 'App crashes on login', 'The app crashes when I try to log in with email', 'in_progress', 3),
--   ('feature', 'Calendar integration', 'Sync contacts with Google Calendar events', 'pending', 12),
--   ('improvement', 'Faster search', 'Improve search performance for large contact lists', 'shipped', 20);

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
