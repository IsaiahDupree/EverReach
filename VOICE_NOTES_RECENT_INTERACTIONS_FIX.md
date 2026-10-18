# Voice Notes Missing from Recent Interactions


## The Problem


Voice notes are showing in "All Notes & Interactions" tab but **NOT in "Recent Interactions" timeline or "Context Summary"** on the Contact Context page.


## Root Cause


According to `FRONTEND_FIXES_IMPLEMENTATION_GUIDE.md`  (lines 293-305):


> **When you create a voice note with a contact, we now automatically:**
> 1. ✅ Save note in `persona_notes`  table
> 2. ✅ Create interaction in `interactions`  table  ← **THIS IS NOT HAPPENING**
> 3. ✅ Link them via `metadata.note_id` 
>
> **Result:** Notes appear in BOTH places:
> - Notes section (full details with audio)
> - Timeline (chronological interactions)


### What's Actually Happening


**Current Implementation**:
1. ✅ Voice note is saved to `persona_notes`  table
2. ❌ **No interaction is auto-created**
3. Frontend fetches separately:
   - `/api/v1/interactions?contact_id=X`  → Returns regular interactions (no voice notes)
   - `/api/v1/contacts/:id/notes`  → Returns voice notes
4. Voice notes display ONLY in "All Notes & Interactions" (merged manually in frontend)
5. Voice notes are MISSING from "Recent Interactions" timeline


## Expected vs Actual Behavior


### Expected (Per Implementation Guide)
```
User saves voice note with contact
  ↓
Backend automatically creates:
  1. persona_notes record
  2. interactions record (channel: 'note', metadata.note_type: 'voice')
  ↓
Frontend fetches interactions
  ↓
Voice notes appear in Recent Interactions timeline
```


### Actual (Current)
```
User saves voice note with contact
  ↓
Backend creates ONLY:
  1. persona_notes record
  ↓
Frontend must manually merge:
  - Fetch interactions
  - Fetch voice notes separately
  - Merge in frontend code
  ↓
Voice notes appear ONLY in merged "All Notes" view
NOT in Recent Interactions timeline
```


## Why This Matters


1. **Inconsistent UX**: Users expect to see voice notes in the timeline
2. **Incomplete Context**: AI context summary doesn't include voice notes
3. **Manual Merging**: Frontend has to do extra work to merge data
4. **Performance**: Multiple API calls instead of unified data


## The Fix


We have TWO options:


### Option A: Backend Fix (Recommended by Guide)


**Implement auto-interaction creation when voice notes are saved**


**Location**: Backend - `/api/v1/me/persona-notes`  POST handler


**Code to Add**:
```typescript
// After creating persona_note, also create interaction
if (note.contact_id && note.type === 'voice') {
  await db.query(`
    INSERT INTO interactions (
      user_id,
      contact_id,
      channel,
      direction,
      summary,
      occurred_at,
      metadata,
      created_at
    ) VALUES (
      $1, $2, 'note', 'outbound',
      $3, NOW(),
      jsonb_build_object('note_id', $4, 'note_type', 'voice'),
      NOW()
    )
  `, [
    userId,
    note.contact_id,
    note.transcript ? note.transcript.substring(0, 200) : 'Voice note',
    note.id
  ]);
}
```


**Benefits**:
- ✅ Aligns with implementation guide
- ✅ Voice notes automatically appear in timeline
- ✅ Cleaner frontend code
- ✅ Better performance (no manual merging)


### Option B: Frontend Workaround (Current Approach)


**Keep manually merging in frontend**


**Status**: Already implemented in:
- `hooks/useContactHistory.ts`  - Merges voice notes with interactions
- `app/(tabs)/home.tsx`  - Uses PeopleProvider for name/avatar fallback


**Issues**:
- ❌ More complex frontend code
- ❌ Multiple API calls
- ❌ Voice notes still don't appear in "Recent Interactions" on Contact Context page
- ❌ Inconsistent with implementation guide


## Current Code Analysis


### Contact Context Page (`app/contact-context/[id].tsx` )


**Recent Interactions Tab (line 490-544)**:
```typescript
const renderInteractions = () => {
  return (
    <ScrollView>
      <Text>Interaction History</Text>
      {interactions.map((interaction) => {
        // Renders ONLY regular interactions
        // Voice notes are NOT included here
        return <InteractionItem />;
      })}
    </ScrollView>
  );
};
```


**All Notes & Interactions Tab (line 934-1219)**:
```typescript
const renderNotes = () => {
  const voiceNotesForPerson = allVoiceNotes.filter(vn => vn.personId === id);
  
  const combinedNotes = [
    ...textNotes.map(note => ({ type: 'text', data: note })),
    ...voiceNotesForPerson.map(note => ({ type: 'voice', data: note }))
  ].sort(...);
  
  // This DOES show voice notes
  // But only in this merged view
  return filteredNotes.map((note) => <NoteCard />);
};
```


### Bundle Fetcher (`repos/ContactsRepo.ts` )


```typescript
async getBundle(contactId: string) {
  const [contactRes, interactionsRes, notesRes, filesRes] = await Promise.all([
    apiFetch(`/api/v1/contacts/${contactId}`),
    apiFetch(`/api/v1/interactions?contact_id=${contactId}`),  // No voice notes
    apiFetch(`/api/v1/contacts/${contactId}/notes`),           // Voice notes separate
    apiFetch(`/api/v1/contacts/${contactId}/files`),
  ]);
  
  return {
    contact,
    interactions,  // Doesn't include voice notes
    notes,         // Voice notes here
    files
  };
}
```


## Recommended Action


### Immediate Fix (Backend)


**Add auto-interaction creation to voice notes endpoint**:


1. Open `backend-vercel/app/api/v1/me/persona-notes/route.ts` 
2. In POST handler, after creating note, add:


```typescript
// Auto-create interaction for voice notes with contacts
if (createdNote.contact_id && createdNote.type === 'voice') {
  try {
    await fetch(`${baseUrl}/api/v1/interactions`, {
      method: 'POST',
      headers: {
        'Authorization': request.headers.get('Authorization'),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contact_id: createdNote.contact_id,
        channel: 'note',
        direction: 'outbound',
        summary: createdNote.transcript 
          ? createdNote.transcript.substring(0, 200) 
          : 'Voice note',
        occurred_at: new Date().toISOString(),
        metadata: {
          note_id: createdNote.id,
          note_type: 'voice',
          audio_url: createdNote.file_url
        }
      })
    });
    console.log('[VoiceNotes] Auto-created interaction for voice note:', createdNote.id);
  } catch (error) {
    console.error('[VoiceNotes] Failed to auto-create interaction:', error);
    // Don't fail the note creation if interaction creation fails
  }
}
```


### Frontend Update (After Backend Fix)


Once backend creates interactions automatically, **remove manual merging**:


1. Update `app/contact-context/[id].tsx` :
   - Remove manual voice note filtering from renderNotes
   - Voice notes will automatically appear in interactions array
   
2. Update interaction renderer to handle note-type interactions:
```typescript
function InteractionItem({ interaction }) {
  const isNote = interaction.channel === 'note';
  const noteType = interaction.metadata?.note_type;
  
  return (
    <View>
      <Icon name={isNote ? getNoteIcon(noteType) : getChannelIcon(interaction.channel)} />
      <Text>{interaction.summary}</Text>
      
      {/* Link to full note if available */}
      {isNote && interaction.metadata?.note_id && (
        <TouchableOpacity onPress={() => openNote(interaction.metadata.note_id)}>
          <Text>View full note →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}


function getNoteIcon(type) {
  switch (type) {
    case 'voice': return <Mic />;
    case 'screenshot': return <Camera />;
    case 'text': return <FileText />;
    default: return <FileText />;
  }
}
```


## Testing Checklist


### After Backend Fix


- [ ] Create new voice note for a contact
- [ ] Verify interaction auto-created in `interactions`  table
- [ ] Check `metadata`  includes `note_id` , `note_type: 'voice'` , `audio_url` 
- [ ] Navigate to Contact Context page
- [ ] **Verify voice note appears in "Recent Interactions"** ← KEY TEST
- [ ] Verify voice note also appears in "All Notes & Interactions"
- [ ] Check Context Summary includes voice note
- [ ] Verify can still delete voice note
- [ ] Verify can still play audio


### Current Behavior (Before Fix)


- [x] Voice notes show in "All Notes & Interactions" tab
- [x] Voice notes have delete button
- [x] Voice notes can be played
- [ ] **Voice notes DO NOT show in "Recent Interactions"** ← FAILS
- [ ] **Voice notes DO NOT appear in Context Summary** ← FAILS


## Files to Update


### Backend (Priority)
- `backend-vercel/app/api/v1/me/persona-notes/route.ts`  - Add auto-interaction creation


### Frontend (After Backend Fix)
- `app/contact-context/[id].tsx`  - Update interaction renderer
- `repos/ContactsRepo.ts`  - Consider using `/detail`  endpoint (optional)


## References


- Implementation Guide: `FRONTEND_FIXES_IMPLEMENTATION_GUIDE.md`  lines 293-396
- Current fixes: `CONTACT_CONTEXT_FIXES.md` 
- Voice note repo: `repos/SupabaseVoiceNotesRepo.ts` 
- Interactions repo: `repos/InteractionsRepo.ts` 


## Status


❌ **INCOMPLETE** - Voice notes missing from Recent Interactions timeline


**Next Step**: Implement backend auto-interaction creation (30 min fix)
