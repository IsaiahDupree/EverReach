# Profile Pictures Guide

Complete guide for uploading, updating, and removing profile pictures for both users and contacts in the EverReach API.

---

## 📋 Overview

Profile pictures are supported for:
- **✅ Users** - Personal profile picture (via `/v1/me`)
- **✅ Contacts** - Contact avatar pictures (via `/v1/contacts/:id`)
- **✅ Files** - Upload to Supabase Storage, manage via `/v1/files`

---

## 👤 User Profile Pictures

### **Upload Flow (3 Steps)**

#### **Step 1: Get Presigned Upload URL**

```http
POST /api/v1/files
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "path": "users/{userId}/profile/avatar.png",
  "contentType": "image/png"
}
```

**Response:**
```json
{
  "url": "https://...supabase.co/storage/v1/object/sign/...",
  "path": "users/abc123/profile/avatar.png"
}
```

#### **Step 2: Upload Image to Storage**

```http
PUT {presigned_url}
Content-Type: image/png

[Binary image data]
```

#### **Step 3: Update User Profile**

```http
PATCH /api/v1/me
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "avatar_url": "users/abc123/profile/avatar.png"
}
```

**Response:**
```json
{
  "user": {
    "id": "abc123",
    "email": "user@example.com",
    "display_name": "John Doe",
    "avatar_url": "users/abc123/profile/avatar.png",
    "preferences": {}
  }
}
```

### **Remove Profile Picture**

Set `avatar_url` to `null`:

```http
PATCH /api/v1/me
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "avatar_url": null
}
```

### **Get Current Profile Picture**

```http
GET /api/v1/me
Authorization: Bearer YOUR_TOKEN
```

**Response:**
```json
{
  "user": {
    "id": "abc123",
    "email": "user@example.com",
    "display_name": "John Doe",
    "avatar_url": "users/abc123/profile/avatar.png",
    "preferences": {}
  }
}
```

---

## 👥 Contact Profile Pictures

### **Upload Flow (3 Steps)**

#### **Step 1: Get Presigned Upload URL**

```http
POST /api/v1/files
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "path": "users/{userId}/contacts/{contactId}/avatar.jpg",
  "contentType": "image/jpeg"
}
```

#### **Step 2: Upload Image to Storage**

```http
PUT {presigned_url}
Content-Type: image/jpeg

[Binary image data]
```

#### **Step 3: Update Contact**

```http
PATCH /api/v1/contacts/{contactId}
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "avatar_url": "users/abc123/contacts/contact123/avatar.jpg"
}
```

**Response:**
```json
{
  "contact": {
    "id": "contact123",
    "display_name": "Jane Smith",
    "avatar_url": "users/abc123/contacts/contact123/avatar.jpg",
    "emails": ["jane@example.com"],
    "phones": ["+1234567890"]
  }
}
```

### **Remove Contact Avatar**

```http
PATCH /api/v1/contacts/{contactId}
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "avatar_url": null
}
```

---

## 🗑️ Delete Uploaded Files

### **DELETE /v1/files/:id**

Permanently deletes a file from both Supabase Storage and the database.

```http
DELETE /api/v1/files/{fileId}
Authorization: Bearer YOUR_TOKEN
```

**Response:**
```json
{
  "success": true,
  "message": "File deleted successfully",
  "deleted_file_id": "file123"
}
```

**Features:**
- ✅ Deletes from Supabase Storage
- ✅ Deletes from `attachments` table
- ✅ Returns 404 if file doesn't exist
- ✅ Verifies user owns the file before deletion
- ✅ Continues with database deletion even if storage fails

**Important:** This does NOT automatically clear `avatar_url` from profiles or contacts. You must update those separately by setting `avatar_url: null`.

---

## 📁 Recommended File Paths

### **User Profile Pictures**
```
users/{userId}/profile/avatar.{ext}
users/{userId}/profile/avatar-thumb.{ext}
```

### **Contact Avatars**
```
users/{userId}/contacts/{contactId}/avatar.{ext}
users/{userId}/contacts/{contactId}/avatar-thumb.{ext}
```

### **Other Files**
```
users/{userId}/images/{filename}.{ext}
users/{userId}/audio/{filename}.{ext}
users/{userId}/documents/{filename}.{ext}
```

---

## 🎨 Supported Image Formats

| Format | MIME Type | Recommended |
|--------|-----------|-------------|
| PNG | `image/png` | ✅ Best quality |
| JPEG | `image/jpeg` | ✅ Smaller size |
| WebP | `image/webp` | ✅ Modern browsers |
| GIF | `image/gif` | ⚠️ Animated ok |
| SVG | `image/svg+xml` | ⚠️ Be careful with user uploads |

---

## 📐 Image Size Recommendations

### **Profile Pictures**
- **Recommended Size**: 400x400px
- **Max Size**: 2MB
- **Format**: PNG or JPEG
- **Aspect Ratio**: 1:1 (square)

### **Contact Avatars**
- **Recommended Size**: 200x200px
- **Max Size**: 1MB
- **Format**: PNG or JPEG
- **Aspect Ratio**: 1:1 (square)

### **Thumbnails**
- **Recommended Size**: 100x100px
- **Max Size**: 100KB
- **Format**: JPEG (for compression)

---

## 🔒 Security & Permissions

### **Row Level Security (RLS)**

All file operations enforce RLS policies:
- Users can only access their own files
- Files are scoped by `user_id`
- Presigned URLs expire after 1 hour

### **File Upload Limits**

- **Max file size**: 15MB (configurable via `MAX_UPLOAD_MB` env var)
- **Rate limiting**: 30 uploads per minute per user
- **Storage quota**: Based on subscription tier

---

## 💻 Code Examples

### **React Native (Full Flow)**

```typescript
import { uploadFile } from '@/lib/api';

async function uploadProfilePicture(imageUri: string) {
  try {
    // 1. Get presigned URL
    const response = await fetch(`${API_BASE}/api/v1/files`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path: `users/${userId}/profile/avatar.png`,
        contentType: 'image/png',
      }),
    });
    const { url, path } = await response.json();

    // 2. Upload to storage
    const file = await fetch(imageUri).then(r => r.blob());
    await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/png' },
      body: file,
    });

    // 3. Update profile
    const updateRes = await fetch(`${API_BASE}/api/v1/me`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ avatar_url: path }),
    });
    
    const { user } = await updateRes.json();
    console.log('Profile updated:', user.avatar_url);
    
    return user;
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
}
```

### **Remove Profile Picture**

```typescript
async function removeProfilePicture() {
  const response = await fetch(`${API_BASE}/api/v1/me`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ avatar_url: null }),
  });
  
  const { user } = await response.json();
  console.log('Avatar removed:', user.avatar_url); // null
}
```

### **Delete Old Avatar File**

```typescript
async function deleteAvatarFile(fileId: string) {
  const response = await fetch(`${API_BASE}/api/v1/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  if (response.ok) {
    console.log('File deleted from storage');
  }
}
```

### **React (Web)**

```typescript
import { useCallback } from 'react';

function useProfilePicture() {
  const uploadAvatar = useCallback(async (file: File) => {
    const userId = 'abc123'; // Get from auth context
    
    // 1. Get presigned URL
    const urlRes = await fetch('/api/v1/files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: `users/${userId}/profile/avatar.${file.name.split('.').pop()}`,
        contentType: file.type,
      }),
    });
    const { url, path } = await urlRes.json();

    // 2. Upload file
    await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    });

    // 3. Update profile
    const updateRes = await fetch('/api/v1/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatar_url: path }),
    });
    
    return await updateRes.json();
  }, []);

  const removeAvatar = useCallback(async () => {
    const res = await fetch('/api/v1/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatar_url: null }),
    });
    return await res.json();
  }, []);

  return { uploadAvatar, removeAvatar };
}
```

---

## 🧪 Testing

### **Test User Profile Picture Upload**

```bash
# 1. Create test image
echo "iVBORw0KGgo..." | base64 -d > test-avatar.png

# 2. Get presigned URL
curl -X POST "https://ever-reach-be.vercel.app/api/v1/files" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "path": "users/USER_ID/profile/avatar.png",
    "contentType": "image/png"
  }'

# 3. Upload image (use presigned URL from step 2)
curl -X PUT "PRESIGNED_URL" \
  -H "Content-Type: image/png" \
  --data-binary @test-avatar.png

# 4. Update profile
curl -X PATCH "https://ever-reach-be.vercel.app/api/v1/me" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "avatar_url": "users/USER_ID/profile/avatar.png"
  }'

# 5. Verify
curl "https://ever-reach-be.vercel.app/api/v1/me" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### **Test Profile Picture Removal**

```bash
# Remove avatar
curl -X PATCH "https://ever-reach-be.vercel.app/api/v1/me" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"avatar_url": null}'

# Verify removal
curl "https://ever-reach-be.vercel.app/api/v1/me" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  | jq '.user.avatar_url'  # Should be null
```

---

## 📊 Database Schema

### **`profiles` Table**

```sql
CREATE TABLE profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  display_name text,
  avatar_url text,  -- ← Profile picture path
  preferences jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for performance
CREATE INDEX profiles_avatar_url_idx 
ON profiles(avatar_url) 
WHERE avatar_url IS NOT NULL;
```

### **`contacts` Table**

```sql
CREATE TABLE contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  avatar_url text,  -- ← Contact avatar path
  emails text[],
  phones text[],
  company text,
  tags text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### **`attachments` Table**

```sql
CREATE TABLE attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

---

## ⚠️ Common Issues & Solutions

### **Issue: Presigned URL Expired**

**Error:** `403 Forbidden` when uploading

**Solution:** Presigned URLs expire after 1 hour. Generate a new one:
```typescript
// Regenerate presigned URL
const { url } = await getPresignedUrl(path, contentType);
```

### **Issue: File Not Appearing**

**Problem:** Avatar not showing after upload

**Solutions:**
1. ✅ Check if `avatar_url` is set in profile/contact
2. ✅ Verify file exists in Supabase Storage
3. ✅ Check file path matches `avatar_url` exactly
4. ✅ Ensure Storage bucket is public (for avatars)

```bash
# Verify in database
SELECT avatar_url FROM profiles WHERE user_id = 'abc123';

# Check Supabase Storage Dashboard
# Navigate to: Storage → attachments bucket → users/{userId}/profile/
```

### **Issue: "File not found" When Deleting**

**Error:** 404 on `DELETE /v1/files/:id`

**Causes:**
- File already deleted
- Wrong file ID
- File belongs to different user

**Solution:**
```typescript
// List user's files first
const files = await fetch('/api/v1/files?type=image');
const { files: fileList } = await files.json();
console.log('Available files:', fileList);
```

### **Issue: Image Too Large**

**Error:** Upload fails with 413 or timeout

**Solution:** Resize image before upload:
```typescript
import ImageResizer from 'react-native-image-resizer';

const resized = await ImageResizer.createResizedImage(
  imageUri,
  400,  // max width
  400,  // max height
  'JPEG',
  80,   // quality
  0,    // rotation
);
```

---

## ✅ Best Practices

1. **Resize Images Client-Side**
   - Resize to 400x400px before upload
   - Compress to reduce file size
   - Use JPEG for photos, PNG for logos

2. **Delete Old Avatars**
   - When uploading new avatar, delete old one from storage
   - Prevents storage bloat
   - Use `DELETE /v1/files/:id`

3. **Use Thumbnails**
   - Generate 100x100px thumbnail for lists
   - Store full-size for profile detail
   - Saves bandwidth

4. **Handle Upload Failures**
   - Show progress indicator
   - Allow retry on failure
   - Provide clear error messages

5. **Cache Avatar URLs**
   - Cache user profile in app state
   - Invalidate cache after avatar change
   - Use ETags for efficient caching

6. **Validate Image Type**
   - Check MIME type client-side
   - Only allow safe image formats
   - Reject executable files (SVG with scripts)

---

## 🔗 Related Documentation

- [Media CRUD Tests](../test/backend/MEDIA_CRUD_TESTS.md) - File upload testing
- [Delete Endpoints Guide](./DELETE_ENDPOINTS_GUIDE.md) - DELETE operations
- [Storage Setup](./STORAGE_SETUP.md) - Supabase Storage configuration
- [API Examples](./API_EXAMPLES.md) - More code examples

---

## 📈 API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/files` | POST | Get presigned upload URL |
| `/v1/files/:id` | GET | Get file details + download URL |
| `/v1/files/:id` | DELETE | Delete file from storage + DB |
| `/v1/me` | GET | Get user profile (includes avatar_url) |
| `/v1/me` | PATCH | Update user profile (set/remove avatar) |
| `/v1/contacts/:id` | GET | Get contact (includes avatar_url) |
| `/v1/contacts/:id` | PATCH | Update contact (set/remove avatar) |

---

**Base URL:** `https://ever-reach-be.vercel.app`  
**All endpoints require authentication**  
**Presigned URLs expire after 1 hour**  
**Max file size: 15MB (configurable)**

---

**Last Updated:** November 1, 2025  
**Version:** 1.0  
**Maintainer:** Backend Team
