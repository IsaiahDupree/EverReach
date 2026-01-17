# File Upload API

Modern presigned URL-based file upload system for secure, direct-to-storage uploads.

**Base Endpoints**: `/v1/files/sign`, `/v1/files/[id]/commit`

---

## Overview

The file upload system uses a two-step process:

1. **Sign**: Get a presigned URL from the server
2. **Upload**: Upload file directly to storage using the presigned URL
3. **Commit**: Notify server that upload is complete

This approach ensures:
- ✅ Secure uploads (signed URLs expire after 1 hour)
- ✅ No file data passes through your API server
- ✅ Direct uploads to Supabase Storage
- ✅ Progress tracking on client-side

---

## Step 1: Get Presigned URL

Request a signed upload URL from the server.

```http
POST /v1/files/sign
Content-Type: application/json
Authorization: Bearer {jwt}
```

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fileName` | string | ✅ Yes | Original file name (e.g., "profile.jpg") |
| `contentType` | string | No | MIME type (e.g., "image/jpeg") |
| `folder` | string | No | Storage folder (e.g., "screenshots", "voice-notes") |
| `isPublic` | boolean | No | Whether file is publicly accessible (default: true) |

### Example Request

```typescript
const response = await fetch('https://ever-reach-be.vercel.app/api/v1/files/sign', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${jwt}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    fileName: 'screenshot.png',
    contentType: 'image/png',
    folder: 'screenshots',
    isPublic: true
  })
});

const { uploadUrl, path, publicUrl, expiresIn } = await response.json();
```

### Response

```json
{
  "uploadUrl": "https://storage.supabase.co/...",
  "path": "screenshots/user-id/uuid.png",
  "publicUrl": "https://storage.supabase.co/public/...",
  "expiresIn": 3600,
  "contentType": "image/png"
}
```

---

## Step 2: Upload to Presigned URL

Upload the file directly to storage using the `uploadUrl` from step 1.

```http
PUT {uploadUrl}
Content-Type: {contentType}
Body: {file binary data}
```

### Example Upload

```typescript
// React Native / Expo
const formData = new FormData();
formData.append('file', {
  uri: fileUri,
  type: contentType,
  name: fileName
});

const uploadResponse = await fetch(uploadUrl, {
  method: 'PUT',
  body: formData
});

if (!uploadResponse.ok) {
  throw new Error('Upload failed');
}
```

### Example Upload (Web)

```typescript
// Web / Browser
const fileBlob = await fetch(fileUri).then(r => r.blob());

const uploadResponse = await fetch(uploadUrl, {
  method: 'PUT',
  headers: {
    'Content-Type': contentType
  },
  body: fileBlob
});

if (!uploadResponse.ok) {
  throw new Error('Upload failed');
}
```

---

## Step 3: Commit Upload

Notify the server that the upload is complete and create a database record.

```http
POST /v1/files/[id]/commit
Content-Type: application/json
Authorization: Bearer {jwt}
```

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `path` | string | ✅ Yes | Storage path (from sign response) |
| `contentType` | string | No | MIME type |
| `sizeBytes` | number | No | File size in bytes |
| `metadata` | object | No | Additional metadata |

### Example Request

```typescript
const fileId = 'file_123'; // Generate a unique ID

const commitResponse = await fetch(`https://ever-reach-be.vercel.app/api/v1/files/${fileId}/commit`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${jwt}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    path: path, // from sign response
    contentType: 'image/png',
    sizeBytes: 12345,
    metadata: {
      originalName: 'screenshot.png',
      uploadedAt: new Date().toISOString()
    }
  })
});

const { file } = await commitResponse.json();
```

### Response

```json
{
  "file": {
    "id": "file_123",
    "path": "screenshots/user-id/uuid.png",
    "url": "https://storage.supabase.co/public/...",
    "contentType": "image/png",
    "sizeBytes": 12345,
    "userId": "user_456",
    "createdAt": "2025-10-26T18:00:00Z"
  }
}
```

---

## Complete Upload Flow

```typescript
import { v4 as uuidv4 } from 'uuid';

async function uploadFile(file: File | { uri: string, type: string, name: string }) {
  // 1. Get presigned URL
  const signResponse = await fetch('/v1/files/sign', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type,
      folder: 'uploads',
      isPublic: true
    })
  });
  
  const { uploadUrl, path, publicUrl } = await signResponse.json();
  
  // 2. Upload to presigned URL
  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type
    },
    body: file // or fileBlob
  });
  
  if (!uploadResponse.ok) {
    throw new Error('Upload failed');
  }
  
  // 3. Commit the upload
  const fileId = uuidv4();
  const commitResponse = await fetch(`/v1/files/${fileId}/commit`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      path,
      contentType: file.type,
      sizeBytes: file.size,
    })
  });
  
  const { file: committedFile } = await commitResponse.json();
  
  console.log('File uploaded:', committedFile.url);
  return committedFile;
}
```

---

## React Native Example

```typescript
import * as ImagePicker from 'expo-image-picker';
import { v4 as uuidv4 } from 'uuid';

async function uploadScreenshot() {
  // Pick image
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
  });
  
  if (result.canceled) return;
  
  const asset = result.assets[0];
  
  // 1. Sign
  const signRes = await fetch('/v1/files/sign', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      fileName: `screenshot-${Date.now()}.jpg`,
      contentType: 'image/jpeg',
      folder: 'screenshots',
      isPublic: true
    })
  });
  
  const { uploadUrl, path } = await signRes.json();
  
  // 2. Upload
  const formData = new FormData();
  formData.append('file', {
    uri: asset.uri,
    type: 'image/jpeg',
    name: 'screenshot.jpg'
  } as any);
  
  await fetch(uploadUrl, {
    method: 'PUT',
    body: formData
  });
  
  // 3. Commit
  const fileId = uuidv4(); // Already imported above
  const commitRes = await fetch(`/v1/files/${fileId}/commit`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      path,
      contentType: 'image/jpeg',
      sizeBytes: asset.fileSize
    })
  });
  
  const { file } = await commitRes.json();
  console.log('Screenshot uploaded:', file.url);
  return file;
}
```

---

## Security

### Authentication
All endpoints require a valid JWT token in the Authorization header.

### Path Validation
- File paths are automatically scoped to the authenticated user
- Users cannot commit files that don't belong to them
- Path format: `{folder}/{userId}/{uuid}.{ext}`

### Expiration
- Presigned URLs expire after 1 hour (3600 seconds)
- Must complete upload before expiration
- Request a new URL if expired

---

## Error Handling

### Common Errors

**401 Unauthorized**
```json
{
  "error": "Unauthorized"
}
```
Solution: Include valid JWT token in Authorization header

**400 Bad Request**
```json
{
  "error": "Validation failed: fileName is required"
}
```
Solution: Check request body matches schema

**500 Server Error**
```json
{
  "error": "Failed to create signed upload URL"
}
```
Solution: Check Supabase Storage configuration

---

## Best Practices

### 1. Generate Unique File IDs
```typescript
import { v4 as uuidv4 } from 'uuid';

const fileId = uuidv4();
```

### 2. Organize by Folder
```typescript
const folders = {
  screenshots: 'screenshots',
  voiceNotes: 'voice-notes',
  avatars: 'avatars',
  documents: 'documents'
};
```

### 3. Track Upload Progress
```typescript
const xhr = new XMLHttpRequest();

xhr.upload.addEventListener('progress', (e) => {
  if (e.lengthComputable) {
    const percentComplete = (e.loaded / e.total) * 100;
    console.log(`Upload: ${percentComplete}%`);
  }
});

xhr.open('PUT', uploadUrl);
xhr.send(fileBlob);
```

### 4. Handle Upload Failures
```typescript
try {
  const { uploadUrl, path } = await getSignedUrl();
  await uploadFile(uploadUrl, file);
  await commitFile(path);
} catch (error) {
  console.error('Upload failed:', error);
  // Retry logic or show error to user
}
```

---

## Related Endpoints

- [Media Upload (tRPC)](./media-upload.md) - Alternative upload via tRPC
- [Contact Files](./21-contact-extensions.md) - Link files to contacts
- [Storage Configuration](../STORAGE_SETUP.md) - Supabase Storage setup

---

## Next Steps

- Configure Supabase Storage buckets
- Set up CORS rules for direct uploads
- Implement progress tracking UI
- Add retry logic for failed uploads
