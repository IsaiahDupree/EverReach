# API Client Implementation

## 📝 Create `lib/agent-api.ts`

This file provides convenient functions for all agent endpoints.

```typescript
import { apiFetch } from './api';
import type {
  AgentChatRequest,
  AgentChatResponse,
  VoiceNoteProcessRequest,
  VoiceNoteProcessResponse,
  ContactAnalysisRequest,
  ContactAnalysisResponse,
  SmartComposeRequest,
  SmartComposeResponse,
  SuggestActionsRequest,
  SuggestActionsResponse,
  Conversation,
  OpenAITestRequest,
  OpenAITestResponse,
} from './agent-types';

// ============================================================================
// OPENAI TESTING
// ============================================================================

export async function testOpenAI(params?: OpenAITestRequest): Promise<OpenAITestResponse> {
  return await apiFetch('/v1/openai/test', {
    method: 'POST',
    body: JSON.stringify(params || {})
  });
}

export async function checkOpenAIStatus(): Promise<{
  configured: boolean;
  model: string;
  message: string;
}> {
  return await apiFetch('/v1/openai/test', { method: 'GET' });
}

// ============================================================================
// AGENT CHAT
// ============================================================================

export async function sendAgentMessage(
  request: AgentChatRequest
): Promise<AgentChatResponse> {
  return await apiFetch('/v1/agent/chat', {
    method: 'POST',
    body: JSON.stringify(request)
  });
}

export async function* streamAgentChat(
  request: AgentChatRequest
): AsyncGenerator<string, void, unknown> {
  const { authHeader } = await import('./api');
  
  const response = await fetch(
    `${process.env.EXPO_PUBLIC_API_URL}/v1/agent/chat/stream`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(await authHeader())
      },
      body: JSON.stringify(request)
    }
  );

  if (!response.ok) {
    throw new Error(`Stream failed: ${response.statusText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        if (data.content) yield data.content;
        if (data.error) throw new Error(data.error);
      }
    }
  }
}

// ============================================================================
// CONVERSATION MANAGEMENT
// ============================================================================

export async function listConversations(
  limit: number = 20
): Promise<{ conversations: Conversation[] }> {
  return await apiFetch(`/v1/agent/conversation?limit=${limit}`, {
    method: 'GET'
  });
}

export async function getConversation(conversationId: string) {
  return await apiFetch(`/v1/agent/conversation/${conversationId}`, {
    method: 'GET'
  });
}

export async function deleteConversation(
  conversationId: string
): Promise<{ deleted: boolean }> {
  return await apiFetch(`/v1/agent/conversation/${conversationId}`, {
    method: 'DELETE'
  });
}

// ============================================================================
// VOICE NOTE PROCESSING
// ============================================================================

export async function processVoiceNote(
  request: VoiceNoteProcessRequest
): Promise<VoiceNoteProcessResponse> {
  return await apiFetch('/v1/agent/voice-note/process', {
    method: 'POST',
    body: JSON.stringify(request)
  });
}

// ============================================================================
// CONTACT ANALYSIS
// ============================================================================

export async function analyzeContact(
  request: ContactAnalysisRequest
): Promise<ContactAnalysisResponse> {
  return await apiFetch('/v1/agent/analyze/contact', {
    method: 'POST',
    body: JSON.stringify(request)
  });
}

// ============================================================================
// SMART MESSAGE COMPOSITION
// ============================================================================

export async function composeSmartMessage(
  request: SmartComposeRequest
): Promise<SmartComposeResponse> {
  return await apiFetch('/v1/agent/compose/smart', {
    method: 'POST',
    body: JSON.stringify(request)
  });
}

// ============================================================================
// ACTION SUGGESTIONS
// ============================================================================

export async function suggestActions(
  request: SuggestActionsRequest = {}
): Promise<SuggestActionsResponse> {
  return await apiFetch('/v1/agent/suggest/actions', {
    method: 'POST',
    body: JSON.stringify(request)
  });
}

// ============================================================================
// TOOLS
// ============================================================================

export async function listAgentTools(): Promise<{
  tools: Array<{
    name: string;
    description: string;
    parameters: any;
  }>;
  count: number;
  categories: Record<string, string[]>;
}> {
  return await apiFetch('/v1/agent/tools', { method: 'GET' });
}
```

## 🧪 Test the API Client

Create a simple test in any component:

```typescript
import { checkOpenAIStatus } from '@/lib/agent-api';

// In a component
const testAPI = async () => {
  try {
    const status = await checkOpenAIStatus();
    console.log('API Status:', status);
  } catch (error) {
    console.error('API Test Failed:', error);
  }
};
```

## ✅ Verification

The API client is ready when:
- [ ] File compiles without errors
- [ ] `checkOpenAIStatus()` returns successfully
- [ ] You can import functions in your components

## Next Steps

Choose your integration path:
- **Need hooks?** → [04-hooks.md](./04-hooks.md)
- **Just quick calls?** → [08-usage-examples.md](./08-usage-examples.md)
- **Full components?** → Continue to 05-07
