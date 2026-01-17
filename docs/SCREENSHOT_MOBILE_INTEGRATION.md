# Screenshot Analysis - Mobile Integration Guide

Complete guide for integrating screenshot analysis into your React Native/Expo mobile app.

## Overview

The screenshot analysis API allows users to:
- Upload screenshots from their camera or gallery
- Extract text and entities using GPT-4 Vision
- Auto-populate contacts from business cards
- Extract action items from emails/chats
- Analyze social media posts

---

## Prerequisites

- Expo SDK 49+ or React Native 0.72+
- Authentication setup (Supabase JWT)
- Backend deployed at `https://ever-reach-be.vercel.app`

---

## Installation

```bash
# Image picker
npx expo install expo-image-picker

# File system
npx expo install expo-file-system

# Optional: Camera
npx expo install expo-camera
```

---

## Implementation

### 1. Screenshot Upload Hook

Create `hooks/useScreenshotUpload.ts`:

```typescript
import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

const BACKEND_URL = 'https://ever-reach-be.vercel.app';

interface UploadResult {
  screenshot_id: string;
  analysis_id: string;
  status: 'queued' | 'analyzing' | 'analyzed' | 'error';
}

export function useScreenshotUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickAndUpload = async (
    authToken: string,
    context: 'business_card' | 'email' | 'meeting_notes' | 'social_post' | 'general' = 'general'
  ): Promise<UploadResult | null> => {
    try {
      setUploading(true);
      setError(null);

      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setError('Camera roll permission denied');
        return null;
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8, // Compress to reduce upload time
        base64: false,
      });

      if (result.canceled) {
        return null;
      }

      const image = result.assets[0];

      // Create form data
      const formData = new FormData();
      
      // Add file
      formData.append('file', {
        uri: image.uri,
        type: image.type === 'image' ? 'image/jpeg' : image.mimeType || 'image/jpeg',
        name: image.fileName || `screenshot-${Date.now()}.jpg`,
      } as any);

      // Add context
      formData.append('context', context);

      // Upload
      const response = await fetch(`${BACKEND_URL}/api/v1/screenshots`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          // Don't set Content-Type - FormData sets it with boundary
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setError(message);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const captureAndUpload = async (
    authToken: string,
    context: 'business_card' | 'email' | 'meeting_notes' | 'social_post' | 'general' = 'general'
  ): Promise<UploadResult | null> => {
    try {
      setUploading(true);
      setError(null);

      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        setError('Camera permission denied');
        return null;
      }

      // Take photo
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });

      if (result.canceled) {
        return null;
      }

      const image = result.assets[0];

      // Create form data (same as pickAndUpload)
      const formData = new FormData();
      formData.append('file', {
        uri: image.uri,
        type: 'image/jpeg',
        name: `photo-${Date.now()}.jpg`,
      } as any);
      formData.append('context', context);

      // Upload
      const response = await fetch(`${BACKEND_URL}/api/v1/screenshots`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setError(message);
      return null;
    } finally {
      setUploading(false);
    }
  };

  return {
    pickAndUpload,
    captureAndUpload,
    uploading,
    error,
  };
}
```

---

### 2. Screenshot List Hook

Create `hooks/useScreenshots.ts`:

```typescript
import { useState, useEffect } from 'react';

const BACKEND_URL = 'https://ever-reach-be.vercel.app';

interface Screenshot {
  id: string;
  user_id: string;
  storage_key: string;
  thumbnail_key?: string;
  context: string;
  mime_type: string;
  file_size: number;
  created_at: string;
  analysis?: {
    id: string;
    status: 'queued' | 'analyzing' | 'analyzed' | 'error';
    ocr_text?: string;
    entities?: any;
    insights?: any;
  };
}

export function useScreenshots(authToken: string) {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchScreenshots = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${BACKEND_URL}/api/v1/screenshots?limit=50`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch screenshots');
      }

      setScreenshots(data.screenshots || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const deleteScreenshot = async (id: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/screenshots/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Delete failed');
      }

      // Remove from local state
      setScreenshots(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delete failed';
      throw new Error(message);
    }
  };

  const triggerAnalysis = async (id: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/screenshots/${id}/analyze`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed');
      }

      // Refresh list
      await fetchScreenshots();

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Analysis failed';
      throw new Error(message);
    }
  };

  useEffect(() => {
    if (authToken) {
      fetchScreenshots();
    }
  }, [authToken]);

  return {
    screenshots,
    loading,
    error,
    refetch: fetchScreenshots,
    deleteScreenshot,
    triggerAnalysis,
  };
}
```

---

### 3. Screenshot Upload Screen

Create `app/(tabs)/screenshots.tsx`:

```typescript
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useScreenshotUpload } from '@/hooks/useScreenshotUpload';
import { useScreenshots } from '@/hooks/useScreenshots';
import { useAuth } from '@/providers/AuthProvider';

export default function ScreenshotsScreen() {
  const { session } = useAuth();
  const { pickAndUpload, captureAndUpload, uploading } = useScreenshotUpload();
  const { screenshots, loading, refetch, deleteScreenshot } = useScreenshots(
    session?.access_token || ''
  );

  const handlePickImage = async () => {
    if (!session) return;

    // Show context picker
    Alert.alert(
      'Select Context',
      'What type of screenshot is this?',
      [
        {
          text: 'Business Card',
          onPress: async () => {
            const result = await pickAndUpload(session.access_token, 'business_card');
            if (result) {
              Alert.alert('Success', 'Screenshot uploaded! Analysis in progress...');
              refetch();
            }
          },
        },
        {
          text: 'Email/Chat',
          onPress: async () => {
            const result = await pickAndUpload(session.access_token, 'email');
            if (result) refetch();
          },
        },
        {
          text: 'Meeting Notes',
          onPress: async () => {
            const result = await pickAndUpload(session.access_token, 'meeting_notes');
            if (result) refetch();
          },
        },
        {
          text: 'Social Post',
          onPress: async () => {
            const result = await pickAndUpload(session.access_token, 'social_post');
            if (result) refetch();
          },
        },
        {
          text: 'General',
          onPress: async () => {
            const result = await pickAndUpload(session.access_token, 'general');
            if (result) refetch();
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleCapture = async () => {
    if (!session) return;

    const result = await captureAndUpload(session.access_token, 'business_card');
    if (result) {
      Alert.alert('Success', 'Photo captured and uploaded!');
      refetch();
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Delete Screenshot',
      'Are you sure? This cannot be undone.',
      [
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteScreenshot(id);
              Alert.alert('Deleted', 'Screenshot removed');
            } catch (err) {
              Alert.alert('Error', err.message);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.context}>{item.context}</Text>
        <Text style={styles.date}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>

      {item.analysis && (
        <View style={styles.analysis}>
          <Text style={styles.status}>
            Status: {item.analysis.status}
          </Text>
          {item.analysis.ocr_text && (
            <Text style={styles.ocrText} numberOfLines={3}>
              {item.analysis.ocr_text}
            </Text>
          )}
        </View>
      )}

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDelete(item.id)}
      >
        <Text style={styles.deleteText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, uploading && styles.buttonDisabled]}
          onPress={handlePickImage}
          disabled={uploading}
        >
          <Text style={styles.buttonText}>
            {uploading ? 'Uploading...' : 'Upload Screenshot'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, uploading && styles.buttonDisabled]}
          onPress={handleCapture}
          disabled={uploading}
        >
          <Text style={styles.buttonText}>Take Photo</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={screenshots}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={refetch}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  button: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  context: {
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  date: {
    color: '#666',
    fontSize: 12,
  },
  analysis: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  status: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  ocrText: {
    fontSize: 14,
    color: '#333',
  },
  deleteButton: {
    marginTop: 12,
    padding: 8,
    alignItems: 'center',
  },
  deleteText: {
    color: '#FF3B30',
    fontWeight: '600',
  },
});
```

---

## Usage Examples

### Quick Upload

```typescript
import { useScreenshotUpload } from '@/hooks/useScreenshotUpload';

function MyComponent() {
  const { session } = useAuth();
  const { pickAndUpload, uploading } = useScreenshotUpload();

  const handleUpload = async () => {
    const result = await pickAndUpload(session.access_token, 'business_card');
    if (result) {
      console.log('Uploaded:', result.screenshot_id);
      // Navigate to results or show success
    }
  };

  return (
    <Button
      title="Scan Business Card"
      onPress={handleUpload}
      disabled={uploading}
    />
  );
}
```

### With Loading State

```typescript
const [result, setResult] = useState(null);
const { pickAndUpload, uploading, error } = useScreenshotUpload();

const handleScan = async () => {
  const data = await pickAndUpload(token, 'business_card');
  if (data) {
    setResult(data);
    // Wait for analysis
    setTimeout(() => checkAnalysis(data.screenshot_id), 5000);
  }
};

if (uploading) return <ActivityIndicator />;
if (error) return <Text>Error: {error}</Text>;
```

---

## API Response Types

### Upload Response

```typescript
{
  screenshot_id: string;
  analysis_id: string;
  status: 'queued';
}
```

### List Response

```typescript
{
  screenshots: Screenshot[];
  total: number;
  limit: number;
  offset: number;
}
```

### Analysis Response

```typescript
{
  screenshot_id: string;
  status: 'analyzed';
  analysis: {
    ocr_text: string;
    entities: {
      contacts: Array<{
        name: string;
        email?: string;
        phone?: string;
        company?: string;
        confidence: number;
      }>;
      dates: Array<{
        date: string;
        context: string;
      }>;
      emails: string[];
      phones: string[];
    };
    insights: {
      summary: string;
      action_items: string[];
      sentiment: 'positive' | 'neutral' | 'negative';
      category: string;
    };
  };
  processing_time_ms: number;
}
```

---

## Error Handling

```typescript
try {
  const result = await pickAndUpload(token, 'business_card');
  
  if (!result) {
    // User canceled or no permission
    return;
  }

  // Success
  console.log('Uploaded:', result.screenshot_id);
  
} catch (error) {
  if (error.message.includes('permission')) {
    Alert.alert(
      'Permission Required',
      'Please enable camera roll access in Settings'
    );
  } else if (error.message.includes('network')) {
    Alert.alert('Network Error', 'Please check your connection');
  } else {
    Alert.alert('Upload Failed', error.message);
  }
}
```

---

## Performance Tips

1. **Compress images** before upload (quality: 0.8)
2. **Show upload progress** for better UX
3. **Cache analysis results** to avoid re-fetching
4. **Implement pagination** for large lists
5. **Use thumbnails** for list views

---

## Security

- ✅ Auth token required for all requests
- ✅ Files scoped to authenticated user
- ✅ Automatic cleanup on delete
- ✅ File size limits enforced (10MB)
- ✅ Only image types allowed

---

## Testing

```bash
# Run screenshot tests
node test/agent/screenshot-analysis-focused.mjs

# Expected: 6/6 tests passing
```

---

## Troubleshooting

### Upload Fails

- Check auth token is valid
- Verify image is < 10MB
- Ensure file type is PNG/JPEG/WebP
- Check network connection

### Analysis Takes Too Long

- Normal processing: 5-15 seconds
- Complex images: Up to 30 seconds
- Implement polling or webhooks for status

### Permission Denied

```typescript
const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
if (status !== 'granted') {
  Alert.alert('Permission Required', 'Enable camera roll access');
}
```

---

## Next Steps

1. Implement auto-create contacts from business cards
2. Add action items to todo list
3. Show extracted entities in UI
4. Enable bulk upload
5. Add OCR confidence scores

---

**Backend URL**: `https://ever-reach-be.vercel.app`  
**API Docs**: See `BACKEND_API_REFERENCE.md`  
**Tests**: `test/agent/screenshot-analysis-focused.mjs`
