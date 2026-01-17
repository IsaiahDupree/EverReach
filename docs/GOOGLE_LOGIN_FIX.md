# Google Login 302 Error - Quick Fix Guide

## Problem
Google login returns 302 redirect and doesn't create a session. The logs show:
```
GET | 302 | https://utasetfxiqcrnwyfforx.supabase.co/auth/v1/authorize?provider=google&redirect_to=https%3A%2F%2Fygcklc4-anonymous-8081.exp.direct%2Fauth%2Fcallback
```

## Root Cause
The redirect URI is using a dynamic Expo development URL (`ygcklc4-anonymous-8081.exp.direct`) which:
1. Changes every time you restart the dev server
2. Isn't registered in Supabase dashboard
3. Causes Supabase to reject the OAuth request with 302

## Solution

### Step 1: Configure Custom Scheme

**1.1 Update app.json:**
```json
{
  "expo": {
    "scheme": "everreach",
    "ios": {
      "bundleIdentifier": "com.yourcompany.everreach",
      "supportsTablet": true
    },
    "android": {
      "package": "com.yourcompany.everreach",
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      }
    }
  }
}
```

**1.2 Verify redirectUri.ts uses custom scheme:**
```typescript
// lib/redirectUri.ts
import { makeRedirectUri } from 'expo-auth-session';

export const redirectUri = makeRedirectUri({
  scheme: 'everreach',
  path: 'auth/callback',
});

export const resetRedirectUri = makeRedirectUri({
  scheme: 'everreach',
  path: 'reset-password',
});

console.log('Redirect URIs:', { redirectUri, resetRedirectUri });
```

This will generate: `everreach://auth/callback`

### Step 2: Configure Supabase Dashboard

**2.1 Add Redirect URIs:**
1. Go to Supabase Dashboard
2. Navigate to: Authentication → URL Configuration
3. Add these redirect URIs:
   ```
   everreach://auth/callback
   everreach://reset-password
   http://localhost:8081/auth/callback (for web dev)
   https://yourdomain.com/auth/callback (for production web)
   ```

**2.2 Configure Google OAuth:**
1. Go to: Authentication → Providers → Google
2. Enable Google provider
3. Add your Google OAuth credentials:
   - Client ID
   - Client Secret
4. Verify redirect URIs are saved

### Step 3: Test the Fix

**3.1 Restart Development Server:**
```bash
# Stop current server
# Then restart
npx expo start --clear
```

**3.2 Test Google Sign In:**
1. Open app in Expo Go or simulator
2. Click "Continue with Google"
3. Check console logs for redirect URI:
   ```
   [Auth] Google sign-in start, redirect URI: everreach://auth/callback
   ```
4. Complete Google sign in
5. Verify you're redirected back to app
6. Check session created

**3.3 Check Supabase Logs:**
1. Go to Supabase Dashboard → Logs → Auth
2. Look for successful OAuth events
3. Verify no 302 errors

### Step 4: Verify Auth Callback Handler

Ensure `app/auth/callback.tsx` properly handles the redirect:

```typescript
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleDeepLink = async (url: string) => {
      try {
        console.log('Auth callback URL:', url);
        const urlObj = new URL(url);
        
        const type = urlObj.searchParams.get('type');
        const code = urlObj.searchParams.get('code');
        const error = urlObj.searchParams.get('error');
        
        if (error) {
          console.error('Auth error:', error);
          router.replace('/');
          return;
        }
        
        // Password recovery
        if (type === 'recovery' && code) {
          console.log('Password recovery detected');
          await supabase.auth.exchangeCodeForSession(code);
          router.replace('/reset-password');
          return;
        }
        
        // Normal OAuth
        if (code) {
          console.log('Exchanging code for session...');
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          
          if (exchangeError) {
            console.error('Code exchange error:', exchangeError);
          } else {
            console.log('Session established successfully');
          }
        }
      } catch (err) {
        console.error('Auth callback error:', err);
      }
      
      router.replace('/');
    };

    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    return () => subscription?.remove();
  }, [router]);

  return <LoadingScreen />;
}
```

## Troubleshooting

### Issue: Still Getting 302 Error

**Check 1: Verify Redirect URI**
```typescript
// Add this to your sign-in screen
console.log('Current redirect URI:', redirectUri);
```
Should output: `everreach://auth/callback`

**Check 2: Verify Supabase Configuration**
1. Go to Supabase Dashboard
2. Check Authentication → URL Configuration
3. Ensure `everreach://auth/callback` is listed
4. Save changes if not

**Check 3: Clear Supabase Cache**
```bash
# Clear Expo cache
npx expo start --clear

# Clear app data on device
# iOS: Delete app and reinstall
# Android: Settings → Apps → Your App → Clear Data
```

### Issue: App Doesn't Open After Google Sign In

**Check 1: Verify Scheme in app.json**
```json
{
  "expo": {
    "scheme": "everreach"
  }
}
```

**Check 2: Test Deep Link**
```bash
# iOS Simulator
xcrun simctl openurl booted everreach://auth/callback?code=test

# Android Emulator
adb shell am start -W -a android.intent.action.VIEW -d "everreach://auth/callback?code=test"
```

**Check 3: Verify Deep Link Handling**
Add logging to `app/_layout.tsx`:
```typescript
useEffect(() => {
  const subscription = Linking.addEventListener('url', ({ url }) => {
    console.log('Deep link received:', url);
  });
  return () => subscription?.remove();
}, []);
```

### Issue: Session Not Created After Redirect

**Check 1: Verify Code Exchange**
Add logging to callback handler:
```typescript
const { data, error } = await supabase.auth.exchangeCodeForSession(code);
console.log('Exchange result:', { data, error });
```

**Check 2: Check Supabase Logs**
1. Go to Supabase Dashboard → Logs → Auth
2. Look for code exchange events
3. Check for errors

**Check 3: Verify Session Storage**
```typescript
// In AuthProvider
const { data: { session } } = await supabase.auth.getSession();
console.log('Current session:', session);
```

## Testing Checklist

After implementing the fix:

- [ ] Redirect URI is `everreach://auth/callback` (not Expo URL)
- [ ] Supabase dashboard has redirect URI configured
- [ ] Google OAuth credentials configured in Supabase
- [ ] App opens after Google sign in
- [ ] Session created successfully
- [ ] User data populated
- [ ] No 302 errors in Supabase logs
- [ ] Works on iOS
- [ ] Works on Android
- [ ] Works on web (with web redirect URI)

## Apple Sign In Configuration

While fixing Google, also configure Apple Sign In:

### Step 1: Apple Developer Console
1. Create App ID with Sign In with Apple capability
2. Create Service ID for web authentication
3. Configure redirect URIs:
   - `everreach://auth/callback`
   - `https://yourdomain.com/auth/callback`
4. Generate private key for JWT

### Step 2: Supabase Dashboard
1. Go to Authentication → Providers → Apple
2. Enable Apple provider
3. Add Service ID (e.g., `com.yourcompany.everreach.signin`)
4. Add Secret Key (JWT generated from private key)
5. Save configuration

### Step 3: Generate JWT Secret
Use Apple's private key to generate JWT:
```bash
# Install jwt-cli
npm install -g jwt-cli

# Generate JWT
jwt encode --secret @/path/to/AuthKey.p8 \
  --alg ES256 \
  --iss "YOUR_TEAM_ID" \
  --sub "com.yourcompany.everreach.signin" \
  --aud "https://appleid.apple.com" \
  --exp +180d
```

Copy the generated JWT to Supabase dashboard.

## Summary

**The Fix:**
1. Use custom scheme (`everreach://`) instead of dynamic Expo URL
2. Configure redirect URIs in Supabase dashboard
3. Verify OAuth credentials configured
4. Test thoroughly

**Why It Works:**
- Custom scheme is stable across dev server restarts
- Supabase can validate the redirect URI
- OAuth flow completes successfully
- Session created and persisted

**Next Steps:**
1. Implement the fix
2. Test Google sign in
3. Configure Apple sign in
4. Test password reset flow
5. Migrate to AuthProviderV2 for better auth management
