# Auth System - Quick Test Guide

Fast reference for testing the new auth system.

---

## 🧪 Test Forgot Password Flow

### Steps:
1. **Open app** → See main auth page
2. **Enter email** → e.g., `test@example.com`
3. **Click "Continue"** → See password screen
4. **Click "Forgot password?"** → Navigate to forgot password page
5. **Email should be pre-filled** ✅
6. **Click "Send reset link"** → See "Check your email" success
7. **Check email** → Click reset link
8. **Should open app** → See reset password screen
9. **Enter new password** → Watch requirements turn green
10. **Click "Reset password"** → See success message
11. **Auto-redirected to home** ✅

---

## ✅ Quick Checks

### Main Auth Page
- [ ] Email input works
- [ ] "Continue" button navigates to password screen
- [ ] "Send magic link" shows success screen
- [ ] Success screen shows email address
- [ ] "Back to sign in" returns to auth page

### Password Screen
- [ ] Email is shown with "Edit" button
- [ ] "Edit" returns to email screen
- [ ] Password input works (secure entry)
- [ ] "Sign in" attempts authentication
- [ ] "Forgot password?" navigates with email pre-filled ✅
- [ ] "Don't have account?" toggles to sign-up mode
- [ ] Sign-up mode shows "Create account" button

### Forgot Password Page
- [ ] Email is pre-filled from previous screen ✅
- [ ] Email input is editable
- [ ] "Send reset link" triggers email
- [ ] Success screen shows generic message
- [ ] "Back to sign in" returns to auth page
- [ ] Back button (arrow) works

### Reset Password Page
- [ ] Opens from email link
- [ ] Shows loading while exchanging code
- [ ] Password requirements shown
- [ ] Requirements turn green as typed
- [ ] Eye icon toggles password visibility
- [ ] "Reset password" validates and updates
- [ ] Success screen shows
- [ ] Auto-redirects to home after 2 seconds
- [ ] Expired link shows error screen

---

## 🐛 Common Issues

### "Forgot password?" does nothing
**Status:** ✅ FIXED
- Route now uses proper query parameter
- Email is passed via `?email=...`

### Email not pre-filled on forgot password page
**Check:** Make sure you entered email before clicking "Forgot password?"
**Status:** ✅ Working - email is pre-filled

### Reset link doesn't open app
**Mobile:** Check deep linking is configured (`everreach://`)
**Web:** Should open in same browser tab
**Expo Go:** Use `exp://` redirect URLs in Supabase

### Password requirements don't update
**Check:** Make sure you're typing in the "New password" field
**Should work:** Requirements update in real-time

---

## 🎯 Happy Path Tests

### Test 1: Sign Up Flow
```
1. Open app
2. Enter: test@example.com
3. Click "Continue"
4. Click "Don't have account? Sign up"
5. Enter: Password123
6. Watch requirements turn green ✅
7. Click "Create account"
8. See "Check your email" success ✅
```

### Test 2: Sign In Flow
```
1. Open app
2. Enter: existing@example.com
3. Click "Continue"
4. Enter: correctpassword
5. Click "Sign in"
6. Should land on home ✅
```

### Test 3: Magic Link Flow
```
1. Open app
2. Enter: test@example.com
3. Click "Send magic link"
4. See "Check your email" ✅
5. Open email → click link
6. Should sign in automatically ✅
```

### Test 4: Forgot Password Flow
```
1. Open app
2. Enter: test@example.com
3. Click "Continue"
4. Click "Forgot password?"
5. Email pre-filled ✅
6. Click "Send reset link"
7. See "Check your email" ✅
8. Open email → click link
9. Opens reset screen ✅
10. Enter: NewPassword123
11. Requirements turn green ✅
12. Click "Reset password"
13. See success ✅
14. Auto-redirects to home ✅
```

---

## 📱 Platform-Specific Tests

### iOS (Expo Go)
- [ ] Deep links work (`exp://`)
- [ ] Back navigation works
- [ ] Keyboard avoidance works
- [ ] Email opens in external app
- [ ] Can return to app after email

### Android (Expo Go)
- [ ] Deep links work (`exp://`)
- [ ] Back button works
- [ ] Keyboard behavior correct
- [ ] Email opens correctly
- [ ] Can return to app

### Web
- [ ] All navigation works
- [ ] Email opens in new tab (or same tab)
- [ ] Reset link opens same browser
- [ ] Back/forward browser buttons work
- [ ] Mobile web responsive

---

## 🔧 Developer Tests

### Error Handling
- [ ] Wrong password → error shown
- [ ] Weak password → validation errors
- [ ] Passwords don't match → error shown
- [ ] Invalid email format → error shown
- [ ] Network error → error shown
- [ ] Expired reset link → error page shown

### Edge Cases
- [ ] Empty email → validation error
- [ ] Very long email → handled
- [ ] Special characters in password → works
- [ ] Paste password → works
- [ ] Auto-fill password → works
- [ ] Rapid clicking → no duplicate requests

### State Management
- [ ] Loading states show correctly
- [ ] Success states clear properly
- [ ] Error states clear on retry
- [ ] Back navigation preserves state
- [ ] Edit email preserves password mode

---

## 🚀 Final Checks Before Production

- [ ] All flows tested on all platforms
- [ ] Email deliverability tested
- [ ] Reset link expires correctly (1 hour)
- [ ] Magic links work
- [ ] Deep linking configured
- [ ] Supabase redirects configured
- [ ] Analytics events firing
- [ ] Error tracking working
- [ ] HTTPS in production
- [ ] Email templates branded

---

**Last Updated:** November 2, 2025  
**Status:** Forgot password navigation ✅ FIXED
