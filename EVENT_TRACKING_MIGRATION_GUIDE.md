# Event Tracking Migration Guide
## From `/api/telemetry/events` to `/api/v1/events/track`

---

## 📊 **Current Event Status**

**Database:** 129 total events  
**Latest Event:** November 1, 2025 (8 days ago)  
**No new events in last 8 days** ❌

---

## 🔍 **Current Implementation Analysis**

### Backend Has TWO Event Endpoints

#### 1. `/api/v1/events/track` (Original)
**Location:** `backend-vercel/app/api/v1/events/track/route.ts`

**Expects:**
```typescript
{
  event_type: string,      // snake_case (e.g., "screen_viewed")
  timestamp: string,       // ISO 8601
  metadata: {              // All properties here
    session_id: string,
    platform: 'ios' | 'android' | 'web',
    app_version: string,
    ...other_properties
  }
}
```

**Returns:**
```json
{ "tracked": true, "event_type": "screen_viewed" }
```

---

#### 2. `/api/telemetry/events` (Alias - Currently Used)
**Location:** `backend-vercel/app/api/telemetry/events/route.ts`

**Expects:**
```typescript
{
  event: string,           // camelCase or snake_case
  properties: {            // All properties here
    session_id: string,
    platform: 'ios' | 'android' | 'web',
    app_version: string,
    ...other_properties
  },
  timestamp?: string       // ISO 8601 (optional)
}
```

**Returns:**
```json
{ "success": true, "tracked": true, "event_type": "screen_viewed" }
```

---

## 🎯 **Key Differences**

| Feature | `/api/telemetry/events` | `/api/v1/events/track` |
|---------|-------------------------|------------------------|
| Field Name | `event` | `event_type` |
| Properties | `properties` | `metadata` |
| Response | `{ success, tracked, event_type }` | `{ tracked, event_type }` |
| Created | 2h ago (hotfix) | Original implementation |
| Accepts Both | ✅ `event` or `event_type` | ❌ Only `event_type` |

---

## 📱 **Frontend Current Implementation**

**File:** `repos/AnalyticsRepo.ts`

```typescript:repos/AnalyticsRepo.ts#67-81
async trackEvent(event: AnalyticsEvent): Promise<void> {
  try {
    await apiFetch('/api/telemetry/events', {
      method: 'POST',
      requireAuth: true,
      body: JSON.stringify({
        ...event,
        timestamp: event.timestamp || new Date().toISOString(),
      }),
    });
  } catch (error) {
    // Don't throw - analytics failures shouldn't break the app
    console.warn('[AnalyticsRepo] Failed to track event:', error);
  }
},
```

**Frontend sends:**
```typescript
{
  event: 'screen_viewed',           // Note: 'event' not 'event_type'
  properties: {
    screen_name: 'ContactDetail',
    session_id: 'session_123',
    platform: 'web',
    app_version: '1.0.0'
  },
  timestamp: '2025-11-09T22:00:00.000Z'
}
```

---

## 🔄 **Migration Options**

### **Option A: Keep Current Alias (Recommended ✅)**

**Why:** Frontend already works, backend accepts it, no changes needed.

**Pros:**
- ✅ Zero code changes
- ✅ Frontend keeps working
- ✅ Backward compatible
- ✅ Both endpoints write to same table

**Cons:**
- ⚠️ Two endpoints doing same thing
- ⚠️ Slight confusion in API docs

**Action Required:** None! Already deployed and working.

---

### **Option B: Migrate Frontend to `/api/v1/events/track`**

**Requires:** Frontend code changes

#### Frontend Changes

**File:** `repos/AnalyticsRepo.ts`

```typescript
// BEFORE (Current)
async trackEvent(event: AnalyticsEvent): Promise<void> {
  try {
    await apiFetch('/api/telemetry/events', {
      method: 'POST',
      requireAuth: true,
      body: JSON.stringify({
        ...event,
        timestamp: event.timestamp || new Date().toISOString(),
      }),
    });
  } catch (error) {
    console.warn('[AnalyticsRepo] Failed to track event:', error);
  }
}

// AFTER (Migrated)
async trackEvent(event: AnalyticsEvent): Promise<void> {
  try {
    await apiFetch('/api/v1/events/track', {  // Changed endpoint
      method: 'POST',
      requireAuth: true,
      body: JSON.stringify({
        event_type: event.event,              // Changed: event → event_type
        metadata: event.properties,           // Changed: properties → metadata
        timestamp: event.timestamp || new Date().toISOString(),
      }),
    });
  } catch (error) {
    console.warn('[AnalyticsRepo] Failed to track event:', error);
  }
}
```

#### Backend - No Changes Needed

The `/api/v1/events/track` endpoint already exists and works correctly.

---

### **Option C: Make `/api/telemetry/events` the Primary**

**Requires:** Update documentation and references

#### Steps:
1. ✅ Keep `/api/telemetry/events` as-is (already done)
2. ✅ Keep `/api/v1/events/track` for backward compatibility
3. 📝 Update API documentation to reference `/api/telemetry/events`
4. 📝 Add deprecation notice to `/api/v1/events/track`

**Pros:**
- ✅ More flexible field names (`event` or `event_type`)
- ✅ Frontend keeps working
- ✅ Clearer naming (`telemetry` is descriptive)

**Cons:**
- ⚠️ Non-RESTful endpoint path
- ⚠️ Breaks API versioning pattern

---

## 📋 **Migration Checklist (Option B)**

If you choose to migrate to `/api/v1/events/track`:

### Frontend Changes
- [ ] Update `repos/AnalyticsRepo.ts`
  - [ ] Change endpoint: `/api/telemetry/events` → `/api/v1/events/track`
  - [ ] Change field: `event` → `event_type`
  - [ ] Change field: `properties` → `metadata`
- [ ] Update tests
- [ ] Test event tracking on all platforms (iOS, Android, Web)
- [ ] Verify events appear in Supabase `app_events` table

### Backend Cleanup (Optional)
- [ ] Add deprecation notice to `/api/telemetry/events`
- [ ] Update API documentation
- [ ] Plan sunset timeline for `/api/telemetry/events`

### Deployment
- [ ] Deploy frontend changes
- [ ] Monitor error rates
- [ ] Verify event flow in Supabase
- [ ] Check Sentry/logs for any issues

---

## 🔍 **Testing After Migration**

### 1. Frontend Test
```typescript
// In your app, track a test event
trackEvent({
  event: 'test_event',
  properties: {
    session_id: 'test_session',
    platform: 'web',
    app_version: '1.0.0',
    test: true
  }
});
```

### 2. Backend Verification (Supabase)
```sql
-- Check for test event
SELECT 
  event_type,
  platform,
  app_version,
  metadata->>'session_id' as session_id,
  metadata->>'test' as is_test,
  occurred_at
FROM app_events
WHERE metadata->>'test' = 'true'
ORDER BY occurred_at DESC
LIMIT 5;
```

### 3. Monitor Logs
```bash
# Check Vercel logs for errors
vercel logs --follow
```

---

## 💡 **Recommendation**

**Keep current implementation** (`/api/telemetry/events`) ✅

**Reasoning:**
1. Frontend already works with it
2. Backend already accepts it
3. Zero migration effort required
4. Both endpoints write to same table anyway
5. No downtime or risk

**Future Consideration:**
- Standardize on one endpoint for new features
- Document both in API reference
- Gradually phase out one if needed

---

## 📊 **Both Endpoints Side-by-Side**

### Frontend Payload Comparison

#### Current (`/api/telemetry/events`)
```json
{
  "event": "screen_viewed",
  "properties": {
    "screen_name": "ContactDetail",
    "session_id": "session_123",
    "platform": "web",
    "app_version": "1.0.0"
  },
  "timestamp": "2025-11-09T22:00:00.000Z"
}
```

#### If Migrated (`/api/v1/events/track`)
```json
{
  "event_type": "screen_viewed",
  "metadata": {
    "screen_name": "ContactDetail",
    "session_id": "session_123",
    "platform": "web",
    "app_version": "1.0.0"
  },
  "timestamp": "2025-11-09T22:00:00.000Z"
}
```

### Database Result (Same for Both)
```json
{
  "id": "uuid",
  "user_id": "user_uuid",
  "event_type": "screen_viewed",
  "platform": "web",
  "app_version": "1.0.0",
  "metadata": {
    "screen_name": "ContactDetail",
    "session_id": "session_123",
    "platform": "web",
    "app_version": "1.0.0"
  },
  "session_info": { "session_id": "session_123" },
  "device_info": { "user_agent": "..." },
  "occurred_at": "2025-11-09T22:00:00.000Z",
  "created_at": "2025-11-09T22:00:05.123Z"
}
```

---

## 🚀 **Quick Decision Matrix**

| Scenario | Recommendation |
|----------|---------------|
| Want zero changes | Keep `/api/telemetry/events` ✅ |
| Want RESTful consistency | Migrate to `/api/v1/events/track` |
| Multiple frontend platforms | Keep alias for flexibility |
| Building new features | Use `/api/v1/events/track` |
| Need backward compatibility | Keep both endpoints |

---

## 📝 **Summary**

**Current Status:**
- ✅ `/api/telemetry/events` deployed and working
- ✅ `/api/v1/events/track` exists and functional
- ✅ Both write to `app_events` table
- ❌ No events tracked in last 8 days (frontend not sending)

**Why No Events:**
- Frontend calls `/api/telemetry/events` ✅
- Endpoint exists and works ✅
- **Issue:** Frontend likely not initialized or auth failing
- **Next Step:** Check frontend analytics initialization and auth token

**Recommendation:**
Keep current setup. Debug why frontend isn't sending events (likely initialization or auth issue, not endpoint mismatch).
