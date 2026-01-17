# API Examples & Best Practices

Complete examples with React hooks, TypeScript, and real-world patterns.

---

## Table of Contents

1. [React Hooks](#react-hooks)
2. [TypeScript Types](#typescript-types)
3. [Complete Workflows](#complete-workflows)
4. [Caching Strategy](#caching-strategy)
5. [Error Handling](#error-handling)

---

## React Hooks

### useContacts

```typescript
import { useState, useEffect } from 'react';
import { useSupabase } from './useSupabase';

interface Contact {
  id: string;
  display_name: string;
  warmth: number;
  warmth_band: string;
  tags: string[];
  last_interaction_at?: string;
}

export function useContacts(filters: {
  warmth_band?: string;
  tag?: string;
  limit?: number;
} = {}) {
  const { getAuthToken } = useSupabase();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);

  const fetchContacts = async (reset = false) => {
    try {
      setLoading(true);
      const token = await getAuthToken();
      
      const params = new URLSearchParams({
        limit: (filters.limit || 20).toString(),
        sort: 'warmth.desc'
      });
      
      if (filters.warmth_band) params.append('warmth_band', filters.warmth_band);
      if (filters.tag) params.append('tag', filters.tag);
      if (!reset && cursor) params.append('cursor', cursor);
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE}/api/v1/contacts?${params}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      if (!response.ok) throw new Error('Failed to fetch contacts');
      
      const data = await response.json();
      
      setContacts(prev => reset ? data.items : [...prev, ...data.items]);
      setCursor(data.nextCursor);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts(true);
  }, [filters.warmth_band, filters.tag]);

  return {
    contacts,
    loading,
    error,
    hasMore: !!cursor,
    loadMore: () => fetchContacts(false),
    refresh: () => fetchContacts(true)
  };
}

// Usage
function ContactList() {
  const { contacts, loading, hasMore, loadMore } = useContacts({
    warmth_band: 'hot',
    limit: 50
  });
  
  return (
    <div>
      {contacts.map(contact => (
        <ContactCard key={contact.id} contact={contact} />
      ))}
      {hasMore && <button onClick={loadMore}>Load More</button>}
    </div>
  );
}
```

### useWarmth

```typescript
import { useState, useEffect } from 'react';
import { useSupabase } from './useSupabase';

interface WarmthData {
  current: number;
  band: string;
  daysSinceLastInteraction: number;
  history: Array<{
    date: string;
    warmth: number;
    interaction_count: number;
  }>;
}

export function useWarmth(contactId: string) {
  const { getAuthToken } = useSupabase();
  const [data, setData] = useState<WarmthData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchWarmth = async () => {
    try {
      const token = await getAuthToken();
      
      // Fetch current + history in parallel
      const [currentRes, historyRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/v1/contacts/${contactId}/warmth/current`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/v1/contacts/${contactId}/warmth/history?limit=30`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);
      
      const [current, history] = await Promise.all([
        currentRes.json(),
        historyRes.json()
      ]);
      
      setData({
        current: current.warmth,
        band: current.warmth_band,
        daysSinceLastInteraction: current.days_since_last_interaction,
        history: history.history
      });
    } catch (err) {
      console.error('Failed to fetch warmth:', err);
    } finally {
      setLoading(false);
    }
  };

  const recompute = async () => {
    try {
      const token = await getAuthToken();
      await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/v1/contacts/${contactId}/warmth/recompute`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Refresh data after recompute
      await fetchWarmth();
    } catch (err) {
      console.error('Failed to recompute warmth:', err);
    }
  };

  useEffect(() => {
    if (contactId) fetchWarmth();
  }, [contactId]);

  return { data, loading, refresh: fetchWarmth, recompute };
}

// Usage
function WarmthChart({ contactId }: { contactId: string }) {
  const { data, loading, recompute } = useWarmth(contactId);
  
  if (loading) return <Spinner />;
  
  return (
    <div>
      <h3>Warmth: {data?.current} ({data?.band})</h3>
      <p>Last contact: {data?.daysSinceLastInteraction} days ago</p>
      <LineChart data={data?.history} />
      <button onClick={recompute}>Refresh Score</button>
    </div>
  );
}
```

### useComposeMessage

```typescript
import { useState } from 'react';
import { useSupabase } from './useSupabase';

interface ComposeOptions {
  contactId: string;
  goal: 'personal' | 'networking' | 'business';
  channel: 'email' | 'sms' | 'dm';
  tone?: 'concise' | 'warm' | 'professional' | 'playful';
}

export function useComposeMessage() {
  const { getAuthToken } = useSupabase();
  const [draft, setDraft] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const compose = async (options: ComposeOptions) => {
    try {
      setLoading(true);
      setError(null);
      
      const token = await getAuthToken();
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE}/api/v1/agent/compose/smart`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contact_id: options.contactId,
            goal: options.goal,
            channel: options.channel,
            tone: options.tone || 'warm',
            include_context: true
          })
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to compose message');
      }
      
      const data = await response.json();
      setDraft(data.draft);
      
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { draft, loading, error, compose, reset: () => setDraft(null) };
}

// Usage
function MessageComposer({ contactId }: { contactId: string }) {
  const { draft, loading, compose } = useComposeMessage();
  
  const handleCompose = async () => {
    await compose({
      contactId,
      goal: 'networking',
      channel: 'email',
      tone: 'warm'
    });
  };
  
  return (
    <div>
      <button onClick={handleCompose} disabled={loading}>
        {loading ? 'Composing...' : 'Compose Message'}
      </button>
      
      {draft?.email && (
        <div>
          <input value={draft.email.subject} />
          <textarea value={draft.email.body} />
        </div>
      )}
    </div>
  );
}
```

---

## TypeScript Types

```typescript
// types/api.ts

export interface Contact {
  id: string;
  display_name: string;
  emails: string[];
  phones: string[];
  company?: string;
  notes?: string;
  tags: string[];
  avatar_url?: string;
  metadata?: Record<string, any>;
  warmth: number;
  warmth_band: 'hot' | 'warm' | 'neutral' | 'cool' | 'cold';
  warmth_override?: boolean;
  warmth_override_reason?: string;
  last_interaction_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Interaction {
  id: string;
  contact_id: string;
  kind: string;
  content?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface WarmthCurrent {
  contact_id: string;
  warmth: number;
  warmth_band: 'hot' | 'warm' | 'neutral' | 'cool' | 'cold';
  last_interaction_at?: string;
  days_since_last_interaction?: number;
  interaction_count: number;
  computed_at: string;
}

export interface WarmthHistoryPoint {
  date: string;
  warmth: number;
  interaction_count: number;
}

export interface WarmthHistory {
  contact_id: string;
  history: WarmthHistoryPoint[];
  metadata: {
    start_date: string;
    end_date: string;
    count: number;
  };
}

export interface ComposeDraft {
  email?: {
    subject: string;
    body: string;
  };
  sms?: {
    body: string;
  };
  dm?: {
    body: string;
  };
}

export interface ComposeResponse {
  draft: ComposeDraft;
  contact: {
    id: string;
    name: string;
  };
  context_used: string[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ApiError {
  error: string;
  request_id?: string;
  details?: Record<string, any>;
}

export interface PaginatedResponse<T> {
  items: T[];
  limit: number;
  nextCursor?: string;
}
```

---

## Complete Workflows

### Add Interaction + Update Warmth

```typescript
async function logInteractionAndUpdateWarmth(
  contactId: string,
  interaction: {
    kind: string;
    content: string;
    metadata?: Record<string, any>;
  }
) {
  const token = await getAuthToken();
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE;
  
  try {
    // Step 1: Log interaction
    const interactionRes = await fetch(`${API_BASE}/api/v1/interactions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contact_id: contactId,
        ...interaction
      })
    });
    
    if (!interactionRes.ok) throw new Error('Failed to log interaction');
    
    const interactionData = await interactionRes.json();
    
    // Step 2: Recompute warmth
    await fetch(`${API_BASE}/api/v1/contacts/${contactId}/warmth/recompute`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    // Step 3: Fetch updated contact
    const contactRes = await fetch(`${API_BASE}/api/v1/contacts/${contactId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const contactData = await contactRes.json();
    
    return {
      interaction: interactionData.interaction,
      contact: contactData.contact
    };
  } catch (error) {
    console.error('Failed to log interaction and update warmth:', error);
    throw error;
  }
}

// Usage
const result = await logInteractionAndUpdateWarmth('contact-id', {
  kind: 'email',
  content: 'Discussed partnership opportunity',
  metadata: {
    direction: 'outgoing',
    subject: 'Partnership Discussion'
  }
});

console.log('New warmth:', result.contact.warmth);
```

### Upload Voice Note + Process with AI

```typescript
async function uploadAndProcessVoiceNote(
  audioFile: File,
  metadata: {
    title: string;
    tags: string[];
  }
) {
  const token = await getAuthToken();
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE;
  
  try {
    // Step 1: Get presigned URL
    const signRes = await fetch(`${API_BASE}/api/v1/files`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        path: `voice-notes/${Date.now()}-${audioFile.name}`,
        contentType: audioFile.type
      })
    });
    
    const { url: presignedUrl, path } = await signRes.json();
    
    // Step 2: Upload to storage
    await fetch(presignedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': audioFile.type },
      body: audioFile
    });
    
    // Step 3: Commit file
    const commitRes = await fetch(`${API_BASE}/api/files/commit`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        path,
        mime_type: audioFile.type,
        size_bytes: audioFile.size
      })
    });
    
    const { attachment } = await commitRes.json();
    
    // Step 4: Transcribe
    const transcribeRes = await fetch(`${API_BASE}/api/v1/files/${attachment.id}/transcribe`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ language: 'en' })
    });
    
    const { transcript } = await transcribeRes.json();
    
    // Step 5: Create persona note
    const noteRes = await fetch(`${API_BASE}/api/v1/me/persona-notes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'voice',
        title: metadata.title,
        file_url: path,
        transcript,
        duration_sec: Math.floor(audioFile.size / 16000), // Rough estimate
        tags: metadata.tags
      })
    });
    
    const { note } = await noteRes.json();
    
    // Step 6: Process with AI
    const processRes = await fetch(`${API_BASE}/api/v1/agent/voice-note/process`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ note_id: note.id })
    });
    
    const aiAnalysis = await processRes.json();
    
    return {
      note,
      transcript,
      aiAnalysis
    };
  } catch (error) {
    console.error('Failed to upload and process voice note:', error);
    throw error;
  }
}

// Usage
const result = await uploadAndProcessVoiceNote(audioFile, {
  title: 'Meeting Notes - Q4 Planning',
  tags: ['meeting', 'planning', 'q4']
});

console.log('Transcript:', result.transcript);
console.log('Extracted contacts:', result.aiAnalysis.extracted_contacts);
console.log('Suggested actions:', result.aiAnalysis.suggested_actions);
```

---

## Caching Strategy

```typescript
class ApiCache {
  private cache = new Map<string, { data: any; expiry: number }>();
  private ttl: number;

  constructor(ttlSeconds = 300) {
    this.ttl = ttlSeconds * 1000;
  }

  set(key: string, data: any) {
    this.cache.set(key, {
      data,
      expiry: Date.now() + this.ttl
    });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  invalidate(pattern: string) {
    const keys = Array.from(this.cache.keys());
    keys.forEach(key => {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    });
  }

  clear() {
    this.cache.clear();
  }
}

// Usage
const apiCache = new ApiCache(300); // 5 minutes

async function getCachedContact(contactId: string) {
  const cacheKey = `contact:${contactId}`;
  
  // Check cache first
  const cached = apiCache.get(cacheKey);
  if (cached) return cached;
  
  // Fetch from API
  const token = await getAuthToken();
  const response = await fetch(
    `${API_BASE}/api/v1/contacts/${contactId}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  
  const data = await response.json();
  
  // Cache result
  apiCache.set(cacheKey, data);
  
  return data;
}

// Invalidate on update
async function updateContact(contactId: string, updates: any) {
  const token = await getAuthToken();
  
  await fetch(`${API_BASE}/api/v1/contacts/${contactId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updates)
  });
  
  // Invalidate cache
  apiCache.invalidate(`contact:${contactId}`);
  apiCache.invalidate('contacts:list');
}
```

---

## Error Handling

```typescript
class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public requestId?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function apiRequest<T>(
  url: string,
  options: RequestInit = {},
  retries = 3
): Promise<T> {
  const token = await getAuthToken();
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...options.headers
        }
      });
      
      if (response.ok) {
        return await response.json();
      }
      
      const errorData = await response.json();
      
      // Handle specific errors
      switch (response.status) {
        case 401:
          // Token expired - refresh and retry
          if (attempt < retries - 1) {
            await refreshAuthToken();
            continue;
          }
          throw new ApiError('Unauthorized', 401, errorData.request_id);
          
        case 429:
          // Rate limited - wait and retry
          if (attempt < retries - 1) {
            const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
            await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
            continue;
          }
          throw new ApiError('Rate limited', 429, errorData.request_id);
          
        case 500:
        case 502:
        case 503:
          // Server error - exponential backoff
          if (attempt < retries - 1) {
            await new Promise(resolve => 
              setTimeout(resolve, Math.pow(2, attempt) * 1000)
            );
            continue;
          }
          throw new ApiError('Server error', response.status, errorData.request_id);
          
        default:
          throw new ApiError(
            errorData.error || 'API request failed',
            response.status,
            errorData.request_id,
            errorData.details
          );
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      // Network error - retry with backoff
      if (attempt < retries - 1) {
        await new Promise(resolve => 
          setTimeout(resolve, Math.pow(2, attempt) * 1000)
        );
        continue;
      }
      
      throw new ApiError(
        error instanceof Error ? error.message : 'Network error',
        0
      );
    }
  }
  
  throw new ApiError('Max retries exceeded', 0);
}

// Usage with error boundaries
function ContactDetailPage({ contactId }: { contactId: string }) {
  const [contact, setContact] = useState<Contact | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  
  useEffect(() => {
    apiRequest<{ contact: Contact }>(
      `${API_BASE}/api/v1/contacts/${contactId}`
    )
      .then(data => setContact(data.contact))
      .catch(err => {
        setError(err);
        
        // Log to error tracking service
        if (err.status >= 500) {
          logErrorToSentry(err);
        }
      });
  }, [contactId]);
  
  if (error) {
    return <ErrorDisplay error={error} />;
  }
  
  return <ContactDetail contact={contact} />;
}
```

---

## Best Practices Summary

### 1. Always Use Token Refresh
- Check token expiry before requests
- Implement automatic refresh on 401
- Cache tokens to avoid excessive auth calls

### 2. Implement Retry Logic
- Retry on 5xx errors with exponential backoff
- Respect `Retry-After` header on 429
- Max 3 retries to avoid infinite loops

### 3. Cache Aggressively
- Cache GET requests for 5 minutes
- Invalidate on mutations (POST/PATCH/DELETE)
- Use cache keys with patterns for bulk invalidation

### 4. Handle Errors Gracefully
- Show user-friendly messages
- Log errors to monitoring service
- Provide recovery actions (retry, refresh)

### 5. Optimize Performance
- Batch requests when possible
- Use parallel requests with `Promise.all()`
- Paginate large datasets
- Debounce search inputs

### 6. Monitor Rate Limits
- Track `X-RateLimit-Remaining` header
- Warn users when approaching limit
- Queue requests if rate limited

---

**For more info:** See [`FRONTEND_API_GUIDE.md`](./FRONTEND_API_GUIDE.md) for endpoint reference.
