# Auth Architecture Migration Guide

## Overview
This guide explains how to migrate from the current auth implementation to the new comprehensive auth system (AuthProviderV2).

## What's New

### 1. **Unified Auth State Management**
- Single `authState` enum instead of multiple boolean flags
- States: `loading`, `unauthenticated`, `authenticated`, `password_recovery`, `onboarding`
- Clearer state transitions and easier debugging

### 2. **Improved Error Handling**
- Structured `AuthError` type with error codes
- User-friendly error messages
- Consistent error parsing across all auth methods

### 3. **Better Session Management**
- Automatic session validation on app launch
- Session refresh on app foreground
- Expiry detection and proactive refresh
- Robust session persistence

### 4. **Password Recovery Isolation**
- Dedicated `password_recovery` state
- Blocks all navigation except reset-password screen
- Secure recovery flow with proper state cleanup

### 5. **Enhanced OAuth Support**
- Stable redirect URIs using custom scheme
- Better error handling for OAuth flows
- Support for both mobile and web platforms

## Migration Steps

### Step 1: Review New Architecture
Read `docs/AUTH_ARCHITECTURE.md` to understand the new system.

### Step 2: Update Supabase Configuration

#### Google OAuth
1. Go to Supabase Dashboard → Authentication → Providers → Google
2. Add redirect URIs:
   ```
   everreach://auth/callback
   https://yourdomain.com/auth/callback (for web)
   ```
3. Ensure Google OAuth credentials are configured

#### Apple Sign In
1. Go to Supabase Dashboard → Authentication → Providers → Apple
2. Configure Service ID from Apple Developer Console
3. Generate JWT secret key (see Apple Developer docs)
4. Add same redirect URIs as Google

### Step 3: Test Current Implementation
Before migrating, test and document current behavior:
- [ ] Google sign in works
- [ ] Apple sign in works (iOS only)
- [ ] Email/password sign in works
- [ ] Magic link works
- [ ] Password reset works
- [ ] Session persists on app restart
- [ ] Sign out works

### Step 4: Switch to AuthProviderV2

#### Option A: Gradual Migration (Recommended)
Keep both providers during transition:

1. Import both providers in `app/_layout.tsx`:
```typescript
import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import { AuthProviderV2, useAuthV2 } from '@/providers/AuthProviderV2';
```

2. Wrap app with both providers:
```typescript
<AuthProvider>
  <AuthProviderV2>
    {/* Rest of app */}
  </AuthProviderV2>
</AuthProvider>
```

3. Update one screen at a time to use `useAuthV2` instead of `useAuth`

4. Test thoroughly after each screen migration

5. Once all screens migrated, remove old AuthProvider

#### Option B: Complete Migration
Replace AuthProvider entirely:

1. Backup current `providers/AuthProvider.tsx`

2. Rename `AuthProviderV2.tsx` to `AuthProvider.tsx`:
```bash
mv providers/AuthProviderV2.tsx providers/AuthProvider.tsx
```

3. Update exports in `AuthProvider.tsx`:
```typescript
export const [AuthProvider, useAuth] = createContextHook<AuthContext>(() => {
  // ... implementation
});
```

4. Update all imports to use new types:
```typescript
import type { AuthContext, AuthState } from '@/lib/auth/types';
```

5. Test all auth flows

### Step 5: Update Auth Callback Handler

Update `app/auth/callback.tsx` to use new auth state:

```typescript
import { useAuthV2 } from '@/providers/AuthProviderV2';

export default function AuthCallback() {
  const { enterPasswordRecovery } = useAuthV2();
  
  // ... existing code
  
  // When password recovery detected:
  if (type === 'recovery' && code) {
    await supabase.auth.exchangeCodeForSession(code);
    enterPasswordRecovery();
    router.replace('/reset-password');
    return;
  }
}
```

### Step 6: Update Route Guards

Update `app/_layout.tsx` to use new auth state:

```typescript
function RootLayoutNav() {
  const { authState, session } = useAuthV2();
  const { isCompleted: onboardingCompleted } = useOnboarding();
  
  if (authState === 'loading') {
    return <LoadingScreen />;
  }
  
  // Password recovery isolation
  if (authState === 'password_recovery') {
    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="reset-password" />
      </Stack>
    );
  }
  
  // Require authentication
  if (authState === 'unauthenticated') {
    return <SignIn />;
  }
  
  // Show onboarding for first-time users
  if (authState === 'authenticated' && !onboardingCompleted) {
    return <OnboardingFlow />;
  }
  
  // Show main app
  return <Stack>{/* ... routes */}</Stack>;
}
```

### Step 7: Update Sign In Screen

Update `app/sign-in.tsx` to use new auth methods:

```typescript
import { useAuthV2 } from '@/providers/AuthProviderV2';

export default function SignIn() {
  const { 
    signInWithGoogle, 
    signInWithApple, 
    signInWithPassword,
    signInWithMagicLink,
    signUp,
    resetPassword,
    error,
    clearError
  } = useAuthV2();
  
  // Use error from context instead of local state
  useEffect(() => {
    if (error) {
      // Show error to user
      setLocalError(error.message);
    }
  }, [error]);
  
  // Clear error when user starts typing
  const handleEmailChange = (email: string) => {
    setEmail(email);
    clearError();
  };
}
```

### Step 8: Update Reset Password Screen

Update `app/reset-password.tsx` to use new methods:

```typescript
import { useAuthV2 } from '@/providers/AuthProviderV2';

export default function ResetPassword() {
  const { updatePassword, clearPasswordRecovery, error } = useAuthV2();
  
  const handleResetPassword = async () => {
    try {
      await updatePassword(password);
      clearPasswordRecovery();
      Alert.alert('Success', 'Password updated!', [
        { text: 'OK', onPress: () => router.replace('/') }
      ]);
    } catch (err: any) {
      // Error already set in context
      setLocalError(err.message);
    }
  };
}
```

### Step 9: Test All Auth Flows

Test each flow thoroughly:

#### Google Sign In
1. Click "Continue with Google"
2. Select Google account
3. Verify redirect back to app
4. Check session created
5. Verify user data populated

#### Apple Sign In (iOS only)
1. Click "Continue with Apple"
2. Complete Face ID/Touch ID
3. Verify redirect back to app
4. Check session created

#### Email/Password Sign In
1. Enter email and password
2. Click "Sign In"
3. Verify session created
4. Test wrong password (should show error)
5. Test non-existent email (should show error)

#### Magic Link
1. Enter email
2. Click "Send Magic Link"
3. Check email received
4. Click link in email
5. Verify app opens and session created

#### Sign Up
1. Enter email and password
2. Click "Sign Up"
3. Check confirmation email received
4. Click confirmation link
5. Verify account created and can sign in

#### Password Reset
1. Click "Forgot Password"
2. Enter email
3. Check reset email received
4. Click reset link
5. Verify app opens to reset-password screen ONLY
6. Enter new password
7. Verify password updated and redirected to app
8. Test sign in with new password

#### Session Persistence
1. Sign in
2. Close app completely
3. Reopen app
4. Verify still signed in

#### Session Refresh
1. Sign in
2. Wait for token to expire (or manually expire)
3. Bring app to foreground
4. Verify session refreshed automatically

#### Sign Out
1. Click sign out
2. Verify redirected to sign-in screen
3. Verify session cleared
4. Verify can't access protected routes

### Step 10: Monitor and Debug

Add logging to track auth state transitions:

```typescript
useEffect(() => {
  console.log('[Auth] State changed:', authState);
  console.log('[Auth] Has session:', !!session);
  console.log('[Auth] Has user:', !!user);
  console.log('[Auth] Error:', error);
}, [authState, session, user, error]);
```

Check Supabase logs for auth events:
1. Go to Supabase Dashboard → Logs → Auth
2. Filter by time range
3. Look for errors or unexpected events

### Step 11: Clean Up

Once migration is complete and tested:

1. Remove old AuthProvider file (if using Option B)
2. Remove backup files
3. Update documentation
4. Remove debug logging
5. Update tests

## Troubleshooting

### Google Sign In Returns 302
**Problem:** OAuth redirect not working, returns 302 status

**Solution:**
1. Check redirect URI in Supabase matches exactly: `everreach://auth/callback`
2. Verify Google OAuth credentials configured
3. Check Supabase logs for detailed error
4. Ensure `app.json` has correct scheme: `"scheme": "everreach"`

### Password Reset Goes to Wrong Screen
**Problem:** User redirected to home instead of reset-password

**Solution:**
1. Verify `authState === 'password_recovery'` in route guard
2. Check `enterPasswordRecovery()` called in callback handler
3. Ensure reset-password route isolated in _layout.tsx
4. Test deep link format: `everreach://reset-password?type=recovery&code=xxx`

### Session Not Persisting
**Problem:** User signed out on app restart

**Solution:**
1. Check Supabase client configured with AsyncStorage
2. Verify `persistSession: true` in supabase config
3. Test session validation on app launch
4. Check token expiry time

### Auth State Stuck on Loading
**Problem:** App shows loading screen forever

**Solution:**
1. Check `initializeAuth()` completes successfully
2. Verify `setAuthState()` called in all code paths
3. Add timeout to session validation
4. Check for unhandled errors in auth initialization

## Rollback Plan

If migration fails, rollback to old implementation:

1. Restore backup of `providers/AuthProvider.tsx`
2. Update imports in `app/_layout.tsx`
3. Revert changes to sign-in and reset-password screens
4. Test old implementation still works
5. Document issues encountered
6. Plan fixes before attempting migration again

## Support

For issues during migration:
1. Check `docs/AUTH_ARCHITECTURE.md` for architecture details
2. Review Supabase auth documentation
3. Check console logs for errors
4. Test each auth method individually
5. Verify Supabase configuration

## Next Steps

After successful migration:
1. Add comprehensive tests for all auth flows
2. Implement biometric authentication
3. Add multi-factor authentication
4. Improve error messages
5. Add session management UI
6. Implement security alerts
