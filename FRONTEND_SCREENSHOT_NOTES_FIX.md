# Frontend Implementation: Screenshots in Personal Notes

**Date:** November 3, 2025  
**Backend Status:** ✅ Fixed and ready  
**Priority:** 🟡 MEDIUM  
**Estimated Effort:** 2-3 hours

---

## 🎯 What Changed on Backend

### 1. **Screenshot Type Added** ✅
- Persona notes now support `type: 'screenshot'` in addition to `'text'` and `'voice'`
- Schema migration unified `image_url` → `file_url` for consistency

### 2. **Contact Linking** ✅
- `linked_contacts` field (UUID array) links screenshots to specific contacts
- Backend already handles this - just need frontend display

### 3. **Fields Returned by API** ✅

```typescript
GET /v1/me/persona-notes?type=screenshot

Response:
{
  "items": [
    {
      "id": "note_123",
      "type": "screenshot",
      "title": "📸 Screenshot Analysis",
      "body_text": "🤖 AI Summary: The image shows a close-up of green leaves...",
      "file_url": "https://storage.supabase.co/screenshots/abc123.jpg",
      "tags": ["analysis", "nature"],
      "linked_contacts": ["contact-uuid-1", "contact-uuid-2"],  // ← NEW!
      "status": "ready",
      "created_at": "2025-10-25T00:00:00Z",
      "updated_at": "2025-10-25T00:00:00Z"
    }
  ]
}
```

---

## 📱 Frontend Changes Needed

### Fix #1: Display Screenshots in Personal Notes List

**File:** `app/personal-notes.tsx` or similar

**Current Issue:**
- Screenshots not showing images
- Contact names not displayed
- Only showing text content

**What to Add:**

```typescript
// components/PersonalNoteCard.tsx
import { Image } from 'react-native';
import { useQuery } from '@tanstack/react-query';

interface PersonaNote {
  id: string;
  type: 'text' | 'voice' | 'screenshot';
  title?: string;
  body_text?: string;
  file_url?: string;
  duration_sec?: number;
  transcript?: string;
  tags?: string[];
  linked_contacts?: string[];  // ← Add this
  status: 'pending' | 'processing' | 'ready' | 'failed';
  created_at: string;
  updated_at: string;
}

export function PersonalNoteCard({ note }: { note: PersonaNote }) {
  // Fetch contact names for linked_contacts
  const { data: contacts } = useQuery({
    queryKey: ['contacts', note.linked_contacts],
    queryFn: async () => {
      if (!note.linked_contacts || note.linked_contacts.length === 0) {
        return [];
      }
      
      // Fetch contact names
      const promises = note.linked_contacts.map(contactId =>
        fetch(`${API_URL}/v1/contacts/${contactId}`, {
          headers: { Authorization: `Bearer ${token}` }
        }).then(r => r.json())
      );
      
      return Promise.all(promises);
    },
    enabled: !!note.linked_contacts && note.linked_contacts.length > 0
  });

  return (
    <View style={styles.noteCard}>
      {/* Header */}
      <View style={styles.noteHeader}>
        <Text style={styles.noteType}>
          {note.type === 'text' && '📝'}
          {note.type === 'voice' && '🎤'}
          {note.type === 'screenshot' && '📸'}
        </Text>
        <Text style={styles.noteDate}>
          {new Date(note.created_at).toLocaleDateString()}
        </Text>
      </View>

      {/* Screenshot Image (if type is screenshot) */}
      {note.type === 'screenshot' && note.file_url && (
        <Image
          source={{ uri: note.file_url }}
          style={styles.screenshot}
          resizeMode="cover"
        />
      )}

      {/* Linked Contacts */}
      {contacts && contacts.length > 0 && (
        <View style={styles.linkedContacts}>
          {contacts.map(contact => (
            <Pressable
              key={contact.id}
              style={styles.contactChip}
              onPress={() => navigation.navigate('ContactDetail', { id: contact.id })}
            >
              <Text style={styles.contactName}>{contact.display_name}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Title */}
      {note.title && (
        <Text style={styles.noteTitle}>{note.title}</Text>
      )}

      {/* Body Text (AI Summary) */}
      {note.body_text && (
        <Text style={styles.noteBody}>{note.body_text}</Text>
      )}

      {/* Tags */}
      {note.tags && note.tags.length > 0 && (
        <View style={styles.tags}>
          {note.tags.map(tag => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Voice Note Player (if type is voice) */}
      {note.type === 'voice' && note.file_url && (
        <AudioPlayer 
          uri={note.file_url} 
          duration={note.duration_sec}
        />
      )}

      {/* Transcript (if exists) */}
      {note.transcript && (
        <View style={styles.transcript}>
          <Text style={styles.transcriptLabel}>Transcription:</Text>
          <Text style={styles.transcriptText}>{note.transcript}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  noteCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  noteType: {
    fontSize: 24,
  },
  noteDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  screenshot: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  linkedContacts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  contactChip: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  contactName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#111827',
  },
  noteBody: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  tag: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 11,
    color: '#6b7280',
  },
  transcript: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  transcriptLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  transcriptText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
});
```

---

### Fix #2: Create Screenshot When Uploading

**File:** Screenshot upload screen

**What to Do:**

When user uploads a screenshot and links it to a contact:

```typescript
// After screenshot upload completes
const handleScreenshotUpload = async (imageUri: string, contactIds: string[]) => {
  try {
    // 1. Upload the screenshot (get file_url from storage)
    const fileUrl = await uploadToStorage(imageUri);

    // 2. Get AI analysis (optional, if you want summary)
    const analysis = await getAIAnalysis(fileUrl);

    // 3. Create persona note with screenshot
    const response = await fetch(`${API_URL}/v1/me/persona-notes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'screenshot',
        title: '📸 Screenshot Analysis',
        body_text: analysis ? `🤖 AI Summary: ${analysis}` : undefined,
        file_url: fileUrl,
        linked_contacts: contactIds,  // ← Link to contacts
        tags: ['screenshot'],
      }),
    });

    if (!response.ok) throw new Error('Failed to save screenshot');

    const data = await response.json();
    console.log('Screenshot saved:', data);

    // Navigate to personal notes or show success
    navigation.navigate('PersonalNotes');
  } catch (error) {
    console.error('Failed to save screenshot:', error);
    Alert.alert('Error', 'Failed to save screenshot');
  }
};
```

---

### Fix #3: Filter Screenshots by Contact

**File:** Contact detail screen

**Feature:** Show all screenshots linked to this contact

```typescript
// app/contact/[id].tsx
const ContactDetailScreen = ({ route }) => {
  const { id: contactId } = route.params;

  // Fetch screenshots for this contact
  const { data: screenshots } = useQuery({
    queryKey: ['screenshots', contactId],
    queryFn: async () => {
      const response = await fetch(
        `${API_URL}/v1/me/persona-notes?type=screenshot`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      const data = await response.json();
      
      // Filter screenshots linked to this contact
      return data.items.filter(note =>
        note.linked_contacts?.includes(contactId)
      );
    },
  });

  return (
    <ScrollView>
      {/* ... other contact info ... */}

      {/* Screenshots Section */}
      {screenshots && screenshots.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Screenshots</Text>
          {screenshots.map(screenshot => (
            <PersonalNoteCard key={screenshot.id} note={screenshot} />
          ))}
        </View>
      )}
    </ScrollView>
  );
};
```

---

### Fix #4: Update TypeScript Types

**File:** `types/personalNotes.ts` or similar

```typescript
export type PersonaNoteType = 'text' | 'voice' | 'screenshot';

export type PersonaNoteStatus = 'pending' | 'processing' | 'ready' | 'failed';

export interface PersonaNote {
  id: string;
  type: PersonaNoteType;
  title?: string;
  body_text?: string;
  file_url?: string;
  duration_sec?: number;
  transcript?: string;
  tags?: string[];
  linked_contacts?: string[];  // ← Add this
  status: PersonaNoteStatus;
  created_at: string;
  updated_at: string;
}

export interface PersonaNotesListResponse {
  items: PersonaNote[];
  limit: number;
  nextCursor?: string;
}
```

---

### Fix #5: Add Contact Selector to Screenshot Upload

**File:** Screenshot upload modal

```typescript
// components/ScreenshotUploadModal.tsx
import { useState } from 'react';
import { ContactPicker } from './ContactPicker';

export function ScreenshotUploadModal({ imageUri, onClose }) {
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  const handleSave = async () => {
    await handleScreenshotUpload(imageUri, selectedContacts);
    onClose();
  };

  return (
    <Modal visible animationType="slide">
      <View style={styles.modal}>
        <Text style={styles.modalTitle}>Save Screenshot</Text>

        {/* Screenshot Preview */}
        <Image source={{ uri: imageUri }} style={styles.preview} />

        {/* Title Input */}
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Title (optional)"
          style={styles.input}
        />

        {/* Contact Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Link to Contacts</Text>
          <ContactPicker
            selectedIds={selectedContacts}
            onChange={setSelectedContacts}
            multiple
          />
        </View>

        {/* Tag Input */}
        <TagInput value={tags} onChange={setTags} />

        {/* Actions */}
        <View style={styles.actions}>
          <Button title="Cancel" onPress={onClose} variant="outline" />
          <Button
            title="Save"
            onPress={handleSave}
            disabled={selectedContacts.length === 0}
          />
        </View>
      </View>
    </Modal>
  );
}
```

---

## 🧪 Testing Checklist

### Backend (Already Done) ✅
- [x] Migration adds screenshot type
- [x] Migration unifies image_url → file_url
- [x] API accepts linked_contacts field
- [x] API returns linked_contacts in GET
- [x] Validation schema updated

### Frontend (To Do)
- [ ] Screenshots display with images
- [ ] Contact chips show and are clickable
- [ ] Screenshots filtered by contact work
- [ ] Upload modal includes contact selector
- [ ] Voice notes still work (file_url field)
- [ ] Text notes still work
- [ ] All note types display correctly
- [ ] Empty states handled (no contacts linked)

---

## 📊 API Response Example

### GET /v1/me/persona-notes

```json
{
  "items": [
    {
      "id": "note_abc123",
      "type": "screenshot",
      "title": "📸 Screenshot Analysis",
      "body_text": "🤖 AI Summary: The image shows a close-up of green leaves with one yellow leaf among them. It appears to be a natural scene with sunlight filtering through the foliage.",
      "file_url": "https://utasetfxiqcrnwyfforx.supabase.co/storage/v1/object/public/screenshots/user123/screenshot-1234.jpg",
      "tags": ["analysis", "nature", "screenshot"],
      "linked_contacts": [
        "contact-uuid-adam-123"
      ],
      "status": "ready",
      "created_at": "2025-10-25T00:00:00Z",
      "updated_at": "2025-10-25T00:00:00Z"
    },
    {
      "id": "note_def456",
      "type": "voice",
      "title": "Meeting notes with Sarah",
      "file_url": "https://storage.supabase.co/audio/recording.m4a",
      "duration_sec": 180,
      "transcript": "Discussed the new project timeline...",
      "linked_contacts": [
        "contact-uuid-sarah-456"
      ],
      "status": "ready",
      "created_at": "2025-10-24T00:00:00Z"
    },
    {
      "id": "note_ghi789",
      "type": "text",
      "title": "Idea for follow-up",
      "body_text": "Remember to ask about the demo feedback next time we talk.",
      "linked_contacts": [
        "contact-uuid-john-789"
      ],
      "tags": ["follow-up", "demo"],
      "status": "ready",
      "created_at": "2025-10-23T00:00:00Z"
    }
  ],
  "limit": 20,
  "nextCursor": null
}
```

---

## 🚀 Implementation Order

### Phase 1: Display (1 hour)
1. Update `PersonaNote` TypeScript interface
2. Update `PersonalNoteCard` to show screenshots
3. Display linked contact chips
4. Test with existing data

### Phase 2: Upload (1 hour)
5. Add contact selector to upload modal
6. Update upload handler to include `linked_contacts`
7. Test screenshot upload with contacts

### Phase 3: Filtering (30 min)
8. Add screenshot filter to contact detail
9. Test filtering by contact

### Phase 4: Polish (30 min)
10. Add empty states
11. Add loading states
12. Add error handling
13. Test all note types

---

## 💡 Pro Tips

### 1. **Lazy Load Contact Names**

Don't fetch all contact details upfront - lazy load them:

```typescript
const { data: contact } = useQuery({
  queryKey: ['contact', contactId],
  queryFn: () => fetchContact(contactId),
  staleTime: 5 * 60 * 1000, // Cache for 5 min
});
```

### 2. **Optimize Image Loading**

Use React Native's Image optimization:

```typescript
<Image
  source={{ uri: note.file_url }}
  style={styles.screenshot}
  resizeMode="cover"
  loadingIndicatorSource={<ActivityIndicator />}
/>
```

### 3. **Handle Missing Contacts**

Contact might be deleted:

```typescript
{contacts?.map(contact => {
  if (!contact) return null; // Contact deleted
  return <ContactChip key={contact.id} contact={contact} />;
})}
```

---

## ✅ Summary

**Backend Changes (DONE):** ✅
- Screenshot type supported
- `linked_contacts` field accepted & returned
- Database migration complete
- Validation updated

**Frontend Changes (NEEDED):**
- Display screenshot images
- Show linked contact chips
- Add contact selector to upload
- Filter screenshots by contact
- Update TypeScript types

**Total Effort:** 2-3 hours  
**Priority:** 🟡 MEDIUM (after warmth mode fix)

---

**Status:** Backend ready, frontend implementation pending  
**Estimated Completion:** 1 day after frontend starts
