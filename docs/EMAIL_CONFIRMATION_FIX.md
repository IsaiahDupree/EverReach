# Email Confirmation Fix

Complete fix for email confirmation redirecting to wrong page showing "Link expired".

---

## 🐛 The Problem

### What Was Happening:
```
1. User signs up
2. Supabase sends "Confirm Your Signup" email
3. User clicks "Confirm Email Address" button
4. Redirected to: /auth/reset-password?code=xxx ❌
5. Page shows: "Link expired" ❌
```

### Root Causes:
1. **`app/index.tsx`** - ALL codes were redirected to `/auth/reset-password`
2. **`app/auth/callback.tsx`** - Treated codes without `type` parameter as password resets

---

## ✅ The Fix

### 1. Fixed `/app/index.tsx`

**Before:**
```typescript
if (params.code) {
  // ❌ Sends ALL codes to reset-password!
  router.replace(`/auth/reset-password?code=${params.code}`);
}
```

**After:**
```typescript
if (params.code) {
  const type = params.type as string;
  
  // Password reset
  if (type === 'recovery') {
    router.replace(`/auth/reset-password?code=${params.code}`);
    return;
  }
  
  // Email confirmation (type=signup, email, or invite)
  if (type === 'signup' || type === 'email' || type === 'invite') {
    router.replace(`/auth/callback?code=${params.code}&type=${type}`);
    return;
  }
  
  // Unknown - try callback
  router.replace(`/auth/callback?code=${params.code}`);
}
```

### 2. Fixed `/app/auth/callback.tsx`

**Before:**
```typescript
// ❌ Redirects to reset-password if no type
if (type === 'recovery' || (code && !type)) {
  router.replace(`/auth/reset-password?code=${code}`);
}
```

**After:**
```typescript
// ✅ Only redirects to reset-password for recovery type
if (type === 'recovery') {
  router.replace(`/auth/reset-password?code=${code}`);
  return;
}

// For all other types, exchange code for session
if (code) {
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (!error) {
    router.replace('/(tabs)/home'); // User is now logged in!
  }
}
```

### 3. Added URL Parameter Support

The callback now handles both:
- **URL parameters** (web navigation)
- **Deep links** (mobile apps)

---

## 🎯 How It Works Now

### Email Confirmation Flow:
```
1. User signs up with email/password
2. Supabase sends confirmation email
3. Email link: http://localhost:8081/?code=xxx&type=signup
4. app/index.tsx detects type=signup
5. Redirects to: /auth/callback?code=xxx&type=signup
6. app/auth/callback.tsx exchanges code for session
7. User is logged in and redirected to home ✅
```

### Password Reset Flow:
```
1. User clicks "Forgot password"
2. Supabase sends reset email
3. Email link: http://localhost:8081/?code=xxx&type=recovery
4. app/index.tsx detects type=recovery
5. Redirects to: /auth/reset-password?code=xxx
6. User sets new password ✅
```

---

## 📊 Supabase Email Types

| Type | Purpose | Route | Handler |
|------|---------|-------|---------|
| `signup` | New account email confirmation | `/auth/callback` | `exchangeCodeForSession` |
| `email` | Email change confirmation | `/auth/callback` | `exchangeCodeForSession` |
| `invite` | Invitation to join | `/auth/callback` | `exchangeCodeForSession` |
| `recovery` | Password reset | `/auth/reset-password` | `updateUser` with new password |
| `magiclink` | Magic link login | `/auth/callback` | `exchangeCodeForSession` |

---

## 🧪 Testing

### Test Email Confirmation:
```
1. Go to: http://localhost:8081/auth
2. Click "Sign up"
3. Enter email and password
4. Click "Create account"
5. Check email inbox
6. Click "Confirm Email Address" button
7. ✅ Should redirect to /auth/callback
8. ✅ Should exchange code
9. ✅ Should log in and go to home
10. ✅ Should NOT show "Link expired"
```

### Test Password Reset:
```
1. Go to: http://localhost:8081/auth
2. Click "Forgot password?"
3. Enter email
4. Click "Send reset link"
5. Check email inbox
6. Click "Reset My Password" button
7. ✅ Should redirect to /auth/reset-password
8. ✅ Should show password input fields
9. ✅ Should allow setting new password
```

---

## 🔍 Debugging

### Enable Console Logging

Watch for these log messages:

#### On Email Confirmation:
```
[Index] Auth code detected, type: signup
[Index] Email confirmation code, redirecting to callback...
🔗 Auth callback params: { code: 'c3c8125b...', type: 'signup' }
🔐 Exchanging code for session...
✅ Successfully authenticated! Session expires: 2025-11-04T01:43:00.000Z
```

#### On Password Reset:
```
[Index] Auth code detected, type: recovery
[Index] Password reset code, redirecting to reset-password...
[ResetPassword] Code detected, ready for password reset
```

### Common Issues

#### Issue: Still shows "Link expired"

**Check:**
1. ✅ Email template uses `{{ .ConfirmationURL }}` not hardcoded URL
2. ✅ Supabase redirect URLs include your domain
3. ✅ Code hasn't actually expired (24 hour limit)

**Debug:**
```javascript
// In app/index.tsx, add:
console.log('Params:', params);
// Should show: { code: 'xxx', type: 'signup' }
```

#### Issue: Redirects to reset-password instead of callback

**Check:**
1. ✅ URL has `type=signup` parameter
2. ✅ `app/index.tsx` properly checks type

**Debug:**
```javascript
// In app/index.tsx, add:
console.log('Type:', params.type);
// Should show: 'signup' (not 'recovery')
```

#### Issue: Code exchange fails

**Possible causes:**
- Code already used
- Code expired (24 hours)
- Supabase client misconfigured
- Network error

**Debug:**
```javascript
// Check Supabase client logs
// Should NOT show:
// ❌ Code exchange error: invalid_grant
```

---

## ⚙️ Supabase Configuration

### Required Redirect URLs

Add these to Supabase Dashboard → Authentication → URL Configuration:

**Development:**
```
http://localhost:8081
http://localhost:8081/
http://localhost:8081/auth/callback
http://localhost:8081/auth/reset-password
```

**Production:**
```
https://everreach.app
https://everreach.app/
https://everreach.app/auth/callback
https://everreach.app/auth/reset-password
```

**Mobile:**
```
everreach://auth/callback
everreach://auth/reset-password
```

### Email Template Variables

Supabase provides these variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `{{ .ConfirmationURL }}` | Auto-generated confirmation link | `http://localhost:8081/?code=xxx&type=signup` |
| `{{ .Token }}` | Raw token (deprecated) | `xxx` |
| `{{ .TokenHash }}` | Hashed token (deprecated) | `yyy` |
| `{{ .SiteURL }}` | Your site URL | `http://localhost:8081` |
| `{{ .RedirectTo }}` | Redirect URL | Custom redirect |

**Always use:** `{{ .ConfirmationURL }}` ✅

**Never use:** `{{ .SiteURL }}/auth/reset-password?code={{ .Token }}` ❌

---

## 📝 Files Changed

### 1. `/app/index.tsx`
- Added type detection
- Routes to correct page based on type
- Logs type for debugging

### 2. `/app/auth/callback.tsx`
- Removed fallback to reset-password for missing type
- Added URL parameter support (not just deep links)
- Extracted shared `processAuth` function
- Handles both web and mobile flows

### 3. `/docs/EMAIL_CONFIRMATION_FIX.md`
- This documentation!

---

## 🎉 Result

### Before:
- ❌ Email confirmation → Reset password page → "Link expired"
- ❌ Confusing user experience
- ❌ Users can't confirm their email
- ❌ Users can't log in

### After:
- ✅ Email confirmation → Callback page → Logged in!
- ✅ Password reset → Reset page → New password set!
- ✅ Clear separation of flows
- ✅ Proper error handling
- ✅ Works on web and mobile

---

**Last Updated:** November 2, 2025  
**Status:** ✅ Fixed  
**Files:** `app/index.tsx`, `app/auth/callback.tsx`
