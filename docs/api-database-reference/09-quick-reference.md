# Quick Reference - Common Operations

## 🚀 Copy-Paste Ready Examples

### Frontend API Calls (using lib/api.ts)

#### Get Contacts List
```typescript
import { apiFetch } from '@/lib/api';

const contacts = await apiFetch('/v1/contacts?limit=50');
```

#### Create Contact
```typescript
const newContact = await apiFetch('/v1/contacts', {
  method: 'POST',
  body: JSON.stringify({
    display_name: 'John Doe',
    emails: [{ email: 'john@example.com' }]
  })
});
```

#### Update Contact
```typescript
await apiFetch(`/v1/contacts/${contactId}`, {
  method: 'PUT',
  body: JSON.stringify({
    tags: ['vip', 'client']
  })
});
```

#### Search Contacts
```typescript
const results = await apiFetch(`/v1/contacts/search?q=${encodeURIComponent(query)}`);
```

#### Create Interaction
```typescript
await apiFetch('/v1/interactions', {
  method: 'POST',
  body: JSON.stringify({
    contact_id: contactId,
    kind: 'note',
    content: 'Met for coffee today'
  })
});
```

#### Process Voice Note with AI
```typescript
import { processVoiceNote } from '@/lib/agent-api';

const result = await processVoiceNote({
  note_id: noteId,
  extract_contacts: true,
  extract_actions: true,
  categorize: true,
  suggest_tags: true
});
```

#### AI Chat
```typescript
import { sendAgentMessage } from '@/lib/agent-api';

const response = await sendAgentMessage({
  message: 'Who should I reach out to this week?',
  context: { use_tools: true }
});
```

#### Smart Compose Message
```typescript
import { composeSmartMessage } from '@/lib/agent-api';

const message = await composeSmartMessage({
  contact_id: contactId,
  goal_type: 'networking',
  channel: 'email',
  tone: 'warm'
});
```

### Backend Supabase Queries

#### Get User's Contacts
```typescript
const { data, error } = await supabase
  .from('contacts')
  .select('id, display_name, emails, warmth')
  .is('deleted_at', null)
  .order('updated_at', { ascending: false })
  .limit(50);
```

#### Create Contact (Backend)
```typescript
const { data, error } = await supabase
  .from('contacts')
  .insert({
    user_id: userId,
    display_name: 'John Doe',
    emails: [{ email: 'john@example.com' }]
  })
  .select()
  .single();
```

#### Get Contact with Interactions
```typescript
const { data: contact } = await supabase
  .from('contacts')
  .select(`
    *,
    interactions (
      id,
      kind,
      content,
      created_at
    )
  `)
  .eq('id', contactId)
  .single();
```

#### Search Contacts by Email
```typescript
const { data } = await supabase
  .from('contacts')
  .select('id, display_name')
  .contains('emails', [{ email: searchEmail }]);
```

#### Create Interaction
```typescript
const { data, error } = await supabase
  .from('interactions')
  .insert({
    user_id: userId,
    contact_id: contactId,
    kind: 'note',
    content: 'Important meeting notes'
  })
  .select()
  .single();
```

#### Get Recent Interactions for Contact
```typescript
const { data } = await supabase
  .from('interactions')
  .select('*')
  .eq('contact_id', contactId)
  .order('created_at', { ascending: false })
  .limit(20);
```

#### Create Voice Note
```typescript
const { data, error } = await supabase
  .from('persona_notes')
  .insert({
    user_id: userId,
    type: 'voice',
    title: 'Meeting notes',
    file_url: audioUrl,
    tags: ['meeting']
  })
  .select()
  .single();
```

#### Update Voice Note Transcript
```typescript
const { error } = await supabase
  .from('persona_notes')
  .update({
    transcript: transcribedText,
    status: 'complete'
  })
  .eq('id', noteId);
```

#### Get Agent Conversations
```typescript
const { data } = await supabase
  .from('agent_conversations')
  .select('*')
  .eq('user_id', userId)
  .order('updated_at', { ascending: false })
  .limit(10);
```

#### Save Agent Conversation
```typescript
const { data, error } = await supabase
  .from('agent_conversations')
  .insert({
    user_id: userId,
    messages: [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi!' }
    ],
    context: { contact_id: contactId },
    token_count: 150
  })
  .select()
  .single();
```

## 🔗 Common Patterns

### Pagination
```typescript
// Using cursor-based pagination
let cursor = null;
const allContacts = [];

do {
  const url = cursor 
    ? `/v1/contacts?limit=50&cursor=${cursor}`
    : '/v1/contacts?limit=50';
  
  const response = await apiFetch(url);
  allContacts.push(...response.items);
  cursor = response.nextCursor;
} while (cursor);
```

### Error Handling
```typescript
try {
  const data = await apiFetch('/v1/contacts');
  console.log('Success:', data);
} catch (error) {
  if (error.status === 401) {
    // Handle unauthorized
    console.error('Please log in');
  } else if (error.status === 404) {
    // Handle not found
    console.error('Resource not found');
  } else {
    // Handle other errors
    console.error('Error:', error.message);
  }
}
```

### Optimistic Updates
```typescript
// Update UI immediately
setContacts(prev => 
  prev.map(c => c.id === contactId ? { ...c, tags: newTags } : c)
);

// Then sync with server
try {
  await apiFetch(`/v1/contacts/${contactId}`, {
    method: 'PUT',
    body: JSON.stringify({ tags: newTags })
  });
} catch (error) {
  // Revert on error
  setContacts(originalContacts);
  alert('Failed to update contact');
}
```

### Batch Operations
```typescript
// Create multiple contacts
const promises = contactsData.map(contact =>
  apiFetch('/v1/contacts', {
    method: 'POST',
    body: JSON.stringify(contact)
  })
);

const results = await Promise.allSettled(promises);

// Check results
results.forEach((result, index) => {
  if (result.status === 'fulfilled') {
    console.log(`Contact ${index} created`);
  } else {
    console.error(`Contact ${index} failed:`, result.reason);
  }
});
```

### Debounced Search
```typescript
import { useState, useEffect } from 'react';

function useContactSearch(query: string) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const data = await apiFetch(`/v1/contacts/search?q=${encodeURIComponent(query)}`);
        setResults(data.items);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setLoading(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [query]);

  return { results, loading };
}
```

## 🎯 Most Used Endpoints

### Top 10
1. `GET /v1/contacts` - List contacts
2. `POST /v1/contacts` - Create contact
3. `GET /v1/contacts/:id` - Get contact
4. `PUT /v1/contacts/:id` - Update contact
5. `POST /v1/interactions` - Create interaction
6. `GET /v1/interactions` - List interactions
7. `POST /v1/agent/chat` - AI chat
8. `POST /v1/agent/voice-note/process` - Process voice note
9. `POST /v1/agent/compose/smart` - Smart compose
10. `GET /v1/me` - Get user profile

## 📝 SQL Cheat Sheet

### Common Queries
```sql
-- Get all contacts for user
SELECT * FROM contacts 
WHERE user_id = 'user-uuid' 
AND deleted_at IS NULL;

-- Search contacts by name
SELECT * FROM contacts 
WHERE display_name ILIKE '%john%' 
AND user_id = 'user-uuid';

-- Get contacts with recent interactions
SELECT c.*, MAX(i.created_at) as last_interaction
FROM contacts c
LEFT JOIN interactions i ON i.contact_id = c.id
WHERE c.user_id = 'user-uuid'
GROUP BY c.id
ORDER BY last_interaction DESC NULLS LAST;

-- Count interactions by type
SELECT kind, COUNT(*) as count
FROM interactions
WHERE user_id = 'user-uuid'
AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY kind;

-- Get contacts needing follow-up
SELECT * FROM contacts
WHERE user_id = 'user-uuid'
AND last_interaction_at < NOW() - INTERVAL '14 days'
AND deleted_at IS NULL
ORDER BY warmth DESC;
```

## Next Steps

- Full endpoint docs: [06-vercel-endpoints.md](./06-vercel-endpoints.md)
- Database tables: [02-supabase-tables.md](./02-supabase-tables.md)
- Agent integration: [../agent-integration/](../agent-integration/)
