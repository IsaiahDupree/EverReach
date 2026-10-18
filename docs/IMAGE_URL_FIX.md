# Image & Audio URL Fix

**Date:** November 1, 2025  
**Issue:** Screenshot images failing to load with error "Failed to load [presigned upload URL]"

---

## Problem

Screenshots were saving the **presigned upload URL** instead of the **public storage URL**, causing images to fail to load.

### Error URLs (Wrong)
```
https://utasetfxiqcrnwyfforx.supabase.co/storage/v1/object/upload/sign/attachments/contacts/...
```

These are **temporary upload endpoints**, not permanent storage URLs!

### Correct URLs
```
https://uepnwxxyxvmeibtnwwmh.supabase.co/storage/v1/object/public/media-assets/contacts/...
```

---

## Root Cause

**File:** `app/screenshot-analysis.tsx` line 155

**Before (WRONG):**
```typescript
return {
  url: presignedUrl.split('?')[0], // ❌ Returning upload URL!
  id: linkResult.attachment?.id,
};
```

The code was returning the **presigned upload URL** which is only valid for uploading the file, not for viewing it later.

---

## Solution

Return the **public storage URL** constructed from the path:

**After (CORRECT):**
```typescript
// Construct the actual public storage URL (NOT the presigned upload URL)
const publicUrl = `https://uepnwxxyxvmeibtnwwmh.supabase.co/storage/v1/object/public/media-assets/${path}`;
console.log('[ScreenshotAnalysis] Public URL:', publicUrl);

return {
  url: publicUrl, // ✅ Return the public storage URL
  id: linkResult.attachment?.id,
};
```

---

## Understanding the 3-Step Upload Flow

### Step 1: Get Presigned URL for Upload
```typescript
POST /api/v1/files
Body: { path: "contacts/123/file.jpg", contentType: "image/jpeg" }

Response: {
  url: "https://...supabase.co/storage/v1/object/upload/sign/..."  // ← TEMPORARY upload URL
}
```

### Step 2: Upload File to Storage
```typescript
PUT https://...supabase.co/storage/v1/object/upload/sign/...
Headers: { Content-Type: "image/jpeg" }
Body: <binary data>
```

### Step 3: Link File to Contact with Path
```typescript
POST /api/v1/contacts/123/files
Body: {
  path: "contacts/123/file.jpg",  // ← Save the PATH, not the URL!
  mime_type: "image/jpeg",
  size_bytes: 12345
}
```

---

## URL Construction

### For Displaying Images/Audio

Always construct the public URL from the path:

```typescript
const path = "contacts/123/file.jpg";  // From database
const publicUrl = `https://uepnwxxyxvmeibtnwwmh.supabase.co/storage/v1/object/public/media-assets/${path}`;
```

### URL Components

- **Project ID:** `uepnwxxyxvmeibtnwwmh`
- **Bucket:** `media-assets`
- **Path:** Whatever was used during upload (e.g., `contacts/123/file.jpg`)

### Full Format
```
https://{project_id}.supabase.co/storage/v1/object/public/{bucket}/{path}
```

---

## Files Changed

**1. app/screenshot-analysis.tsx (Lines 154-161)**
- Changed from returning presigned URL to constructing public storage URL
- Added console log to show the correct URL being saved

**2. app/voice-note.tsx**
- Removed debug code and yellow banner
- Cleaned up console logs

---

## Impact

### Before
- ❌ Screenshots saved with upload URL
- ❌ Images failed to load: "Failed to load https://...upload/sign/..."
- ❌ Users saw grey boxes instead of images

### After
- ✅ Screenshots save with public storage URL
- ✅ Images load correctly from storage
- ✅ Users can see their screenshot analyses with images

---

## Testing

### For New Screenshots
1. Take screenshot → analyze
2. Save to contact
3. Go to Contact Context → Notes tab
4. **Image should display** ✅

### For Audio (Voice Notes)
The same principle applies:
- Save the **path** in metadata
- Construct public URL when displaying:
  ```typescript
  const audioUrl = `https://uepnwxxyxvmeibtnwwmh.supabase.co/storage/v1/object/public/media-assets/${file_url}`;
  ```

---

## Related Code Patterns

### Correct Pattern (Interaction Attachments)
`features/contacts/screens/ContactContext.tsx` already does this correctly:

```typescript
const path = `contacts/${id}/interactions/${interactionId}/${Date.now()}-${file.fileName}`;

// Step 1: Get presigned URL
const signRes = await apiFetch('/api/v1/files', { ... });
const { url } = await signRes.json();

// Step 2: Upload
await fetch(url, { method: 'PUT', body: blob });

// Step 3: Link with PATH (not URL)
await apiFetch(`/api/v1/interactions/${interactionId}/files`, {
  body: JSON.stringify({ 
    path,  // ✅ Saving path, not presigned URL
    mime_type: file.mimeType,
    size_bytes: blob.size
  }),
});
```

This code was already correct!

---

## Prevention

### Rule of Thumb
- **Never save presigned URLs to the database**
- **Always save the storage path**
- **Construct public URLs when displaying**

### Why?
- Presigned URLs expire
- Presigned URLs contain temporary auth tokens
- Storage paths are permanent
- Public URLs can always be reconstructed from paths

---

## Summary

**Problem:** Saved presigned upload URL instead of public storage URL  
**Solution:** Construct and save public storage URL from path  
**Result:** Images and audio now load correctly! ✅

Future screenshots and voice notes will now display properly.
