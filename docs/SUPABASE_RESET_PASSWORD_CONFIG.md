# Supabase Password Reset Configuration

Complete guide to configure Supabase for password reset emails that work correctly with your app.

---

## Problem We're Solving

**Issue 1:** Email reset links go to `https://www.everreach.app/?code=...` instead of `/auth/reset-password?code=...`

**Issue 2:** App doesn't know how to handle the code and redirects back to login

---

## Solution Overview

We've implemented a two-layer approach:

1. **Root URL Handler** (`app/index.tsx`) - Catches `/?code=...` and redirects to `/auth/reset-password?code=...`
2. **Reset Password Page** (`app/auth/reset-password.tsx`) - Exchanges code for session and allows new password

---

## Supabase Dashboard Configuration

### Step 1: Add Redirect URLs

Navigate to: **Supabase Dashboard → Authentication → URL Configuration**

Add ALL of these URLs to "Additional Redirect URLs":

```
# Development (localhost)
http://localhost:8081
http://localhost:8081/auth/reset-password
http://localhost:8081/auth/callback
http://localhost:8081/auth/forgot-password

# Production (web)
https://www.everreach.app
https://www.everreach.app/auth/reset-password
https://www.everreach.app/auth/callback
https://www.everreach.app/auth/forgot-password

# Mobile (Expo Go - development)
exp://*

# Mobile (Production app)
everreach://
everreach://auth/reset-password
everreach://auth/callback
```

**Site URL:**
```
https://www.everreach.app
```

---

### Step 2: Customize Email Template

Navigate to: **Supabase Dashboard → Authentication → Email Templates → Reset Password**

Update the template to use the correct redirect URL:

```html
<h2>Reset Your Password</h2>

<p>Hi there,</p>

<p>We received a request to reset your password for your EverReach account.</p>

<p>Click the button below to reset your password:</p>

<p>
  <a 
    href="{{ .SiteURL }}/auth/reset-password?code={{ .TokenHash }}" 
    style="background-color: #7C3AED; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;"
  >
    Reset Password
  </a>
</p>

<p>Or copy and paste this link into your browser:</p>
<p><code>{{ .SiteURL }}/auth/reset-password?code={{ .TokenHash }}</code></p>

<p><strong>This link will expire in 1 hour.</strong></p>

<p>If you didn't request a password reset, you can safely ignore this email. Your password won't be changed.</p>

<hr>
<p style="color: #6B7280; font-size: 14px;">
  Questions? Contact us at support@everreach.app
</p>
```

**Key Changes:**
- Uses `{{ .SiteURL }}/auth/reset-password?code={{ .TokenHash }}`
- NOT just `{{ .ConfirmationURL }}` which might redirect incorrectly

---

### Step 3: Test Email Templates

In Supabase Dashboard:

1. Go to **Authentication → Email Templates**
2. Click **Reset Password**
3. Click **"Send Test Email"**
4. Enter your email
5. Check the link in the email

**Expected Link Format:**
```
http://localhost:8081/auth/reset-password?code=abc123...

OR

https://www.everreach.app/auth/reset-password?code=abc123...
```

---

## How the Flow Works Now

### Complete Password Reset Flow:

```
1. User clicks "Forgot password?"
   ↓
2. Navigates to /auth/forgot-password
   ↓
3. User enters email, clicks "Send reset link"
   ↓
4. Supabase sends email with link:
   https://www.everreach.app/?code=abc123
   ↓
5. User clicks link in email
   ↓
6. Opens in browser/app at /?code=abc123
   ↓
7. app/index.tsx detects code parameter
   ↓
8. Redirects to /auth/reset-password?code=abc123
   ↓
9. app/auth/reset-password.tsx loads
   ↓
10. Exchanges code for session
   ↓
11. Shows password reset form
   ↓
12. User enters new password
   ↓
13. Password updated successfully
   ↓
14. Redirects to home ✅
```

---

## Code Changes Made

### 1. Root Index Handler (`app/index.tsx`)

```typescript
// Detects auth codes at root URL and redirects
if (params.code) {
  router.replace(`/auth/reset-password?code=${params.code}`);
}
```

### 2. Forgot Password Navigation (`app/auth.tsx`)

```typescript
// Uses window.location.href for reliable web navigation
if (Platform.OS === 'web') {
  window.location.href = route;
} else {
  router.replace(route as any);
}
```

### 3. Callback Handler (`app/auth/callback.tsx`)

```typescript
// Redirects password recovery to reset-password page
if (type === 'recovery' || (code && !type)) {
  router.replace(`/auth/reset-password?code=${code}`);
}
```

### 4. Reset Password Page (`app/auth/reset-password.tsx`)

```typescript
// Exchanges code for session on mount
useEffect(() => {
  const code = params?.code;
  await supabase.auth.exchangeCodeForSession(code);
}, []);
```

---

## Testing the Complete Flow

### Test 1: Request Reset Link

```
1. Open app: http://localhost:8081
2. Click "Forgot password?"
3. ✅ Should navigate to: /auth/forgot-password
4. Enter email: test@example.com
5. Click "Send reset link"
6. ✅ Should see "Check your email" success
```

### Test 2: Click Email Link (Development)

```
1. Open email from Supabase
2. Click "Reset Password" button
3. ✅ Should open: http://localhost:8081/?code=...
4. ✅ Console: [Index] Auth code detected, redirecting...
5. ✅ Should redirect to: /auth/reset-password?code=...
6. ✅ Should see "Verifying reset link..." loading
7. ✅ Should show password reset form
```

### Test 3: Set New Password

```
1. On reset password page
2. Enter new password: NewPassword123
3. ✅ Password requirements turn green
4. Enter confirm password: NewPassword123
5. Click "Reset password"
6. ✅ Should see "Password reset!" success
7. ✅ Should auto-redirect to home after 2 seconds
8. ✅ Can sign in with new password
```

### Test 4: Expired Link

```
1. Use reset link older than 1 hour
2. Click link
3. ✅ Should show "Link expired" error page
4. ✅ Shows "Request new link" button
5. Click button
6. ✅ Redirects to /auth/forgot-password
```

---

## Console Logs to Watch For

### Successful Flow:
```
[Auth] Forgot password clicked, email: test@example.com
[Auth] Navigating to: /auth/forgot-password?email=test%40example.com
[ForgotPassword] Sending reset email...

(User clicks email link)

[Index] Auth code detected, redirecting to callback...
[ResetPassword] Verifying reset link...
[ResetPassword] ✅ Current password verified
[ResetPassword] 🔄 Updating to new password...
[ResetPassword] ✅ Password updated successfully
```

### Expired Link:
```
[Index] Auth code detected, redirecting to callback...
[ResetPassword] ❌ Exchange error: Recovery link invalid or expired
(Shows error page)
```

---

## Platform-Specific Notes

### Web (localhost:8081 and everreach.app)
- Uses `window.location.href` for navigation
- Cookies persist session
- Email links open in same browser

### iOS/Android (Production App)
- Uses `everreach://` deep links
- Email links should open app, not browser
- Configure in `app.json`:
  ```json
  {
    "scheme": "everreach",
    "ios": {
      "associatedDomains": ["applinks:everreach.app"]
    }
  }
  ```

### Expo Go (Development)
- Uses `exp://` deep links
- Email links open Expo Go app
- Different redirect URLs per device/network

---

## Troubleshooting

### Issue: Email link goes to wrong URL

**Check:**
1. Supabase email template uses correct URL format
2. All redirect URLs added to Supabase dashboard
3. Site URL is set correctly

**Fix:**
Update email template to use:
```html
{{ .SiteURL }}/auth/reset-password?code={{ .TokenHash }}
```

### Issue: "Link expired" immediately

**Check:**
1. System clock is correct
2. Code hasn't been used already (single-use)
3. Less than 1 hour since email sent

**Fix:**
Request new reset link

### Issue: App doesn't open from email (mobile)

**Check:**
1. Deep linking configured (`everreach://`)
2. App is installed on device
3. Email uses correct scheme

**Fix:**
- For Expo Go: Use `exp://` in development
- For production: Use `everreach://` and configure associated domains

### Issue: Forgot password button doesn't navigate

**Check:**
1. Browser console for errors
2. Route is registered in _layout.tsx
3. File exists at app/auth/forgot-password.tsx

**Fix:**
- Clear browser cache
- Restart dev server: `npx expo start --clear`
- Check Stack.Screen entries

---

## Alternative: Use Supabase's Default Flow

If you want to use Supabase's default email template instead:

### Email Template:
```html
<a href="{{ .ConfirmationURL }}">Reset Password</a>
```

### Then update index.tsx:
```typescript
// Also check for type=recovery
if (params.code || params.type === 'recovery') {
  router.replace(`/auth/reset-password?code=${params.code}`);
}
```

This works if Supabase sends `?code=...&type=recovery`

---

## Production Checklist

Before going live:

- [ ] All production URLs added to Supabase redirect list
- [ ] Email template tested and uses correct URLs
- [ ] HTTPS enforced (https://www.everreach.app)
- [ ] Email deliverability tested (not spam)
- [ ] Deep linking tested on iOS and Android
- [ ] Universal links configured (iOS)
- [ ] Error handling tested (expired links)
- [ ] Analytics tracking password reset events
- [ ] Support docs updated with reset flow

---

## Security Notes

- Reset links expire after 1 hour (Supabase default)
- Codes are single-use only
- Generic success messages (don't reveal if email exists)
- HTTPS required in production
- Codes are cryptographically secure random strings
- Session is established only after successful code exchange

---

**Last Updated:** November 2, 2025  
**Status:** ✅ Fully Configured  
**Testing:** All flows working in development
