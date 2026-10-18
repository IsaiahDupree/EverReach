# User Settings API

Manage personal settings, persona notes, and AI composition preferences.

**Base Endpoint**: `/v1/me`

---

## Persona Notes

Personal notes and voice memos for capturing context about contacts and situations.

### Create Persona Note

```http
POST /v1/me/persona-notes
Content-Type: application/json
```

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | ✅ Yes | text, voice, screenshot |
| `title` | string | No | Note title |
| `body_text` | string | Conditional | Required for text notes |
| `transcription` | string | Conditional | Required for voice notes |
| `audio_url` | string | No | URL to audio file |
| `image_url` | string | No | URL to screenshot |
| `tags` | string[] | No | Associated tags/contacts |
| `linked_contacts` | UUID[] | No | Related contact IDs |

### Example - Text Note

```typescript
await fetch('/v1/me/persona-notes', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${jwt}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    type: 'text',
    title: 'Sarah Chen Context',
    body_text: 'Sarah is very technical and prefers data-driven discussions. Mentioned interest in AI automation during last call.',
    tags: ['Sarah Chen', 'Acme Inc'],
    linked_contacts: ['550e8400-e29b-41d4-a716-446655440000']
  })
});
```

### Example - Voice Note

```typescript
await fetch('/v1/me/persona-notes', {
  method: 'POST',
  body: JSON.stringify({
    type: 'voice',
    title: 'Post-meeting thoughts',
    transcription: 'Just met with Sarah. Great conversation about Q1 planning...',
    audio_url: 'https://storage.example.com/voice/abc.m4a',
    tags: ['Sarah Chen'],
    linked_contacts: ['550e8400-e29b-41d4-a716-446655440000']
  })
});
```

### List Persona Notes

```http
GET /v1/me/persona-notes
```

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | string | Filter by type |
| `contact_id` | UUID | Filter by linked contact |
| `tag` | string | Filter by tag |
| `limit` | integer | Max results (default: 50) |

### Example

```typescript
// Get all notes for a contact
const notes = await fetch(
  `/v1/me/persona-notes?contact_id=${contactId}`,
  {
    headers: { 'Authorization': `Bearer ${jwt}` }
  }
).then(r => r.json());
```

### Response

```json
{
  "notes": [
    {
      "id": "note_abc123",
      "type": "text",
      "title": "Sarah Chen Context",
      "body_text": "Sarah is very technical...",
      "tags": ["Sarah Chen", "Acme Inc"],
      "linked_contacts": ["550e8400-e29b-41d4-a716-446655440000"],
      "created_at": "2025-01-15T10:00:00Z",
      "updated_at": "2025-01-15T10:00:00Z"
    }
  ]
}
```

### Get Note

```http
GET /v1/me/persona-notes/:id
```

### Update Note

```http
PATCH /v1/me/persona-notes/:id
```

### Delete Note

```http
DELETE /v1/me/persona-notes/:id
```

---

## Compose Settings

Configure AI message composition preferences.

### Get Compose Settings

```http
GET /v1/me/compose-settings
```

### Response

```json
{
  "settings": {
    "default_tone": "professional",
    "default_length": "medium",
    "signature": "Best regards,\nJohn Doe",
    "brand_voice": {
      "tone": "warm and professional",
      "do": [
        "Be concise and direct",
        "Use data when available",
        "Ask clarifying questions"
      ],
      "dont": [
        "Use jargon unnecessarily",
        "Make assumptions",
        "Be overly formal"
      ]
    },
    "email_settings": {
      "include_signature": true,
      "default_subject_style": "action_oriented"
    },
    "sms_settings": {
      "max_length": 160,
      "use_emojis": true
    }
  }
}
```

### Update Compose Settings

```http
PATCH /v1/me/compose-settings
Content-Type: application/json
```

### Example

```typescript
await fetch('/v1/me/compose-settings', {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${jwt}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    default_tone: 'casual',
    brand_voice: {
      tone: 'friendly and approachable',
      do: [
        'Be conversational',
        'Use simple language',
        'Show enthusiasm'
      ],
      dont: [
        'Be too formal',
        'Use corporate speak'
      ]
    },
    email_settings: {
      include_signature: true
    }
  })
});
```

---

## Common Patterns

### 1. Context-Rich AI Composition

```typescript
// Create persona notes for better AI context
await fetch('/v1/me/persona-notes', {
  method: 'POST',
  body: JSON.stringify({
    type: 'text',
    title: 'John Communication Style',
    body_text: 'John prefers brief emails. Always include specific action items. Responds best to numbered lists.',
    linked_contacts: [johnId]
  })
});

// AI will use this context when composing
const { message } = await fetch('/v1/agent/compose/smart', {
  method: 'POST',
  body: JSON.stringify({
    contact_id: johnId,
    channel: 'email',
    goal: 'follow-up',
    include: {
      persona_notes: true  // Include the context note
    }
  })
}).then(r => r.json());
```

### 2. Voice Note Workflow

```typescript
// React Native voice note capture
import { Audio } from 'expo-av';

async function captureVoiceNote(contactId: string) {
  // 1. Record audio
  const recording = await Audio.Recording.createAsync(
    Audio.RecordingOptionsPresets.HIGH_QUALITY
  );
  
  // ... user records ...
  
  await recording.stopAndUnloadAsync();
  const uri = recording.getURI();
  
  // 2. Transcribe (using Whisper or similar)
  const transcription = await transcribe(uri);
  
  // 3. Upload audio
  const audioUrl = await uploadAudio(uri);
  
  // 4. Save as persona note
  await fetch('/v1/me/persona-notes', {
    method: 'POST',
    body: JSON.stringify({
      type: 'voice',
      transcription,
      audio_url: audioUrl,
      linked_contacts: [contactId]
    })
  });
}
```

### 3. Centralized Brand Voice

```typescript
// Set brand voice once, use everywhere
await fetch('/v1/me/compose-settings', {
  method: 'PATCH',
  body: JSON.stringify({
    brand_voice: {
      tone: 'Professional but approachable',
      do: [
        'Lead with value',
        'Be specific with examples',
        'Keep emails under 200 words'
      ],
      dont: [
        'Use buzzwords',
        'Make it about features',
        'Send without a clear CTA'
      ]
    }
  })
});

// All AI compositions will follow these guidelines
```

---

## UI Examples

### Persona Notes List

```typescript
function PersonaNotesScreen({ contactId }) {
  const { data } = useQuery(['persona-notes', contactId], () =>
    fetch(`/v1/me/persona-notes?contact_id=${contactId}`).then(r => r.json())
  );
  
  return (
    <div>
      <h2>Notes about this contact</h2>
      {data?.notes.map(note => (
        <div key={note.id} className="note-card">
          <h3>{note.title}</h3>
          <p>{note.body_text || note.transcription}</p>
          <span>{format(note.created_at, 'MMM d, yyyy')}</span>
        </div>
      ))}
    </div>
  );
}
```

### Compose Settings Form

```typescript
function ComposeSettingsForm() {
  const { data: settings } = useQuery(['compose-settings'], () =>
    fetch('/v1/me/compose-settings').then(r => r.json())
  );
  
  const update = useMutation({
    mutationFn: (data) =>
      fetch('/v1/me/compose-settings', {
        method: 'PATCH',
        body: JSON.stringify(data)
      })
  });
  
  return (
    <form onSubmit={e => {
      e.preventDefault();
      update.mutate(formData);
    }}>
      <label>
        Default Tone
        <select name="default_tone">
          <option value="professional">Professional</option>
          <option value="casual">Casual</option>
          <option value="warm">Warm</option>
        </select>
      </label>
      
      <label>
        Brand Voice - Do's
        <textarea name="brand_voice.do" />
      </label>
      
      <label>
        Brand Voice - Don'ts
        <textarea name="brand_voice.dont" />
      </label>
      
      <button type="submit">Save Settings</button>
    </form>
  );
}
```

---

## Best Practices

### 1. Tag Notes Effectively

```typescript
// Use consistent tagging
await fetch('/v1/me/persona-notes', {
  method: 'POST',
  body: JSON.stringify({
    title: 'Sarah - Technical Preferences',
    body_text: '...',
    tags: [
      'Sarah Chen',           // Person name
      'Acme Inc',            // Company
      'technical',           // Category
      'ai-automation'        // Topic
    ]
  })
});
```

### 2. Link Notes to Contacts

```typescript
// Always link notes to relevant contacts
await fetch('/v1/me/persona-notes', {
  method: 'POST',
  body: JSON.stringify({
    body_text: 'Meeting went well, discussed Q1 roadmap',
    linked_contacts: [sarahId, mikeId]  // Link to attendees
  })
});
```

### 3. Update Brand Voice Iteratively

```typescript
// Review AI outputs and refine brand voice
const generated = await composeMessage();

// If output doesn't match style, update settings
if (!matchesBrandVoice(generated)) {
  await fetch('/v1/me/compose-settings', {
    method: 'PATCH',
    body: JSON.stringify({
      brand_voice: {
        dont: [...existingDonts, 'Use this specific phrase']
      }
    })
  });
}
```

---

## Integration with AI

### Persona Notes in AI Context

```typescript
// AI automatically includes persona notes when composing
const { message } = await fetch('/v1/agent/compose/smart', {
  method: 'POST',
  body: JSON.stringify({
    contact_id: contactId,
    include: {
      persona_notes: true  // Includes all linked notes
    }
  })
}).then(r => r.json());

// AI considers:
// - All persona notes tagged with contact
// - Brand voice guidelines
// - Compose settings (tone, length)
```

---

## Next Steps

- [Voice Notes](./16-voice-notes.md) - Voice note processing
- [AI Compose](./07-ai-compose.md) - Message generation
- [Agent Chat](./15-agent-chat.md) - Conversational AI
