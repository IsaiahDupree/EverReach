# Feature Requests System

## Overview

Complete feature request system with user voting, status tracking, and automatic changelog generation for shipped features.

## Architecture

### Backend Location
- Branch: `feat/backend-vercel-only-clean`
- Base URL: `https://ever-reach-be.vercel.app`

### Database Tables

#### 1. `feature_requests`
Stores user-submitted feature requests, feedback, and bug reports.

**Columns:**
- `id` - UUID primary key
- `type` - enum: `feature`, `feedback`, `bug`
- `title` - Text (max 100 chars)
- `description` - Text (max 2000 chars)
- `user_id` - UUID (nullable for anonymous submissions)
- `email` - Text (only for anonymous submissions)
- `status` - enum: `pending`, `reviewing`, `planned`, `in_progress`, `shipped`, `declined`
- `priority` - enum: `low`, `medium`, `high`, `critical`
- `votes_count` - Integer (cached count, updated by trigger)
- `assigned_to` - UUID (admin only)
- `target_version` - Text
- `shipped_at` - Timestamp
- `declined_reason` - Text
- `metadata` - JSONB
- `tags` - Text array
- `created_at`, `updated_at` - Timestamps

**Indexes:**
- User lookup
- Status + votes (for sorting)
- Type + status
- Full-text search on title + description

#### 2. `feature_votes`
One-to-many voting relationship with unique constraint per user.

**Columns:**
- `id` - UUID primary key
- `feature_id` - UUID (references feature_requests)
- `user_id` - UUID (references auth.users)
- `created_at` - Timestamp

**Unique Constraint:** `(feature_id, user_id)`

#### 3. `feature_changelog`
Auto-generated changelog entries for shipped features.

**Columns:**
- `id` - UUID primary key
- `feature_id` - UUID (references feature_requests)
- `version` - Text (e.g., "1.2.0")
- `title` - Text
- `description` - Text
- `category` - enum: `feature`, `improvement`, `bugfix`, `breaking`
- `published` - Boolean
- `published_at` - Timestamp
- `metadata` - JSONB
- `created_at`, `updated_at` - Timestamps

### Database Triggers

#### Auto-Update Votes Count
```sql
-- Automatically updates votes_count when votes are added/removed
CREATE TRIGGER trigger_update_feature_votes_count
AFTER INSERT OR DELETE ON feature_votes
FOR EACH ROW
EXECUTE FUNCTION update_feature_votes_count();
```

#### Auto-Create Changelog
```sql
-- Creates changelog entry when status changes to 'shipped'
CREATE TRIGGER trigger_auto_create_changelog
BEFORE UPDATE ON feature_requests
FOR EACH ROW
EXECUTE FUNCTION auto_create_changelog_entry();
```

### Row Level Security (RLS)

**feature_requests:**
- ✅ Anyone can read all requests
- ✅ Authenticated users can create requests
- ✅ Users can update their own requests (title/description only)
- ✅ Users can delete their own requests

**feature_votes:**
- ✅ Anyone can read votes
- ✅ Authenticated users can vote
- ✅ Users can remove their own votes

**feature_changelog:**
- ✅ Anyone can read published entries

## API Endpoints

### 1. List Feature Requests
```http
GET /api/v1/feature-requests
```

**Query Parameters:**
- `status` - Filter by status (pending, reviewing, planned, in_progress, shipped, declined)
- `type` - Filter by type (feature, feedback, bug)
- `sort` - Sort by: `votes` (default), `recent`, `oldest`
- `limit` - Results limit (default 50, max 100)
- `my_votes` - Show only user's voted features (requires auth)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "type": "feature",
      "title": "Dark mode support",
      "description": "Add dark mode theme...",
      "status": "planned",
      "priority": "medium",
      "votes_count": 15,
      "user_has_voted": true,
      "tags": ["ui", "theme"],
      "created_at": "2025-10-08T...",
      "updated_at": "2025-10-08T..."
    }
  ],
  "count": 10,
  "user_id": "uuid"
}
```

### 2. Create Feature Request
```http
POST /api/v1/feature-requests
```

**Authentication:** Optional (email required if not authenticated)

**Body:**
```json
{
  "type": "feature",
  "title": "Calendar integration",
  "description": "Sync contacts with Google Calendar events",
  "email": "user@example.com",
  "tags": ["calendar", "integration"],
  "metadata": {}
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "type": "feature",
    "title": "Calendar integration",
    "status": "pending",
    "votes_count": 0
  },
  "message": "Feature request submitted successfully"
}
```

### 3. Get Single Feature Request
```http
GET /api/v1/feature-requests/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "type": "feature",
    "title": "Dark mode support",
    "description": "...",
    "status": "planned",
    "votes_count": 15,
    "user_has_voted": true
  }
}
```

### 4. Update Feature Request
```http
PATCH /api/v1/feature-requests/:id
```

**Authentication:** Required

**Permissions:**
- **Users:** Can update their own requests (title, description, tags only)
- **Admins:** Can update any request (all fields including status)

**Body:**
```json
{
  "title": "Updated title",
  "description": "Updated description",
  "tags": ["new-tag"]
}
```

### 5. Delete Feature Request
```http
DELETE /api/v1/feature-requests/:id
```

**Authentication:** Required (owner only)

**Response:**
```json
{
  "success": true,
  "message": "Feature request deleted successfully"
}
```

### 6. Vote for Feature Request
```http
POST /api/v1/feature-requests/:id/vote
```

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "data": {
    "vote_id": "uuid",
    "feature_id": "uuid",
    "votes_count": 16
  },
  "message": "Vote registered successfully"
}
```

**Error (Already Voted):**
```json
{
  "error": "You have already voted for this feature request"
}
```

### 7. Remove Vote
```http
DELETE /api/v1/feature-requests/:id/vote
```

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "data": {
    "feature_id": "uuid",
    "votes_count": 15
  },
  "message": "Vote removed successfully"
}
```

### 8. Get Changelog
```http
GET /api/v1/changelog
```

**Public endpoint** - No authentication required

**Query Parameters:**
- `version` - Filter by version (e.g., "1.2.0")
- `category` - Filter by category (feature, improvement, bugfix, breaking)
- `limit` - Results limit (default 50, max 100)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "version": "1.2.0",
      "title": "Dark mode support",
      "description": "Added dark theme option",
      "category": "feature",
      "published": true,
      "published_at": "2025-10-08T...",
      "feature": {
        "id": "uuid",
        "title": "Dark mode support",
        "type": "feature",
        "votes_count": 25
      }
    }
  ],
  "grouped": {
    "1.2.0": [...],
    "1.1.0": [...]
  },
  "count": 5
}
```

## Frontend Integration

### Installation (Frontend)

1. Install dependencies (if needed):
```bash
npm install @supabase/supabase-js
```

2. Create API helper:
```typescript
// lib/featureRequests.ts
import { apiFetch } from '@/lib/api';

export interface FeatureRequest {
  id: string;
  type: 'feature' | 'feedback' | 'bug';
  title: string;
  description: string;
  status: string;
  votes_count: number;
  user_has_voted: boolean;
  tags: string[];
  created_at: string;
}

export const featureRequestsApi = {
  // List feature requests
  async list(params?: {
    status?: string;
    type?: string;
    sort?: 'votes' | 'recent' | 'oldest';
    limit?: number;
  }) {
    const query = new URLSearchParams(params as any);
    const response = await apiFetch(`/v1/feature-requests?${query}`);
    return response.json();
  },

  // Create feature request
  async create(data: {
    type: 'feature' | 'feedback' | 'bug';
    title: string;
    description: string;
    tags?: string[];
  }) {
    const response = await apiFetch('/v1/feature-requests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.json();
  },

  // Get single feature request
  async get(id: string) {
    const response = await apiFetch(`/v1/feature-requests/${id}`);
    return response.json();
  },

  // Vote for feature
  async vote(id: string) {
    const response = await apiFetch(`/v1/feature-requests/${id}/vote`, {
      method: 'POST',
    });
    return response.json();
  },

  // Remove vote
  async unvote(id: string) {
    const response = await apiFetch(`/v1/feature-requests/${id}/vote`, {
      method: 'DELETE',
    });
    return response.json();
  },

  // Get changelog
  async changelog(params?: {
    version?: string;
    category?: string;
    limit?: number;
  }) {
    const query = new URLSearchParams(params as any);
    const response = await apiFetch(`/v1/changelog?${query}`);
    return response.json();
  },
};
```

### Example Component: Feature Request List

```typescript
import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { ThumbsUp } from 'lucide-react-native';
import { featureRequestsApi, FeatureRequest } from '@/lib/featureRequests';

export function FeatureRequestsList() {
  const [requests, setRequests] = useState<FeatureRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
    try {
      const { data } = await featureRequestsApi.list({ sort: 'votes' });
      setRequests(data);
    } catch (error) {
      console.error('Failed to load requests:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleVote(id: string, hasVoted: boolean) {
    try {
      if (hasVoted) {
        await featureRequestsApi.unvote(id);
      } else {
        await featureRequestsApi.vote(id);
      }
      // Refresh list
      loadRequests();
    } catch (error) {
      console.error('Vote failed:', error);
    }
  }

  return (
    <FlatList
      data={requests}
      keyExtractor={item => item.id}
      renderItem={({ item }) => (
        <View style={{ padding: 16, borderBottomWidth: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '600' }}>
                {item.title}
              </Text>
              <Text style={{ fontSize: 14, color: '#666', marginTop: 4 }}>
                {item.description}
              </Text>
              <View style={{ flexDirection: 'row', marginTop: 8, gap: 8 }}>
                <Text style={{ fontSize: 12, color: '#999' }}>
                  {item.status}
                </Text>
                <Text style={{ fontSize: 12, color: '#999' }}>
                  {item.type}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => handleVote(item.id, item.user_has_voted)}
              style={{
                alignItems: 'center',
                padding: 8,
                backgroundColor: item.user_has_voted ? '#007AFF' : '#F0F0F0',
                borderRadius: 8,
              }}
            >
              <ThumbsUp
                size={20}
                color={item.user_has_voted ? '#FFF' : '#666'}
              />
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  marginTop: 4,
                  color: item.user_has_voted ? '#FFF' : '#666',
                }}
              >
                {item.votes_count}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    />
  );
}
```

### Example Component: Submit Request

```typescript
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal } from 'react-native';
import { featureRequestsApi } from '@/lib/featureRequests';

export function SubmitFeatureRequest({ onSuccess }: { onSuccess: () => void }) {
  const [type, setType] = useState<'feature' | 'feedback' | 'bug'>('feature');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!title || !description) return;

    setLoading(true);
    try {
      await featureRequestsApi.create({
        type,
        title,
        description,
      });
      
      // Reset form
      setTitle('');
      setDescription('');
      onSuccess();
    } catch (error) {
      console.error('Failed to submit:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 16 }}>
        Submit Feature Request
      </Text>

      {/* Type Selector */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        {(['feature', 'feedback', 'bug'] as const).map(t => (
          <TouchableOpacity
            key={t}
            onPress={() => setType(t)}
            style={{
              padding: 8,
              backgroundColor: type === t ? '#007AFF' : '#F0F0F0',
              borderRadius: 8,
            }}
          >
            <Text style={{ color: type === t ? '#FFF' : '#666' }}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Title */}
      <TextInput
        placeholder="Title (max 100 characters)"
        value={title}
        onChangeText={setTitle}
        maxLength={100}
        style={{
          borderWidth: 1,
          borderColor: '#DDD',
          borderRadius: 8,
          padding: 12,
          marginBottom: 12,
        }}
      />

      {/* Description */}
      <TextInput
        placeholder="Description (max 2000 characters)"
        value={description}
        onChangeText={setDescription}
        maxLength={2000}
        multiline
        numberOfLines={6}
        style={{
          borderWidth: 1,
          borderColor: '#DDD',
          borderRadius: 8,
          padding: 12,
          marginBottom: 16,
          textAlignVertical: 'top',
        }}
      />

      {/* Submit Button */}
      <TouchableOpacity
        onPress={handleSubmit}
        disabled={loading || !title || !description}
        style={{
          backgroundColor: '#007AFF',
          padding: 16,
          borderRadius: 8,
          alignItems: 'center',
          opacity: loading || !title || !description ? 0.5 : 1,
        }}
      >
        <Text style={{ color: '#FFF', fontWeight: '600' }}>
          {loading ? 'Submitting...' : 'Submit Request'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
```

## Deployment

### Database Migration

1. **Connect to Supabase:**
   ```bash
   psql postgresql://[connection-string]
   ```

2. **Run migration:**
   ```bash
   \i backend-vercel/migrations/feature-requests-enhanced.sql
   ```

3. **Verify tables:**
   ```sql
   \dt feature*
   ```

### Backend Deployment

1. **Push to branch:**
   ```bash
   git add backend-vercel/
   git commit -m "Add feature requests system with voting"
   git push origin feat/backend-vercel-only-clean
   ```

2. **Vercel will auto-deploy** (connected to the branch)

3. **Test endpoints:**
   ```bash
   curl https://ever-reach-be.vercel.app/api/v1/feature-requests
   ```

## Testing Checklist

### Backend Tests
- [ ] Create feature request (authenticated)
- [ ] Create feature request (anonymous with email)
- [ ] List feature requests (no auth)
- [ ] Filter by status
- [ ] Filter by type
- [ ] Sort by votes
- [ ] Vote for feature (authenticated)
- [ ] Try to vote twice (should fail)
- [ ] Remove vote
- [ ] Get single feature request
- [ ] Update own feature request
- [ ] Try to update others' request (should fail)
- [ ] Delete own feature request
- [ ] View changelog

### Frontend Tests
- [ ] Display feature requests list
- [ ] Vote/unvote functionality
- [ ] Submit new request form
- [ ] Character limits enforced (100 title, 2000 description)
- [ ] Filter by status
- [ ] Filter by type
- [ ] Sort options work
- [ ] View changelog

## Admin Features (TODO)

Future enhancements for admin users:
- [ ] Admin dashboard to manage requests
- [ ] Change status (pending → reviewing → planned → in_progress → shipped)
- [ ] Set priority
- [ ] Assign to team members
- [ ] Set target version
- [ ] Decline requests with reason
- [ ] Bulk operations
- [ ] Analytics dashboard

## Status Workflow

```
pending → reviewing → planned → in_progress → shipped
                                            ↓
                                        declined
```

**Automatic Actions:**
- When status changes to `shipped`:
  - Auto-creates changelog entry
  - Sets `shipped_at` timestamp
  - Publishes to public changelog

## Notes

- **Votes are cached** in `votes_count` for performance
- **Triggers keep vote counts in sync** automatically
- **RLS policies** ensure users can only modify their own data
- **Anonymous submissions** allowed but require email
- **Changelog is public** - anyone can view without auth
- **Max limits:** 100 char title, 2000 char description

---

**Created:** 2025-10-08  
**Last Updated:** 2025-10-08  
**Status:** Ready for deployment
