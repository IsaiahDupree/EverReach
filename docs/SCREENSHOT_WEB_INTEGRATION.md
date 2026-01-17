# Screenshot Analysis - Web Integration Guide

Complete guide for integrating screenshot analysis into your Next.js web app.

## Overview

The screenshot analysis API allows web users to:
- Upload screenshots via drag & drop or file picker
- Extract text and entities using GPT-4 Vision
- Auto-populate contacts from business cards
- Extract action items from emails/chats
- Analyze social media posts

---

## Prerequisites

- Next.js 14+ (App Router or Pages Router)
- Authentication setup (Supabase JWT)
- Backend deployed at `https://ever-reach-be.vercel.app`

---

## Installation

```bash
npm install react-dropzone
# or
pnpm add react-dropzone
```

---

## Implementation

### 1. CORS Utility (Already Created!)

Use the existing `web/lib/cors.ts`:

```typescript
import { apiPost, apiGet, apiDelete, apiUpload } from '@/lib/cors';

// Upload screenshot
const { data, error } = await apiUpload(
  '/api/v1/screenshots',
  formData,
  authToken
);

// List screenshots
const { data } = await apiGet('/api/v1/screenshots?limit=20', authToken);

// Delete screenshot
await apiDelete(`/api/v1/screenshots/${id}`, authToken);
```

---

### 2. Screenshot Upload Hook

Create `lib/hooks/useScreenshotUpload.ts`:

```typescript
'use client';

import { useState } from 'react';
import { apiUpload } from '@/lib/cors';

interface UploadResult {
  screenshot_id: string;
  analysis_id: string;
  status: 'queued' | 'analyzing' | 'analyzed' | 'error';
}

interface UploadOptions {
  context?: 'business_card' | 'email' | 'meeting_notes' | 'social_post' | 'general';
  onProgress?: (progress: number) => void;
}

export function useScreenshotUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const upload = async (
    file: File,
    authToken: string,
    options: UploadOptions = {}
  ): Promise<UploadResult | null> => {
    try {
      setUploading(true);
      setProgress(0);
      setError(null);

      // Validate file
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        throw new Error('File too large. Maximum size is 10MB.');
      }

      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.');
      }

      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('context', options.context || 'general');

      // Simulate progress (real progress would need XHR or fetch streams)
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
        options.onProgress?.(Math.min(progress + 10, 90));
      }, 200);

      // Upload
      const { data, error: uploadError } = await apiUpload<UploadResult>(
        '/api/v1/screenshots',
        formData,
        authToken
      );

      clearInterval(progressInterval);
      setProgress(100);
      options.onProgress?.(100);

      if (uploadError || !data) {
        throw new Error(uploadError || 'Upload failed');
      }

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setError(message);
      return null;
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  return {
    upload,
    uploading,
    progress,
    error,
  };
}
```

---

### 3. Screenshot List Hook

Create `lib/hooks/useScreenshots.ts`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { apiGet, apiDelete, apiPost } from '@/lib/cors';

interface Screenshot {
  id: string;
  user_id: string;
  storage_key: string;
  thumbnail_key?: string;
  thumbnail_url?: string;
  public_url?: string;
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

interface ListResponse {
  screenshots: Screenshot[];
  total: number;
  limit: number;
  offset: number;
}

export function useScreenshots(authToken: string | null, autoFetch = true) {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchScreenshots = async (limit = 50, offset = 0) => {
    if (!authToken) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await apiGet<ListResponse>(
        `/api/v1/screenshots?limit=${limit}&offset=${offset}`,
        authToken
      );

      if (fetchError || !data) {
        throw new Error(fetchError || 'Failed to fetch screenshots');
      }

      setScreenshots(data.screenshots);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const deleteScreenshot = async (id: string) => {
    if (!authToken) throw new Error('Not authenticated');

    const { error } = await apiDelete(`/api/v1/screenshots/${id}`, authToken);

    if (error) {
      throw new Error(error);
    }

    // Remove from local state
    setScreenshots(prev => prev.filter(s => s.id !== id));
  };

  const triggerAnalysis = async (id: string) => {
    if (!authToken) throw new Error('Not authenticated');

    const { data, error } = await apiPost(
      `/api/v1/screenshots/${id}/analyze`,
      {},
      authToken
    );

    if (error) {
      throw new Error(error);
    }

    // Refresh list to get updated status
    await fetchScreenshots();

    return data;
  };

  useEffect(() => {
    if (authToken && autoFetch) {
      fetchScreenshots();
    }
  }, [authToken, autoFetch]);

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

### 4. Upload Component with Drag & Drop

Create `components/ScreenshotUpload.tsx`:

```typescript
'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useScreenshotUpload } from '@/lib/hooks/useScreenshotUpload';

interface ScreenshotUploadProps {
  authToken: string;
  onSuccess?: (result: any) => void;
  onError?: (error: string) => void;
}

export function ScreenshotUpload({ authToken, onSuccess, onError }: ScreenshotUploadProps) {
  const { upload, uploading, progress, error } = useScreenshotUpload();
  const [context, setContext] = useState<string>('general');

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    
    const result = await upload(file, authToken, {
      context: context as any,
      onProgress: (p) => console.log(`Upload: ${p}%`),
    });

    if (result) {
      onSuccess?.(result);
    } else if (error) {
      onError?.(error);
    }
  }, [authToken, context, upload, error, onSuccess, onError]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 1,
    disabled: uploading,
  });

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      {/* Context Selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Screenshot Type
        </label>
        <select
          value={context}
          onChange={(e) => setContext(e.target.value)}
          disabled={uploading}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="general">General</option>
          <option value="business_card">Business Card</option>
          <option value="email">Email/Chat</option>
          <option value="meeting_notes">Meeting Notes</option>
          <option value="social_post">Social Post</option>
        </select>
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
          transition-colors duration-200
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />

        {uploading ? (
          <div>
            <div className="mb-4">
              <svg
                className="animate-spin h-12 w-12 mx-auto text-blue-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
            <p className="text-lg font-medium text-gray-900">Uploading...</p>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-gray-600">{progress}%</p>
          </div>
        ) : isDragActive ? (
          <div>
            <svg
              className="mx-auto h-12 w-12 text-blue-500"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="mt-2 text-lg font-medium text-blue-600">Drop here to upload</p>
          </div>
        ) : (
          <div>
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="mt-2 text-base text-gray-900">
              <span className="font-semibold">Click to upload</span> or drag and drop
            </p>
            <p className="mt-1 text-sm text-gray-600">PNG, JPG, WebP up to 10MB</p>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
    </div>
  );
}
```

---

### 5. Screenshot List Component

Create `components/ScreenshotList.tsx`:

```typescript
'use client';

import React, { useState } from 'react';
import { useScreenshots } from '@/lib/hooks/useScreenshots';
import Image from 'next/image';

interface ScreenshotListProps {
  authToken: string;
}

export function ScreenshotList({ authToken }: ScreenshotListProps) {
  const { screenshots, loading, error, deleteScreenshot, triggerAnalysis } =
    useScreenshots(authToken);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this screenshot? This cannot be undone.')) return;

    try {
      setDeleting(id);
      await deleteScreenshot(id);
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    } finally {
      setDeleting(null);
    }
  };

  const handleAnalyze = async (id: string) => {
    try {
      setAnalyzing(id);
      await triggerAnalysis(id);
      alert('Analysis complete!');
    } catch (err) {
      alert(`Analysis failed: ${err.message}`);
    } finally {
      setAnalyzing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  if (screenshots.length === 0) {
    return (
      <div className="text-center p-12 text-gray-500">
        <p>No screenshots yet. Upload your first one above!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {screenshots.map((screenshot) => (
        <div
          key={screenshot.id}
          className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
        >
          {/* Thumbnail */}
          {screenshot.thumbnail_url && (
            <div className="relative h-48 bg-gray-100">
              <Image
                src={screenshot.thumbnail_url}
                alt={screenshot.context}
                fill
                className="object-cover"
              />
            </div>
          )}

          {/* Content */}
          <div className="p-4">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-medium text-gray-500 uppercase">
                {screenshot.context.replace('_', ' ')}
              </span>
              <span className="text-xs text-gray-400">
                {new Date(screenshot.created_at).toLocaleDateString()}
              </span>
            </div>

            {/* Analysis Status */}
            {screenshot.analysis && (
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded ${
                      screenshot.analysis.status === 'analyzed'
                        ? 'bg-green-100 text-green-800'
                        : screenshot.analysis.status === 'analyzing'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {screenshot.analysis.status}
                  </span>
                </div>

                {screenshot.analysis.ocr_text && (
                  <p className="text-sm text-gray-600 line-clamp-3">
                    {screenshot.analysis.ocr_text}
                  </p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => handleAnalyze(screenshot.id)}
                disabled={analyzing === screenshot.id}
                className="flex-1 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-50"
              >
                {analyzing === screenshot.id ? 'Analyzing...' : 'Analyze'}
              </button>
              <button
                onClick={() => handleDelete(screenshot.id)}
                disabled={deleting === screenshot.id}
                className="px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
              >
                {deleting === screenshot.id ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

### 6. Complete Page Example

Create `app/screenshots/page.tsx`:

```typescript
import { ScreenshotUpload } from '@/components/ScreenshotUpload';
import { ScreenshotList } from '@/components/ScreenshotList';
import { getServerSession } from 'next-auth';

export default async function ScreenshotsPage() {
  const session = await getServerSession();

  if (!session?.user) {
    return (
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold text-center">
          Please sign in to access screenshots
        </h1>
      </div>
    );
  }

  const authToken = session.accessToken; // Get from your auth system

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Screenshot Analysis</h1>

      {/* Upload */}
      <div className="mb-12">
        <h2 className="text-xl font-semibold mb-4">Upload Screenshot</h2>
        <ScreenshotUpload
          authToken={authToken}
          onSuccess={(result) => {
            alert(`Upload successful! ID: ${result.screenshot_id}`);
            // Optionally refresh the list
          }}
          onError={(error) => {
            alert(`Upload failed: ${error}`);
          }}
        />
      </div>

      {/* List */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Your Screenshots</h2>
        <ScreenshotList authToken={authToken} />
      </div>
    </div>
  );
}
```

---

## Styling with Tailwind CSS

Add to `tailwind.config.js`:

```javascript
module.exports = {
  theme: {
    extend: {
      animation: {
        'spin': 'spin 1s linear infinite',
      },
    },
  },
};
```

---

## API Integration Examples

### With React Query

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiUpload, apiDelete } from '@/lib/cors';

export function useScreenshotsQuery(authToken: string) {
  return useQuery({
    queryKey: ['screenshots'],
    queryFn: async () => {
      const { data } = await apiGet('/api/v1/screenshots', authToken);
      return data;
    },
    enabled: !!authToken,
  });
}

export function useUploadMutation(authToken: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, context }: { file: File; context: string }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('context', context);
      
      const { data } = await apiUpload('/api/v1/screenshots', formData, authToken);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['screenshots'] });
    },
  });
}
```

---

## Error Handling

```typescript
try {
  const result = await upload(file, token, { context: 'business_card' });
  
  if (!result) {
    throw new Error('Upload returned no data');
  }

  // Success
  console.log('Uploaded:', result.screenshot_id);
  
} catch (error) {
  if (error.message.includes('File too large')) {
    toast.error('Image must be under 10MB');
  } else if (error.message.includes('Invalid file type')) {
    toast.error('Only PNG, JPEG, and WebP images are supported');
  } else if (error.message.includes('Unauthorized')) {
    toast.error('Please sign in again');
  } else {
    toast.error(`Upload failed: ${error.message}`);
  }
}
```

---

## Performance Tips

1. **Use Next.js Image** for thumbnails (automatic optimization)
2. **Implement pagination** for large lists
3. **Cache API responses** with React Query/SWR
4. **Show upload progress** for better UX
5. **Lazy load images** in viewport

---

## Testing

```bash
# Run screenshot tests
node test/agent/screenshot-analysis-focused.mjs

# Expected: 6/6 tests passing
```

---

## Troubleshooting

### CORS Errors

Make sure origin is in backend allowlist:
- `https://everreach.app`
- `https://www.everreach.app`
- Development: Set `ALLOW_EXP_DIRECT=true`

### Upload Fails

- Verify auth token is fresh
- Check file size < 10MB
- Ensure correct MIME type
- Check browser console for errors

### Images Not Displaying

- Verify Supabase storage bucket is public
- Check signed URL expiration
- Use Next.js Image component for better loading

---

**Backend URL**: `https://ever-reach-be.vercel.app`  
**CORS Utility**: `web/lib/cors.ts`  
**API Reference**: `BACKEND_API_REFERENCE.md`
