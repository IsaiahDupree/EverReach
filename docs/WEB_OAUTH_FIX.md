# Web OAuth Fix - Google Sign-In

## Problem

Google OAuth sign-in on web was failing because:
1. The redirect URI was using a deep link scheme (`everreach://auth/callback`) instead of an HTTPS URL
2. Web browsers cannot handle deep link schemes for OAuth callbacks
3. Supabase and Google need the correct web callback URL registered

## Solution Applied

### 1. Fixed Redirect URI (`lib/redirectUri.ts`)

**Changed from:**
- Using `everreach://auth/callback` for both mobile AND web

**Changed to:**
- **Web Development**: `http://localhost:8081/auth/callback`
- **Web Production**: `https://www.everreach.app/auth/callback`
- **Mobile**: `everreach://auth/callback` (unchanged)

The code now detects the platform and uses the appropriate redirect URI.

---

## Additional Configuration Needed

### 2. Update Supabase Dashboard

You need to add the web redirect URLs to your Supabase project:

1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/auth/url-configuration
2. Under **Redirect URLs**, add:
   ```
   http://localhost:8081/auth/callback
   https://www.everreach.app/auth/callback
   http://localhost:8081/reset-password
   https://www.everreach.app/reset-password
   ```
3. Click **Save**

### 3. Update Google Cloud Console

You need to add the web redirect URLs to your Google OAuth credentials:

1. Go to: https://console.cloud.google.com/apis/credentials
2. Select your OAuth 2.0 Client ID
3. Under **Authorized redirect URIs**, add:
   ```
   https://utasetfxiqcrnwyfforx.supabase.co/auth/v1/callback
   http://localhost:8081/auth/callback
   https://www.everreach.app/auth/callback
   ```
4. Click **Save**

**Note**: The Supabase callback URL is the main one - it handles the OAuth flow and then redirects to your app's callback.

---

## OAuth Flow (Web)

### Before Fix:
1. User clicks "Sign in with Google"
2. Opens Google OAuth in new tab ✅
3. User authorizes ✅
4. Google redirects to: `everreach://auth/callback?code=...` ❌
5. Browser doesn't know how to handle `everreach://` scheme ❌
6. User ends up back at login page, not signed in ❌

### After Fix:
1. User clicks "Sign in with Google" ✅
2. Opens Google OAuth in new tab ✅
3. User authorizes ✅
4. Google redirects to: `https://utasetfxiqcrnwyfforx.supabase.co/auth/v1/callback` ✅
5. Supabase exchanges the code for a session ✅
6. Supabase redirects to: `https://www.everreach.app/auth/callback?code=...` ✅
7. Your app exchanges the code for a session ✅
8. User is signed in! ✅

---

## Testing

### Local Development

1. Set `EXPO_PUBLIC_SHOW_DEV_SETTINGS=true` in `.env`
2. Start the dev server: `npx expo start --web`
3. Open: http://localhost:8081
4. Click "Sign in with Google"
5. Authorize with Google
6. Should redirect back to: `http://localhost:8081/auth/callback`
7. Should be signed in!

### Production (www.everreach.app)

1. Deploy to Vercel
2. Open: https://www.everreach.app
3. Click "Sign in with Google"
4. Authorize with Google
5. Should redirect back to: `https://www.everreach.app/auth/callback`
6. Should be signed in!

---

## Debugging

### Check Console Logs

Open browser console (F12) and look for:
```
🔗 Redirect URIs: {
  platform: 'web',
  isWeb: true,
  current: 'https://www.everreach.app/auth/callback',
  ...
}

[Auth] 🔐 Starting Google OAuth...
[Auth] 🌐 Opening browser...
[Auth] ✅ Browser auth completed
[Auth] 🔄 Exchanging code for session...
[Auth] ✅ Google sign-in complete!
```

### Common Issues

**"Invalid redirect URI"**
- Make sure the redirect URL is registered in both Supabase and Google Cloud Console
- Check that the URL matches exactly (including http vs https)

**"No code in callback"**
- Check browser console for errors
- Verify Supabase is configured for PKCE flow
- Check that `detectSessionInUrl: true` is set in Supabase client config

**"Session not persisting"**
- Check AsyncStorage is working
- Verify `persistSession: true` in Supabase config
- Check cookies are enabled in browser

---

## Code Changes Summary

### File: `lib/redirectUri.ts`

```typescript
// Before
export const redirectUri = makeRedirectUri({
  scheme: 'everreach',
  path: 'auth/callback',
});

// After
const isWeb = Platform.OS === 'web';
const webProdRedirect = 'https://www.everreach.app/auth/callback';
const mobileProdRedirect = makeRedirectUri({
  scheme: 'everreach',
  path: 'auth/callback',
});
export const redirectUri = isWeb ? webProdRedirect : mobileProdRedirect;
```

---

## Verification Checklist

Before deploying to production:

- [ ] Code changes committed (`lib/redirectUri.ts`)
- [ ] Supabase redirect URLs configured
- [ ] Google Cloud Console redirect URLs configured
- [ ] Tested on local dev (`http://localhost:8081`)
- [ ] Tested on production (`https://www.everreach.app`)
- [ ] Verified session persists after OAuth callback
- [ ] Verified user is redirected to home screen after sign-in
- [ ] Tested sign-out and sign-in again

---

## Related Files

- `lib/redirectUri.ts` - Redirect URI configuration (FIXED)
- `app/auth/callback.tsx` - OAuth callback handler
- `providers/AuthProviderV2.tsx` - Google sign-in implementation
- `lib/supabase.ts` - Supabase client configuration

---

## Next Steps

1. **Commit the code change**
2. **Configure Supabase redirect URLs** (see section 2 above)
3. **Configure Google Cloud Console redirect URLs** (see section 3 above)
4. **Test locally** with `npx expo start --web`
5. **Deploy to Vercel**
6. **Test on production** at www.everreach.app

After completing these steps, Google OAuth should work perfectly on web! 🎉
