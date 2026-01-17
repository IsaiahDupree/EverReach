# Debugging "Forgot Password?" Button

## Changes Made to Fix the Issue

### 1. **Added Console Logging**
The button now logs when clicked:
```typescript
console.log('[Auth] Forgot password clicked, email:', email);
console.log('[Auth] Navigating to:', route);
```

### 2. **Improved Touch Target**
- **Before:** 12px vertical padding, gray text
- **After:** 
  - 16px vertical + horizontal padding
  - Minimum 44px height (Apple's recommended touch target)
  - Purple text (#7C3AED) - more visible
  - Bold font (600 weight)
  - Active opacity feedback

### 3. **Added Test ID**
```typescript
testID="forgot-password-button"
```

---

## Why the Button Might Not Show

### ⚠️ The button ONLY shows when:
1. ✅ You're in **password mode** (after entering email and clicking "Continue")
2. ✅ You're in **sign-in mode** (NOT sign-up mode)

### ❌ The button WILL NOT show if:
- You're still on the email screen (haven't clicked "Continue" yet)
- You clicked "Don't have an account? Sign up" (sign-up mode)

---

## How to Test

### Step 1: Check Console
Open developer tools and look for these logs:
```
[Auth] Forgot password clicked, email: test@example.com
[Auth] Navigating to: /auth/forgot-password?email=test%40example.com
```

### Step 2: Verify You're in the Right Mode
```
Email Screen → [Continue] → Password Screen
                              ↓
                         Sign In Mode
                              ↓
                    "Forgot password?" button HERE ✅
```

If you see "Create account" button instead of "Sign in":
```
You're in Sign-Up Mode
↓
Click "Already have an account? Sign in"
↓
Now you'll see "Forgot password?" ✅
```

---

## Testing Flow

### ✅ Correct Flow:
```bash
1. Open app
2. Enter: test@example.com
3. Click "Continue"
4. Should see:
   - Email with "Edit" button
   - Password input field
   - "Sign in" button
   - "Forgot password?" button ← HERE
   - "Don't have an account? Sign up" link
```

### ❌ If in Sign-Up Mode:
```bash
1. Open app
2. Enter: test@example.com  
3. Click "Continue"
4. Click "Don't have an account? Sign up"
5. Now see:
   - "Create account" button
   - NO "Forgot password?" button (by design)
   - "Already have an account? Sign in" link
   
To see forgot password:
6. Click "Already have an account? Sign in"
7. Now "Forgot password?" button appears ✅
```

---

## What to Check

### 1. **Is the Button Visible?**
Look for the purple text link that says "Forgot password?"

It should appear:
- Below the "Sign in" button
- Above the "Don't have an account?" link
- With purple color (#7C3AED)
- In bold text

### 2. **Can You Tap It?**
The button now has:
- Larger touch area (44px minimum height)
- Padding around it
- Visual feedback when tapped (opacity change)

### 3. **Does It Navigate?**
When tapped, you should:
1. See console logs
2. Navigate to forgot password page
3. Email should be pre-filled

---

## Common Issues

### Issue 1: Button Not Visible
**Cause:** You're in sign-up mode  
**Fix:** Click "Already have an account? Sign in"

### Issue 2: Button Visible But Not Responding
**Check Console:** Look for errors or logs  
**Try:** 
- Reload the app
- Check if keyboard is blocking it
- Try tapping slightly higher/lower
- Check if another element is overlaying it

### Issue 3: Button Navigates But Page Not Found
**Check:**
```bash
ls app/auth/forgot-password.tsx
```
Should exist ✅

**Check Console:** Should NOT see 404 or "route not found"

### Issue 4: Email Not Pre-filled
**Check Console:** Should see email in the log  
**URL Should Be:** `/auth/forgot-password?email=test%40example.com`

---

## Debugging Commands

### Check if Route Exists:
```bash
cd /Users/isaiahdupree/Documents/Software/EverReach/rork-ai-enhanced-personal-crm
ls -la app/auth/forgot-password.tsx
```
Should output: File exists

### Check for Errors:
Open React Native debugger and look for:
- Navigation errors
- Route not found errors
- Touch handler errors

### Test Navigation Directly:
In your app, try adding a test button:
```typescript
<TouchableOpacity onPress={() => router.push('/auth/forgot-password' as any)}>
  <Text>Test Navigate</Text>
</TouchableOpacity>
```

---

## Current Button Code

```typescript
{mode === 'password' && !isSignUp && (
  <TouchableOpacity 
    style={styles.secondaryButton} 
    onPress={handleForgotPassword}
    testID="forgot-password-button"
    activeOpacity={0.7}
  >
    <Text style={styles.secondaryButtonText}>Forgot password?</Text>
  </TouchableOpacity>
)}
```

**Conditions:**
- `mode === 'password'` → Must be on password screen
- `!isSignUp` → Must NOT be in sign-up mode

---

## Current Handler Code

```typescript
const handleForgotPassword = () => {
  console.log('[Auth] Forgot password clicked, email:', email);
  try {
    const emailParam = email ? `?email=${encodeURIComponent(email)}` : '';
    const route = `/auth/forgot-password${emailParam}`;
    console.log('[Auth] Navigating to:', route);
    router.push(route as any);
  } catch (err) {
    console.error('[Auth] Navigation error:', err);
  }
};
```

**What It Does:**
1. Logs click event
2. Encodes email for URL
3. Constructs route with query parameter
4. Logs final route
5. Navigates
6. Catches and logs any errors

---

## Visual Changes

### Before:
```
Forgot password?
  ↑ Small, gray, hard to see
```

### After:
```
Forgot password?
  ↑ Larger, purple, bold, easier to tap
```

---

## Next Steps to Debug

1. **Reload the app completely**
   ```bash
   # Kill and restart
   npx expo start --clear
   ```

2. **Check console for logs**
   - Open debugger
   - Click "Forgot password?"
   - Look for `[Auth]` logs

3. **Verify mode state**
   - Make sure you're in password mode
   - Make sure you're NOT in sign-up mode

4. **Try on different platform**
   - If on web, try mobile
   - If on mobile, try web
   - Different platforms might behave differently

5. **Check for overlays**
   - Make sure keyboard isn't covering button
   - Check if any modals/overlays are active
   - Try scrolling down if needed

---

## Expected Behavior

### When Button Works:
```
1. Click "Forgot password?"
   ↓
2. Console: [Auth] Forgot password clicked...
   ↓
3. Console: [Auth] Navigating to: /auth/forgot-password?email=...
   ↓
4. Screen changes to forgot password page
   ↓
5. Email is pre-filled
   ↓
6. Success! ✅
```

---

## Contact for Help

If still not working after all these checks:

1. **Share console logs** - What do you see when clicking?
2. **Share screenshot** - What's on screen when you tap?
3. **Share state** - Are you in sign-in or sign-up mode?
4. **Share platform** - Web, iOS, or Android?

---

**Last Updated:** November 2, 2025  
**Status:** Button improved with better touch target and logging
