# Screenshot Display & Deletion Fix

**Date:** October 31, 2025  
**Issue:** Screenshots not displaying on Contact Context Notes tab + no file cleanup on deletion

---

## Problem Diagnosis

### Root Cause
The screenshot `file_url` was being saved in note metadata, but the metadata field was being **stripped out** at two points in the data flow:

1. **ContactsRepo.ts** - Type casting stripped metadata
2. **ContactContext component** - Note mapping didn't include metadata

This caused screenshots to be uploaded and saved, but not displayed because the `file_url` was lost.

---

## Solutions Implemented

### 1. Fixed Metadata Preservation in ContactsRepo

**File:** `repos/ContactsRepo.ts`

**Changes:**
- Updated `ContactBundle` type to include `metadata?: any` field
- Changed notes parsing from type casting to explicit mapping:

```typescript
// BEFORE (stripped metadata)
const notes = (notesJson?.items || notesJson?.notes || []) as Array<{ ... }>;

// AFTER (preserves metadata)
const notes = (notesJson?.items || notesJson?.notes || []).map((n: any) => ({
  id: n.id,
  content: n.content,
  created_at: n.created_at,
  createdAt: n.createdAt,
  person_id: n.person_id,
  metadata: n.metadata, // ← CRITICAL FIX
}));
```

---

### 2. Fixed Metadata Preservation in ContactContext

**File:** `app/contact-context/[id].tsx`

**Changes:**
- Added `metadata` field to note mapping from bundle data:

```typescript
const bn = (b.notes || []).map((n: any) => ({
  id: n.id,
  content: n.content,
  createdAt: n.created_at ? Date.parse(n.created_at) : (n.createdAt || Date.now()),
  personId: (n as any).person_id,
  metadata: n.metadata, // ← CRITICAL FIX
}));
```

---

### 3. Added Storage URL Helper Function

**File:** `app/contact-context/[id].tsx`

**Purpose:** Convert storage paths to full URLs for display

```typescript
const getFullStorageUrl = (pathOrUrl: string): string => {
  if (!pathOrUrl) return '';
  // If already a full URL, return as-is
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    return pathOrUrl;
  }
  // Otherwise, construct full Supabase storage URL
  return `https://uepnwxxyxvmeibtnwwmh.supabase.co/storage/v1/object/public/media-assets/${pathOrUrl}`;
};
```

**Used for:**
- Screenshot image URLs
- Voice note audio URLs

---

### 4. Improved Screenshot Detection

**File:** `app/contact-context/[id].tsx`

**Changes:**
- Made detection more lenient - checks metadata type OR content:

```typescript
const isScreenshotNote = content?.includes('📸 Screenshot Analysis') || 
                        noteMetadata?.type === 'screenshot_analysis';
const hasScreenshot = !!screenshotPath && isScreenshotNote;
```

---

### 5. Added File Deletion on Note Deletion

**File:** `app/contact-context/[id].tsx`

**Feature:** When deleting a screenshot analysis note, also delete the associated image file

```typescript
// Check if note has associated file (screenshot)
const noteMetadata = (note as any).metadata;
const hasFile = noteMetadata?.file_url && noteMetadata?.file_id;

if (hasFile) {
  console.log('[ContactContext] Note has associated file, deleting:', noteMetadata.file_id);
  try {
    // Delete the file from storage via backend
    const deleteFileResponse = await apiFetch(`/api/v1/files/${noteMetadata.file_id}`, {
      method: 'DELETE',
      requireAuth: true,
    });
    
    if (deleteFileResponse.ok) {
      console.log('[ContactContext] Associated file deleted successfully');
    }
  } catch (fileError) {
    console.error('[ContactContext] Error deleting associated file:', fileError);
    // Continue with note deletion even if file deletion fails
  }
}
```

**Benefits:**
- Prevents orphaned files in storage
- Saves storage space
- Maintains data consistency

---

### 6. Added Comprehensive Debug Logging

**File:** `app/contact-context/[id].tsx`

**Purpose:** Help diagnose screenshot display issues

```typescript
console.log('[ContactContext] Note data:', {
  noteId: noteData.id,
  contentPreview: content?.substring(0, 50),
  hasMetadata: !!noteMetadata,
  metadataType: noteMetadata?.type,
  metadataFileUrl: noteMetadata?.file_url,
  screenshotPath,
  isScreenshotNote,
  hasScreenshot,
  screenshotUrl,
});
```

---

## How It Works Now

### Screenshot Display Flow

1. **User saves screenshot analysis**
   - Screenshot uploaded to Supabase storage
   - Note created with metadata: `{ type: 'screenshot_analysis', file_url: 'path', file_id: 'uuid' }`

2. **Backend returns note with metadata**
   - `/api/v1/contacts/:id/notes` returns full note including metadata

3. **ContactsRepo preserves metadata**
   - Explicitly maps `metadata` field from backend response

4. **ContactContext preserves metadata**
   - Includes `metadata` when mapping bundle notes to state

5. **Note rendering detects screenshot**
   - Checks for `file_url` in metadata AND screenshot indicator in content
   - Constructs full URL: `https://...supabase.co/storage/v1/object/public/media-assets/[path]`
   - Renders `<Image>` component with full URL

6. **User sees screenshot inline**
   - Image displays in note card
   - Tap to open full-screen
   - Pinch to zoom

### Screenshot Deletion Flow

1. **User taps delete icon on screenshot note**
2. **Confirmation dialog**
3. **If confirmed:**
   - Check for `metadata.file_id`
   - DELETE `/api/v1/files/:id` to remove file from storage
   - Delete note from backend
   - Update local state
   - File and note both removed

---

## Files Modified

1. ✅ `repos/ContactsRepo.ts`
   - Updated `ContactBundle` type
   - Changed notes mapping to preserve metadata

2. ✅ `app/contact-context/[id].tsx`
   - Added `getFullStorageUrl()` helper
   - Preserved metadata in note mapping
   - Improved screenshot detection
   - Added file deletion on note deletion
   - Added comprehensive logging
   - Used helper for audio URLs

---

## Testing Checklist

### Screenshot Display
- [ ] Take screenshot → analyze → save to contact
- [ ] Navigate to Contact Context → Notes tab
- [ ] **Verify screenshot image displays inline**
- [ ] Tap screenshot → verify full-screen modal opens
- [ ] Tap X → verify modal closes
- [ ] Check console logs for metadata presence

### Screenshot Deletion
- [ ] Delete a screenshot analysis note
- [ ] Confirm deletion
- [ ] **Verify note AND file are both deleted**
- [ ] Check Supabase storage to confirm file removed
- [ ] Verify no orphaned files remain

### Voice Notes (bonus)
- [ ] Play voice note → verify playback works
- [ ] Verify progress bar animates
- [ ] Verify pause functionality
- [ ] Check console for audio URL construction

---

## Expected Console Output

When viewing a screenshot note:
```
[ContactContext] Note data: {
  noteId: "uuid-here",
  contentPreview: "📸 Screenshot Analysis\n\n🤖 AI Summary:\nThe im",
  hasMetadata: true,
  metadataType: "screenshot_analysis",
  metadataFileUrl: "contacts/uuid/1234567890-screenshot.jpg",
  screenshotPath: "contacts/uuid/1234567890-screenshot.jpg",
  isScreenshotNote: true,
  hasScreenshot: true,
  screenshotUrl: "https://uepnwxxyxvmeibtnwwmh.supabase.co/storage/v1/object/public/media-assets/contacts/uuid/1234567890-screenshot.jpg"
}
```

When deleting a screenshot note:
```
[ContactContext] Deleting note: uuid-here
[ContactContext] Note has associated file, deleting: file-uuid
[ContactContext] Associated file deleted successfully
[ContactContext] Note deleted successfully
```

---

## Backend Requirements

The fix assumes the backend:

1. **Returns metadata in notes:**
   - `GET /api/v1/contacts/:id/notes` includes `metadata` field

2. **Supports file deletion:**
   - `DELETE /api/v1/files/:id` endpoint exists and works

3. **Stores metadata correctly:**
   - When creating notes via `POST /api/v1/contacts/:id/notes`, metadata is saved

If any of these aren't working, the backend endpoints need to be verified.

---

## Summary

**Before:** Screenshots uploaded but not displayed, orphaned files on deletion  
**After:** Screenshots display inline with full-screen zoom, files cleaned up on deletion

**Impact:** Users can now see their screenshot analyses with the actual images, improving context and usability. Storage stays clean with proper file cleanup.
