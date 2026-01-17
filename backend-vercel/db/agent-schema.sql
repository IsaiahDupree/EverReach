-- Agent Conversations Table
-- Stores multi-turn conversations with the AI agent
CREATE TABLE IF NOT EXISTS agent_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  messages JSONB DEFAULT '[]'::jsonb,
  context JSONB DEFAULT '{}'::jsonb,
  token_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_agent_conversations_user ON agent_conversations(user_id);
CREATE INDEX idx_agent_conversations_updated ON agent_conversations(user_id, updated_at DESC);

-- RLS Policies
ALTER TABLE agent_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations" ON agent_conversations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversations" ON agent_conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations" ON agent_conversations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations" ON agent_conversations
  FOR DELETE USING (auth.uid() = user_id);

-- User Agent Context Table
-- Stores user preferences and persistent context for the agent
CREATE TABLE IF NOT EXISTS user_agent_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  context_key VARCHAR(100) NOT NULL,
  context_value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, context_key)
);

CREATE INDEX idx_user_agent_context_user ON user_agent_context(user_id);
CREATE INDEX idx_user_agent_context_key ON user_agent_context(user_id, context_key);

-- RLS Policies
ALTER TABLE user_agent_context ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own context" ON user_agent_context
  FOR ALL USING (auth.uid() = user_id);

-- Contact Analysis Table
-- Stores AI-generated analysis of contacts
CREATE TABLE IF NOT EXISTS contact_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_type VARCHAR(50) NOT NULL,
  analysis_content TEXT NOT NULL,
  context_snapshot JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_contact_analysis_contact ON contact_analysis(contact_id);
CREATE INDEX idx_contact_analysis_user ON contact_analysis(user_id);
CREATE INDEX idx_contact_analysis_type ON contact_analysis(contact_id, analysis_type, created_at DESC);

-- RLS Policies
ALTER TABLE contact_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own contact analysis" ON contact_analysis
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create contact analysis" ON contact_analysis
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Message Generations Table
-- Logs AI-generated messages for analytics and improvement
CREATE TABLE IF NOT EXISTS message_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  goal_type VARCHAR(50),
  channel VARCHAR(20),
  tone VARCHAR(20),
  generated_subject TEXT,
  generated_body TEXT NOT NULL,
  context_used JSONB DEFAULT '{}'::jsonb,
  was_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_message_generations_user ON message_generations(user_id);
CREATE INDEX idx_message_generations_contact ON message_generations(contact_id);
CREATE INDEX idx_message_generations_created ON message_generations(user_id, created_at DESC);

-- RLS Policies
ALTER TABLE message_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own message generations" ON message_generations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create message generations" ON message_generations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own message generations" ON message_generations
  FOR UPDATE USING (auth.uid() = user_id);

-- Agent Tasks Table (for autonomous task execution)
CREATE TABLE IF NOT EXISTS agent_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_type VARCHAR(50) NOT NULL,
  task_description TEXT NOT NULL,
  task_parameters JSONB DEFAULT '{}'::jsonb,
  status VARCHAR(20) DEFAULT 'pending', -- pending, running, completed, failed, cancelled
  progress INTEGER DEFAULT 0, -- 0-100
  result JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_agent_tasks_user ON agent_tasks(user_id);
CREATE INDEX idx_agent_tasks_status ON agent_tasks(user_id, status);
CREATE INDEX idx_agent_tasks_created ON agent_tasks(user_id, created_at DESC);

-- RLS Policies
ALTER TABLE agent_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tasks" ON agent_tasks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create tasks" ON agent_tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks" ON agent_tasks
  FOR UPDATE USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_agent_conversations_updated_at
  BEFORE UPDATE ON agent_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_agent_context_updated_at
  BEFORE UPDATE ON user_agent_context
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_tasks_updated_at
  BEFORE UPDATE ON agent_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
