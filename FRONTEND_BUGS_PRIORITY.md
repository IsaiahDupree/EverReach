# Frontend Bugs - Priority List

**Date Reported:** November 3, 2025  
**App:** EverReach Mobile (Expo/React Native)  
**Total Issues:** 4  
**Priority Breakdown:** 2 HIGH, 2 MEDIUM

---

## 🐛 Bug #1: Profile Image Upload (CORS Issue)

**Priority:** 🔴 HIGH  
**Status:** ⏳ Open  
**Component:** Profile Settings / Image Upload  
**Platform:** iOS + Android

### Problem Description

Profile photo upload is failing due to CORS error. Users cannot set their profile image.

### Steps to Reproduce

1. Navigate to Profile Settings
2. Tap on profile photo/avatar
3. Select "Upload Photo" or "Take Photo"
4. Select image from gallery or take new photo
5. **Error occurs:** CORS error prevents upload

### Expected Behavior

- User selects image
- Image uploads to Supabase storage
- Profile photo updates immediately
- Image displays in all app screens (profile, home, etc.)

### Actual Behavior

- CORS error blocks upload
- Profile photo remains empty/default
- User sees error message or loading spinner hangs

### Technical Details

**Likely Causes:**
1. **Direct Supabase upload bypassing backend API** (most likely)
   - Frontend calling Supabase storage directly
   - CORS policy not configured for mobile app domain
   
2. **Missing Authorization header**
   - Supabase RLS policy rejecting upload
   - Missing or expired JWT token

3. **Incorrect bucket configuration**
   - Storage bucket not public or missing policies
   - Wrong bucket name in code

**Affected Endpoints:**
- Supabase Storage: `/storage/v1/object/avatars/*` (direct upload)
- Should use: `POST /api/v1/files/upload` (backend proxy)

### Recommended Fix

**Option 1: Use Backend API (Recommended)**

Instead of direct Supabase upload, use backend API:

```typescript
// BEFORE (causes CORS):
const { data, error } = await supabase.storage
  .from('avatars')
  .upload(`${userId}.jpg`, file);

// AFTER (fixes CORS):
const formData = new FormData();
formData.append('file', file);
formData.append('type', 'avatar');

const response = await fetch('https://ever-reach-be.vercel.app/api/v1/files/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const { file_url } = await response.json();
```

**Option 2: Fix Supabase CORS (if keeping direct upload)**

Add allowed origins in Supabase dashboard:
- Settings → Storage → CORS Configuration
- Add: `exp://localhost:19000` (Expo dev)
- Add: `yourapp://` (production)

### Files to Check

- Profile settings screen: `app/(tabs)/settings.tsx` or `app/profile.tsx`
- Image upload logic: `lib/uploadImage.ts` or similar
- Avatar component: `components/Avatar.tsx`
- User update API call: Check if using backend `/api/v1/me` endpoint

### Testing Checklist

- [ ] Profile photo uploads successfully
- [ ] Image appears immediately after upload
- [ ] Image persists after app restart
- [ ] No CORS errors in console
- [ ] Works on iOS
- [ ] Works on Android
- [ ] Handles large images (compression)
- [ ] Shows loading state during upload
- [ ] Shows error if upload fails

---

## 🐛 Bug #2: User Greeting Not Showing Correct Name

**Priority:** 🔴 HIGH  
**Status:** ⏳ Open  
**Component:** Home Screen / User Context  
**Platform:** iOS + Android

### Problem Description

Welcome message not showing user's first name correctly. Should display "Welcome, [First Name]" but showing incorrect or missing name.

### Sub-Issues

**2a. Name not displaying at all**
- Shows "Welcome, " with no name
- Shows "Welcome, User" (generic)

**2b. Google Sign-up not auto-populating name**
- User signs up via Google OAuth
- Name should auto-populate from Google profile
- Currently not happening or showing wrong name

### Steps to Reproduce

**For Issue 2a:**
1. Sign up with email/password
2. Complete onboarding
3. Navigate to Home screen
4. **Bug:** Welcome message shows no name or "User"

**For Issue 2b:**
1. Sign up with "Continue with Google"
2. Authorize Google account
3. Complete onboarding
4. Navigate to Home screen
5. **Bug:** Name not pulled from Google profile

### Expected Behavior

**Email Sign-up:**
- User enters first name during onboarding
- Welcome message shows: "Welcome, John"

**Google Sign-up:**
- Google profile provides `given_name` → "John"
- Auto-populate first name field
- Welcome message shows: "Welcome, John"

### Actual Behavior

- Welcome message shows: "Welcome, " or "Welcome, User"
- First name not stored in database
- Google OAuth not extracting name from profile

### Technical Details

**Likely Causes:**

1. **First name not saved to database**
   - User signs up but `first_name` field not populated
   - Check `users` or `profiles` table

2. **Google OAuth not extracting name**
   - OAuth callback not parsing `user_metadata`
   - Need to extract `given_name` from Google response

3. **User context not loading correctly**
   - Home screen not fetching user data
   - Using wrong field (e.g., `name` instead of `first_name`)

**Database Check:**
```sql
-- Check if first_name is populated
SELECT id, email, raw_user_meta_data->>'given_name' as google_name, 
       raw_user_meta_data->>'full_name' as full_name
FROM auth.users 
WHERE email = 'user@example.com';
```

### Recommended Fix

**Fix 1: Save First Name During Onboarding**

```typescript
// app/onboarding.tsx
const handleComplete = async () => {
  // Save first name to database
  await fetch('https://ever-reach-be.vercel.app/api/v1/me', {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      first_name: firstName,
      last_name: lastName
    })
  });
};
```

**Fix 2: Extract Name from Google OAuth**

```typescript
// After Google OAuth success
const { data: { user } } = await supabase.auth.getUser();

// Extract name from user metadata
const firstName = user.user_metadata?.given_name || 
                  user.user_metadata?.name?.split(' ')[0] || 
                  '';

// Save to backend
await fetch('https://ever-reach-be.vercel.app/api/v1/me', {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    first_name: firstName
  })
});
```

**Fix 3: Display Name in Home Screen**

```typescript
// app/(tabs)/home.tsx
const { data: user } = await fetch('https://ever-reach-be.vercel.app/api/v1/me', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json());

return (
  <Text>Welcome, {user.first_name || 'there'}</Text>
);
```

### Files to Check

- Onboarding screen: `app/onboarding.tsx`
- Google OAuth handler: `app/auth/google-callback.tsx`
- Home screen: `app/(tabs)/home.tsx`
- User context/provider: `context/UserContext.tsx`
- Backend endpoint: `backend-vercel/app/api/v1/me/route.ts`

### Testing Checklist

- [ ] Email sign-up: First name saved correctly
- [ ] Google sign-up: Name auto-populated from profile
- [ ] Home screen shows: "Welcome, [First Name]"
- [ ] Name persists after app restart
- [ ] Works for new users
- [ ] Works for existing users (migration)
- [ ] Handles users with no first name gracefully
- [ ] Special characters in names display correctly

---

## 🐛 Bug #3: Personal Notes - Attachments & Deletion

**Priority:** 🟡 MEDIUM  
**Status:** ⏳ Open  
**Component:** Personal Notes Screen  
**Platform:** iOS + Android

### Problem Description

Two issues with Personal Notes feature:
1. Attachments not displaying under notes
2. Cannot delete notes (no delete functionality)

### Sub-Issues

**3a. Attachments Not Displaying**

**Steps to Reproduce:**
1. Navigate to Personal Notes
2. View a note with attachments
3. **Bug:** Attachments not visible or not loading

**Expected:**
- Attachments shown below note content
- Can tap to view/download attachment
- Shows file type icon, name, size

**Actual:**
- No attachments displayed
- Or shows loading spinner indefinitely
- Or shows error

**3b. Cannot Delete Notes**

**Steps to Reproduce:**
1. Navigate to Personal Notes
2. Try to delete a note
3. **Bug:** No delete option available

**Expected:**
- Long-press on note → "Delete" option appears
- Or swipe left → Delete button
- Or tap note → menu with "Delete" option
- Confirm delete with dialog
- Note removed from list

**Actual:**
- No delete functionality exists
- Notes pile up with no way to remove

### Technical Details

**For Attachments (3a):**

**Likely Causes:**
1. Attachments not fetched with notes
2. Wrong field name (e.g., `attachments` vs `files`)
3. URL not constructed correctly
4. Storage bucket permissions

**API Check:**
```bash
# Check if attachments are returned
GET /api/v1/persona-notes?type=voice
# Response should include file_url for voice notes
```

**For Deletion (3b):**

**API Endpoint Available:**
```bash
DELETE /api/v1/me/persona-notes/:id
```

Backend supports deletion, just need to implement in UI.

### Recommended Fix

**Fix 3a: Display Attachments**

```typescript
// components/PersonalNoteCard.tsx
<View style={styles.noteCard}>
  <Text>{note.body_text}</Text>
  
  {/* Add attachment display */}
  {note.file_url && (
    <TouchableOpacity 
      style={styles.attachment}
      onPress={() => openFile(note.file_url)}
    >
      <Icon name="paperclip" />
      <Text>Voice Note ({formatDuration(note.duration_sec)})</Text>
    </TouchableOpacity>
  )}
  
  {note.transcript && (
    <View style={styles.transcript}>
      <Text style={styles.transcriptLabel}>Transcription:</Text>
      <Text>{note.transcript}</Text>
    </View>
  )}
</View>
```

**Fix 3b: Add Delete Functionality**

```typescript
// app/personal-notes.tsx
import { Swipeable } from 'react-native-gesture-handler';

const handleDelete = async (noteId: string) => {
  Alert.alert(
    'Delete Note',
    'Are you sure you want to delete this note?',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await fetch(
            `https://ever-reach-be.vercel.app/api/v1/me/persona-notes/${noteId}`,
            {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
            }
          );
          // Refresh notes list
          refetch();
        }
      }
    ]
  );
};

// In render:
<Swipeable
  renderRightActions={() => (
    <TouchableOpacity 
      style={styles.deleteButton}
      onPress={() => handleDelete(note.id)}
    >
      <Icon name="trash" color="white" />
      <Text style={styles.deleteText}>Delete</Text>
    </TouchableOpacity>
  )}
>
  <PersonalNoteCard note={note} />
</Swipeable>
```

### Files to Check

- Personal notes screen: `app/personal-notes.tsx` or `app/(tabs)/notes.tsx`
- Note card component: `components/PersonalNoteCard.tsx`
- Notes API: `lib/api/notes.ts`
- Backend: `backend-vercel/app/api/v1/me/persona-notes/route.ts`

### Testing Checklist

**Attachments:**
- [ ] Voice note attachments display correctly
- [ ] Can play audio attachments
- [ ] Transcriptions display below audio
- [ ] File size/duration shown
- [ ] Works for old and new notes

**Deletion:**
- [ ] Swipe-to-delete works
- [ ] Confirmation dialog appears
- [ ] Note deleted from database
- [ ] Note removed from UI immediately
- [ ] Can undo delete (optional)
- [ ] Haptic feedback on delete
- [ ] Works on iOS
- [ ] Works on Android

---

## 🐛 Bug #4: Back Arrow Not Visible on Personal Profile

**Priority:** 🟡 MEDIUM  
**Status:** ⏳ Open  
**Component:** Personal Profile Screen / Navigation  
**Platform:** iOS + Android

### Problem Description

Back arrow/button not visible on Personal Profile page due to dark/light mode contrast issue.

### Steps to Reproduce

1. Navigate to Personal Profile screen
2. **Bug:** Back button not visible or very hard to see
3. May vary between light mode and dark mode

### Expected Behavior

- Back arrow clearly visible in both light and dark mode
- High contrast against background
- Tappable area obvious to users

### Actual Behavior

- Back arrow same color as background (invisible)
- Or too light to see clearly
- Users can't figure out how to go back

### Technical Details

**Likely Causes:**

1. **Header style not respecting theme**
   - Header background color matches arrow color
   - No theme-aware styling

2. **Navigation options not configured**
   - Missing `headerTintColor` in navigation options
   - Not using theme colors

3. **Custom header component issue**
   - Custom back button not styled correctly

### Recommended Fix

**Option 1: Configure Navigation Options**

```typescript
// app/personal-profile.tsx or _layout.tsx
<Stack.Screen
  name="personal-profile"
  options={{
    title: "Personal Profile",
    headerShown: true,
    headerTintColor: colorScheme === 'dark' ? '#fff' : '#000', // ← Fix
    headerStyle: {
      backgroundColor: colorScheme === 'dark' ? '#1f2937' : '#fff'
    }
  }}
/>
```

**Option 2: Use Theme Provider**

```typescript
// app/_layout.tsx
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/Colors';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  
  return (
    <Stack
      screenOptions={{
        headerTintColor: Colors[colorScheme ?? 'light'].text,
        headerStyle: {
          backgroundColor: Colors[colorScheme ?? 'light'].background
        }
      }}
    >
      {/* screens */}
    </Stack>
  );
}
```

**Option 3: Custom Back Button**

```typescript
// components/CustomBackButton.tsx
import { useColorScheme } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export function CustomBackButton() {
  const colorScheme = useColorScheme();
  const navigation = useNavigation();
  
  return (
    <TouchableOpacity 
      onPress={() => navigation.goBack()}
      style={styles.backButton}
    >
      <Icon 
        name="arrow-left" 
        size={24} 
        color={colorScheme === 'dark' ? '#fff' : '#000'}
      />
    </TouchableOpacity>
  );
}
```

### Files to Check

- Profile screen: `app/personal-profile.tsx`
- Layout configuration: `app/_layout.tsx`
- Theme colors: `constants/Colors.ts`
- Navigation options: Check `screenOptions` in Stack.Navigator

### Testing Checklist

- [ ] Back arrow visible in light mode
- [ ] Back arrow visible in dark mode
- [ ] High contrast in both themes
- [ ] Tappable area adequate (44x44pt minimum)
- [ ] Haptic feedback on tap
- [ ] Works on iOS
- [ ] Works on Android
- [ ] Consistent across all screens

---

## 📊 Summary Table

| Bug # | Title | Priority | Component | Effort | Impact |
|-------|-------|----------|-----------|--------|--------|
| 1 | Profile Image Upload (CORS) | 🔴 HIGH | Profile | 2-3 hrs | Users can't set photo |
| 2 | User Greeting Wrong Name | 🔴 HIGH | Home/Auth | 2-4 hrs | Poor personalization |
| 3a | Attachments Not Displaying | 🟡 MEDIUM | Notes | 1-2 hrs | Can't access files |
| 3b | Cannot Delete Notes | 🟡 MEDIUM | Notes | 1-2 hrs | Notes accumulate |
| 4 | Back Arrow Not Visible | 🟡 MEDIUM | Navigation | 30 min | Navigation confusion |

**Total Estimated Effort:** 7-12 hours

---

## 🎯 Recommended Fix Order

### Sprint 1 (Week 1)
1. **Bug #4: Back Arrow** (30 min) - Quick win, affects all navigation
2. **Bug #1: Profile Image Upload** (2-3 hrs) - High priority, user-facing
3. **Bug #2: User Greeting** (2-4 hrs) - High priority, onboarding issue

### Sprint 2 (Week 2)
4. **Bug #3a: Display Attachments** (1-2 hrs) - Important for note features
5. **Bug #3b: Delete Notes** (1-2 hrs) - Important for note management

---

## 📋 Issue Tracker Format

### For GitHub Issues / Linear / Notion

**Template for Each Bug:**

```markdown
## [Bug] Profile Image Upload Failing (CORS)

**Priority:** High
**Component:** Profile Settings
**Platforms:** iOS, Android

**Description:**
Profile photo upload is failing due to CORS error. Users cannot set their profile image.

**Steps to Reproduce:**
1. Navigate to Profile Settings
2. Tap on profile photo
3. Select image from gallery
4. CORS error occurs

**Expected:** Image uploads successfully
**Actual:** CORS error blocks upload

**Technical Details:**
- Likely using direct Supabase upload
- Should use backend API: POST /api/v1/files/upload
- See: FRONTEND_BUGS_PRIORITY.md for detailed fix

**Labels:** `bug`, `high-priority`, `frontend`, `profile`
```

---

## 🔍 Testing Commands

### Check Backend Endpoints

```bash
# Test profile update
curl -X PATCH https://ever-reach-be.vercel.app/api/v1/me \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"first_name":"John"}'

# Test file upload
curl -X POST https://ever-reach-be.vercel.app/api/v1/files/upload \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@avatar.jpg" \
  -F "type=avatar"

# Test note deletion
curl -X DELETE https://ever-reach-be.vercel.app/api/v1/me/persona-notes/NOTE_ID \
  -H "Authorization: Bearer TOKEN"
```

---

**Created:** November 3, 2025, 10:25 PM  
**Ready for:** GitHub Issues, Linear, Jira, Notion, etc.  
**Documentation:** Complete with fixes, testing, and priorities
