import { apiFetch } from './api';

// Singleflight dedupe for composeMessage to prevent duplicate network calls
type ComposeKey = string;
const composeInFlight = new Map<ComposeKey, Promise<ComposeResponse>>();
const composeCache = new Map<ComposeKey, { ts: number; data: ComposeResponse }>();
const COMPOSE_CACHE_TTL_MS = 15000; // extend cache to avoid repeat calls during screen lifetime

function toComposeKey(req: ComposeRequest): ComposeKey {
  const vars = req.variables || {};
  const sortedKeys = Object.keys(vars).sort();
  const normalizedVars: Record<string, any> = {};
  for (const k of sortedKeys) normalizedVars[k] = (vars as any)[k];
  return [req.contact_id, req.goal, req.channel, JSON.stringify(normalizedVars)].join('|');
}

export interface AgentChatRequest {
  message: string;
  conversation_id?: string;
  context?: {
    contact_id?: string;
    use_tools?: boolean;
    include_voice_notes?: boolean;
    [key: string]: any;
  };
}

export interface AgentChatResponse {
  message: string;
  conversation_id: string;
  tools_used?: string[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  metadata?: {
    model?: string;
    [key: string]: any;
  };
  references?: {
    contacts?: {
      id: string;
      name: string;
    }[];
    notes?: {
      id: string;
      type: 'voice' | 'text';
    }[];
    interactions?: {
      id: string;
      date: string;
    }[];
    data_sources?: string[];
  };
}

export async function sendAgentMessage(request: AgentChatRequest): Promise<AgentChatResponse> {
  console.log('[Agent API] Sending message:', request);
  
  const response = await apiFetch('/api/v1/agent/chat', {
    method: 'POST',
    requireAuth: true,
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  const data = await response.json();
  console.log('[Agent API] Response:', data);
  
  return data;
}

export interface VoiceNoteProcessRequest {
  voice_note_id: string;
  transcription?: string;
  context?: {
    contact_id?: string;
    [key: string]: any;
  };
}

export interface VoiceNoteProcessResponse {
  summary: string;
  key_points: string[];
  action_items?: string[];
  entities?: {
    people?: string[];
    companies?: string[];
    topics?: string[];
  };
  sentiment?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export async function processVoiceNote(request: VoiceNoteProcessRequest): Promise<VoiceNoteProcessResponse> {
  console.log('[Agent API] Processing voice note:', request);
  
  const response = await apiFetch('/api/v1/agent/voice-note/process', {
    method: 'POST',
    requireAuth: true,
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export interface ContactAnalysisRequest {
  contact_id: string;
  analysis_type?: 'quick_summary' | 'full_analysis' | 'relationship_health';
  include_voice_notes?: boolean;
  include_interactions?: boolean;
}

export interface ContactAnalysisResponse {
  analysis: string;
  insights?: {
    relationship_strength?: string;
    engagement_level?: string;
    suggested_actions?: string[];
  };
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export async function analyzeContact(request: ContactAnalysisRequest): Promise<ContactAnalysisResponse> {
  console.log('[Agent API] Analyzing contact:', request);
  
  const response = await apiFetch('/api/v1/agent/analyze/contact', {
    method: 'POST',
    requireAuth: true,
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export interface SmartComposeRequest {
  contact_id: string;
  goal_type?: string;
  channel?: 'email' | 'sms' | 'linkedin';
  tone?: 'professional' | 'casual' | 'warm' | 'formal';
  include_voice_context?: boolean;
  custom_instructions?: string;
}

export interface SmartComposeResponse {
  message: {
    subject?: string;
    body: string;
  };
  reasoning?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export async function composeSmartMessage(request: SmartComposeRequest): Promise<SmartComposeResponse> {
  console.log('[Agent API] Composing smart message:', request);
  
  const response = await apiFetch('/api/v1/agent/compose/smart', {
    method: 'POST',
    requireAuth: true,
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export interface SuggestActionsRequest {
  context?: {
    contact_id?: string;
    time_horizon?: 'today' | 'this_week' | 'this_month';
  };
}

export interface SuggestActionsResponse {
  actions: {
    type: string;
    priority: 'high' | 'medium' | 'low';
    description: string;
    contact_id?: string;
    reasoning?: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export async function suggestActions(request: SuggestActionsRequest = {}): Promise<SuggestActionsResponse> {
  console.log('[Agent API] Suggesting actions:', request);
  
  const response = await apiFetch('/api/v1/agent/suggest/actions', {
    method: 'POST',
    requireAuth: true,
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export interface AgentTool {
  name: string;
  description: string;
  parameters?: Record<string, any>;
}

export interface ListAgentToolsResponse {
  tools: AgentTool[];
}

export async function listAgentTools(): Promise<ListAgentToolsResponse> {
  console.log('[Agent API] Listing tools');
  
  const response = await apiFetch('/api/v1/agent/tools', {
    method: 'GET',
    requireAuth: true,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export interface ComposeRequest {
  contact_id: string;
  goal: string;
  channel: 'email' | 'sms' | 'dm';
  template_id?: string;
  variables?: Record<string, any>;
  include?: {
    persona_notes?: boolean;
    interactions?: boolean;
    voice_notes?: boolean;
  };
}

export interface ComposeResponse {
  compose_session_id: string | null;
  draft: {
    email?: {
      subject: string;
      body: string;
      closing: string;
    };
    sms?: {
      body: string;
    };
    dm?: {
      body: string;
    };
  };
  sources: {
    persona_note_ids: string[];
    contact_context: {
      warmth: number;
      last_interaction_at: string | null;
    } | null;
    template_id: string | null;
  };
  alternatives: any[];
  safety: {
    pii_flags: string[];
    spam_risk: string;
  };
}

export async function composeMessage(request: ComposeRequest): Promise<ComposeResponse> {
  const key = toComposeKey(request);

  // Short-lived cache hit
  const cached = composeCache.get(key);
  if (cached && Date.now() - cached.ts < COMPOSE_CACHE_TTL_MS) {
    console.log('[Agent API] composeMessage cache hit');
    return cached.data;
  }

  // Join in-flight request if present
  const inflight = composeInFlight.get(key);
  if (inflight) {
    console.log('[Agent API] composeMessage joined in-flight request');
    return inflight;
  }

  console.log('[Agent API] Composing message:', request);
  const promise = (async (): Promise<ComposeResponse> => {
    const response = await apiFetch('/api/v1/compose', {
      method: 'POST',
      headers: { 'Idempotency-Key': key },
      requireAuth: true,
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data: ComposeResponse = await response.json();
    console.log('[Agent API] Compose response:', data);
    composeCache.set(key, { ts: Date.now(), data });
    return data;
  })();

  composeInFlight.set(key, promise);
  try {
    return await promise;
  } finally {
    composeInFlight.delete(key);
  }
}
