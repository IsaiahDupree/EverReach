# Interests Persistence Implementation Guide

## Problem Statement

**Interests** are currently computed by `GET /api/v1/contacts/:id/context-summary` and displayed in the UI, but they are **not persisted** to the contact record. After an app restart, interests disappear because they only exist transiently in the context summary response.

### Current Behavior
- ✅ **Tags**: Persisted in `contact.tags` → survives restart
- ✅ **Social Channels**: Persisted in `contact.metadata.social_channels` → survives restart  
- ✅ **Preferred Channels**: Persisted in `contact.metadata.comms.channelsPreferred` → survives restart
- ❌ **Interests**: Computed from context summary → lost on restart

## Solution Overview

Persist interests in the contact record under `metadata.interests` so they survive app restarts.

---

## Backend Changes Required

### 1. PATCH /api/v1/contacts/:id

**Location**: `backend-vercel/app/api/v1/contacts/[id]/route.ts`

#### Accept `metadata.interests` field

**Request Schema**:
```typescript
{
  metadata?: {
    interests?: string[];  // Array of interest strings
    // ... other metadata fields
  }
}
```

#### Validation Rules
- Accept `interests` as optional array of strings
- Sanitize: trim whitespace, deduplicate, remove empty strings
- Merge strategy: replace existing interests (client handles merge logic)
- Allow empty array `[]` to clear interests

#### Example Request
```json
PATCH /api/v1/contacts/123
Content-Type: application/json

{
  "metadata": {
    "interests": ["hiking", "photography", "coffee"]
  }
}
```

#### Implementation Notes
```typescript
// Pseudo-code for validation
if (body.metadata?.interests !== undefined) {
  if (!Array.isArray(body.metadata.interests)) {
    return { error: 'interests must be an array' };
  }
  
  // Sanitize
  const sanitized = body.metadata.interests
    .filter(i => typeof i === 'string')
    .map(i => i.trim())
    .filter(i => i.length > 0);
  
  // Deduplicate
  const unique = Array.from(new Set(sanitized));
  
  updatePayload.metadata = {
    ...existingMetadata,
    interests: unique
  };
}
```

---

### 2. GET /api/v1/contacts/:id

**Location**: `backend-vercel/app/api/v1/contacts/[id]/route.ts`

#### Return `metadata.interests` in response

**Response Schema**:
```typescript
{
  id: string;
  name: string;
  // ... other contact fields
  metadata?: {
    interests?: string[];
    social_channels?: Array<{platform: string; handle: string; url: string}>;
    comms?: {
      channelsPreferred?: string[];
    };
    // ... other metadata fields
  }
}
```

#### Example Response
```json
GET /api/v1/contacts/123

{
  "id": "123",
  "name": "Emily Watson",
  "tags": ["friend", "personal"],
  "metadata": {
    "interests": ["hiking", "photography", "coffee"],
    "social_channels": [
      {
        "platform": "snapchat",
        "handle": "yes",
        "url": "https://snapchat.com/add/yes"
      }
    ],
    "comms": {
      "channelsPreferred": ["snapchat"]
    }
  }
}
```

---

### 3. Database Schema (if needed)

If using Supabase `contacts` table with JSONB `metadata` column, no schema migration needed. The field already supports arbitrary JSON.

**Verify**:
```sql
-- Verify metadata column exists and is JSONB
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'contacts' AND column_name = 'metadata';
```

---

## Frontend Changes (Reference)

### Location
- `app/contact/[id].tsx` - Contact Detail Screen

### Logic
When `contextSummary.interests` is loaded and differs from `contact.metadata.interests`:
```typescript
React.useEffect(() => {
  if (!contact || !contextSummary?.interests) return;
  
  const persisted = contact.metadata?.interests || [];
  const computed = contextSummary.interests;
  
  // Only update if interests changed
  if (JSON.stringify(persisted.sort()) !== JSON.stringify(computed.sort())) {
    // Debounced PATCH
    persistInterests(contact.id, computed);
  }
}, [contact, contextSummary]);

const persistInterests = async (contactId: string, interests: string[]) => {
  try {
    await apiFetch(`/api/v1/contacts/${contactId}`, {
      method: 'PATCH',
      requireAuth: true,
      body: JSON.stringify({
        metadata: { interests }
      })
    });
  } catch (error) {
    console.error('[Contact] Failed to persist interests:', error);
  }
};
```

---

## Testing Checklist

### Backend Tests
- [ ] PATCH with valid interests array → persists correctly
- [ ] PATCH with empty interests array → clears interests
- [ ] PATCH with duplicate interests → deduplicates
- [ ] PATCH with whitespace in interests → trims correctly
- [ ] PATCH with invalid type (non-array) → returns error
- [ ] GET returns persisted interests in metadata

### Integration Tests
1. **Create contact with interests**:
   ```bash
   PATCH /api/v1/contacts/123
   {"metadata": {"interests": ["hiking", "coffee"]}}
   ```

2. **Verify GET returns interests**:
   ```bash
   GET /api/v1/contacts/123
   # Response should include metadata.interests
   ```

3. **Update interests**:
   ```bash
   PATCH /api/v1/contacts/123
   {"metadata": {"interests": ["hiking", "coffee", "photography"]}}
   ```

4. **Clear interests**:
   ```bash
   PATCH /api/v1/contacts/123
   {"metadata": {"interests": []}}
   ```

### End-to-End Tests
1. Open contact in app → interests display from context-summary
2. App automatically persists interests via PATCH
3. Restart app (cold boot)
4. Open same contact → interests still display
5. Add note mentioning new interest → context-summary recomputes
6. New interest auto-persists
7. Restart again → new interest persists

---

## Verification Steps

### Before Implementation
```bash
# Check current response - interests likely missing
curl -H "Authorization: Bearer $TOKEN" \
  https://your-api.vercel.app/api/v1/contacts/123
```

### After Implementation
```bash
# 1. Persist interests
curl -X PATCH \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"metadata":{"interests":["hiking","coffee"]}}' \
  https://your-api.vercel.app/api/v1/contacts/123

# 2. Verify persistence
curl -H "Authorization: Bearer $TOKEN" \
  https://your-api.vercel.app/api/v1/contacts/123 | jq '.metadata.interests'

# Should return: ["hiking", "coffee"]
```

---

## Migration Plan

### Phase 1: Backend Implementation
1. Update PATCH endpoint to accept `metadata.interests`
2. Add validation and sanitization
3. Ensure GET endpoint returns `metadata.interests`
4. Deploy to staging
5. Test with curl/Postman

### Phase 2: Frontend Integration
1. Add auto-persist logic in Contact Detail screen
2. Update UI to read from `metadata.interests` as fallback
3. Test locally against staging backend
4. Deploy to production

### Phase 3: Backfill (Optional)
If existing contacts have context summaries with interests but no persisted interests:
```sql
-- Backfill script (run carefully)
UPDATE contacts
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{interests}',
  '[]'::jsonb
)
WHERE metadata->>'interests' IS NULL;
```

---

## Rollback Plan

If issues arise:
1. Frontend can continue reading from `context-summary` as primary source
2. Backend changes are additive (no breaking changes)
3. Remove auto-persist logic from frontend
4. No data loss - interests regenerate from context-summary

---

## Open Questions

- [ ] Should interests be case-sensitive or normalized to lowercase?
- [ ] Maximum array length limit (e.g., 50 interests)?
- [ ] Should we merge server-computed interests with manually-added ones?
- [ ] Rate limiting for PATCH requests?

---

## References

- Contact persistence diagnostics: `app/contact/[id].tsx` line 211-237
- Social channels persistence: `app/contact-context/[id].tsx` line 843-880
- Preferred channels persistence: `app/contact-context/[id].tsx` line 877-880
- Context summary endpoint: `backend-vercel/app/api/v1/contacts/[id]/context-summary/route.ts`
