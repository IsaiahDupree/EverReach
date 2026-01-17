# OAuth Fix for Expo Go (iOS Simulator)

## Problem

When testing Google OAuth in Expo Go on iOS simulator, you get a CORS error:
```
Blocked a frame with origin "http://localhost:8081" from accessing a cross-origin frame
```

## Root Cause

Expo Go uses special redirect URIs (`exp://...`) in development that need to be registered in both:
1. Supabase redirect URL allowlist
2. Google Cloud Console authorized redirect URIs

## Solution

### 1. Find Your Expo Redirect URI

When you run `npx expo start --ios`, check the console output for the redirect URI being used:

```
🔗 Redirect URIs: {
  platform: 'ios',
  isWeb: false,
  dev: 'exp://192.168.x.x:8081/--/auth/callback',  ← This is what you need!
  ...
}
```

Or you can generate it manually:
```typescript
import { makeRedirectUri } from 'expo-auth-session';

const uri = makeRedirectUri({ path: 'auth/callback' });
console.log(uri); // exp://192.168.x.x:8081/--/auth/callback
```

---

### 2. Add Expo Redirect URI to Supabase

1. Go to: https://supabase.com/dashboard/project/utasetfxiqcrnwyfforx/auth/url-configuration

2. Under **Redirect URLs**, add:
   ```
   exp://*
   ```
   
   **OR** be more specific with your IP:
   ```
   exp://192.168.1.10:8081/--/auth/callback
   ```
   
   ⚠️ **Note**: Using `exp://*` is easier for development as your IP may change

3. Also keep these for production:
   ```
   https://www.everreach.app/auth/callback
   everreach://auth/callback
   ```

4. Click **Save**

---

### 3. Add Expo Redirect to Google Cloud Console

1. Go to: https://console.cloud.google.com/apis/credentials

2. Select your OAuth 2.0 Client ID

3. Under **Authorized redirect URIs**, add:
   ```
   exp://*
   ```
   
   **OR** the specific URI:
   ```
   exp://192.168.1.10:8081/--/auth/callback
   ```

4. Keep the Supabase callback URL:
   ```
   https://utasetfxiqcrnwyfforx.supabase.co/auth/v1/callback
   ```

5. Click **Save**

⚠️ **Note**: Google may not accept wildcards. In that case, use your specific exp:// URI

---

### 4. Restart Expo and Test

1. Stop the Expo dev server
2. Run: `npx expo start --ios --clear`
3. Try Google sign-in again
4. Should now work! ✅

---

## Alternative: Use a Production Build

If Expo Go continues to have issues, create a development build:

```bash
# Install expo-dev-client
npx expo install expo-dev-client

# Create development build
eas build --profile development --platform ios

# Run on simulator
npx expo start --dev-client
```

Development builds use your custom scheme (`everreach://`) which is more reliable.

---

## How It Works Now

### Development (Expo Go):
```
1. User clicks "Sign in with Google" 🎤
2. Opens browser with Google OAuth
3. User authorizes
4. Google redirects to Supabase: https://...supabase.co/auth/v1/callback
5. Supabase redirects to: exp://192.168.x.x:8081/--/auth/callback
6. Expo Go handles the exp:// deep link ✅
7. App exchanges code for session ✅
8. User is signed in! 🎉
```

### Production (Standalone App):
```
1. User clicks "Sign in with Google" 🎤
2. Opens browser with Google OAuth
3. User authorizes
4. Google redirects to Supabase: https://...supabase.co/auth/v1/callback
5. Supabase redirects to: everreach://auth/callback
6. iOS handles the everreach:// deep link ✅
7. App exchanges code for session ✅
8. User is signed in! 🎉
```

---

## Troubleshooting

### Still getting CORS error?

1. **Clear Expo cache**:
   ```bash
   npx expo start --clear
   ```

2. **Check console logs** for the actual redirect URI being used

3. **Verify Supabase config**: Make sure the redirect URL is saved (sometimes it doesn't save on first try)

### "Invalid redirect URI" error?

- The URI in Supabase MUST match exactly
- Try using `exp://*` wildcard
- Make sure you clicked Save in Supabase

### Auth succeeds but app doesn't redirect back?

- Check that `app/auth/callback.tsx` exists
- Verify the path is correct: `auth/callback` (not `/auth/callback`)
- Look for errors in Metro bundler console

---

## Code Changes Made

### File: `lib/redirectUri.ts`

```typescript
// BEFORE (BROKEN in Expo Go)
const mobileDevRedirect = makeRedirectUri({
  scheme: 'everreach',  // ❌ Doesn't work in Expo Go
  path: 'auth/callback',
});

// AFTER (FIXED for Expo Go)
const mobileDevRedirect = makeRedirectUri({
  // ✅ Don't specify scheme in dev - Expo uses exp:// automatically
  path: 'auth/callback',
});
```

This allows Expo to use its default `exp://` scheme in development while using the custom `everreach://` scheme in production.

---

## Summary

✅ **Fixed redirect URI** for Expo Go development  
✅ **Documented** Supabase configuration  
✅ **Documented** Google Cloud Console setup  
✅ **Provided troubleshooting** steps  

**After configuring Supabase and Google Cloud Console, Google OAuth will work in Expo Go!** 🎉

---

## Quick Checklist

- [ ] Add `exp://*` to Supabase Redirect URLs
- [ ] Add `exp://*` or specific URI to Google Cloud Console
- [ ] Restart Expo with `--clear` flag
- [ ] Test Google sign-in in Expo Go
- [ ] Verify user is signed in after OAuth callback

