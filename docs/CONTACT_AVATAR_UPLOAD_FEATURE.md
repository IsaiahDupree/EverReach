# Contact Avatar Upload Feature

**Date:** November 1, 2025  
**Status:** 🚧 In Progress  
**Branch:** `e2e`

---

## 🎯 Overview

Enable users to manually upload avatar images for contacts, reusing the proven upload pattern from `IMAGE_URL_FIX.md`.

---

## ✅ Current State

### **Working:**
- ✅ Avatar display in `Avatar` component
- ✅ Avatar import from phone contacts (automatic)
- ✅ Supabase storage upload pattern documented (IMAGE_URL_FIX.md)
- ✅ Profile picture upload UI (personal-profile.tsx) - reference implementation

### **Missing:**
- ❌ Manual avatar upload for contacts
- ❌ Camera button overlay on contact avatar
- ❌ Upload handler with 3-step process
- ❌ Update contact record with new avatar URL

---

## 🔧 Implementation Plan

### 1. **File to Modify**
`app/contact/[id].tsx` - Contact detail screen

### 2. **Required Imports** (✅ Added)
```typescript
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
```

### 3. **State Management** (✅ Added)
```typescript
const [uploadingAvatar, setUploadingAvatar] = useState(false);
```

### 4. **Upload Handler** (🚧 TODO)
```typescript
const handleUploadAvatar = async () => {
  try {
    setUploadingAvatar(true);
    
    // Step 1: Pick image
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],  // Square crop
      quality: 0.8,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    
    // Step 2: Get presigned URL
    const path = `contacts/${id}/avatar-${Date.now()}.jpg`;
    const signResponse = await apiFetch('/api/v1/files', {
      method: 'POST',
      requireAuth: true,
      body: JSON.stringify({
        path,
        contentType: 'image/jpeg',
      }),
    });

    if (!signResponse.ok) {
      throw new Error('Failed to get upload URL');
    }

    const { url: presignedUrl } = await signResponse.json();

    // Step 3: Upload to storage
    const blob = await fetch(asset.uri).then(r => r.blob());
    const uploadResponse = await fetch(presignedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/jpeg' },
      body: blob,
    });

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload image');
    }

    // Step 4: Construct public URL (NOT presigned URL!)
    const publicUrl = `https://uepnwxxyxvmeibtnwwmh.supabase.co/storage/v1/object/public/media-assets/${path}`;
    console.log('[ContactDetail] Avatar uploaded:', publicUrl);

    // Step 5: Update contact record
    const updateResponse = await apiFetch(`/api/v1/contacts/${id}`, {
      method: 'PATCH',
      requireAuth: true,
      body: JSON.stringify({
        avatar_url: publicUrl,
      }),
    });

    if (!updateResponse.ok) {
      throw new Error('Failed to update contact');
    }

    // Step 6: Refresh data
    await refetchAll();
    
    Alert.alert('Success', 'Avatar updated successfully!');
    
    // Track analytics
    screenAnalytics.track('contact_avatar_uploaded', {
      contactId: id,
      hasAvatar: true,
    });

  } catch (error) {
    console.error('[ContactDetail] Avatar upload error:', error);
    Alert.alert('Error', 'Failed to upload avatar. Please try again.');
    analytics.errors.occurred(error as Error, 'ContactDetail');
  } finally {
    setUploadingAvatar(false);
  }
};
```

### 5. **UI Changes** (🚧 TODO)

**Add camera button overlay on avatar:**

```tsx
<View style={styles.avatarContainer}>
  <Avatar 
    name={contact.display_name}
    avatarUrl={contact.avatar_url}
    size={80}
    warmthColor={warmth.color}
    borderWidth={4}
  />
  <TouchableOpacity 
    style={styles.avatarCameraButton}
    onPress={handleUploadAvatar}
    disabled={uploadingAvatar}
  >
    {uploadingAvatar ? (
      <ActivityIndicator size="small" color="#FFFFFF" />
    ) : (
      <Camera size={16} color="#FFFFFF" />
    )}
  </TouchableOpacity>
</View>
```

### 6. **Styles** (🚧 TODO)

```typescript
avatarContainer: {
  position: 'relative',
  marginBottom: 12,
},
avatarCameraButton: {
  position: 'absolute',
  bottom: 0,
  right: 0,
  width: 32,
  height: 32,
  borderRadius: 16,
  backgroundColor: '#000000',
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 2,
  borderColor: '#FFFFFF',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.25,
  shadowRadius: 4,
  elevation: 5,
},
```

---

## 🔑 Key Principles (from IMAGE_URL_FIX.md)

### ✅ DO:
1. **Save the storage path** in database: `contacts/{id}/avatar-{timestamp}.jpg`
2. **Construct public URL** for display: `https://{project}.supabase.co/storage/v1/object/public/media-assets/{path}`
3. **Use presigned URL only** for uploading (Step 2 → Step 3)

### ❌ DON'T:
1. **Don't save presigned URLs** - they expire!
2. **Don't save upload URLs** - they're for uploading only
3. **Don't hardcode project IDs** - use env vars if possible

---

## 🔄 Upload Flow Diagram

```
User Taps Camera Button
         ↓
1. ImagePicker.launchImageLibraryAsync()
   → User selects image
   → Image cropped to 1:1 aspect ratio
         ↓
2. POST /api/v1/files { path, contentType }
   → Backend generates presigned URL
   → Returns: { url: "...upload/sign/..." }
         ↓
3. PUT {presignedUrl} with blob
   → Upload image to Supabase Storage
   → Image saved in media-assets bucket
         ↓
4. Construct public URL from path
   → publicUrl = base + path
         ↓
5. PATCH /api/v1/contacts/{id} { avatar_url: publicUrl }
   → Save public URL to contact record
         ↓
6. refetchAll()
   → UI updates with new avatar
```

---

## 📊 Backend Requirements

### Existing Endpoints (✅ Already Working)

**POST /api/v1/files**
- Generates presigned upload URL
- Input: `{ path, contentType }`
- Output: `{ url: presignedUrl }`

**PATCH /api/v1/contacts/{id}**
- Updates contact fields
- Input: `{ avatar_url: string }`
- Output: Updated contact object

### Storage Bucket
- **Bucket:** `media-assets`
- **Path format:** `contacts/{contactId}/avatar-{timestamp}.jpg`
- **Permissions:** Public read, authenticated write

---

## 🧪 Testing Checklist

### Manual Upload
- [ ] Camera button appears on avatar
- [ ] Tapping button opens image picker
- [ ] Selected image preview shows
- [ ] Image crops to square (1:1)
- [ ] Upload progress indicator shows
- [ ] Success message displays
- [ ] Avatar updates immediately
- [ ] New avatar persists after refresh

### URL Validation
- [ ] Saved URL is public storage URL (not presigned)
- [ ] URL format: `https://.../public/media-assets/contacts/...`
- [ ] Image loads correctly from storage
- [ ] Image accessible without authentication

### Error Handling
- [ ] Permission denied → Shows error alert
- [ ] Upload canceled → No error, no change
- [ ] Network failure → Shows error alert
- [ ] Large image → Compresses to 0.8 quality
- [ ] Invalid format → Shows error alert

### Edge Cases
- [ ] Rapid successive uploads → Debounced
- [ ] Contact deleted → Upload aborts
- [ ] Offline → Shows network error
- [ ] Slow network → Shows loading state

---

## 🎨 UI/UX Considerations

### Design Patterns
- **Camera Button:** Similar to profile picture upload
- **Loading State:** ActivityIndicator replaces camera icon
- **Success Feedback:** Alert + immediate UI update
- **Error Feedback:** Alert with retry option

### Accessibility
- `accessibilityLabel="Upload avatar photo"`
- `accessibilityHint="Opens your photo library to select a new avatar"`
- `accessibilityRole="button"`

---

## 📈 Analytics Events

```typescript
// On successful upload
screenAnalytics.track('contact_avatar_uploaded', {
  contactId: id,
  hasAvatar: true,
  uploadDuration: Date.now() - startTime,
});

// On error
analytics.errors.occurred(error, 'ContactDetail', {
  action: 'avatar_upload',
  contactId: id,
});
```

---

## 🚀 Future Enhancements

### Short Term
- [ ] Image compression optimization
- [ ] Thumbnail generation (multiple sizes)
- [ ] Avatar cropping interface improvements
- [ ] Upload progress percentage

### Long Term
- [ ] Batch avatar upload (multiple contacts)
- [ ] Avatar from camera (not just library)
- [ ] Avatar from URL/web
- [ ] AI-generated avatars
- [ ] Avatar history/versioning

---

## 📝 Related Files

- `app/contact/[id].tsx` - Contact detail screen (target file)
- `app/personal-profile.tsx` - Profile picture upload (reference)
- `docs/IMAGE_URL_FIX.md` - Upload pattern documentation
- `docs/PERSONAL_PROFILE_FEATURE.md` - Profile picture feature docs
- `components/Avatar.tsx` - Avatar display component
- `lib/imageUpload.ts` - Image upload utilities

---

## 🔗 Dependencies

- `expo-image-picker` - Already installed ✅
- Supabase Storage - Already configured ✅
- `/api/v1/files` endpoint - Already working ✅
- `/api/v1/contacts/{id}` PATCH - Already working ✅

---

## ⚠️ Important Notes

### From IMAGE_URL_FIX.md:
> **Never save presigned URLs to the database**  
> **Always save the storage path**  
> **Construct public URLs when displaying**

### Storage Path Convention:
```
contacts/{contactId}/avatar-{timestamp}.jpg
```

### Public URL Format:
```
https://uepnwxxyxvmeibtnwwmh.supabase.co/storage/v1/object/public/media-assets/{path}
```

---

**Status:** 🚧 Ready for implementation  
**Next Step:** Implement upload handler and UI changes in `app/contact/[id].tsx`  
**Estimated Time:** 30-45 minutes
