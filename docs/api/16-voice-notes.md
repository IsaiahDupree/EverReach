# Voice Notes API

Process voice notes with AI to extract contacts, action items, sentiment, and context.

**Base Endpoint**: `/v1/agent/voice-note`

---

## Overview

Voice notes help you:
- **Capture context** - Record thoughts about contacts on the go
- **Extract action items** - AI identifies follow-ups and todos
- **Detect sentiment** - Understand emotional tone
- **Tag contacts** - Auto-suggest tags based on content
- **Link relationships** - Automatically associate with contacts

---

## Process Voice Note

Upload and process a voice note with AI analysis.

```http
POST /v1/agent/voice-note/process
Content-Type: application/json
```

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `transcription` | string | ✅ Yes | Voice note text (from speech-to-text) |
| `audio_url` | string | No | URL to audio file |
| `duration_seconds` | number | No | Audio duration |

### Example

```typescript
const response = await fetch(
  'https://ever-reach-be.vercel.app/api/v1/agent/voice-note/process',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      transcription: "Just had a great call with Sarah from Acme Inc. She mentioned they're interested in our enterprise plan but need to discuss it with their CTO first. Should follow up next week. She also mentioned they're hiring engineers if we know anyone.",
      duration_seconds: 45
    })
  }
);

const result = await response.json();
```

### Response

```json
{
  "analysis": {
    "contacts_mentioned": [
      {
        "name": "Sarah",
        "company": "Acme Inc",
        "confidence": 0.95,
        "matched_contact_id": "550e8400-e29b-41d4-a716-446655440000"
      }
    ],
    "action_items": [
      {
        "action": "Follow up with Sarah about enterprise plan discussion",
        "priority": "medium",
        "due_date": "2025-01-22",
        "contact_id": "550e8400-e29b-41d4-a716-446655440000"
      }
    ],
    "sentiment": "positive",
    "sentiment_score": 0.85,
    "category": "sales_call",
    "suggested_tags": ["enterprise", "decision_pending", "referral_opportunity"],
    "key_topics": [
      "enterprise plan",
      "CTO approval needed",
      "hiring engineers"
    ],
    "urgency": "medium"
  },
  "persona_note": {
    "id": "note_abc123",
    "title": "Call with Sarah - Acme Inc",
    "body_text": "Just had a great call with Sarah...",
    "tags": ["Sarah", "Acme Inc"],
    "linked_contacts": ["550e8400-e29b-41d4-a716-446655440000"]
  }
}
```

---

## Analysis Fields

### contacts_mentioned

Array of people detected in the note:

```typescript
{
  "name": "Sarah",
  "company": "Acme Inc",
  "title": "VP Engineering",  // If mentioned
  "confidence": 0.95,          // 0-1 confidence score
  "matched_contact_id": "uuid" // If found in your contacts
}
```

### action_items

Extracted todos and follow-ups:

```typescript
{
  "action": "Follow up about pricing",
  "priority": "high" | "medium" | "low",
  "due_date": "2025-01-22",    // AI-inferred due date
  "contact_id": "uuid"         // Related contact
}
```

### sentiment

Overall emotional tone:
- `very_positive` - Excited, enthusiastic
- `positive` - Good, optimistic
- `neutral` - Factual, balanced
- `negative` - Concerned, disappointed
- `very_negative` - Frustrated, angry

### category

Auto-detected note type:
- `sales_call` - Sales conversation
- `networking` - Networking event
- `customer_support` - Support issue
- `partnership` - Partnership discussion
- `personal` - Personal relationship
- `general` - General note

### suggested_tags

AI-recommended tags based on content:
```json
["enterprise", "decision_pending", "hot_lead", "technical"]
```

---

## Common Patterns

### 1. Mobile Voice Capture

```typescript
// React Native with Expo
import { Audio } from 'expo-av';

async function recordVoiceNote() {
  // Record audio
  const { recording } = await Audio.Recording.createAsync(
    Audio.RecordingOptionsPresets.HIGH_QUALITY
  );
  
  // ... user records ...
  await recording.stopAndUnloadAsync();
  const uri = recording.getURI();
  
  // Transcribe (using Whisper, Google Speech-to-Text, etc.)
  const transcription = await transcribe(uri);
  
  // Process with AI
  const { analysis } = await fetch('/v1/agent/voice-note/process', {
    method: 'POST',
    body: JSON.stringify({
      transcription,
      audio_url: uri,
      duration_seconds: recording._finalDurationMillis / 1000
    })
  }).then(r => r.json());
  
  // Show analysis to user
  console.log('Detected contacts:', analysis.contacts_mentioned);
  console.log('Action items:', analysis.action_items);
}
```

### 2. Automatic Task Creation

```typescript
const { analysis } = await fetch('/v1/agent/voice-note/process', {
  method: 'POST',
  body: JSON.stringify({ transcription })
}).then(r => r.json());

// Create tasks from action items
for (const item of analysis.action_items) {
  await createTask({
    title: item.action,
    contact_id: item.contact_id,
    due_date: item.due_date,
    priority: item.priority
  });
}
```

### 3. Contact Linking

```typescript
const { analysis, persona_note } = await fetch('/v1/agent/voice-note/process', {
  method: 'POST',
  body: JSON.stringify({ transcription })
}).then(r => r.json());

// Link note to detected contacts
console.log('Linked to:', analysis.contacts_mentioned.map(c => c.name));

// Access linked note
const note = await fetch(`/v1/me/persona-notes/${persona_note.id}`, {
  headers: { 'Authorization': `Bearer ${jwt}` }
}).then(r => r.json());
```

---

## Integration with Persona Notes

Voice notes are automatically saved as persona notes and can be accessed via:

```http
GET /v1/me/persona-notes
```

**Filter by contact**:
```http
GET /v1/me/persona-notes?contact_id=550e8400-e29b-41d4-a716-446655440000
```

---

## UI Examples

### React Native Component

```typescript
import { useState } from 'react';
import { View, Button, Text } from 'react-native';
import { Audio } from 'expo-av';

export function VoiceNoteRecorder() {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [analysis, setAnalysis] = useState(null);
  
  const startRecording = async () => {
    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    setRecording(recording);
  };
  
  const stopRecording = async () => {
    if (!recording) return;
    
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    
    // Transcribe and process
    const transcription = await transcribeAudio(uri);
    
    const result = await fetch('/v1/agent/voice-note/process', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ transcription })
    }).then(r => r.json());
    
    setAnalysis(result.analysis);
    setRecording(null);
  };
  
  return (
    <View>
      <Button
        title={recording ? 'Stop Recording' : 'Start Recording'}
        onPress={recording ? stopRecording : startRecording}
      />
      
      {analysis && (
        <View>
          <Text>Contacts: {analysis.contacts_mentioned.length}</Text>
          <Text>Actions: {analysis.action_items.length}</Text>
          <Text>Sentiment: {analysis.sentiment}</Text>
        </View>
      )}
    </View>
  );
}
```

---

## Best Practices

### 1. Provide Clear Transcriptions

```typescript
// Use high-quality speech-to-text (Whisper, Google, Azure)
const transcription = await openai.audio.transcriptions.create({
  file: audioFile,
  model: 'whisper-1',
  language: 'en'
});

// Then process
await processVoiceNote(transcription.text);
```

### 2. Review AI Suggestions

```typescript
// Don't auto-apply all suggestions, let user review
const { analysis } = await processVoiceNote(transcription);

// Show UI for user to confirm
showReviewModal({
  contacts: analysis.contacts_mentioned,
  actions: analysis.action_items,
  tags: analysis.suggested_tags,
  onConfirm: async (confirmed) => {
    // Apply confirmed items
    for (const action of confirmed.actions) {
      await createTask(action);
    }
  }
});
```

### 3. Store Audio for Reference

```typescript
// Upload audio to storage
const audioUrl = await uploadToS3(audioFile);

// Include in voice note processing
await fetch('/v1/agent/voice-note/process', {
  method: 'POST',
  body: JSON.stringify({
    transcription,
    audio_url: audioUrl,
    duration_seconds
  })
});
```

---

## Performance

- **Processing time**: 1-3 seconds
- **Token usage**: 300-800 tokens
- **Cost per note**: ~$0.002-0.004
- **Accuracy**: 85-95% for contact detection

---

## Next Steps

- [Agent Chat](./15-agent-chat.md) - Conversational AI assistant
- [User Settings](./22-user-settings.md) - Manage persona notes
- [Contacts](./02-contacts.md) - Link notes to contacts
