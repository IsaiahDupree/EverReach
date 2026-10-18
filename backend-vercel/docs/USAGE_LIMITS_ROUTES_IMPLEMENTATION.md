# Usage Limits Routes Implementation

## ✅ Implementation Complete

All routes have been updated to enforce usage limits for:
- **Compose message generation** (`/api/v1/compose`)
- **Voice note transcription** (`/api/v1/me/persona-notes/[id]/transcribe`)
- **Screenshot analysis** (`/api/v1/agent/analyze/screenshot`) - Already implemented

---

## 📋 Changes Made

### 1. Compose Route (`/api/v1/compose`)

**File:** `backend/backend-vercel/app/api/v1/compose/route.ts`

**Changes:**
- ✅ Added import for `canUseCompose` and `incrementComposeUsage`
- ✅ Added usage limit check before processing compose request
- ✅ Returns `429` status with detailed error when limit exceeded
- ✅ Increments usage counter after successful generation
- ✅ Returns usage info in successful response

**Error Response (429):**
```json
{
  "error": {
    "code": "usage_limit_exceeded",
    "message": "Monthly compose generation limit reached",
    "details": {
      "current_usage": 50,
      "limit": 50,
      "remaining": 0,
      "resets_at": "2025-12-31T23:59:59Z",
      "tier": "core"
    }
  }
}
```

**Success Response (200):**
```json
{
  "compose_session_id": "...",
  "draft": { ... },
  "usage": {
    "current": 26,
    "limit": 50,
    "remaining": 24,
    "resets_at": "2025-12-31T23:59:59Z",
    "tier": "core"
  }
}
```

---

### 2. Voice Transcription Route (`/api/v1/me/persona-notes/[id]/transcribe`)

**File:** `backend/backend-vercel/app/api/v1/me/persona-notes/[id]/transcribe/route.ts`

**Changes:**
- ✅ Added import for `canUseVoiceTranscription` and `incrementVoiceTranscriptionUsage`
- ✅ Estimates audio duration from file size (~1MB per minute)
- ✅ Checks usage limits before processing transcription
- ✅ Returns `429` status with detailed error when limit exceeded
- ✅ Increments usage by estimated minutes after successful transcription
- ✅ Returns usage info in successful response

**Duration Estimation:**
- Fetches audio file to get `Content-Length` header
- Estimates: `fileSizeMB` minutes (clamped between 0.1 and 30 minutes)
- Falls back to 1.0 minute if estimation fails

**Error Response (429):**
```json
{
  "error": {
    "code": "usage_limit_exceeded",
    "message": "Monthly voice transcription limit reached",
    "details": {
      "current_usage": 30,
      "limit": 30,
      "remaining": 0,
      "resets_at": "2025-12-31T23:59:59Z",
      "tier": "core",
      "estimated_minutes": 2.5
    }
  }
}
```

**Success Response (200):**
```json
{
  "id": "note-id",
  "status": "ready",
  "transcript_len": 1234,
  "usage": {
    "minutes_used": 2.5,
    "current": 22.5,
    "limit": 30,
    "remaining": 7.5,
    "resets_at": "2025-12-31T23:59:59Z",
    "tier": "core"
  }
}
```

---

### 3. Screenshot Analysis Route

**Status:** ✅ Already implemented in `backend/backend-vercel/app/api/v1/agent/analyze/screenshot/route.ts`

This route already has:
- Usage limit checking via `canUseScreenshots`
- Usage incrementing via `incrementScreenshotUsage`
- Proper error responses with usage details

---

## 🧪 Tests

**File:** `backend/backend-vercel/__tests__/api/usage-limits-routes.test.ts`

**Test Coverage:**
- ✅ Compose route usage limit enforcement
- ✅ Voice transcription route usage limit enforcement
- ✅ Error response format validation
- ✅ Success response format validation
- ✅ Tier limits verification
- ✅ Duration estimation logic

---

## 📊 Database Schema

All required columns and functions are in place:

**Table:** `usage_periods`
- ✅ `screenshot_count` / `screenshot_limit`
- ✅ `compose_runs_used` / `compose_runs_limit`
- ✅ `voice_minutes_used` / `voice_minutes_limit`

**Functions:**
- ✅ `can_use_compose(p_user_id UUID)`
- ✅ `increment_compose_usage(p_user_id UUID)`
- ✅ `can_use_voice_transcription(p_user_id UUID, p_minutes NUMERIC)`
- ✅ `increment_voice_transcription_usage(p_user_id UUID, p_minutes NUMERIC)`
- ✅ `can_use_screenshot_analysis(p_user_id UUID)`
- ✅ `increment_screenshot_usage(p_user_id UUID)`

---

## 🎯 Tier Limits

| Tier | Screenshots | Compose Runs | Voice Minutes |
|------|-------------|--------------|---------------|
| **Core** | 100/month | 50/month | 30/month |
| **Pro** | 300/month | 200/month | 120/month |
| **Enterprise** | Unlimited | Unlimited | Unlimited |

---

## 🔄 Usage Flow

### Compose Flow:
1. User makes request to `/api/v1/compose`
2. Route checks `canUseCompose(userId)`
3. If not allowed → Return `429` with error details
4. If allowed → Process compose request
5. After success → Call `incrementComposeUsage(userId)`
6. Return response with updated usage info

### Voice Transcription Flow:
1. User makes request to `/api/v1/me/persona-notes/[id]/transcribe`
2. Route estimates audio duration from file size
3. Route checks `canUseVoiceTranscription(userId, estimatedMinutes)`
4. If not allowed → Return `429` with error details
5. If allowed → Process transcription
6. After success → Call `incrementVoiceTranscriptionUsage(userId, estimatedMinutes)`
7. Return response with updated usage info

---

## 📝 Next Steps

1. **Monitor Usage:** Track usage patterns to optimize limits
2. **Improve Duration Estimation:** Consider using actual audio metadata if available
3. **Add Analytics:** Track limit hits for product insights
4. **Add Upgrade Prompts:** Suggest upgrades when limits are reached

---

## ✅ Verification

To verify the implementation:

1. **Test Compose Limit:**
   ```bash
   # Make 50 compose requests (core tier limit)
   # 51st should return 429
   ```

2. **Test Voice Limit:**
   ```bash
   # Transcribe notes totaling 30 minutes (core tier limit)
   # Next transcription should return 429
   ```

3. **Check Database:**
   ```sql
   SELECT * FROM usage_periods WHERE user_id = 'your-user-id';
   ```

---

## 🎉 Summary

All routes now properly enforce usage limits based on subscription tiers. Users will receive clear error messages when limits are reached, and usage is tracked accurately in the database.




