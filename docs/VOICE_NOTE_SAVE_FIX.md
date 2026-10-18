# Voice Note Save Fix

**Date:** November 1, 2025  
**Issue:** Voice notes failing to save with error "For type=text, body_text is required. For type=voice, file_url is required."

---

## Problem

The backend `/api/v1/me/persona-notes` endpoint has strict requirements:
- **type=text** requires `body_text` field
- **type=voice** requires `file_url` field (NOT `body_text`)

The frontend code had fallback logic that would send `body_text` when `file_url` was missing, causing the backend to reject voice note creation with a 400 error.

### Error Message
```
Create failed: 400 {"error":"[\n  {\n    \"code\":\"custom\",\n
\"message\":\"For type=text, body_text is required. For type=voice, 
file_url is required.\",\n    \"path\": []\n  }\n]"}
```

---

## Root Cause

**File:** `repos/SupabaseVoiceNotesRepo.ts`

**Before (INCORRECT):**
```typescript
const payload: any = {
  type: 'voice',
  transcription: note.transcription,
  linked_contacts: note.personId ? [note.personId] : [],
};

// ❌ WRONG: Fallback to body_text when no file_url
if (hasValidUrl) {
  payload.file_url = audioUrl;
} else if (note.transcription) {
  payload.body_text = note.transcription;  // Backend rejects this!
} else {
  payload.body_text = '(Voice note - transcription pending)';  // Backend rejects this!
}
```

This violated the backend requirement that `type=voice` MUST have `file_url`, not `body_text`.

---

## Solution

### 1. Require Audio Upload
Make audio upload mandatory - fail fast if upload fails:

```typescript
// Step 1: Upload audio to Supabase Storage (REQUIRED)
let audioUrl: string | null = null;

if (note.audioBlob || note.audioFile) {
  audioUrl = await this.uploadAudio(note.audioBlob || note.audioFile!);
  
  if (!audioUrl) {
    throw new Error('Audio upload to Supabase Storage failed. Cannot create voice note without audio file.');
  }
} else if (note.audioUri && note.audioUri.startsWith('http')) {
  // Use existing HTTP/HTTPS URL if provided
  audioUrl = note.audioUri;
} else {
  throw new Error('No audio file provided. Voice notes require either audioBlob, audioFile, or valid audioUri.');
}
```

### 2. Always Send file_url for type=voice
Remove fallback to `body_text`:

```typescript
// Backend requires file_url for type=voice (cannot use body_text)
const hasValidUrl = audioUrl && audioUrl.startsWith('http');

if (!hasValidUrl) {
  throw new Error('Cannot create voice note without valid audio URL.');
}

const payload: any = {
  type: 'voice',
  file_url: audioUrl,  // ✅ REQUIRED for type=voice
  transcription: note.transcription,
  contact_id: note.personId,  // ✅ Use contact_id (not linked_contacts)
};
```

### 3. Fix Field Names
Updated to match backend schema:
- `linked_contacts` → `contact_id` (single ID, not array)
- `audio_url` → `file_url` (in response mapping)
- `person_id` → `contact_id` (in mapping)

### 4. Update Response Mapping
```typescript
function mapBackendNoteToVoiceNote(backendNote: any): VoiceNote {
  return {
    id: backendNote.id,
    personId: backendNote.contact_id || backendNote.person_id,  // ✅ Check both
    transcription: backendNote.transcription || backendNote.transcript || '',
    audioUri: backendNote.file_url || backendNote.audio_url || '',  // ✅ file_url first
    createdAt: backendNote.created_at 
      ? new Date(backendNote.created_at).getTime() 
      : (backendNote.createdAt || Date.now()),
    processed: backendNote.processed ?? (backendNote.transcription ? true : false),
  };
}
```

---

## Changes Made

**File:** `repos/SupabaseVoiceNotesRepo.ts`

### Change 1: Make Upload Mandatory (Lines 98-116)
- Changed from optional upload with fallback to required upload
- Throw clear error if upload fails
- Accept existing HTTP/HTTPS URLs as fallback

### Change 2: Remove body_text Fallback (Lines 118-128)
- Always require `file_url` for `type=voice`
- Use `contact_id` instead of `linked_contacts`
- Remove dangerous fallback to `body_text`

### Change 3: Fix Response Mapping (Lines 307-318)
- Map `file_url` to `audioUri` (check `file_url` first)
- Map `contact_id` to `personId` (check `contact_id` first)
- Add fallbacks for backward compatibility

---

## Testing

### Success Path
1. User records voice note
2. Audio uploads to Supabase Storage → gets `https://...` URL
3. Backend receives:
   ```json
   {
     "type": "voice",
     "file_url": "https://uepnwxxyxvmeibtnwwmh.supabase.co/storage/v1/object/public/media-assets/voice-notes/...",
     "transcription": "...",
     "contact_id": "uuid"
   }
   ```
4. Backend accepts and creates voice note ✅

### Error Handling
1. **Upload fails** → Clear error: "Audio upload to Supabase Storage failed"
2. **No audio provided** → Clear error: "No audio file provided. Voice notes require..."
3. **Invalid URL** → Clear error: "Cannot create voice note without valid audio URL"

All errors now fail fast with actionable messages.

---

## Backend Requirements (Confirmed)

From error message and tests:

```typescript
// POST /api/v1/me/persona-notes

// For type=text:
{
  type: "text",
  body_text: "..." // REQUIRED
}

// For type=voice:
{
  type: "voice",
  file_url: "https://..." // REQUIRED (not body_text!)
  transcription: "..."     // OPTIONAL
  contact_id: "uuid"       // OPTIONAL
}
```

---

## Summary

**Before:** Voice notes failed with 400 error because `body_text` was sent instead of `file_url`  
**After:** Voice notes require audio upload and always send `file_url` ✅

**Impact:** Users can now save voice notes to contacts successfully!

---

## Related Files

- `repos/SupabaseVoiceNotesRepo.ts` - Main fix
- `repos/VoiceNotesRepo.ts` - Delegates to Supabase repo
- `providers/VoiceNotesProvider.tsx` - Uses repo to save notes
- `app/voice-note.tsx` - Voice recording UI

---

## Verification

Check console logs:
```
[SupabaseVoiceNotesRepo] Creating voice note
[SupabaseVoiceNotesRepo] Uploading audio to Supabase Storage...
[SupabaseVoiceNotesRepo] Upload successful: https://...
[SupabaseVoiceNotesRepo] Voice note created with ID: uuid
```

If you see: "Voice note created with ID", it worked! ✅
