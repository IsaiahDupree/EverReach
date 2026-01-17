# Authentication Architecture

## Overview
This document describes the comprehensive authentication system for EverReach, including OAuth providers (Google, Apple), email/password, magic links, and password recovery.

## Architecture Principles

1. **Single Source of Truth**: All auth state managed in AuthProvider
2. **Route-Based Auth Guards**: Authentication requirements defined at route level
3. **Secure by Default**: All routes require auth unless explicitly marked public
4. **Graceful Degradation**: Offline mode support with local-only authentication
5. **Session Persistence**: Automatic token refresh and session recovery
6. **Deep Link Security**: Validate and sanitize all deep link parameters

## Auth Flow States

### 1. Unauthenticated
- User has no session
- Show: Sign-in screen
- Available actions: Sign in, Sign up, OAuth, Magic link

### 2. Authenticated
- User has valid session
- Show: Main app (tabs)
- Available actions: All app features, Sign out

### 3. Password Recovery
- User clicked reset password link
- Show: Reset password screen ONLY
- Block: All other navigation
- Available actions: Set new password, Cancel

### 4. Onboarding
- First-time authenticated user
- Show: Onboarding flow
- Available actions: Complete onboarding, Skip

### 5. Local-Only Mode
- Offline/development mode
- Show: Main app with local user
- Available actions: All features with local storage

## Components

### 1. AuthProvider (`providers/AuthProvider.tsx`)
**Responsibilities:**
- Manage auth state (session, user, loading)
- Handle all auth methods (OAuth, email, password)
- Listen to Supabase auth events
- Persist session to AsyncStorage
- Provide auth context to app

**State:**
```typescript
{
  session: Session | null
  user: User | LocalUser | null
  loading: boolean
  authState: 'unauthenticated' | 'authenticated' | 'password_recovery' | 'onboarding'
  error: AuthError | null
}
```

**Methods:**
- `signInWithGoogle()`
- `signInWithApple()`
- `signInWithPassword(email, password)`
- `signInWithMagicLink(email)`
- `signUp(email, password)`
- `resetPassword(email)`
- `updatePassword(newPassword)`
- `signOut()`
- `refreshSession()`

### 2. Auth Callback Handler (`app/auth/callback.tsx`)
**Responsibilities:**
- Handle OAuth redirects
- Exchange authorization codes for sessions
- Detect password recovery vs normal auth
- Route to appropriate screen

**Flow:**
```
1. Receive deep link with code/tokens
2. Parse URL parameters (code, type, error)
3. If type=recovery → Set password recovery state → Navigate to /reset-password
4. If code exists → Exchange for session → Navigate to /
5. If error → Show error → Navigate to /sign-in
```

### 3. Route Guard (`app/_layout.tsx`)
**Responsibilities:**
- Check auth state before rendering routes
- Redirect based on auth requirements
- Show loading state during auth check
- Handle password recovery isolation

**Logic:**
```
if (loading) → Show loading screen
if (authState === 'password_recovery') → Show ONLY /reset-password
if (authState === 'unauthenticated' && !isPublicRoute) → Show /sign-in
if (authState === 'authenticated' && !onboardingComplete) → Show /onboarding
if (authState === 'authenticated') → Show main app
```

### 4. Sign In Screen (`app/sign-in.tsx`)
**Responsibilities:**
- Collect user credentials
- Trigger auth methods
- Show auth errors
- Handle forgot password flow

### 5. Reset Password Screen (`app/reset-password.tsx`)
**Responsibilities:**
- Collect new password
- Validate password strength
- Update user password
- Clear recovery state
- Block back navigation

## OAuth Configuration

### Google OAuth
**Supabase Dashboard Setup:**
1. Enable Google provider
2. Add authorized redirect URIs:
   - Development: `everreach://auth/callback`
   - Production: `everreach://auth/callback`
   - Web: `https://yourdomain.com/auth/callback`

**Client Configuration:**
- Use PKCE flow (more secure than implicit)
- Request scopes: email, profile
- Handle both mobile and web platforms

### Apple Sign In
**Supabase Dashboard Setup:**
1. Enable Apple provider
2. Configure Service ID from Apple Developer
3. Generate JWT secret key
4. Add redirect URIs (same as Google)

**Client Configuration:**
- iOS: Use native AppleAuthentication module
- Android/Web: Use OAuth web flow
- Request scopes: email, fullName

## Password Recovery Flow

### Step 1: Request Reset
```
User clicks "Forgot Password" → Enter email → Call resetPassword(email)
→ Supabase sends email with recovery link
→ Link format: everreach://reset-password?type=recovery&code=xxx
```

### Step 2: Handle Recovery Link
```
App receives deep link → auth/callback.tsx detects type=recovery
→ Exchange code for recovery session → Set authState='password_recovery'
→ Navigate to /reset-password
```

### Step 3: Reset Password Screen
```
User enters new password → Call updatePassword(newPassword)
→ Clear recovery state → Navigate to main app
```

### Security Measures:
- Recovery session is temporary (1 hour expiry)
- Block all navigation except /reset-password
- Disable back button on Android
- Clear recovery state after password update
- Sign out if user cancels

## Session Management

### Token Refresh
- Automatic refresh before expiry (handled by Supabase client)
- Manual refresh on app foreground
- Retry logic for network failures

### Session Persistence
- Store session in AsyncStorage
- Restore on app launch
- Validate session on restore
- Clear on sign out

### Session Validation
```typescript
async function validateSession() {
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error || !session) {
    // Session invalid, sign out
    await signOut()
    return null
  }
  return session
}
```

## Error Handling

### Auth Errors
```typescript
type AuthError = {
  code: string
  message: string
  details?: any
}
```

### Common Errors:
- `invalid_credentials`: Wrong email/password
- `email_not_confirmed`: User hasn't verified email
- `user_not_found`: Email doesn't exist
- `weak_password`: Password doesn't meet requirements
- `rate_limit_exceeded`: Too many attempts
- `network_error`: Connection failed

### Error Display:
- Show user-friendly messages
- Provide recovery actions
- Log technical details for debugging
- Don't expose sensitive information

## Security Best Practices

1. **Never store passwords**: Use Supabase auth only
2. **Validate all inputs**: Email format, password strength
3. **Rate limiting**: Prevent brute force attacks
4. **HTTPS only**: All auth requests over secure connection
5. **Token security**: Store in secure storage (AsyncStorage with encryption)
6. **Deep link validation**: Sanitize all URL parameters
7. **Session timeout**: Auto sign out after inactivity
8. **Audit logging**: Track auth events for security monitoring

## Testing Strategy

### Unit Tests
- Auth state transitions
- Error handling
- Session validation
- Token refresh logic

### Integration Tests
- OAuth flows (Google, Apple)
- Email/password sign in
- Magic link flow
- Password recovery
- Session persistence

### E2E Tests
- Complete sign up flow
- Sign in with different methods
- Password reset flow
- Session expiry handling
- Deep link handling

## Migration Plan

### Phase 1: Refactor AuthProvider
- Consolidate auth state
- Add authState enum
- Improve error handling
- Add session validation

### Phase 2: Improve Route Guards
- Implement route-based auth
- Add password recovery isolation
- Improve loading states

### Phase 3: Fix OAuth Flows
- Configure stable redirect URIs
- Test Google/Apple sign in
- Handle edge cases

### Phase 4: Enhance Password Recovery
- Secure recovery flow
- Block navigation during recovery
- Improve UX

### Phase 5: Testing & Documentation
- Write comprehensive tests
- Document all flows
- Create troubleshooting guide

## Troubleshooting

### Google Sign In Not Working
**Symptoms:** 302 redirect, no session created
**Causes:**
- Redirect URI mismatch in Supabase dashboard
- Expo URL changes between sessions
- PKCE code exchange failure

**Solutions:**
1. Use stable custom scheme: `everreach://auth/callback`
2. Add all possible redirect URIs to Supabase
3. Check Supabase logs for errors
4. Verify Google OAuth credentials

### Password Reset Not Working
**Symptoms:** User redirected to wrong screen
**Causes:**
- Recovery state not set
- Route guard not checking recovery state
- Deep link not parsed correctly

**Solutions:**
1. Check auth/callback.tsx detects type=recovery
2. Verify authState set to 'password_recovery'
3. Ensure _layout.tsx isolates reset-password route
4. Test deep link format

### Session Not Persisting
**Symptoms:** User signed out on app restart
**Causes:**
- AsyncStorage not configured
- Session not saved
- Token expired

**Solutions:**
1. Verify Supabase client uses AsyncStorage
2. Check autoRefreshToken enabled
3. Test session restore on app launch
4. Check token expiry time

## Future Enhancements

1. **Biometric Auth**: Face ID, Touch ID, fingerprint
2. **Multi-Factor Auth**: SMS, authenticator app
3. **Social Providers**: Facebook, Twitter, LinkedIn
4. **SSO**: Enterprise single sign-on
5. **Passwordless**: WebAuthn, passkeys
6. **Session Management**: View active sessions, remote sign out
7. **Security Alerts**: Notify on suspicious activity
8. **Account Recovery**: Alternative recovery methods
