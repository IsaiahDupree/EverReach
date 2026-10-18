# Notes as Interactions - Architecture

## 🎯 **How It Works Now**

When you create a voice note, screenshot, or text note linked to a contact, the system **automatically**:

1. ✅ **Saves the note** in `persona_notes` table
2. ✅ **Creates an interaction** in `interactions` table

This makes notes appear in **TWO places**:
- **Notes section** - Full details with files, transcripts
- **Interaction timeline** - Chronological touchpoint history

---

## 📊 **Data Flow**

```
User Action: Record voice note about John
    ↓
POST /api/v1/me/persona-notes
{
  type: 'voice',
  transcript: 'Discussed Q4 roadmap. Wants dark mode.',
  file_url: 'https://storage.com/audio/john-call.mp3',
  contact_id: 'john-uuid'
}
    ↓
Backend Creates TWO Records:
    ↓
┌─────────────────────────────┐  ┌─────────────────────────────┐
│   persona_notes table       │  │   interactions table        │
├─────────────────────────────┤  ├─────────────────────────────┤
│ id: note-123                │  │ id: int-456                 │
│ type: 'voice'               │  │ channel: 'note'             │
│ transcript: 'Discussed...'  │  │ direction: 'outbound'       │
│ file_url: 'storage.../...'  │  │ summary: 'Voice note: D...' │
│ linked_contacts: [john-id]  │  │ contact_id: john-id         │
│ status: 'ready'             │  │ body: 'Discussed Q4...'     │
│                             │  │ occurred_at: 2025-11-08...  │
│                             │  │ metadata: {                 │
│                             │  │   note_id: note-123         │
│                             │  │   note_type: 'voice'        │
│                             │  │ }                           │
└─────────────────────────────┘  └─────────────────────────────┘
    ↓                                ↓
Frontend Displays BOTH:
    ↓
┌──────────────────────────────────────────────────────┐
│  Contact Detail Page: John Doe                       │
├──────────────────────────────────────────────────────┤
│                                                      │
│  📅 TIMELINE (Interactions)                          │
│  ├─ Nov 8, 2pm: Voice note: Discussed Q4 roadmap    │ ← Shows here!
│  ├─ Nov 7, 4pm: Email: Sent proposal                │
│  └─ Nov 6, 9am: Call: 15 min discussion             │
│                                                      │
│  🎤 VOICE NOTES (Persona Notes)                      │
│  └─ Nov 8, 2pm: [Audio Player]                      │ ← AND here!
│     "Discussed Q4 roadmap. Wants dark mode."        │
│     [Play] [Download] [Delete]                       │
│                                                      │
│  📸 SCREENSHOTS                                       │
│  └─ Nov 5: Dashboard mockup feedback                │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## 📝 **Summary Generation**

The system creates smart summaries for each note type:

### **Voice Notes**
```typescript
// Has transcript
summary: "Voice note: Discussed Q4 roadmap. Wants dark mode feature..."
                       └── First 100 chars of transcript

// No transcript yet
summary: "Voice note recorded"
```

### **Screenshots**
```typescript
// Has title
summary: "Dashboard mockup feedback"
         └── Uses title directly

// No title
summary: "Screenshot captured"
```

### **Text Notes**
```typescript
// Has body
summary: "Note: Meeting went well. Follow up next week..."
               └── First 100 chars of body_text

// No body
summary: "Note added"
```

---

## 🎨 **Frontend Display Examples**

### **Timeline View (Interactions)**
```typescript
function InteractionTimeline({ contactId }) {
  const { data } = useContactDetail(contactId);
  
  return (
    <div>
      {data.interactions.recent.map(interaction => (
        <TimelineItem key={interaction.id}>
          <Icon type={interaction.channel} /> {/* note, email, call, etc */}
          <Time>{interaction.occurred_at}</Time>
          <Summary>{interaction.summary}</Summary>
          
          {/* Link to full note if it's a note */}
          {interaction.metadata?.note_id && (
            <Link to={`/notes/${interaction.metadata.note_id}`}>
              View full note →
            </Link>
          )}
        </TimelineItem>
      ))}
    </div>
  );
}
```

### **Notes Tab (Persona Notes)**
```typescript
function VoiceNotesTab({ contactId }) {
  const { data } = useContactDetail(contactId);
  
  return (
    <div>
      {data.notes.by_type.voice.map(note => (
        <VoiceNoteCard key={note.id}>
          <AudioPlayer src={note.file_url} />
          <Transcript>{note.transcript}</Transcript>
          <Time>{note.created_at}</Time>
        </VoiceNoteCard>
      ))}
    </div>
  );
}
```

---

## ✅ **Benefits**

### **For Users:**
1. **Chronological timeline** - See all touchpoints in order (calls, emails, notes)
2. **Detailed reference** - Access full audio/screenshots in notes section
3. **Better context** - When did I last interact? When did I make that note?

### **For Developers:**
1. **Single endpoint** - `/api/v1/contacts/:id/detail` returns everything
2. **Automatic** - No need to manually create interactions
3. **Linked data** - `metadata.note_id` links interaction back to note
4. **Fail-safe** - If interaction creation fails, note still saves

---

## 🔄 **Data Relationships**

```
Contact
  └─ Has Many: Interactions
       ├─ Email sent
       ├─ Call received  
       └─ Note: Voice note (links to persona_notes.id)
  └─ Has Many: Persona Notes
       ├─ Voice note (creates interaction)
       ├─ Screenshot (creates interaction)
       └─ Text note (creates interaction)
```

---

## 🎯 **Use Cases**

### **Use Case 1: After Call Notes**
```typescript
// User makes a call
POST /api/v1/interactions
{
  channel: 'call',
  direction: 'inbound',
  summary: 'Discussed new features',
  occurred_at: '2025-11-08T14:00:00Z'
}

// User records voice memo right after
POST /api/v1/me/persona-notes
{
  type: 'voice',
  transcript: 'Key takeaways: needs dark mode, wants API access',
  contact_id: 'john-uuid'
}

// Timeline now shows BOTH:
// - 2:00pm: Call received
// - 2:05pm: Voice note: Key takeaways...
```

### **Use Case 2: Screenshot Feedback**
```typescript
// User takes screenshot of design
POST /api/v1/me/persona-notes
{
  type: 'screenshot',
  file_url: 'storage.com/mockup.png',
  title: 'Dashboard redesign feedback',
  body_text: 'Sarah wants header to be darker',
  contact_id: 'sarah-uuid'
}

// Creates TWO records:
// 1. Persona note with image
// 2. Interaction: "Dashboard redesign feedback"
```

### **Use Case 3: Quick Text Notes**
```typescript
// User jots down quick note
POST /api/v1/me/persona-notes
{
  type: 'text',
  body_text: 'Prefers email over phone calls. Works EST timezone.',
  contact_id: 'john-uuid'
}

// Shows in timeline: "Note: Prefers email over phone calls..."
```

---

## 🧪 **Testing**

Test that notes create interactions:

```typescript
// 1. Create voice note with contact
const noteResponse = await fetch('/api/v1/me/persona-notes', {
  method: 'POST',
  body: JSON.stringify({
    type: 'voice',
    transcript: 'Test note',
    contact_id: contactId,
  }),
});
const note = await noteResponse.json();

// 2. Check interactions for contact
const interactionsResponse = await fetch(
  `/api/v1/interactions?contact_id=${contactId}`
);
const { items } = await interactionsResponse.json();

// 3. Verify interaction was created
const noteInteraction = items.find(
  i => i.metadata?.note_id === note.id
);

expect(noteInteraction).toBeTruthy();
expect(noteInteraction.channel).toBe('note');
expect(noteInteraction.summary).toContain('Test note');
```

---

## 🚀 **Migration Notes**

**Existing notes won't have interactions** - only new notes created after this feature.

If you want to backfill interactions for existing notes:

```sql
-- Optional: Create interactions for existing persona notes
INSERT INTO interactions (contact_id, channel, direction, summary, body, occurred_at, metadata)
SELECT 
  (linked_contacts->0)::uuid as contact_id,
  'note' as channel,
  'outbound' as direction,
  CASE 
    WHEN type = 'voice' THEN 'Voice note: ' || COALESCE(SUBSTRING(transcript, 1, 100), 'Voice note recorded')
    WHEN type = 'screenshot' THEN COALESCE(title, 'Screenshot captured')
    WHEN type = 'text' THEN 'Note: ' || COALESCE(SUBSTRING(body_text, 1, 100), 'Note added')
  END as summary,
  COALESCE(transcript, body_text, title) as body,
  created_at as occurred_at,
  jsonb_build_object('note_id', id, 'note_type', type) as metadata
FROM persona_notes
WHERE linked_contacts IS NOT NULL 
  AND array_length(linked_contacts, 1) > 0;
```

---

## 📚 **API Reference**

### **POST /api/v1/me/persona-notes**

**Request:**
```json
{
  "type": "voice",
  "transcript": "Meeting notes...",
  "file_url": "https://storage.com/audio.mp3",
  "contact_id": "uuid"
}
```

**What Happens:**
1. Creates `persona_notes` record
2. Automatically creates `interactions` record with `channel: 'note'`
3. Links them via `metadata.note_id`

**Response:**
```json
{
  "id": "note-uuid",
  "type": "voice",
  "transcript": "Meeting notes...",
  "file_url": "https://storage.com/audio.mp3",
  "contact_id": "uuid",
  "linked_contacts": ["uuid"],
  "status": "ready",
  "created_at": "2025-11-08T14:00:00Z"
}
```

---

## ✨ **Summary**

**Before:** Notes were isolated, no chronological timeline  
**After:** Notes appear in BOTH notes section AND interaction timeline

**Result:** Better UX, complete contact history, chronological view of all activity!
