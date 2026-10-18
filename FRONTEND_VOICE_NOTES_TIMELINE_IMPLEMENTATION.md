# Frontend Implementation: Voice Notes in Recent Interactions Timeline

**Status**: Backend complete ✅ | Frontend pending 🟡

---

## 🎯 Objective

Display voice notes (and all persona notes) in the "Recent Interactions" timeline on the Contact Context page without manual merging.

---

## ✅ What the Backend Now Provides

### Auto-Created Interactions

When a persona note is created with a contact, the backend **automatically creates an interaction**:

```typescript
// POST /api/v1/me/persona-notes with linked_contacts
{
  type: 'voice',
  transcript: 'Follow-up call notes...',
  file_url: 'https://storage.../voice-123.m4a',
  linked_contacts: ['contact-uuid']
}

// Backend auto-creates this interaction:
{
  id: 'interaction-uuid',
  contact_id: 'contact-uuid',
  channel: 'note',
  direction: 'outbound',
  summary: 'Voice note: Follow-up call notes...',
  body: 'Full transcript text...',
  occurred_at: '2025-11-08T20:00:00Z',
  metadata: {
    note_id: 'persona-note-uuid',
    note_type: 'voice',
    audio_url: 'https://storage.../voice-123.m4a'
  }
}
```

### Metadata Structure

```typescript
type InteractionMetadata = {
  note_id?: string;           // Link to persona_notes table
  note_type?: 'voice' | 'text' | 'screenshot';
  audio_url?: string;         // For voice notes (playback)
  // ... other interaction-specific metadata
};

type Interaction = {
  id: string;
  contact_id: string;
  channel: 'email' | 'sms' | 'call' | 'note' | 'meeting' | string;
  direction: 'inbound' | 'outbound';
  summary: string;
  body?: string;
  metadata?: InteractionMetadata;
  occurred_at: string;
  created_at: string;
};
```

### Endpoints Updated

1. **GET /api/v1/interactions?contact_id=X**
   - Returns all interactions including note-type
   - Includes `metadata` field

2. **GET /api/v1/contacts/:id/detail**
   - `interactions.recent[]` now includes `metadata`
   - Voice notes appear naturally in the timeline

---

## 📱 Frontend Implementation

### Step 1: Update ContactsRepo or API Client

Ensure your API client includes the `metadata` field when fetching interactions:

```typescript
// repos/ContactsRepo.ts or similar

async getBundle(contactId: string) {
  const [contactRes, interactionsRes, notesRes, filesRes] = await Promise.all([
    apiFetch(`/api/v1/contacts/${contactId}`),
    apiFetch(`/api/v1/interactions?contact_id=${contactId}`),
    apiFetch(`/api/v1/contacts/${contactId}/notes`),
    apiFetch(`/api/v1/contacts/${contactId}/files`),
  ]);
  
  // The interactions already include voice notes!
  // No need to manually merge anymore
  return {
    contact,
    interactions,  // Contains regular interactions + note interactions
    notes,         // Still useful for dedicated notes view
    files
  };
}

// Or use the unified detail endpoint:
async getContactDetail(contactId: string) {
  const response = await apiFetch(`/api/v1/contacts/${contactId}/detail`);
  // response.interactions.recent includes metadata
  return response;
}
```

### Step 2: Update Interaction Renderer

Modify your interaction renderer to handle note-type interactions:

```typescript
// app/contact-context/[id].tsx or components/InteractionItem.tsx

import { Mic, FileText, Camera, Mail, Phone, Video } from 'lucide-react-native';

type InteractionItemProps = {
  interaction: Interaction;
  onOpenNote?: (noteId: string) => void;
};

function InteractionItem({ interaction, onOpenNote }: InteractionItemProps) {
  const isNote = interaction.channel === 'note';
  const noteType = interaction.metadata?.note_type;
  const audioUrl = interaction.metadata?.audio_url;
  const noteId = interaction.metadata?.note_id;
  
  // Get icon based on channel/type
  const Icon = getInteractionIcon(interaction.channel, noteType);
  
  return (
    <View style={styles.interactionCard}>
      <View style={styles.iconContainer}>
        <Icon size={20} color={getIconColor(interaction.channel, noteType)} />
      </View>
      
      <View style={styles.content}>
        <Text style={styles.summary}>{interaction.summary}</Text>
        <Text style={styles.timestamp}>
          {formatRelativeTime(interaction.occurred_at)}
        </Text>
        
        {/* Voice note: Show play button */}
        {isNote && noteType === 'voice' && audioUrl && (
          <TouchableOpacity 
            style={styles.playButton}
            onPress={() => playAudio(audioUrl)}
          >
            <Play size={16} />
            <Text>Play recording</Text>
          </TouchableOpacity>
        )}
        
        {/* Link to full note if available */}
        {isNote && noteId && (
          <TouchableOpacity 
            style={styles.viewNoteButton}
            onPress={() => onOpenNote?.(noteId)}
          >
            <Text style={styles.linkText}>View full note →</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.directionBadge}>
        <Text style={styles.directionText}>
          {interaction.direction === 'inbound' ? '←' : '→'}
        </Text>
      </View>
    </View>
  );
}

function getInteractionIcon(channel: string, noteType?: string) {
  if (channel === 'note') {
    switch (noteType) {
      case 'voice': return Mic;
      case 'screenshot': return Camera;
      case 'text': return FileText;
      default: return FileText;
    }
  }
  
  switch (channel) {
    case 'email': return Mail;
    case 'sms': return MessageSquare;
    case 'call': return Phone;
    case 'meeting': return Video;
    default: return MessageCircle;
  }
}

function getIconColor(channel: string, noteType?: string) {
  if (channel === 'note') {
    switch (noteType) {
      case 'voice': return '#3B82F6';      // Blue
      case 'screenshot': return '#8B5CF6'; // Purple
      case 'text': return '#10B981';       // Green
      default: return '#6B7280';
    }
  }
  
  switch (channel) {
    case 'email': return '#EF4444';
    case 'sms': return '#F59E0B';
    case 'call': return '#10B981';
    default: return '#6B7280';
  }
}
```

### Step 3: Remove Manual Merging (Optional)

Once verified, remove the manual voice note merging logic:

```typescript
// BEFORE (manual merging):
const renderNotes = () => {
  const voiceNotesForPerson = allVoiceNotes.filter(vn => vn.personId === id);
  
  const combinedNotes = [
    ...textNotes.map(note => ({ type: 'text', data: note })),
    ...voiceNotesForPerson.map(note => ({ type: 'voice', data: note })),
    ...interactions.map(i => ({ type: 'interaction', data: i }))
  ].sort((a, b) => new Date(b.data.created_at) - new Date(a.data.created_at));
  
  return combinedNotes.map((note) => <NoteCard />);
};

// AFTER (unified timeline):
const renderInteractions = () => {
  // Voice notes are already included in interactions!
  return interactions.map((interaction) => (
    <InteractionItem 
      key={interaction.id} 
      interaction={interaction}
      onOpenNote={handleOpenNote}
    />
  ));
};
```

### Step 4: Add Audio Playback (Voice Notes)

```typescript
// hooks/useAudioPlayback.ts

import { Audio } from 'expo-av';

export function useAudioPlayback() {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const playAudio = async (audioUrl: string) => {
    try {
      // Stop existing playback
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
      }
      
      // Load and play new audio
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true }
      );
      
      setSound(newSound);
      setIsPlaying(true);
      
      // Auto-stop when finished
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setIsPlaying(false);
        }
      });
    } catch (error) {
      console.error('Audio playback error:', error);
    }
  };
  
  const stopAudio = async () => {
    if (sound) {
      await sound.stopAsync();
      setIsPlaying(false);
    }
  };
  
  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);
  
  return { playAudio, stopAudio, isPlaying };
}
```

### Step 5: Deep Link to Full Note (Optional)

```typescript
// utils/navigation.ts

export function openNote(noteId: string, navigation: any) {
  navigation.navigate('NoteDetail', { noteId });
}

// In InteractionItem:
<TouchableOpacity onPress={() => openNote(noteId, navigation)}>
  <Text>View full note →</Text>
</TouchableOpacity>
```

---

## 🧪 Testing Checklist

### Manual Testing

- [ ] **Create voice note for contact**
  - Record or create voice note
  - Link to contact
  - Save

- [ ] **Verify in Recent Interactions**
  - Navigate to Contact Context page
  - Open "Recent Interactions" tab
  - **Verify voice note appears with mic icon** ← KEY TEST
  - Verify timestamp is correct
  - Verify summary shows transcript preview

- [ ] **Test audio playback**
  - Tap "Play recording" button
  - Audio plays correctly
  - Can stop playback

- [ ] **Test deep link**
  - Tap "View full note"
  - Navigates to full note view
  - Can see full transcript and metadata

- [ ] **Test text notes**
  - Create text note for contact
  - Appears in timeline with text icon
  - Summary shows note preview

- [ ] **Test screenshot notes**
  - Create screenshot note for contact
  - Appears in timeline with camera icon
  - Can view full screenshot

- [ ] **Verify sorting**
  - All interactions (emails, calls, notes) sorted by `occurred_at`
  - Most recent first

### Automated Testing

```typescript
// __tests__/contact-context.test.tsx

describe('Contact Context - Recent Interactions', () => {
  it('should display voice notes in interactions timeline', async () => {
    const { getByTestId, getAllByTestId } = render(
      <ContactContext contactId="test-contact-id" />
    );
    
    // Wait for data to load
    await waitFor(() => {
      expect(getAllByTestId('interaction-item').length).toBeGreaterThan(0);
    });
    
    // Find voice note interaction
    const voiceInteraction = getAllByTestId('interaction-item').find(
      item => item.props.testID === 'interaction-note-voice'
    );
    
    expect(voiceInteraction).toBeTruthy();
    expect(voiceInteraction).toHaveTextContent('Voice note:');
  });
});
```

---

## 📊 Expected Behavior

### Before (Manual Merge)
```
Recent Interactions:
  - Email sent (3 hours ago)
  - Call received (1 day ago)
  
All Notes & Interactions:
  - Voice note (2 hours ago)  ← Only here
  - Email sent (3 hours ago)
  - Text note (5 hours ago)
  - Call received (1 day ago)
```

### After (Unified Timeline)
```
Recent Interactions:
  - Voice note (2 hours ago)  ✅ NOW APPEARS HERE
  - Email sent (3 hours ago)
  - Text note (5 hours ago)
  - Call received (1 day ago)
  
All Notes & Interactions:
  (Same unified view, but simpler to build)
```

---

## 🎨 UI Recommendations

### Voice Note Card Design

```typescript
const styles = StyleSheet.create({
  voiceNoteCard: {
    backgroundColor: '#EFF6FF',  // Light blue bg
    borderLeftColor: '#3B82F6',  // Blue accent
    borderLeftWidth: 3,
    padding: 12,
    borderRadius: 8,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#3B82F6',
    borderRadius: 6,
  },
  playButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  transcriptPreview: {
    fontSize: 14,
    color: '#4B5563',
    marginTop: 4,
    fontStyle: 'italic',
  },
});
```

### Timeline View Example

```
┌─────────────────────────────────────┐
│ 🎤 Voice note (2 hours ago)         │
│ "Follow-up call notes..."           │
│ [▶ Play recording] [View full →]   │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ ✉️ Email sent (3 hours ago)         │
│ "Re: Project update"                │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 📝 Text note (5 hours ago)          │
│ "Meeting notes from today's call"   │
│ [View full →]                       │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 📞 Call received (1 day ago)        │
│ Duration: 12 minutes                │
└─────────────────────────────────────┘
```

---

## 🚀 Migration Strategy

### Phase 1: Add Support (No Breaking Changes)
1. Update `InteractionItem` to handle note-type interactions
2. Add audio playback hook
3. Test in parallel with existing merge logic

### Phase 2: Verify
1. Create voice notes and verify they appear
2. Test all interaction types render correctly
3. Verify no regressions in existing interactions

### Phase 3: Cleanup (Optional)
1. Remove manual voice note merge logic
2. Simplify "All Notes & Interactions" tab
3. Consider using `/detail` endpoint exclusively

---

## 🐛 Troubleshooting

### Issue: Voice notes don't appear in timeline

**Check:**
1. Backend deployed with latest code (commit `a5664cb4`)
2. Interaction was created: `GET /api/v1/interactions?contact_id=X`
3. Metadata is present in response
4. Frontend is reading `metadata` field

**Debug:**
```typescript
console.log('Interactions:', interactions.map(i => ({
  id: i.id,
  channel: i.channel,
  metadata: i.metadata
})));
```

### Issue: Audio doesn't play

**Check:**
1. `metadata.audio_url` is valid HTTPS URL
2. Audio file is accessible (not 404)
3. Correct audio permissions (iOS/Android)
4. Audio format supported (m4a, mp3, wav)

**Debug:**
```typescript
console.log('Audio URL:', interaction.metadata?.audio_url);
console.log('Audio permissions:', await Audio.getPermissionsAsync());
```

### Issue: Duplicate voice notes (in both places)

**Cause:** Manual merge logic still running

**Fix:** Remove old merge code:
```typescript
// DELETE THIS:
const voiceNotesForPerson = allVoiceNotes.filter(vn => vn.personId === id);
const combined = [...textNotes, ...voiceNotesForPerson, ...interactions];
```

---

## 📚 API Reference

### GET /api/v1/contacts/:id/detail

```typescript
Response: {
  contact: Contact;
  interactions: {
    recent: Interaction[];  // Includes note-type interactions with metadata
    total_count: number;
    has_more: boolean;
  };
  notes: {
    all: PersonaNote[];
    by_type: { voice: [], screenshot: [], text: [] };
    total_count: number;
  };
  meta: {
    fetched_at: string;
    interactions_limit: 20;
    notes_limit: 50;
  };
}
```

### GET /api/v1/interactions?contact_id=X

```typescript
Response: {
  items: Interaction[];  // Includes note-type interactions
  limit: number;
  nextCursor: string | null;
}
```

---

## ✅ Completion Checklist

- [ ] Backend deployed with interaction metadata fix
- [ ] Tests pass: `npm run test -- voice-note-interactions`
- [ ] `InteractionItem` component updated to handle notes
- [ ] Audio playback implemented for voice notes
- [ ] Deep linking to full note works
- [ ] Manual testing completed (see Testing Checklist)
- [ ] No regressions in existing interaction rendering
- [ ] Documentation updated
- [ ] Optional: Remove manual merge logic

---

## 🎉 Benefits

**Before:**
- ❌ Voice notes missing from Recent Interactions
- ❌ Frontend must manually merge 3 data sources
- ❌ Inconsistent UX (voice notes only in dedicated view)
- ❌ Multiple API calls needed

**After:**
- ✅ Voice notes appear in Recent Interactions timeline
- ✅ Single unified data source (interactions)
- ✅ Consistent UX across all interaction types
- ✅ Simpler frontend code
- ✅ Better performance (fewer API calls)

---

## 📞 Support

**Backend Code:**
- `backend-vercel/app/api/v1/me/persona-notes/route.ts` (line 113-145)
- `backend-vercel/app/api/v1/contacts/[id]/detail/route.ts` (line 75)

**Tests:**
- `backend-vercel/tests/voice-note-interactions.test.mjs`

**Docs:**
- `VOICE_NOTES_RECENT_INTERACTIONS_FIX.md`
- `FRONTEND_FIXES_IMPLEMENTATION_GUIDE.md` (lines 293-396)

**Questions?**
- Check test output for API behavior
- Review interaction metadata structure
- Verify backend is deployed: `https://backend-vercel-git-feat-dev-dashboard-isaiahduprees-projects.vercel.app`
