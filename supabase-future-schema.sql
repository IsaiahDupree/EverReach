-- Future-proof Supabase schema for EverReach CRM
-- This schema is designed to be extensible and handle various CRM use cases

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Organizations table (multi-tenancy support)
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    settings JSONB DEFAULT '{}',
    subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
    subscription_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table (authentication and user management)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    timezone TEXT DEFAULT 'UTC',
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization memberships (many-to-many relationship)
CREATE TABLE IF NOT EXISTS organization_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    permissions JSONB DEFAULT '{}',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

-- People/Contacts table (core CRM entity)
CREATE TABLE IF NOT EXISTS people (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Basic info
    full_name TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    phone TEXT,
    title TEXT,
    company TEXT,
    
    -- CRM-specific fields
    warmth TEXT DEFAULT 'cool' CHECK (warmth IN ('hot', 'warm', 'cool', 'cold')),
    lead_score INTEGER DEFAULT 0,
    lifecycle_stage TEXT DEFAULT 'lead' CHECK (lifecycle_stage IN ('lead', 'prospect', 'customer', 'evangelist', 'other')),
    
    -- Relationship data
    interests TEXT[] DEFAULT '{}',
    goals TEXT[] DEFAULT '{}',
    values TEXT[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    
    -- Interaction tracking
    last_interaction TIMESTAMPTZ,
    last_interaction_type TEXT,
    last_interaction_summary TEXT,
    interaction_count INTEGER DEFAULT 0,
    
    -- Communication preferences
    preferred_contact_method TEXT DEFAULT 'email' CHECK (preferred_contact_method IN ('email', 'phone', 'sms', 'linkedin', 'other')),
    communication_frequency TEXT DEFAULT 'monthly' CHECK (communication_frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
    timezone TEXT,
    
    -- Social/Professional links
    linkedin_url TEXT,
    twitter_url TEXT,
    website_url TEXT,
    
    -- Address information
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    country TEXT,
    
    -- Metadata
    source TEXT, -- How they were added (import, manual, api, etc.)
    custom_fields JSONB DEFAULT '{}',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interactions table (track all touchpoints)
CREATE TABLE IF NOT EXISTS interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Interaction details
    type TEXT NOT NULL CHECK (type IN ('email', 'call', 'meeting', 'note', 'task', 'sms', 'linkedin', 'other')),
    direction TEXT DEFAULT 'outbound' CHECK (direction IN ('inbound', 'outbound', 'internal')),
    subject TEXT,
    content TEXT,
    summary TEXT,
    
    -- Timing
    occurred_at TIMESTAMPTZ DEFAULT NOW(),
    duration_minutes INTEGER,
    
    -- Outcome tracking
    outcome TEXT CHECK (outcome IN ('positive', 'neutral', 'negative', 'no_response')),
    next_action TEXT,
    next_action_due TIMESTAMPTZ,
    
    -- Metadata
    channel_data JSONB DEFAULT '{}', -- Store channel-specific data
    attachments TEXT[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks/Reminders table
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    person_id UUID REFERENCES people(id) ON DELETE CASCADE,
    assigned_to UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Task details
    title TEXT NOT NULL,
    description TEXT,
    type TEXT DEFAULT 'follow_up' CHECK (type IN ('follow_up', 'call', 'email', 'meeting', 'research', 'other')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    
    -- Status and timing
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Metadata
    tags TEXT[] DEFAULT '{}',
    custom_fields JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Message templates table (for AI-generated content)
CREATE TABLE IF NOT EXISTS message_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Template details
    name TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'general' CHECK (category IN ('follow_up', 'introduction', 'check_in', 'thank_you', 'meeting_request', 'general')),
    channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'linkedin', 'phone')),
    
    -- Content
    subject_template TEXT,
    body_template TEXT NOT NULL,
    variables TEXT[] DEFAULT '{}', -- Variables that can be replaced
    
    -- AI/Generation metadata
    tone TEXT DEFAULT 'professional' CHECK (tone IN ('casual', 'professional', 'friendly', 'formal')),
    length TEXT DEFAULT 'medium' CHECK (length IN ('short', 'medium', 'long')),
    
    -- Usage tracking
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_public BOOLEAN DEFAULT false, -- Can be shared across organization
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI-generated messages log (track what was generated)
CREATE TABLE IF NOT EXISTS ai_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Generation context
    prompt_context JSONB NOT NULL,
    model_used TEXT NOT NULL,
    generation_params JSONB DEFAULT '{}',
    
    -- Generated content
    subject TEXT,
    content TEXT NOT NULL,
    variants TEXT[] DEFAULT '{}',
    
    -- User interaction
    was_used BOOLEAN DEFAULT false,
    was_edited BOOLEAN DEFAULT false,
    final_content TEXT,
    user_feedback TEXT CHECK (user_feedback IN ('helpful', 'not_helpful', 'needs_improvement')),
    
    -- Metadata
    generation_time_ms INTEGER,
    token_usage JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Voice notes and transcriptions
CREATE TABLE IF NOT EXISTS voice_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    person_id UUID REFERENCES people(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Audio file details
    file_url TEXT NOT NULL,
    file_size_bytes INTEGER,
    duration_seconds INTEGER,
    mime_type TEXT DEFAULT 'audio/m4a',
    
    -- Transcription
    transcript TEXT,
    transcript_confidence DECIMAL(3,2),
    language_detected TEXT DEFAULT 'en',
    
    -- AI processing
    summary TEXT,
    key_points TEXT[] DEFAULT '{}',
    action_items TEXT[] DEFAULT '{}',
    sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
    
    -- Processing status
    transcription_status TEXT DEFAULT 'pending' CHECK (transcription_status IN ('pending', 'processing', 'completed', 'failed')),
    ai_processing_status TEXT DEFAULT 'pending' CHECK (ai_processing_status IN ('pending', 'processing', 'completed', 'failed')),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document storage and analysis
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    person_id UUID REFERENCES people(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- File details
    filename TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size_bytes INTEGER,
    mime_type TEXT NOT NULL,
    
    -- Content analysis
    extracted_text TEXT,
    summary TEXT,
    key_entities JSONB DEFAULT '{}', -- Named entities, dates, etc.
    
    -- Categorization
    document_type TEXT DEFAULT 'other' CHECK (document_type IN ('contract', 'proposal', 'resume', 'presentation', 'email', 'other')),
    tags TEXT[] DEFAULT '{}',
    
    -- Vector embeddings for semantic search
    content_embedding vector(1536), -- OpenAI embedding dimension
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics and insights
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    person_id UUID REFERENCES people(id) ON DELETE CASCADE,
    
    -- Event details
    event_type TEXT NOT NULL,
    event_category TEXT NOT NULL,
    event_data JSONB DEFAULT '{}',
    
    -- Context
    session_id TEXT,
    user_agent TEXT,
    ip_address INET,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Automation rules and workflows
CREATE TABLE IF NOT EXISTS automation_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Rule definition
    name TEXT NOT NULL,
    description TEXT,
    trigger_type TEXT NOT NULL CHECK (trigger_type IN ('time_based', 'event_based', 'condition_based')),
    trigger_config JSONB NOT NULL,
    
    -- Actions to take
    actions JSONB NOT NULL, -- Array of actions to execute
    
    -- Status and execution
    is_active BOOLEAN DEFAULT true,
    execution_count INTEGER DEFAULT 0,
    last_executed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Integrations and external data
CREATE TABLE IF NOT EXISTS integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Integration details
    provider TEXT NOT NULL, -- 'gmail', 'outlook', 'linkedin', 'salesforce', etc.
    provider_account_id TEXT,
    
    -- Configuration
    config JSONB DEFAULT '{}',
    credentials_encrypted TEXT, -- Encrypted credentials
    
    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error', 'expired')),
    last_sync_at TIMESTAMPTZ,
    sync_frequency TEXT DEFAULT 'hourly' CHECK (sync_frequency IN ('realtime', 'hourly', 'daily', 'weekly')),
    
    -- Error tracking
    last_error TEXT,
    error_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_people_organization_id ON people(organization_id);
CREATE INDEX IF NOT EXISTS idx_people_warmth ON people(warmth);
CREATE INDEX IF NOT EXISTS idx_people_last_interaction ON people(last_interaction);
CREATE INDEX IF NOT EXISTS idx_people_full_name ON people(full_name);
CREATE INDEX IF NOT EXISTS idx_people_email ON people(email);
CREATE INDEX IF NOT EXISTS idx_people_company ON people(company);

CREATE INDEX IF NOT EXISTS idx_interactions_person_id ON interactions(person_id);
CREATE INDEX IF NOT EXISTS idx_interactions_user_id ON interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_interactions_occurred_at ON interactions(occurred_at);
CREATE INDEX IF NOT EXISTS idx_interactions_type ON interactions(type);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_person_id ON tasks(person_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

CREATE INDEX IF NOT EXISTS idx_voice_notes_person_id ON voice_notes(person_id);
CREATE INDEX IF NOT EXISTS idx_voice_notes_user_id ON voice_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_notes_created_at ON voice_notes(created_at);

CREATE INDEX IF NOT EXISTS idx_documents_person_id ON documents(person_id);
CREATE INDEX IF NOT EXISTS idx_documents_document_type ON documents(document_type);

CREATE INDEX IF NOT EXISTS idx_analytics_events_organization_id ON analytics_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);

-- Vector similarity search index
CREATE INDEX IF NOT EXISTS idx_documents_content_embedding ON documents USING ivfflat (content_embedding vector_cosine_ops);

-- Row Level Security (RLS) policies
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (users can only access data from their organizations)
CREATE POLICY "Users can view their own profile" ON users FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can access their organization's data" ON people FOR ALL 
USING (organization_id IN (
    SELECT organization_id FROM organization_memberships 
    WHERE user_id = auth.uid()
));

CREATE POLICY "Users can access their organization's interactions" ON interactions FOR ALL 
USING (organization_id IN (
    SELECT organization_id FROM organization_memberships 
    WHERE user_id = auth.uid()
));

CREATE POLICY "Users can access their organization's tasks" ON tasks FOR ALL 
USING (organization_id IN (
    SELECT organization_id FROM organization_memberships 
    WHERE user_id = auth.uid()
));

-- Add similar policies for other tables...

-- Functions for common operations
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at columns
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_people_updated_at BEFORE UPDATE ON people FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_interactions_updated_at BEFORE UPDATE ON interactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_message_templates_updated_at BEFORE UPDATE ON message_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_voice_notes_updated_at BEFORE UPDATE ON voice_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_automation_rules_updated_at BEFORE UPDATE ON automation_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON integrations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate lead score based on interactions
CREATE OR REPLACE FUNCTION calculate_lead_score(person_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    score INTEGER := 0;
    interaction_count INTEGER;
    recent_interactions INTEGER;
    last_interaction_days INTEGER;
BEGIN
    -- Base score from interaction count
    SELECT COUNT(*) INTO interaction_count FROM interactions WHERE person_id = person_uuid;
    score := score + (interaction_count * 5);
    
    -- Bonus for recent interactions (last 30 days)
    SELECT COUNT(*) INTO recent_interactions 
    FROM interactions 
    WHERE person_id = person_uuid 
    AND occurred_at > NOW() - INTERVAL '30 days';
    score := score + (recent_interactions * 10);
    
    -- Penalty for old interactions
    SELECT EXTRACT(days FROM NOW() - MAX(occurred_at)) INTO last_interaction_days
    FROM interactions 
    WHERE person_id = person_uuid;
    
    IF last_interaction_days > 90 THEN
        score := score - 20;
    ELSIF last_interaction_days > 30 THEN
        score := score - 10;
    END IF;
    
    -- Ensure score is not negative
    IF score < 0 THEN
        score := 0;
    END IF;
    
    RETURN score;
END;
$$ LANGUAGE plpgsql;

-- Function to update person's interaction summary
CREATE OR REPLACE FUNCTION update_person_interaction_summary()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE people SET 
        last_interaction = NEW.occurred_at,
        last_interaction_type = NEW.type,
        last_interaction_summary = NEW.summary,
        interaction_count = (
            SELECT COUNT(*) FROM interactions WHERE person_id = NEW.person_id
        ),
        lead_score = calculate_lead_score(NEW.person_id)
    WHERE id = NEW.person_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update person summary when interaction is added
CREATE TRIGGER update_person_on_interaction 
    AFTER INSERT ON interactions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_person_interaction_summary();

-- Views for common queries
CREATE OR REPLACE VIEW person_summary AS
SELECT 
    p.*,
    COALESCE(i.recent_interaction_count, 0) as recent_interaction_count,
    COALESCE(t.pending_task_count, 0) as pending_task_count,
    CASE 
        WHEN p.last_interaction > NOW() - INTERVAL '7 days' THEN 'recent'
        WHEN p.last_interaction > NOW() - INTERVAL '30 days' THEN 'moderate'
        WHEN p.last_interaction > NOW() - INTERVAL '90 days' THEN 'old'
        ELSE 'stale'
    END as interaction_recency
FROM people p
LEFT JOIN (
    SELECT person_id, COUNT(*) as recent_interaction_count
    FROM interactions 
    WHERE occurred_at > NOW() - INTERVAL '30 days'
    GROUP BY person_id
) i ON p.id = i.person_id
LEFT JOIN (
    SELECT person_id, COUNT(*) as pending_task_count
    FROM tasks 
    WHERE status = 'pending'
    GROUP BY person_id
) t ON p.id = t.person_id;

-- Insert some sample data for testing
INSERT INTO organizations (name, slug) VALUES 
('Demo Organization', 'demo-org')
ON CONFLICT (slug) DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE people IS 'Core contacts/people table with CRM-specific fields and relationship data';
COMMENT ON TABLE interactions IS 'All touchpoints and communications with people';
COMMENT ON TABLE tasks IS 'Tasks and reminders related to people or general CRM activities';
COMMENT ON TABLE voice_notes IS 'Voice recordings with AI transcription and analysis';
COMMENT ON TABLE ai_messages IS 'Log of AI-generated messages and user feedback';
COMMENT ON TABLE documents IS 'File storage with content analysis and vector embeddings';
COMMENT ON TABLE analytics_events IS 'User behavior and system events for analytics';
COMMENT ON TABLE automation_rules IS 'Configurable automation workflows';
COMMENT ON TABLE integrations IS 'External service integrations and sync status';

COMMENT ON COLUMN people.warmth IS 'Lead temperature: hot (ready to buy), warm (interested), cool (potential), cold (not interested)';
COMMENT ON COLUMN people.lead_score IS 'Calculated score based on interactions and engagement';
COMMENT ON COLUMN people.lifecycle_stage IS 'Where the person is in the sales/relationship funnel';
COMMENT ON COLUMN documents.content_embedding IS 'Vector embedding for semantic search using OpenAI embeddings';