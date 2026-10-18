# TypeScript Type Definitions

## 📝 Create `lib/agent-types.ts`

This file contains all TypeScript types for the agent system.

```typescript
// ============================================================================
// AGENT CHAT TYPES
// ============================================================================

export type AgentMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
};

export type AgentChatRequest = {
  message: string;
  conversation_id?: string;
  context?: {
    contact_id?: string;
    goal_type?: 'personal' | 'networking' | 'business';
    use_tools?: boolean;
  };
  model?: string;
  temperature?: number;
};

export type AgentChatResponse = {
  conversation_id: string;
  message: string;
  tool_calls_made: number;
  tools_used: string[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

// ============================================================================
// VOICE NOTE PROCESSING TYPES
// ============================================================================

export type VoiceNoteProcessRequest = {
  note_id: string;
  extract_contacts?: boolean;
  extract_actions?: boolean;
  categorize?: boolean;
  suggest_tags?: boolean;
};

export type VoiceNoteProcessResponse = {
  note_id: string;
  processed: boolean;
  extracted: {
    contacts?: string[];
    actions?: string[];
    category?: 'personal' | 'networking' | 'business';
    tags?: string[];
    sentiment?: 'positive' | 'neutral' | 'negative';
    topics?: string[];
  };
  contact_matches?: Array<{
    mentioned: string;
    possible_matches: Array<{
      id: string;
      display_name: string;
    }>;
  }>;
  tags_added?: string[];
};

// ============================================================================
// CONTACT ANALYSIS TYPES
// ============================================================================

export type AnalysisType = 
  | 'relationship_health' 
  | 'engagement_suggestions' 
  | 'context_summary' 
  | 'full_analysis';

export type ContactAnalysisRequest = {
  contact_id: string;
  analysis_type?: AnalysisType;
  include_voice_notes?: boolean;
  include_interactions?: boolean;
};

export type ContactAnalysisResponse = {
  contact: {
    id: string;
    name: string;
  };
  analysis_type: AnalysisType;
  analysis: string;
  context_used: {
    interactions: number;
    persona_notes: number;
  };
};

// ============================================================================
// SMART COMPOSITION TYPES
// ============================================================================

export type SmartComposeRequest = {
  contact_id: string;
  goal_type: 'personal' | 'networking' | 'business';
  goal_description?: string;
  channel?: 'email' | 'sms' | 'dm';
  tone?: 'concise' | 'warm' | 'professional' | 'playful';
  include_voice_context?: boolean;
  include_interaction_history?: boolean;
  max_length?: number;
};

export type SmartComposeResponse = {
  contact: {
    id: string;
    name: string;
  };
  message: {
    channel: string;
    subject?: string;
    body: string;
    tone: string;
    estimated_length: number;
  };
  context_sources: {
    voice_notes_used: boolean;
    interactions_used: boolean;
    contact_warmth: number;
  };
};

// ============================================================================
// ACTION SUGGESTIONS TYPES
// ============================================================================

export type ActionSuggestion = {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  contacts?: string[];
  estimated_time?: string;
};

export type SuggestActionsRequest = {
  context?: 'dashboard' | 'contact_view' | 'goals';
  contact_id?: string;
  focus?: 'engagement' | 'networking' | 'follow_ups' | 'all';
  limit?: number;
};

export type SuggestActionsResponse = {
  context: string;
  focus: string;
  suggestions: ActionSuggestion[];
  generated_at: string;
};

// ============================================================================
// CONVERSATION TYPES
// ============================================================================

export type Conversation = {
  id: string;
  created_at: string;
  updated_at: string;
  context: Record<string, any>;
};

// ============================================================================
// OPENAI TEST TYPES
// ============================================================================

export type OpenAITestRequest = {
  prompt?: string;
  model?: string;
  max_tokens?: number;
  temperature?: number;
};

export type OpenAITestResponse = {
  status: string;
  model: string;
  response: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  latency_ms: number;
  timestamp: string;
};
```

## ✅ Verification

After creating the file, verify it compiles:

```bash
# In your fifth_pull directory
npx tsc --noEmit lib/agent-types.ts
```

## Next Steps

Continue to [03-api-client.md](./03-api-client.md) to implement the API client.
