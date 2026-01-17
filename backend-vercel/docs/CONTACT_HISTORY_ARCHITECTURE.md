# Contact History: Complete Architecture Guide

**Last Updated**: October 14, 2025  
**Status**: Production Ready ✅

---

## Overview

This document explains how **all interaction types** (notes, messages, screenshots, voice notes, calls, meetings, replies) are unified in the `interactions` table and what endpoints display complete contact history.

---

## 1. Core Data Model

### Single `interactions` Table

All interaction types stored in one table:

```sql
CREATE TABLE interactions (
  id UUID PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES contacts(id),
  kind VARCHAR(50) NOT NULL,  -- 'email', 'note', 'call', 'screenshot', 'voice_note', 'meeting'
  content TEXT,
  metadata JSONB DEFAULT '{}',
  occurred_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Principle**: One table, many types. Use `kind` to differentiate, `metadata` for type-specific data.

---

## 2. Primary Endpoint

### GET /api/v1/interactions

```
GET /v1/interactions?contact_id={id}&limit=50&sort=occurred_at:desc
```

**Returns ALL interaction types**:

```json
{
  "items": [
    {
      "id": "uuid",
      "kind": "screenshot",
      "content": "Screenshot analysis: Project timeline",
      "metadata": {
        "image_url": "...",
        "analysis": {
          "entities": [...],
          "action_items": [...]
        }
      },
      "occurred_at": "2025-10-12T14:30:00Z"
    },
    {
      "id": "uuid",
      "kind": "voice_note",
      "content": "Transcription...",
      "metadata": {
        "audio_url": "...",
        "ai_analysis": {...}
      },
      "occurred_at": "2025-10-11T10:00:00Z"
    }
  ]
}
```

---

## 3. Interaction Types

### A. Notes
- **Create**: `POST /v1/contacts/:id/notes`
- **Metadata**: tags, sentiment, priority

### B. Messages
- **Create**: `POST /v1/messages/send`
- **Metadata**: subject, status, opened, clicked, ai_generated

### C. Screenshots
- **Create**: `POST /v1/agent/analyze/screenshot`
- **Metadata**: image_url, ocr_text, entities, action_items, confidence

### D. Voice Notes
- **Create**: `POST /v1/agent/voice-note/process`
- **Metadata**: audio_url, transcription, ai_analysis, action_items

### E. Calls
- **Create**: `POST /v1/interactions` (kind: call)
- **Metadata**: duration, recording_url, transcription, summary

### F. Meetings
- **Create**: `POST /v1/interactions` (kind: meeting)
- **Metadata**: attendees, location, notes, action_items

---

## 4. Complete Endpoint Map

| Purpose | Endpoint |
|---------|----------|
| **Fetch All Types** | `GET /v1/interactions?contact_id={id}` |
| **Filter by Type** | `GET /v1/interactions?contact_id={id}&type=email` |
| **Notes Only** | `GET /v1/contacts/:id/notes` |
| **Single Details** | `GET /v1/interactions/:id` |
| **Full Context** | `GET /v1/contacts/:id/context-bundle` |

---

## 5. Frontend Implementation

### Hook

```typescript
export function useContactHistory(contactId: string) {
  const { data } = useSWR(
    `/v1/interactions?contact_id=${contactId}&sort=occurred_at:desc`,
    fetcher
  );

  const groupedByDate = useMemo(() => {
    return data?.items.reduce((acc, item) => {
      const date = format(new Date(item.occurred_at), 'yyyy-MM-dd');
      if (!acc[date]) acc[date] = [];
      acc[date].push(item);
      return acc;
    }, {});
  }, [data]);

  return {
    allInteractions: data?.items || [],
    groupedByDate,
    screenshots: data?.items.filter(i => i.kind === 'screenshot') || [],
    voiceNotes: data?.items.filter(i => i.kind === 'voice_note') || [],
  };
}
```

### Timeline Component

```typescript
export function ContactHistoryTimeline({ contactId }) {
  const { groupedByDate } = useContactHistory(contactId);

  return (
    <div className="space-y-6">
      {Object.entries(groupedByDate).map(([date, interactions]) => (
        <div key={date}>
          <h3>{format(new Date(date), 'MMMM d, yyyy')}</h3>
          {interactions.map(interaction => (
            <InteractionCard key={interaction.id} interaction={interaction} />
          ))}
        </div>
      ))}
    </div>
  );
}
```

### Type-Specific Rendering

```typescript
function InteractionCard({ interaction }) {
  switch (interaction.kind) {
    case 'screenshot':
      return <ScreenshotCard interaction={interaction} />;
    case 'voice_note':
      return <VoiceNoteCard interaction={interaction} />;
    case 'email':
      return <EmailCard interaction={interaction} />;
    default:
      return <GenericCard interaction={interaction} />;
  }
}
```

---

## 6. Architecture Flow

```
User Action → Create Endpoint → Interactions Table → History Endpoint → Frontend

Examples:

Screenshot Upload:
  → POST /v1/agent/analyze/screenshot
  → OpenAI Vision analysis
  → INSERT interactions (kind: screenshot)
  → GET /v1/interactions returns it
  → Display with thumbnail + entities

Voice Note:
  → POST /v1/agent/voice-note/process
  → Whisper transcription + GPT analysis
  → INSERT interactions (kind: voice_note)
  → GET /v1/interactions returns it
  → Display with audio player + transcript

Message Sent:
  → POST /v1/messages/send
  → Send via SendGrid
  → INSERT interactions (kind: email)
  → GET /v1/interactions returns it
  → Display with status badges
```

---

## 7. Query Parameters

```
GET /v1/interactions?contact_id={id}&type=email&sort=occurred_at:desc&limit=50
```

**Parameters**:
- `contact_id` (required)
- `type`: Filter by kind
- `start`, `end`: Date range
- `sort`: Field:order
- `limit`: Page size (1-100)
- `cursor`: Pagination

---

## 8. Summary

### Key Points

- ✅ One `interactions` table for all types
- ✅ Single endpoint: `GET /v1/interactions`
- ✅ Flexible JSONB metadata
- ✅ Frontend switches on `kind`
- ✅ Sort by `occurred_at`

### Architecture

```
interactions table (single source)
    ↓
GET /v1/interactions?contact_id={id}
    ↓
Frontend groups by kind
    ↓
Type-specific rendering
    ↓
Complete history! 🎉
```

---

**Production URL**: https://backend-vercel-21y0s1dvx-isaiahduprees-projects.vercel.app
