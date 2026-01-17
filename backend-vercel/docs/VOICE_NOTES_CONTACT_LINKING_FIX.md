# Voice Notes Contact Linking - Backend Fix

**Date**: November 7, 2025  
**Issue**: Voice notes with `contact_id` not displaying on contact-specific pages  
**Status**: ✅ Fixed

---

## 🔍 Problem Summary

Voice notes created with a `contact_id` were not appearing on contact-specific pages in the mobile app because the backend was **not returning the `contact_id` field** in API responses.

### Root Cause

The `persona_notes` API endpoints were missing `contact_id` in their SELECT queries, even though:
- ✅ Database column `persona_notes.contact_id` exists
- ✅ Frontend was sending `contact_id` correctly on creation
- ✅ Frontend mapper was checking for `contact_id` in responses
- ❌ Backend was NOT including `contact_id` in SELECT queries

---

## 🔧 Fix Applied

### Files Modified

**1. `/app/api/v1/me/persona-notes/route.ts`**

**GET endpoint** (list all notes):
```typescript
// BEFORE (Line 26)
.select('id, type, status, title, body_text, file_url, duration_sec, transcript, tags, linked_contacts, created_at, updated_at')

// AFTER
.select('id, type, status, title, body_text, file_url, duration_sec, transcript, tags, linked_contacts, contact_id, created_at, updated_at')
```

**POST endpoint** (create note):
```typescript
// BEFORE (Line 70)
.select('id, type, title, created_at')

// AFTER
.select('id, type, title, contact_id, created_at')
```

**2. `/app/api/v1/me/persona-notes/[id]/route.ts`**

**GET endpoint** (get individual note):
```typescript
// BEFORE (Line 18)
.select('id, type, title, body_text, file_url, duration_sec, transcript, tags, created_at, updated_at')

// AFTER
.select('id, type, title, body_text, file_url, duration_sec, transcript, tags, contact_id, created_at, updated_at')
```

---

## ✅ What This Fixes

### Before Fix

**API Response** (missing `contact_id`):
```json
{
  "id": "ab75a483-6ce0-45be-af73-a423bbf5d01f",
  "type": "voice",
  "file_url": "https://...voice-notes/1762488651700.m4a",
  "transcript": "Hello there.",
  "linked_contacts": null,
  "created_at": "2025-11-07T04:10:53.343863+00:00"
  // ❌ NO contact_id field!
}
```

**Frontend Result**:
- `personId` becomes `undefined`
- Voice note doesn't appear on contact page
- Filter `voiceNotes.filter(vn => vn.personId === contactId)` returns empty

### After Fix

**API Response** (includes `contact_id`):
```json
{
  "id": "ab75a483-6ce0-45be-af73-a423bbf5d01f",
  "type": "voice",
  "file_url": "https://...voice-notes/1762488651700.m4a",
  "transcript": "Hello there.",
  "contact_id": "6d115bd9-de07-4db3-8728-75ec3834b166",  // ✅ NOW PRESENT
  "linked_contacts": null,
  "created_at": "2025-11-07T04:10:53.343863+00:00"
}
```

**Frontend Result**:
- ✅ `personId` correctly populated from `contact_id`
- ✅ Voice note appears on contact page
- ✅ Filter works correctly
- ✅ Contact name displayed on personal notes page

---

## 🎯 Expected Behavior (After Deploy)

### Personal Notes Page
```
✅ Shows ALL voice notes (personal + contact-linked)
✅ Displays contact name for linked notes
✅ Audio playback works
✅ Sorted by creation date
```

### Contact Context Page - Notes Tab
```
✅ Shows ONLY voice notes for this specific contact
✅ Shows text notes for this contact
✅ Filtered correctly by contact_id
✅ Audio playback works
✅ Sorted by creation date (newest first)
```

---

## 📋 Testing Checklist

After deployment, verify:

- [ ] **Create voice note with contact**
  - Record voice note
  - Link to specific contact
  - Verify API response includes `contact_id`

- [ ] **Personal Notes Page**
  - Open `/personal-notes`
  - Verify ALL voice notes appear
  - Verify contact name shown for linked notes
  - Test audio playback

- [ ] **Contact Page**
  - Open `/contact-context/[id]`
  - Go to Notes tab
  - Verify voice notes for THIS contact appear
  - Verify voice notes for OTHER contacts don't appear
  - Test audio playback

- [ ] **Filtering**
  - Create notes for Contact A
  - Create notes for Contact B
  - Verify Contact A page only shows Contact A notes
  - Verify Contact B page only shows Contact B notes

---

## 🔄 Frontend Integration

**No frontend changes needed!** The frontend code was already correct:

### Mapper Already Handles This

```typescript
// repos/SupabaseVoiceNotesRepo.ts
function mapBackendNoteToVoiceNote(backendNote: any): VoiceNote {
  return {
    id: backendNote.id,
    personId: backendNote.contact_id || backendNote.person_id,  // ✅ Already checks contact_id
    transcription: backendNote.transcription || backendNote.transcript || '',
    audioUri: backendNote.file_url || backendNote.audio_url || '',
    createdAt: new Date(backendNote.created_at).getTime(),
    processed: backendNote.processed ?? (backendNote.transcription ? true : false),
  };
}
```

### Filtering Already Implemented

```typescript
// app/contact-context/[id].tsx (Notes tab)
const voiceNotesForPerson = allVoiceNotes.filter(vn => vn.personId === id);  // ✅ Already filters
```

Everything just works once backend returns `contact_id`!

---

## 📊 API Endpoints Affected

All three persona-notes endpoints now correctly return `contact_id`:

1. **GET /v1/me/persona-notes** - List all notes
2. **POST /v1/me/persona-notes** - Create note (response)
3. **GET /v1/me/persona-notes/:id** - Get specific note

---

## 🚀 Deployment

**Files Changed**: 2 files
- `app/api/v1/me/persona-notes/route.ts`
- `app/api/v1/me/persona-notes/[id]/route.ts`

**Database Changes**: None (column already exists)

**Migration Required**: No

**Breaking Changes**: No (additive only)

**Deploy Steps**:
1. Push code to `feat/dev-dashboard`
2. Deploy to Vercel
3. Test with mobile app

---

## 🎉 Impact

### User Benefits
- ✅ Voice notes now appear on contact pages
- ✅ Can review all notes for a specific contact
- ✅ Better context when viewing contact details
- ✅ Organized note management

### Developer Benefits
- ✅ Consistent API responses
- ✅ No frontend changes needed
- ✅ Simple backend fix
- ✅ No migration complexity

---

**Fixed By**: Backend API enhancement  
**Frontend Changes**: None required (already compatible)  
**Status**: ✅ Ready for deployment
