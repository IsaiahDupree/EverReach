# User Profile Endpoints Specification

**Date**: October 25, 2025  
**Status**: Specification for Backend Implementation  
**Related TODO**: Task #6 - User Profile Page & Dashboard Welcome Ribbon

---

## 📋 Overview

This document specifies the backend API endpoints needed to support the user profile feature requested in the requirements PDF. The profile feature includes:
- Personal profile page with user info and avatar
- Dashboard welcome ribbon showing user's first name
- Personal notes stored on profile
- Profile context/bio about the user

---

## 🔍 Current State Analysis

### ✅ **Already Exists in Master Endpoint List:**

1. **`GET /v1/me`** - Get user profile ✅
   - Already implemented
   - Returns user data including email, name, etc.

2. **`PATCH /v1/me`** - Update user profile ✅
   - Already implemented
   - Updates user profile fields

3. **`GET /v1/me/persona-notes`** - List persona notes ✅
   - Already implemented
   - Returns user's personal notes

4. **`POST /v1/me/persona-notes`** - Create persona note ✅
   - Already implemented
   - Creates new personal note

5. **`DELETE /v1/me/persona-notes/[id]`** - Delete persona note ✅
   - Already implemented
   - Deletes personal note

---

## ❌ **Missing Endpoints (Need Implementation):**

### 1. **`POST /v1/me/avatar`** - Upload Profile Picture
**Status**: ⚠️ **MISSING - NEEDS IMPLEMENTATION**

**Purpose**: Allow users to upload and update their profile picture

**Request:**
```http
POST /v1/me/avatar
Content-Type: multipart/form-data
Authorization: Bearer {token}

Body:
- avatar: File (image/jpeg, image/png, image/webp)
- max size: 5MB
```

**Request Body (FormData):**
```typescript
{
  avatar: File | Blob,
  // Optional metadata
  description?: string,
}
```

**Response (200 OK):**
```json
{
  "avatar_url": "https://storage.example.com/avatars/user-123.jpg",
  "thumbnail_url": "https://storage.example.com/avatars/user-123-thumb.jpg",
  "uploaded_at": "2025-10-25T19:23:00.000Z",
  "file_size": 245678,
  "mime_type": "image/jpeg"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid file format or size exceeds limit
- `401 Unauthorized` - Missing or invalid auth token
- `413 Payload Too Large` - File exceeds 5MB limit
- `500 Internal Server Error` - Upload failed

**Implementation Notes:**
- Store in cloud storage (S3, Cloudflare R2, etc.)
- Generate thumbnail (e.g., 200x200px)
- Support JPEG, PNG, WEBP formats
- Validate image dimensions (min 100x100, max 2000x2000)
- Auto-resize/compress if needed
- Update `avatar_url` field in user profile

---

### 2. **`DELETE /v1/me/avatar`** - Remove Profile Picture
**Status**: ⚠️ **MISSING - NEEDS IMPLEMENTATION**

**Purpose**: Remove/reset user's profile picture to default

**Request:**
```http
DELETE /v1/me/avatar
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "message": "Avatar removed successfully",
  "avatar_url": null,
  "default_avatar_url": "https://ui-avatars.com/api/?name=John+Doe"
}
```

**Error Responses:**
- `401 Unauthorized` - Missing or invalid auth token
- `404 Not Found` - User has no avatar to delete
- `500 Internal Server Error` - Delete failed

**Implementation Notes:**
- Delete file from cloud storage
- Set `avatar_url` to `null` in database
- Return default avatar URL (can use ui-avatars.com or similar)

---

## 📊 **Enhanced Profile Endpoint Specification**

### **`GET /v1/me` Enhancement**
**Status**: ✅ **EXISTS** (May need enhancement)

**Current Response** (verify this matches your implementation):
```json
{
  "id": "user-uuid",
  "email": "user@example.com",
  "full_name": "John Doe",
  "created_at": "2025-01-01T00:00:00.000Z"
}
```

**Enhanced Response** (add these fields if missing):
```json
{
  "id": "user-uuid",
  "email": "user@example.com",
  "full_name": "John Doe",
  "first_name": "John",  // ⚠️ REQUIRED for welcome ribbon
  "last_name": "Doe",
  "avatar_url": "https://storage.example.com/avatars/user-123.jpg",  // ⚠️ REQUIRED
  "avatar_thumbnail_url": "https://storage.example.com/avatars/user-123-thumb.jpg",
  "bio": "Product designer and coffee enthusiast",  // ⚠️ REQUIRED (personal context)
  "phone": "+1234567890",
  "timezone": "America/New_York",
  "created_at": "2025-01-01T00:00:00.000Z",
  "updated_at": "2025-10-25T19:23:00.000Z",
  "onboarding_completed": true,
  "preferences": {
    "theme": "dark",
    "notifications_enabled": true,
    "email_notifications": true
  }
}
```

**Required Fields for Profile Feature:**
- ✅ `first_name` - For welcome ribbon ("Welcome, John!")
- ✅ `avatar_url` - For profile picture display
- ✅ `bio` - For personal context section
- ✅ `full_name` - Already exists

---

### **`PATCH /v1/me` Enhancement**
**Status**: ✅ **EXISTS** (May need enhancement)

**Request Body** (ensure these fields are supported):
```json
{
  "full_name": "John Doe",
  "first_name": "John",  // ⚠️ REQUIRED
  "last_name": "Doe",
  "bio": "Product designer and coffee enthusiast",  // ⚠️ REQUIRED
  "phone": "+1234567890",
  "timezone": "America/New_York",
  "preferences": {
    "theme": "dark",
    "notifications_enabled": true
  }
}
```

**Response (200 OK):**
```json
{
  "id": "user-uuid",
  "email": "user@example.com",
  "full_name": "John Doe",
  "first_name": "John",
  "last_name": "Doe",
  "avatar_url": "https://storage.example.com/avatars/user-123.jpg",
  "bio": "Product designer and coffee enthusiast",
  "updated_at": "2025-10-25T19:23:00.000Z"
}
```

---

## 🗄️ Database Schema Requirements

### **`users` Table Updates:**

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_thumbnail_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';
```

**Field Definitions:**
- `first_name`: User's first name (required for welcome ribbon)
- `last_name`: User's last name
- `avatar_url`: Full-size profile picture URL
- `avatar_thumbnail_url`: Thumbnail version (200x200)
- `bio`: Personal context/bio (up to 500 characters)
- `phone`: Optional phone number
- `timezone`: User's timezone for scheduling
- `preferences`: JSON object for user preferences

---

## 🎯 Frontend Integration

### **Profile Page Component:**
```tsx
// app/profile.tsx (new file needed)

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  bio: string | null;
  phone: string | null;
  timezone: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const response = await apiFetch('/api/v1/me', {
      method: 'GET',
      requireAuth: true,
    });
    const data = await response.json();
    setProfile(data);
    setLoading(false);
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    const response = await apiFetch('/api/v1/me', {
      method: 'PATCH',
      requireAuth: true,
      body: JSON.stringify(updates),
    });
    const data = await response.json();
    setProfile(data);
  };

  const uploadAvatar = async (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await apiFetch('/api/v1/me/avatar', {
      method: 'POST',
      requireAuth: true,
      body: formData,
      // Don't set Content-Type header, let browser set it with boundary
    });
    const data = await response.json();
    setProfile(prev => prev ? { ...prev, avatar_url: data.avatar_url } : null);
  };

  // ... render profile UI
}
```

### **Welcome Ribbon Component:**
```tsx
// components/WelcomeRibbon.tsx (new file needed)

import { useAuth } from '@/providers/AuthProvider';
import { useRouter } from 'expo-router';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';

export function WelcomeRibbon() {
  const { user } = useAuth(); // Assuming AuthProvider has user data
  const { theme } = useTheme();
  const router = useRouter();

  if (!user?.first_name) return null;

  return (
    <View style={{ padding: 16, backgroundColor: theme.colors.surface }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', color: theme.colors.text }}>
        Welcome, {user.first_name}! 👋
      </Text>
      <TouchableOpacity 
        onPress={() => router.push('/profile')}
        style={{ marginTop: 8 }}
      >
        <Text style={{ fontSize: 16, color: theme.colors.primary }}>
          View Personal Profile →
        </Text>
      </TouchableOpacity>
    </View>
  );
}
```

---

## 📝 Implementation Checklist

### **Backend Team:**
- [ ] Verify `GET /v1/me` returns `first_name`, `avatar_url`, and `bio` fields
- [ ] Verify `PATCH /v1/me` accepts `first_name`, `bio` updates
- [ ] Implement `POST /v1/me/avatar` endpoint
- [ ] Implement `DELETE /v1/me/avatar` endpoint
- [ ] Add database columns: `first_name`, `last_name`, `avatar_url`, `avatar_thumbnail_url`, `bio`
- [ ] Set up cloud storage for avatar images
- [ ] Add image validation and processing
- [ ] Test avatar upload/delete flow
- [ ] Update API documentation

### **Frontend Team (After Backend Ready):**
- [ ] Create `app/profile.tsx` page
- [ ] Create `components/WelcomeRibbon.tsx` component
- [ ] Add profile link to Settings (✅ already done in task #10)
- [ ] Add WelcomeRibbon to dashboard
- [ ] Implement avatar upload UI with image picker
- [ ] Implement bio editing
- [ ] Show personal notes on profile page (reuse existing component)
- [ ] Add loading states and error handling
- [ ] Test profile flow end-to-end

---

## 🔗 Related Documentation

- **Master Endpoint List**: `docs/ALL_ENDPOINTS_MASTER_LIST.md`
- **TODO Task #6**: User Profile Page & Dashboard Welcome Ribbon
- **Requirements PDF**: `make sure this page has a bottom nav bar (1).pdf`

---

## 📊 Priority & Estimate

**Priority**: 🟡 **MEDIUM** (Feature enhancement, not blocking)

**Backend Estimate**: 
- Endpoint implementation: 2-3 hours
- Database migrations: 30 minutes
- Cloud storage setup: 1-2 hours
- Testing: 1 hour
- **Total**: 4-6 hours

**Frontend Estimate**:
- Profile page UI: 2 hours
- Welcome ribbon: 30 minutes
- Avatar upload: 1 hour
- Integration: 1 hour
- **Total**: 4-5 hours

**Combined Total**: 8-11 hours for complete feature

---

## ✅ Success Criteria

1. User can view their profile with avatar, name, bio, and personal notes
2. User can upload/change their profile picture
3. User can edit their bio/personal context
4. Dashboard shows "Welcome, [FirstName]!" ribbon
5. Ribbon has "View Personal Profile" button that navigates to profile page
6. Personal notes are accessible from profile page
7. All changes persist across sessions
8. Avatar images are optimized and load quickly

---

**Last Updated**: October 25, 2025  
**Next Review**: After backend implementation complete
