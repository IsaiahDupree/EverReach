# 401 Authentication Failures Fix

## Problem
At 2025-10-04 21:51 UTC, multiple API requests (`/me/entitlements`, `/contacts`, `/persona-notes`, `/messages`) returned 401 Unauthorized errors. The pattern showed:
- A successful GET `/contacts?limit=1000` with 200 status
- Immediately followed by multiple 401 failures from the same Chrome 131 client
- This suggests the session token expired or auth headers were missing during follow-up requests

## Root Cause
The authentication token management had several issues:

1. **No Session Caching**: Every API call was calling `supabase.auth.getSession()`, which is expensive and can cause race conditions
2. **Short Expiry Buffer**: Only 60 seconds buffer before token expiry, which wasn't enough for multiple rapid requests
3. **No Cache Invalidation**: When tokens expired or 401 errors occurred, the cached session wasn't cleared
4. **Race Conditions**: Multiple simultaneous requests could trigger multiple token refresh attempts

## Solution

### 1. Session Caching (`lib/api.ts`)
Added session caching to reduce `getSession()` calls:
```typescript
let lastSessionCheck = 0;
let cachedSession: any = null;
const SESSION_CACHE_MS = 5000; // Cache session for 5 seconds
```

### 2. Proactive Token Refresh
Increased expiry buffer from 60 seconds to 2 minutes:
```typescript
const isExpiringSoon = expiresAt - now < 120000; // 2 minutes buffer
```

This ensures tokens are refreshed well before they expire, preventing 401 errors during rapid API calls.

### 3. Enhanced Logging
Added detailed token lifecycle logging:
- Token age and time until expiry
- Explicit expired vs expiring-soon states
- Token refresh success/failure with new expiry times

### 4. Cache Invalidation
Clear cache on errors and 401 responses:
```typescript
// Clear cached session on 401
cachedSession = null;
lastSessionCheck = 0;
```

### 5. Sign Out Integration
Added `clearSessionCache()` function that's called during sign out:
```typescript
export function clearSessionCache() {
  console.log('🗑️ Clearing session cache');
  cachedSession = null;
  lastSessionCheck = 0;
  tokenRefreshPromise = null;
}
```

## Benefits

1. **Reduced API Calls**: Session is cached for 5 seconds, reducing redundant `getSession()` calls
2. **Proactive Refresh**: Tokens refresh 2 minutes before expiry, preventing 401 errors
3. **Better Error Recovery**: 401 errors trigger immediate cache clear and token refresh
4. **Race Condition Prevention**: Shared token refresh promise prevents multiple simultaneous refresh attempts
5. **Improved Debugging**: Detailed logs show token lifecycle and help diagnose auth issues

## Testing Recommendations

1. **Token Expiry**: Wait for token to approach expiry and verify proactive refresh
2. **Rapid Requests**: Make multiple API calls in quick succession and verify no 401 errors
3. **Session Cache**: Verify session is reused within 5-second window
4. **401 Recovery**: Simulate 401 error and verify automatic retry with refreshed token
5. **Sign Out**: Verify cache is cleared on sign out

## Monitoring

Watch for these log patterns:

### Healthy Token Usage
```
🎫 Using token (age: 234ms, expires in: 3456s)
```

### Proactive Refresh
```
🔄 Token expiring soon, refreshing proactively...
🔄 Calling refreshSession...
✅ Token refreshed successfully
✅ New token expires at: 2025-10-04T23:00:00.000Z
```

### 401 Recovery
```
🔄 401 Unauthorized - Attempting token refresh and retry...
🔄 Forcing session refresh after 401...
✅ Token refreshed successfully after 401
🔄 Retrying request with new token...
```

### Error States
```
❌ Token expired, refreshing immediately...
❌ Token refresh failed: [error message]
❌ Failed to obtain new token, cannot retry
```

## Related Files
- `lib/api.ts` - Core auth header and token refresh logic
- `providers/AuthProvider.tsx` - Auth state management and sign out
- `lib/supabase.ts` - Supabase client configuration with auto-refresh enabled
