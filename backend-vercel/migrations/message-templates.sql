-- Message Templates System
-- Reusable message templates for quick communication

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Message Templates
CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID, -- For team templates (future)
  
  -- Template content (matching API expectations)
  name VARCHAR(255) NOT NULL,
  description TEXT,
  subject_tmpl VARCHAR(500), -- For email subject with {{variables}}
  body_tmpl TEXT NOT NULL, -- Message body with {{variables}}
  closing_tmpl TEXT, -- Optional closing/signature
  
  -- Template variables
  variables TEXT[] DEFAULT '{}', -- ["first_name", "company", "date"]
  
  -- Settings
  channel VARCHAR(50) NOT NULL DEFAULT 'email', -- email, sms, dm, any
  visibility VARCHAR(50) DEFAULT 'private', -- private, shared, public
  is_default BOOLEAN DEFAULT FALSE,
  is_favorite BOOLEAN DEFAULT FALSE,
  
  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  -- Optional metadata
  goal VARCHAR(50), -- re-engage, nurture, convert, follow_up
  tone VARCHAR(50), -- casual, professional, warm, direct
  category VARCHAR(100), -- general, follow_up, introduction, etc
  tags TEXT[] DEFAULT '{}',
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_category CHECK (category IN (
    'general', 'follow_up', 'introduction', 'thank_you', 
    'check_in', 'meeting_request', 'event_invite', 'feedback',
    'apology', 'congratulations', 'networking', 'sales', 'other'
  )),
  CONSTRAINT valid_channel CHECK (channel IS NULL OR channel IN ('email', 'sms', 'dm', 'any')),
  CONSTRAINT valid_goal CHECK (goal IS NULL OR goal IN (
    're-engage', 'nurture', 'convert', 'follow_up', 'maintain', 'strengthen'
  )),
  CONSTRAINT valid_tone CHECK (tone IS NULL OR tone IN (
    'casual', 'professional', 'warm', 'direct', 'friendly', 'formal'
  ))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_templates_user_id ON templates(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_org_id ON templates(org_id) WHERE org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category) WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_templates_channel ON templates(channel);
CREATE INDEX IF NOT EXISTS idx_templates_tags ON templates USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_templates_is_favorite ON templates(user_id, is_favorite) WHERE is_favorite = TRUE;
CREATE INDEX IF NOT EXISTS idx_templates_created_at ON templates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_templates_usage ON templates(usage_count DESC, last_used_at DESC NULLS LAST);

-- Full-text search on name and description
CREATE INDEX IF NOT EXISTS idx_templates_search ON templates USING GIN(
  to_tsvector('english', name || ' ' || COALESCE(description, '') || ' ' || body_tmpl)
);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_template_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_template_updated_at
  BEFORE UPDATE ON templates
  FOR EACH ROW
  EXECUTE FUNCTION update_template_updated_at();

-- RLS Policies
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- Users can view their own templates
CREATE POLICY IF NOT EXISTS templates_select_own
  ON templates
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can create their own templates
CREATE POLICY IF NOT EXISTS templates_insert_own
  ON templates
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own templates
CREATE POLICY IF NOT EXISTS templates_update_own
  ON templates
  FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own templates
CREATE POLICY IF NOT EXISTS templates_delete_own
  ON templates
  FOR DELETE
  USING (user_id = auth.uid());

-- Helper function: Extract variables from template content
CREATE OR REPLACE FUNCTION extract_template_variables(template_content TEXT)
RETURNS JSONB AS $$
DECLARE
  vars TEXT[];
BEGIN
  -- Extract {{variable_name}} patterns
  SELECT array_agg(DISTINCT match[1])
  INTO vars
  FROM regexp_matches(template_content, '\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}', 'g') AS match;
  
  IF vars IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;
  
  RETURN to_jsonb(vars);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Helper function: Render template with values
CREATE OR REPLACE FUNCTION render_template(
  template_content TEXT,
  template_values JSONB
)
RETURNS TEXT AS $$
DECLARE
  result TEXT := template_content;
  var_name TEXT;
  var_value TEXT;
BEGIN
  -- Replace each {{variable}} with its value
  FOR var_name, var_value IN
    SELECT key, value::text
    FROM jsonb_each_text(template_values)
  LOOP
    result := regexp_replace(
      result,
      '\{\{' || var_name || '\}\}',
      COALESCE(var_value, ''),
      'g'
    );
  END LOOP;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Helper function: Increment usage count
CREATE OR REPLACE FUNCTION increment_template_usage(template_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE templates
  SET 
    usage_count = usage_count + 1,
    last_used_at = NOW()
  WHERE id = template_id;
END;
$$ LANGUAGE plpgsql;

-- Materialized view: Popular templates
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_popular_templates AS
SELECT 
  t.id,
  t.name,
  t.category,
  t.channel,
  t.goal,
  t.usage_count,
  t.last_used_at,
  COUNT(*) OVER (PARTITION BY t.category) as category_count,
  ROW_NUMBER() OVER (PARTITION BY t.category ORDER BY t.usage_count DESC, t.last_used_at DESC) as rank_in_category
FROM templates t
WHERE t.usage_count > 0;

CREATE UNIQUE INDEX ON mv_popular_templates(id);
CREATE INDEX ON mv_popular_templates(category, rank_in_category);

-- Refresh function
CREATE OR REPLACE FUNCTION refresh_popular_templates()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_popular_templates;
END;
$$ LANGUAGE plpgsql;

-- Sample templates for testing (optional - will only insert if users exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users LIMIT 1) THEN
    INSERT INTO templates (user_id, name, description, body_tmpl, channel, goal, tone, category, tags, variables) VALUES
      (
        (SELECT id FROM auth.users LIMIT 1),
        'Quick Check-in',
        'Casual check-in message',
        'Hey {{first_name}}! Just wanted to check in and see how things are going. Let me know if there''s anything I can help with!',
        'any',
        'maintain',
        'casual',
        'check_in',
        ARRAY['quick', 'friendly'],
        ARRAY['first_name']
      ),
      (
        (SELECT id FROM auth.users LIMIT 1),
        'Meeting Follow-up',
        'Professional follow-up after meeting',
        'Hi {{first_name}},\n\nGreat meeting with you today! As discussed, I''ll {{action_item}}. Let me know if you have any questions.\n\nBest,',
        'email',
        'maintain',
        'professional',
        'follow_up',
        ARRAY['meeting', 'business'],
        ARRAY['first_name', 'action_item']
      ),
      (
        (SELECT id FROM auth.users LIMIT 1),
        'Re-engagement',
        'Reconnect with someone you haven''t talked to in a while',
        'Hey {{first_name}}! It''s been a while since we last connected. I saw {{recent_achievement}} and wanted to reach out. How have you been?',
        'any',
        're-engage',
        'warm',
        'general',
        ARRAY['reengagement', 'networking'],
        ARRAY['first_name', 'recent_achievement']
      ),
      (
        (SELECT id FROM auth.users LIMIT 1),
        'Thank You Note',
        'Express gratitude',
        'Thanks so much for {{reason}}, {{first_name}}! I really appreciate it. Looking forward to {{next_step}}.',
        'any',
        'strengthen',
        'warm',
        'thank_you',
        ARRAY['gratitude', 'appreciation'],
        ARRAY['first_name', 'reason', 'next_step']
      )
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

COMMENT ON TABLE templates IS 'Reusable message templates with variable substitution';
COMMENT ON COLUMN templates.variables IS 'List of {{variable}} names used in template';
COMMENT ON COLUMN templates.usage_count IS 'Number of times template has been used';
COMMENT ON COLUMN templates.is_favorite IS 'User favorite for quick access';
COMMENT ON COLUMN templates.body_tmpl IS 'Template body with {{variable}} placeholders';
COMMENT ON FUNCTION render_template IS 'Replace {{variables}} with actual values';
COMMENT ON FUNCTION increment_template_usage IS 'Track template usage for analytics';
