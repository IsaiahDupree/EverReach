# React Hooks for Agent Features

## 📝 Create Custom Hooks

These hooks make it easy to integrate agent features into your components.

### 1. Voice Note Processing Hook

Create `hooks/useVoiceProcess.ts`:

```typescript
import { useState } from 'react';
import { processVoiceNote } from '@/lib/agent-api';
import type { VoiceNoteProcessRequest, VoiceNoteProcessResponse } from '@/lib/agent-types';

export function useVoiceProcess() {
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<VoiceNoteProcessResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const process = async (request: VoiceNoteProcessRequest) => {
    setProcessing(true);
    setError(null);
    try {
      const response = await processVoiceNote(request);
      setResult(response);
      return response;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
  };

  return { processing, result, error, process, reset };
}
```

**Usage:**
```tsx
const { processing, result, error, process } = useVoiceProcess();

<TouchableOpacity 
  onPress={() => process({ note_id: 'uuid', extract_contacts: true })}
  disabled={processing}
>
  <Text>{processing ? 'Processing...' : 'Process Note'}</Text>
</TouchableOpacity>

{result && <Text>Found {result.extracted.contacts?.length} contacts</Text>}
{error && <Text style={{ color: 'red' }}>{error}</Text>}
```

---

### 2. Smart Composition Hook

Create `hooks/useSmartCompose.ts`:

```typescript
import { useState } from 'react';
import { composeSmartMessage } from '@/lib/agent-api';
import type { SmartComposeRequest, SmartComposeResponse } from '@/lib/agent-types';

export function useSmartCompose() {
  const [composing, setComposing] = useState(false);
  const [result, setResult] = useState<SmartComposeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const compose = async (request: SmartComposeRequest) => {
    setComposing(true);
    setError(null);
    try {
      const response = await composeSmartMessage(request);
      setResult(response);
      return response;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setComposing(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
  };

  return { composing, result, error, compose, reset };
}
```

**Usage:**
```tsx
const { composing, result, error, compose } = useSmartCompose();

<TouchableOpacity 
  onPress={() => compose({
    contact_id: 'uuid',
    goal_type: 'networking',
    channel: 'email',
    tone: 'warm'
  })}
  disabled={composing}
>
  <Text>{composing ? 'Composing...' : 'AI Compose'}</Text>
</TouchableOpacity>

{result && (
  <>
    <Text>Subject: {result.message.subject}</Text>
    <Text>{result.message.body}</Text>
  </>
)}
```

---

### 3. Agent Chat Hook

Create `hooks/useAgent.ts`:

```typescript
import { useState, useCallback } from 'react';
import { sendAgentMessage, streamAgentChat } from '@/lib/agent-api';
import type { AgentMessage, AgentChatRequest } from '@/lib/agent-types';

export function useAgent(conversationId?: string) {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState(conversationId);

  const sendMessage = useCallback(async (
    message: string, 
    context?: AgentChatRequest['context']
  ) => {
    setLoading(true);
    setError(null);

    // Add user message
    const userMessage: AgentMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await sendAgentMessage({
        message,
        conversation_id: currentConversationId,
        context
      });

      // Add assistant response
      const assistantMessage: AgentMessage = {
        role: 'assistant',
        content: response.message,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, assistantMessage]);
      setCurrentConversationId(response.conversation_id);

      return response;
    } catch (err: any) {
      setError(err.message);
      setMessages(prev => prev.slice(0, -1)); // Remove user message on error
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentConversationId]);

  const sendMessageStreaming = useCallback(async (
    message: string,
    context?: AgentChatRequest['context']
  ) => {
    setStreaming(true);
    setError(null);

    // Add user message
    const userMessage: AgentMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);

    // Add empty assistant message
    setMessages(prev => [...prev, { 
      role: 'assistant', 
      content: '', 
      timestamp: new Date().toISOString() 
    }]);

    try {
      const stream = streamAgentChat({
        message,
        conversation_id: currentConversationId,
        context
      });

      for await (const chunk of stream) {
        setMessages(prev => {
          const updated = [...prev];
          const lastMessage = updated[updated.length - 1];
          if (lastMessage.role === 'assistant') {
            lastMessage.content += chunk;
          }
          return updated;
        });
      }
    } catch (err: any) {
      setError(err.message);
      setMessages(prev => prev.slice(0, -2)); // Remove both messages on error
      throw err;
    } finally {
      setStreaming(false);
    }
  }, [currentConversationId]);

  const reset = useCallback(() => {
    setMessages([]);
    setError(null);
    setCurrentConversationId(undefined);
  }, []);

  return {
    messages,
    loading,
    streaming,
    error,
    conversationId: currentConversationId,
    sendMessage,
    sendMessageStreaming,
    reset
  };
}
```

**Usage:**
```tsx
const { messages, loading, sendMessage } = useAgent();

<FlatList
  data={messages}
  renderItem={({ item }) => (
    <Text>{item.role}: {item.content}</Text>
  )}
/>

<TextInput
  onSubmitEditing={(e) => sendMessage(e.nativeEvent.text)}
  editable={!loading}
/>
```

---

### 4. Contact Analysis Hook

Create `hooks/useContactAnalysis.ts`:

```typescript
import { useState } from 'react';
import { analyzeContact } from '@/lib/agent-api';
import type { ContactAnalysisRequest, ContactAnalysisResponse, AnalysisType } from '@/lib/agent-types';

export function useContactAnalysis(contactId: string) {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<ContactAnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyze = async (analysisType: AnalysisType = 'context_summary') => {
    setAnalyzing(true);
    setError(null);
    try {
      const response = await analyzeContact({
        contact_id: contactId,
        analysis_type: analysisType,
        include_voice_notes: true,
        include_interactions: true
      });
      setResult(response);
      return response;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setAnalyzing(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
  };

  return { analyzing, result, error, analyze, reset };
}
```

**Usage:**
```tsx
const { analyzing, result, error, analyze } = useContactAnalysis(contactId);

<TouchableOpacity onPress={() => analyze('full_analysis')}>
  <Text>{analyzing ? 'Analyzing...' : 'Analyze Contact'}</Text>
</TouchableOpacity>

{result && <Text>{result.analysis}</Text>}
```

---

### 5. Action Suggestions Hook

Create `hooks/useActionSuggestions.ts`:

```typescript
import { useState, useEffect } from 'react';
import { suggestActions } from '@/lib/agent-api';
import type { SuggestActionsRequest, ActionSuggestion } from '@/lib/agent-types';

export function useActionSuggestions(autoLoad: boolean = false) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<ActionSuggestion[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = async (request: SuggestActionsRequest = {}) => {
    setLoading(true);
    setError(null);
    try {
      const response = await suggestActions(request);
      setSuggestions(response.suggestions);
      return response.suggestions;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoLoad) {
      load();
    }
  }, [autoLoad]);

  return { loading, suggestions, error, load };
}
```

**Usage:**
```tsx
const { loading, suggestions, load } = useActionSuggestions(true);

<FlatList
  data={suggestions}
  renderItem={({ item }) => (
    <View>
      <Text>{item.title}</Text>
      <Text>{item.description}</Text>
    </View>
  )}
/>

<TouchableOpacity onPress={() => load({ focus: 'engagement' })}>
  <Text>Refresh</Text>
</TouchableOpacity>
```

---

## 🎯 Hook Benefits

- **State Management**: Handles loading, results, and errors automatically
- **Reusability**: Use the same hook across multiple screens
- **Type Safety**: Full TypeScript support
- **Clean Code**: Separates logic from UI

## 📚 Next Steps

- Use hooks in your screens: [09-screen-integration.md](./09-screen-integration.md)
- Or build full components: [05-voice-processor.md](./05-voice-processor.md)
