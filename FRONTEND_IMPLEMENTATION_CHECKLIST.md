# Frontend Implementation Checklist

**Date:** November 3, 2025  
**Purpose:** Track all frontend changes needed after backend deployment  
**Priority:** 🔴 HIGH - Fixes critical UX issues

---

## 🎯 Overview

**Backend Status:** ✅ Deployed  
**Frontend Status:** ⏳ Pending implementation  
**Estimated Time:** 6-8 hours total

---

## 📋 Checklist

### Phase 1: Critical Fixes (2-3 hours)

#### ✅ Task 1.1: Fix Import Route Mismatch
**Priority:** 🔴 CRITICAL  
**Time:** 30 minutes  
**Issue:** Backend redirects to `/settings/imports/:id`, frontend shows `/import-third-party`

**Action Items:**
- [ ] Choose implementation approach:
  - **Option A (Recommended):** Create `/app/settings/imports/[jobId].tsx`
  - **Option B:** Update backend redirect to `/import-third-party?job_id=`
- [ ] If Option A: Create new route file
- [ ] Test OAuth callback flow
- [ ] Verify deep linking works

**Files to Modify:**
```
Option A:
- app/settings/imports/[jobId].tsx (new)
- app/settings/imports/index.tsx (update navigation)

Option B:
- backend: app/api/v1/contacts/import/[provider]/callback/route.ts
```

**Test:**
```bash
# 1. Start Google OAuth import
# 2. Verify redirect after OAuth succeeds
# 3. Check URL matches expected pattern
```

---

#### ✅ Task 1.2: Display Screenshots in Personal Notes
**Priority:** 🔴 HIGH  
**Time:** 1 hour  
**Issue:** Screenshots not showing images, contact chips missing

**Action Items:**
- [ ] Update `PersonaNote` TypeScript interface
- [ ] Add `linked_contacts` field to type
- [ ] Update `PersonalNoteCard` component:
  - [ ] Show `<Image>` for screenshot types
  - [ ] Render contact chips
  - [ ] Make chips clickable (navigate to contact)
- [ ] Test with existing screenshots

**Files to Modify:**
```
- types/personalNotes.ts
- components/PersonalNoteCard.tsx
- app/personal-notes.tsx
```

**Test:**
```bash
# 1. Upload screenshot
# 2. Link to contacts
# 3. Verify image displays
# 4. Verify contact chips show
# 5. Tap chip → navigates to contact
```

---

#### ✅ Task 1.3: Fix CORS Errors (No Frontend Changes!)
**Priority:** 🟢 INFO ONLY  
**Time:** 0 minutes  
**Issue:** CORS errors in console - backend fix already deployed

**Action Items:**
- [ ] Verify CORS errors gone after backend deployment
- [ ] Check browser console for `/api/telemetry/performance`
- [ ] Check browser console for `/api/telemetry/events`

**Test:**
```bash
# 1. Open app
# 2. Check browser console (F12)
# 3. Should see NO red CORS errors
# 4. Telemetry should send successfully (status 204)
```

---

### Phase 2: Push Notifications (3-4 hours)

#### ✅ Task 2.1: Register Push Tokens
**Priority:** 🟡 HIGH  
**Time:** 1 hour  
**Issue:** Users can't receive import completion notifications

**Action Items:**
- [ ] Install dependencies (if needed): `expo-notifications`, `expo-device`
- [ ] Create `registerForPushNotifications()` function
- [ ] Request permissions on app start
- [ ] Get Expo push token
- [ ] Send token to backend: `POST /v1/me/push-tokens`
- [ ] Handle permission denied gracefully
- [ ] Test on iOS and Android

**Files to Modify:**
```
- app/_layout.tsx or app/index.tsx
- lib/notifications.ts (new)
```

**Code:**
```typescript
// lib/notifications.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

export async function registerForPushNotifications(authToken: string) {
  if (!Device.isDevice) {
    console.log('Push notifications only work on physical devices');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push permission denied');
    return null;
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;

  await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/v1/me/push-tokens`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      token,
      platform: Platform.OS,
    }),
  });

  return token;
}
```

**Test:**
```bash
# 1. Launch app on physical device
# 2. Accept push permission
# 3. Verify token registered in Supabase push_tokens table
# 4. Send test notification via backend
```

---

#### ✅ Task 2.2: Listen for Push Notifications
**Priority:** 🟡 HIGH  
**Time:** 1 hour  
**Issue:** App receives notifications but doesn't handle them

**Action Items:**
- [ ] Configure notification handler
- [ ] Listen for foreground notifications (show alert)
- [ ] Listen for notification taps (navigate to correct screen)
- [ ] Handle import completion notifications
- [ ] Handle import ready notifications
- [ ] Handle import failed notifications

**Files to Modify:**
```
- app/_layout.tsx
```

**Code:**
```typescript
// app/_layout.tsx
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function RootLayout() {
  useEffect(() => {
    const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
      Alert.alert(
        notification.request.content.title || 'Notification',
        notification.request.content.body || ''
      );
    });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      
      if (data.type === 'import_complete' || data.type === 'import_ready') {
        router.push(`/import-third-party?job_id=${data.jobId}`);
      }
    });

    return () => {
      foregroundSubscription.remove();
      responseSubscription.remove();
    };
  }, []);

  return <Slot />;
}
```

**Test:**
```bash
# 1. Start import
# 2. Close app or navigate away
# 3. Wait for import to complete
# 4. Verify push notification received
# 5. Tap notification → opens to import screen
```

---

#### ✅ Task 2.3: Create Notification Center
**Priority:** 🟢 MEDIUM  
**Time:** 2 hours  
**Issue:** No way to view notification history

**Action Items:**
- [ ] Create `/app/(tabs)/notifications.tsx`
- [ ] Fetch notifications from backend
- [ ] Display unread count badge
- [ ] Mark as read on tap
- [ ] Add "Mark all as read" button
- [ ] Add pull-to-refresh
- [ ] Handle empty state

**Files to Modify:**
```
- app/(tabs)/notifications.tsx (new)
- app/(tabs)/_layout.tsx (add notifications tab)
- hooks/useNotifications.ts (new)
```

**Code:**
```typescript
// hooks/useNotifications.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useNotifications() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/api/v1/me/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.json();
    },
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`${API_URL}/api/v1/me/notifications/${id}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  return {
    notifications: data?.items || [],
    unreadCount: data?.items.filter(n => !n.read).length || 0,
    markRead,
    isLoading,
  };
}
```

**Test:**
```bash
# 1. Navigate to notifications tab
# 2. Verify notifications display
# 3. Tap notification → marks as read
# 4. Test "Mark all as read"
# 5. Verify unread badge updates
```

---

### Phase 3: UX Improvements (1-2 hours)

#### ✅ Task 3.1: Add "We'll notify you" Message
**Priority:** 🟢 LOW  
**Time:** 30 minutes  
**Issue:** Users don't know they can navigate away

**Action Items:**
- [ ] Update import screen with message
- [ ] Show while `status === 'fetching'`
- [ ] Add visual indicator (bell icon)
- [ ] Make it dismissible

**Files to Modify:**
```
- app/import-third-party.tsx
```

**Code:**
```typescript
{job.status === 'fetching' && (
  <View style={styles.notificationBanner}>
    <Icon name="bell" size={20} color="#7c3aed" />
    <Text style={styles.bannerText}>
      Fetching contacts... We'll notify you when ready! Feel free to navigate away.
    </Text>
  </View>
)}
```

**Test:**
```bash
# 1. Start import
# 2. Verify banner shows
# 3. Navigate away
# 4. Come back → banner still there if fetching
```

---

#### ✅ Task 3.2: Show Import Progress
**Priority:** 🟢 LOW  
**Time:** 30 minutes  
**Issue:** No visual feedback on progress

**Action Items:**
- [ ] Add progress bar component
- [ ] Show `processed / total` contacts
- [ ] Update in real-time via polling or websocket
- [ ] Animate progress changes

**Files to Modify:**
```
- app/import-third-party.tsx
- components/ProgressBar.tsx (new)
```

**Code:**
```typescript
{job.status === 'processing' && (
  <ProgressBar
    value={job.processed_contacts / job.total_contacts}
    label={`${job.processed_contacts} / ${job.total_contacts} contacts`}
    animated
  />
)}
```

**Test:**
```bash
# 1. Start import
# 2. Watch progress bar animate
# 3. Verify count updates
# 4. Verify completes at 100%
```

---

#### ✅ Task 3.3: Better Error Messages
**Priority:** 🟢 MEDIUM  
**Time:** 30 minutes  
**Issue:** Generic "Import failed" not helpful

**Action Items:**
- [ ] Show `job.error_message` from backend
- [ ] Add "Try Again" button
- [ ] Add "Contact Support" link
- [ ] Log errors to analytics

**Files to Modify:**
```
- app/import-third-party.tsx
```

**Code:**
```typescript
{job.status === 'failed' && (
  <View style={styles.errorContainer}>
    <Icon name="alert-circle" size={48} color="#ef4444" />
    <Text style={styles.errorTitle}>Import Failed</Text>
    <Text style={styles.errorMessage}>
      {job.error_message || 'Unknown error occurred'}
    </Text>
    <Button
      title="Try Again"
      onPress={() => restartImport(job.provider)}
    />
    <Button
      title="Contact Support"
      variant="ghost"
      onPress={() => router.push('/support')}
    />
  </View>
)}
```

**Test:**
```bash
# 1. Trigger failed import (revoke OAuth)
# 2. Verify error message shows
# 3. Test "Try Again" button
# 4. Test "Contact Support" link
```

---

## 📊 Testing Matrix

### Device Testing

| Feature | iOS | Android | Web |
|---------|-----|---------|-----|
| Push Notifications | ⏳ | ⏳ | N/A |
| Screenshot Display | ⏳ | ⏳ | ⏳ |
| Import Flow | ⏳ | ⏳ | ⏳ |
| Notification Center | ⏳ | ⏳ | ⏳ |

### User Flow Testing

- [ ] **Happy Path:** OAuth → Import → Notification → Review → Confirm
- [ ] **Navigate Away:** Start import → close app → receive notification → tap notification
- [ ] **Failed Import:** OAuth fails → see error → try again → succeeds
- [ ] **No Permissions:** Deny push → import still works → see in-app notifications only

---

## 🚀 Deployment Checklist

### Before Starting
- [ ] Pull latest from `feat/dev-dashboard` branch
- [ ] Verify backend migrations ran successfully
- [ ] Backend deployed to production
- [ ] Test backend endpoints with Postman

### After Each Phase
- [ ] Test on iOS device
- [ ] Test on Android device
- [ ] Check for console errors
- [ ] Verify analytics tracking
- [ ] Update this checklist

### Before Production
- [ ] All checklist items completed
- [ ] All tests passing
- [ ] No console errors
- [ ] Performance tested (large imports)
- [ ] Accessibility tested (screen reader)
- [ ] Submit to App Store / Play Store

---

## 📝 Notes & Issues

### Known Issues
- Import route mismatch (backend vs frontend)
- Screenshots not displaying contact chips yet
- No push notification system yet

### Questions
- Should we add import history screen?
- Should we allow retry of failed imports?
- Should we add import scheduling?

### Future Improvements
- Real-time updates via WebSocket
- Import progress with percentage
- Duplicate detection before import
- Smart contact merging
- Import from CSV

---

## 📞 Support Resources

**Documentation:**
- Backend API: `docs/ALL_ENDPOINTS_MASTER_LIST.md`
- Import Flow: `IMPORT_FLOW_IMPROVEMENTS.md`
- Screenshot Fix: `FRONTEND_SCREENSHOT_NOTES_FIX.md`

**Code References:**
- Push Notifications: `IMPORT_FLOW_IMPROVEMENTS.md` lines 100-180
- Screenshot Display: `FRONTEND_SCREENSHOT_NOTES_FIX.md` lines 50-250
- Import Route Fix: `IMPORT_FLOW_IMPROVEMENTS.md` lines 70-100

---

## ✅ Sign-off

**Phase 1 Complete:** _______ Date: _______  
**Phase 2 Complete:** _______ Date: _______  
**Phase 3 Complete:** _______ Date: _______  
**Production Ready:** _______ Date: _______  

**Reviewed by:** _______  
**Tested by:** _______  
**Deployed by:** _______

---

**Status:** Ready for implementation  
**Estimated Total Time:** 6-8 hours  
**Priority Order:** Task 1.1 → Task 1.2 → Task 2.1 → Task 2.2 → Task 2.3 → Task 3.x
