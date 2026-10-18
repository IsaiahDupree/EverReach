# DELETE Endpoints Guide

Complete guide to deletion functionality in the EverReach API.

---

## 📋 Overview

Three DELETE endpoints for removing data:
1. **DELETE /api/v1/interactions/:id** - Delete any interaction permanently
2. **DELETE /api/v1/contacts/:id/notes/:noteId** - Delete contact notes
3. **DELETE /api/v1/me/persona-notes/:id** - Delete personal notes

---

## 🗑️ DELETE /api/v1/interactions/:id

**Purpose:** Permanently delete any interaction (notes, calls, emails, meetings, etc.)

### Request

```http
DELETE /api/v1/interactions/:id
Authorization: Bearer YOUR_TOKEN
```

### Response (Success)

```json
{
  "deleted": true,
  "id": "2614aec5-eec8-47c8-9aed-09be1329f20c"
}
```

### Response (Not Found)

```json
{
  "error": "Interaction not found"
}
```
**Status:** 404

### Features

- ✅ Permanent deletion (cannot be undone)
- ✅ Rate limited (60 requests per minute per user)
- ✅ Verifies ownership before deletion
- ✅ Works with all interaction types (note, call, email, meeting, sms, dm, etc.)
- ✅ Returns 404 if interaction doesn't exist or doesn't belong to user

### Example Usage

```javascript
// Delete an interaction
const response = await fetch(
  'https://ever-reach-be.vercel.app/api/v1/interactions/INTERACTION_ID',
  {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);

if (response.ok) {
  const { deleted, id } = await response.json();
  console.log(`Deleted interaction: ${id}`);
} else if (response.status === 404) {
  console.log('Interaction not found');
} else {
  console.error('Delete failed');
}
```

---

## 📝 DELETE /api/v1/contacts/:id/notes/:noteId

**Purpose:** Delete a specific note attached to a contact

### Request

```http
DELETE /api/v1/contacts/:contactId/notes/:noteId
Authorization: Bearer YOUR_TOKEN
```

### Response (Success)

```json
{
  "deleted": true,
  "id": "d6cae0c9-7350-4a31-9053-9b9a3d915a80"
}
```

### Features

- ✅ Verifies note belongs to specified contact
- ✅ Returns 404 if note doesn't exist or doesn't belong to contact
- ✅ Permanently deletes from database

### Example Usage

```javascript
// Delete a contact note
const response = await fetch(
  `https://ever-reach-be.vercel.app/api/v1/contacts/${contactId}/notes/${noteId}`,
  {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);

if (response.ok) {
  console.log('Note deleted');
} else if (response.status === 404) {
  console.log('Note not found or does not belong to this contact');
}
```

---

## 📔 DELETE /api/v1/me/persona-notes/:id

**Purpose:** Delete a personal/persona note

### Request

```http
DELETE /api/v1/me/persona-notes/:id
Authorization: Bearer YOUR_TOKEN
```

### Response (Success)

```json
{
  "deleted": true,
  "id": "ee72e029-603e-421f-9ccc-222ea3cac9c4"
}
```

### Features

- ✅ Deletes text notes and voice notes
- ✅ Returns 404 if note doesn't exist or doesn't belong to user
- ✅ Permanently deletes from database

### Example Usage

```javascript
// Delete a persona note
const response = await fetch(
  `https://ever-reach-be.vercel.app/api/v1/me/persona-notes/${noteId}`,
  {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);

if (response.ok) {
  console.log('Persona note deleted');
}
```

---

## 🔐 Security & Authorization

All DELETE endpoints:
- ✅ Require authentication (Bearer token)
- ✅ Verify user owns the resource before deletion
- ✅ Return 401 if not authenticated
- ✅ Return 404 if resource doesn't exist or doesn't belong to user
- ✅ Cannot delete another user's data

---

## ⚠️ Important Notes

### Permanent Deletion

**DELETE operations are PERMANENT and cannot be undone.**

Before deleting:
1. Confirm user intent (show confirmation dialog)
2. Consider soft delete for important data
3. Log deletions for audit trail

### Cascading Behavior

When deleting:
- **Interactions:** Only deletes the interaction record
- **Contact Notes:** Only deletes the note (interaction)
- **Persona Notes:** Only deletes the note, attached files remain in storage

### Rate Limiting

The interactions endpoint is rate limited:
- **60 requests per minute per user**
- Returns 429 if limit exceeded
- Includes `Retry-After` header

---

## 📊 Testing Deletion

### Verify Deletion Worked

After deleting, GET the resource to verify 404:

```javascript
// Delete
await fetch(`/api/v1/interactions/${id}`, { method: 'DELETE' });

// Verify deletion (should return 404)
const verifyRes = await fetch(`/api/v1/interactions/${id}`);
console.log(verifyRes.status); // 404 = successfully deleted
```

### Test Script

Run the comprehensive delete test:

```bash
node test/backend/quick-delete-test.mjs
```

Expected output:
```
✅ Contact note deleted
✅ Deletion verified (404)
✅ Persona note deleted
✅ Deletion verified (404)
```

---

## 🔄 Common Patterns

### Delete with Undo Option

For better UX, implement soft delete in your app:

```javascript
// App-side soft delete pattern
const deletedItems = [];

function softDelete(item) {
  // Mark as deleted in UI
  item.deletedAt = Date.now();
  deletedItems.push(item);
  
  // Show undo toast
  showToast('Deleted. Undo?', {
    onUndo: () => {
      const index = deletedItems.indexOf(item);
      if (index > -1) deletedItems.splice(index, 1);
      item.deletedAt = null;
    }
  });
  
  // After 5 seconds, actually delete
  setTimeout(async () => {
    if (item.deletedAt) {
      await fetch(`/api/v1/interactions/${item.id}`, {
        method: 'DELETE'
      });
    }
  }, 5000);
}
```

### Batch Delete

Delete multiple items:

```javascript
async function batchDelete(ids) {
  const results = await Promise.allSettled(
    ids.map(id =>
      fetch(`/api/v1/interactions/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
    )
  );
  
  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  
  return { successful, failed };
}
```

### Delete with Confirmation

Always confirm before deleting:

```javascript
async function deleteWithConfirmation(id, type) {
  const confirmed = await showConfirmDialog({
    title: `Delete ${type}?`,
    message: 'This action cannot be undone.',
    confirmText: 'Delete',
    confirmStyle: 'danger'
  });
  
  if (!confirmed) return;
  
  try {
    const response = await fetch(`/api/v1/interactions/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      showToast('Deleted successfully');
      refreshList();
    } else if (response.status === 404) {
      showToast('Item not found');
    } else {
      showToast('Delete failed', 'error');
    }
  } catch (error) {
    showToast('Network error', 'error');
  }
}
```

---

## 🚨 Error Handling

### Common Errors

| Status | Error | Meaning | Action |
|--------|-------|---------|--------|
| 401 | Unauthorized | Invalid/missing token | Re-authenticate |
| 404 | Not found | Resource doesn't exist | Update UI |
| 429 | Rate limited | Too many requests | Wait and retry |
| 500 | Server error | Backend issue | Retry later |

### Error Handling Example

```javascript
async function safeDelete(id) {
  try {
    const response = await fetch(`/api/v1/interactions/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    switch (response.status) {
      case 200:
        return { success: true };
      
      case 404:
        return { success: false, error: 'Not found', recoverable: false };
      
      case 429:
        const retryAfter = response.headers.get('Retry-After');
        return { success: false, error: 'Rate limited', retryAfter, recoverable: true };
      
      case 401:
        // Token expired, refresh and retry
        await refreshToken();
        return safeDelete(id); // Retry once
      
      default:
        return { success: false, error: 'Unknown error', recoverable: true };
    }
  } catch (error) {
    return { success: false, error: 'Network error', recoverable: true };
  }
}
```

---

## 📱 Mobile Integration

### React Native Example

```typescript
import { useState } from 'react';
import { Alert } from 'react-native';

function useDeleteInteraction() {
  const [deleting, setDeleting] = useState(false);
  
  const deleteInteraction = async (id: string) => {
    return new Promise((resolve, reject) => {
      Alert.alert(
        'Delete Interaction',
        'This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              setDeleting(true);
              try {
                const response = await fetch(
                  `${API_BASE}/api/v1/interactions/${id}`,
                  {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                  }
                );
                
                if (response.ok) {
                  resolve(true);
                } else {
                  throw new Error('Delete failed');
                }
              } catch (error) {
                reject(error);
              } finally {
                setDeleting(false);
              }
            }
          }
        ]
      );
    });
  };
  
  return { deleteInteraction, deleting };
}
```

---

## ✅ Best Practices

1. **Always Confirm** - Show confirmation dialog before deleting
2. **Verify Success** - Check response status and handle errors
3. **Update UI Immediately** - Remove from list after successful delete
4. **Handle 404 Gracefully** - Item may have been deleted elsewhere
5. **Rate Limit Awareness** - Respect 429 responses and retry after delay
6. **Log Deletions** - Keep audit trail in your app analytics
7. **Consider Soft Delete** - For important data, mark as deleted rather than removing
8. **Undo Option** - Give users 5-10 seconds to undo before permanent delete

---

## 🧪 Testing

### Manual Testing

```bash
# Run comprehensive delete tests
node test/backend/quick-delete-test.mjs

# Expected output:
# ✅ Contact Note DELETE: PASS
# ✅ Persona Note DELETE: PASS
```

### Integration Testing

```javascript
describe('DELETE endpoints', () => {
  it('should delete interaction', async () => {
    // Create interaction
    const { interaction } = await createInteraction();
    
    // Delete it
    const response = await fetch(`/api/v1/interactions/${interaction.id}`, {
      method: 'DELETE'
    });
    
    expect(response.status).toBe(200);
    
    // Verify 404
    const verify = await fetch(`/api/v1/interactions/${interaction.id}`);
    expect(verify.status).toBe(404);
  });
});
```

---

## 📚 Related Documentation

- [Frontend API Guide](./FRONTEND_API_GUIDE.md) - All endpoint reference
- [API Examples](./API_EXAMPLES.md) - React hooks and patterns
- [Frequent Endpoints](./FREQUENT_ENDPOINTS.md) - Most used endpoints

---

**Base URL:** `https://ever-reach-be.vercel.app`  
**All endpoints require authentication**  
**Deletions are permanent and cannot be undone**
