# Frontend Contact API Guide
**Complete CRUD Operations for Contact Management**

---

## 🎯 Quick Start: One Endpoint for Everything

### **The /detail Endpoint - Your Best Friend**

Get **everything** about a contact in **one API call**:

```typescript
// ONE call instead of 3-4!
const response = await fetch(
  `/api/v1/contacts/${contactId}/detail`,
  { headers: { Authorization: `Bearer ${token}` } }
);

const data = await response.json();
```

**Returns:**
```typescript
{
  // Contact basic info
  contact: {
    id: string;
    display_name: string;
    emails: string[];
    phones: string[];
    company: string;
    title: string;
    tags: string[];
    warmth: number;           // 0-100
    warmth_band: string;      // hot|warm|cooling|cold
    last_interaction_at: string;
    custom: object;           // Custom fields
    notes: string;            // Text notes
    pipeline: {               // null if not in pipeline
      pipeline_id: string;
      pipeline_name: string;
      stage_id: string;
      stage_name: string;
    };
    created_at: string;
    updated_at: string;
  },
  
  // All interactions
  interactions: {
    recent: Array<{
      id: string;
      channel: string;        // email|sms|call|dm
      direction: string;      // inbound|outbound
      summary: string;
      occurred_at: string;
    }>;
    total_count: number;
    has_more: boolean;        // True if > 20
  },
  
  // All persona notes (audio, screenshots, text)
  notes: {
    all: Array<PersonaNote>;
    by_type: {
      voice: Array<PersonaNote>;
      screenshot: Array<PersonaNote>;
      text: Array<PersonaNote>;
    };
    total_count: number;
    counts: {
      voice: number;
      screenshot: number;
      text: number;
    };
  },
  
  // Metadata
  meta: {
    fetched_at: string;
    interactions_limit: 20;
    notes_limit: 50;
  }
}
```

---

## 📝 Complete CRUD Operations

### **1. Create Contact**

```typescript
const response = await fetch('/api/v1/contacts', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    display_name: 'John Doe',
    emails: ['john@example.com'],
    phones: ['+1234567890'],
    company: 'Acme Corp',
    title: 'CTO',
    tags: ['vip', 'customer'],
  }),
});

const contact = await response.json();
// Returns: { id, display_name, created_at, ... }
```

### **2. Get Contact (Simple)**

```typescript
// Just basic info
const response = await fetch(`/api/v1/contacts/${id}`, {
  headers: { Authorization: `Bearer ${token}` },
});

const contact = await response.json();
```

### **3. Get Contact (Full Detail)**

```typescript
// Everything in one call - USE THIS!
const response = await fetch(`/api/v1/contacts/${id}/detail`, {
  headers: { Authorization: `Bearer ${token}` },
});

const fullData = await response.json();
// Access: fullData.contact, fullData.interactions, fullData.notes
```

### **4. Update Contact**

```typescript
const response = await fetch(`/api/v1/contacts/${id}`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    display_name: 'John Smith',  // Changed name
    company: 'New Corp',
    tags: ['vip', 'partner'],    // Updated tags
  }),
});

const updated = await response.json();
```

### **5. Delete Contact**

```typescript
const response = await fetch(`/api/v1/contacts/${id}`, {
  method: 'DELETE',
  headers: { Authorization: `Bearer ${token}` },
});

// Returns 200 on success
```

### **6. List Contacts**

```typescript
// Basic list
const response = await fetch('/api/v1/contacts?limit=50', {
  headers: { Authorization: `Bearer ${token}` },
});

const data = await response.json();
// Returns: { contacts: [...], limit: 50, nextCursor: "..." }

// With filters
const filtered = await fetch(
  '/api/v1/contacts?warmth_band=hot&limit=20',
  { headers: { Authorization: `Bearer ${token}` } }
);
```

---

## 🎤 Persona Notes (Audio, Screenshots, Text)

### **Create Voice Note Linked to Contact**

```typescript
const response = await fetch('/api/v1/me/persona-notes', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    type: 'voice',
    file_url: 'https://storage.com/audio/meeting.mp3',
    transcript: 'Discussed project timeline',
    contact_id: contactId,  // Links to contact!
  }),
});

const note = await response.json();
```

### **Create Screenshot Note Linked to Contact**

```typescript
const response = await fetch('/api/v1/me/persona-notes', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    type: 'screenshot',
    file_url: 'https://storage.com/img/mockup.png',
    title: 'Dashboard feedback',
    body_text: 'Wants darker theme',
    contact_id: contactId,  // Links to contact!
  }),
});

const screenshot = await response.json();
```

### **Get All Notes for Contact**

```typescript
// Option 1: Use detail endpoint (recommended)
const detail = await fetch(`/api/v1/contacts/${contactId}/detail`, {
  headers: { Authorization: `Bearer ${token}` },
});
const data = await detail.json();
// Access: data.notes.by_type.voice, data.notes.by_type.screenshot

// Option 2: Query notes directly
const notes = await fetch(
  `/api/v1/me/persona-notes?contact_id=${contactId}`,
  { headers: { Authorization: `Bearer ${token}` } }
);

// Option 3: Filter by type
const voiceNotes = await fetch(
  `/api/v1/me/persona-notes?contact_id=${contactId}&type=voice`,
  { headers: { Authorization: `Bearer ${token}` } }
);
```

### **Update Note**

```typescript
const response = await fetch(`/api/v1/me/persona-notes/${noteId}`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    title: 'Updated title',
    body_text: 'New content',
  }),
});
```

### **Delete Note**

```typescript
const response = await fetch(`/api/v1/me/persona-notes/${noteId}`, {
  method: 'DELETE',
  headers: { Authorization: `Bearer ${token}` },
});
```

---

## 💬 Interactions

### **Create Interaction**

```typescript
const response = await fetch('/api/v1/interactions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    contact_id: contactId,
    channel: 'email',           // email|sms|call|dm
    direction: 'outbound',      // inbound|outbound
    summary: 'Sent proposal',
    body: 'Full email content...',
    occurred_at: new Date().toISOString(),
  }),
});

const interaction = await response.json();
```

### **Get Interactions for Contact**

```typescript
// Option 1: Use detail endpoint (recommended)
const detail = await fetch(`/api/v1/contacts/${contactId}/detail`, {
  headers: { Authorization: `Bearer ${token}` },
});
const data = await detail.json();
// Access: data.interactions.recent, data.interactions.total_count

// Option 2: Query directly
const interactions = await fetch(
  `/api/v1/interactions?contact_id=${contactId}&limit=50`,
  { headers: { Authorization: `Bearer ${token}` } }
);
```

---

## 🎨 React Hook Examples

### **useContactDetail Hook**

```typescript
import { useQuery } from '@tanstack/react-query';

export function useContactDetail(contactId: string) {
  return useQuery({
    queryKey: ['contact', 'detail', contactId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/contacts/${contactId}/detail`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('Failed to fetch contact');
      return res.json();
    },
    // Optional: refetch on window focus
    refetchOnWindowFocus: true,
  });
}

// Usage in component
function ContactDetailPage({ contactId }) {
  const { data, isLoading, error } = useContactDetail(contactId);
  
  if (isLoading) return <Loading />;
  if (error) return <Error />;
  
  return (
    <div>
      <h1>{data.contact.display_name}</h1>
      
      {/* Voice notes */}
      <VoiceNotesList notes={data.notes.by_type.voice} />
      
      {/* Screenshots */}
      <ScreenshotsList notes={data.notes.by_type.screenshot} />
      
      {/* Interactions */}
      <InteractionsList 
        interactions={data.interactions.recent}
        totalCount={data.interactions.total_count}
      />
    </div>
  );
}
```

### **usePersonaNotes Hook**

```typescript
export function usePersonaNotes(contactId?: string, type?: 'voice' | 'screenshot' | 'text') {
  const params = new URLSearchParams();
  if (contactId) params.append('contact_id', contactId);
  if (type) params.append('type', type);
  
  return useQuery({
    queryKey: ['persona-notes', contactId, type],
    queryFn: async () => {
      const res = await fetch(
        `/api/v1/me/persona-notes?${params.toString()}`,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      if (!res.ok) throw new Error('Failed to fetch notes');
      return res.json();
    },
  });
}

// Usage
function VoiceNotesTab({ contactId }) {
  const { data } = usePersonaNotes(contactId, 'voice');
  
  return (
    <div>
      {data?.items.map(note => (
        <VoiceNoteCard key={note.id} note={note} />
      ))}
    </div>
  );
}
```

---

## 🚀 Performance Tips

### **1. Use /detail Endpoint for Contact Pages**
✅ **DO**: One call with all data
```typescript
const data = await fetch(`/api/v1/contacts/${id}/detail`);
// Everything in one request!
```

❌ **DON'T**: Multiple calls
```typescript
const contact = await fetch(`/api/v1/contacts/${id}`);
const notes = await fetch(`/api/v1/me/persona-notes?contact_id=${id}`);
const interactions = await fetch(`/api/v1/interactions?contact_id=${id}`);
// 3 requests instead of 1!
```

### **2. Pagination for Lists**
```typescript
// Use cursor-based pagination
let cursor = null;
let allContacts = [];

do {
  const url = `/api/v1/contacts?limit=50${cursor ? `&cursor=${cursor}` : ''}`;
  const response = await fetch(url, { headers: { Authorization: token } });
  const data = await response.json();
  
  allContacts = [...allContacts, ...data.contacts];
  cursor = data.nextCursor;
} while (cursor);
```

### **3. Caching with React Query**
```typescript
// Cache for 5 minutes
const { data } = useQuery({
  queryKey: ['contact', id],
  queryFn: fetchContact,
  staleTime: 5 * 60 * 1000,  // 5 minutes
});
```

---

## 🎯 Common Patterns

### **Contact Detail Page**
```typescript
function ContactDetailPage({ contactId }) {
  const { data, isLoading } = useContactDetail(contactId);
  
  if (isLoading) return <Spinner />;
  
  return (
    <Layout>
      {/* Header */}
      <ContactHeader contact={data.contact} />
      
      {/* Tabs */}
      <Tabs>
        <Tab label={`Interactions (${data.interactions.total_count})`}>
          <InteractionsList interactions={data.interactions.recent} />
        </Tab>
        
        <Tab label={`Voice Notes (${data.notes.counts.voice})`}>
          <VoiceNotesList notes={data.notes.by_type.voice} />
        </Tab>
        
        <Tab label={`Screenshots (${data.notes.counts.screenshot})`}>
          <ScreenshotsList notes={data.notes.by_type.screenshot} />
        </Tab>
      </Tabs>
    </Layout>
  );
}
```

### **Create Note with File Upload**
```typescript
async function createVoiceNote(file: File, contactId: string, transcript: string) {
  // 1. Upload file to storage
  const fileUrl = await uploadToStorage(file);
  
  // 2. Create note linked to contact
  const response = await fetch('/api/v1/me/persona-notes', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'voice',
      file_url: fileUrl,
      transcript: transcript,
      contact_id: contactId,
    }),
  });
  
  return response.json();
}
```

---

## 📊 Response Types (TypeScript)

```typescript
// Contact Detail Response
interface ContactDetailResponse {
  contact: {
    id: string;
    display_name: string;
    emails: string[];
    phones: string[];
    company?: string;
    title?: string;
    tags: string[];
    warmth: number;
    warmth_band: 'hot' | 'warm' | 'cooling' | 'cold';
    last_interaction_at?: string;
    custom?: Record<string, any>;
    notes?: string;
    pipeline?: {
      pipeline_id: string;
      pipeline_name: string;
      stage_id: string;
      stage_name: string;
    } | null;
    created_at: string;
    updated_at: string;
  };
  interactions: {
    recent: Interaction[];
    total_count: number;
    has_more: boolean;
  };
  notes: {
    all: PersonaNote[];
    by_type: {
      voice: PersonaNote[];
      screenshot: PersonaNote[];
      text: PersonaNote[];
    };
    total_count: number;
    counts: {
      voice: number;
      screenshot: number;
      text: number;
    };
  };
  meta: {
    fetched_at: string;
    interactions_limit: number;
    notes_limit: number;
  };
}

interface PersonaNote {
  id: string;
  type: 'voice' | 'screenshot' | 'text';
  status: 'pending' | 'processing' | 'ready' | 'failed';
  title?: string;
  body_text?: string;
  file_url?: string;
  duration_sec?: number;
  transcript?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

interface Interaction {
  id: string;
  channel: 'email' | 'sms' | 'call' | 'dm';
  direction: 'inbound' | 'outbound';
  summary: string;
  body?: string;
  occurred_at: string;
  created_at: string;
}
```

---

## ✅ Testing Checklist

- [ ] Can create contact
- [ ] Can get contact detail (full data)
- [ ] Can update contact
- [ ] Can delete contact
- [ ] Can create voice note linked to contact
- [ ] Can create screenshot note linked to contact
- [ ] Notes appear in /detail endpoint
- [ ] Can filter notes by type
- [ ] Can create interaction
- [ ] Interactions appear in /detail endpoint
- [ ] Pagination works for lists
- [ ] Error handling works (404, 401, etc.)

---

## 🎉 Summary

**For Contact Detail Pages:**
- ✅ Use `/api/v1/contacts/:id/detail` - ONE call for everything
- ✅ Get contact + interactions + notes in single response
- ✅ Notes grouped by type (voice, screenshot, text)

**For CRUD:**
- ✅ Full REST API: GET, POST, PATCH, DELETE
- ✅ Works for contacts, notes, and interactions
- ✅ All endpoints support contact linking

**Performance:**
- ✅ Cursor-based pagination
- ✅ RLS security (user can only see their data)
- ✅ React Query caching recommended
