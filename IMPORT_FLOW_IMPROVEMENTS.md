# Contact Import Flow Improvements

**Date:** November 3, 2025  
**Issue:** URL mismatch and missing notifications  
**Status:** ⚠️ Needs fixing + improvements ready

---

## 🚨 Critical Issue: URL Mismatch

### What's Happening

**Backend redirects to:**
```
https://www.everreach.app/settings/imports/3bcb6b70-595a-4a8e-b793-b9384acac0de
```

**User actually lands at:**
```
https://www.everreach.app/import-third-party?job_id=3bcb6b70-595a-4a8e-b793-b9384acac0de
```

### Root Cause

The backend callback (line 91 in `callback/route.ts`) redirects to:
```typescript
`${process.env.NEXT_PUBLIC_FRONTEND_URL}/settings/imports/${job_id}`
```

But the frontend has a different route structure. Likely scenarios:
1. Frontend doesn't have `/settings/imports/:id` route
2. Frontend is catching the 404 and redirecting to `/import-third-party`
3. Or there's a redirect rule somewhere

---

## ✅ Backend Fix (Already Done!)

### Notifications System ✅

**What Was Added:**

1. **Database Tables:**
   - `notifications` - In-app notifications
   - `push_tokens` - Expo push tokens

2. **Notification Functions:**
   - `notifyImportComplete()` - Success with stats
   - `notifyImportFailed()` - Error with details
   - `notifyImportReady()` - Contacts fetched, ready to review

3. **Integration:**
   - Import cron job now sends notifications
   - Expo Push API integration
   - Users get notified without polling

**Migration:** `20251104_notifications_system.sql`

---

## 🔧 Frontend Fixes Needed

### Fix #1: Match Backend Redirect URL

**Option A: Update Frontend Route** (Recommended)

Create the route that backend expects:
```
app/settings/imports/[jobId].tsx
```

This matches REST conventions and keeps imports under settings.

**Option B: Update Backend Redirect**

Change backend to redirect where frontend expects:
```typescript
// backend-vercel/app/api/v1/contacts/import/[provider]/callback/route.ts
return NextResponse.redirect(
  `${process.env.NEXT_PUBLIC_FRONTEND_URL}/import-third-party?job_id=${job_id}`
);
```

**Recommendation:** Use Option A (update frontend route) because:
- More RESTful structure
- Keeps imports under settings menu
- Better URL hierarchy

---

### Fix #2: Register Push Tokens

**File:** `app/index.tsx` or `App.tsx`

**Add Push Token Registration:**

```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

async function registerForPushNotifications() {
  if (!Device.isDevice) {
    console.log('Push notifications only work on physical devices');
    return null;
  }

  // Request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Failed to get push token for push notification');
    return null;
  }

  // Get Expo push token
  const token = (await Notifications.getExpoPushTokenAsync()).data;

  // Register with backend
  await fetch(`${API_URL}/v1/me/push-tokens`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      token,
      platform: Platform.OS, // 'ios' or 'android'
    }),
  });

  return token;
}

// Call this after user logs in
useEffect(() => {
  if (user) {
    registerForPushNotifications();
  }
}, [user]);
```

---

### Fix #3: Add Notification Center

**File:** `app/(tabs)/notifications.tsx` (new)

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FlatList, View, Text, Pressable } from 'react-native';

export default function NotificationsScreen() {
  const queryClient = useQueryClient();

  // Fetch notifications
  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/v1/me/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.json();
    },
  });

  // Mark as read mutation
  const markRead = useMutation({
    mutationFn: async (notificationId: string) => {
      await fetch(`${API_URL}/v1/me/notifications/${notificationId}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  return (
    <FlatList
      data={notifications?.items || []}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => markRead.mutate(item.id)}
          style={[
            styles.notification,
            !item.read && styles.unread
          ]}
        >
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.body}>{item.body}</Text>
          <Text style={styles.time}>
            {new Date(item.created_at).toLocaleString()}
          </Text>
        </Pressable>
      )}
      keyExtractor={item => item.id}
    />
  );
}
```

---

### Fix #4: Listen for Push Notifications

**File:** `app/_layout.tsx`

```typescript
import * as Notifications from 'expo-notifications';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function RootLayout() {
  // Listen for notifications
  useEffect(() => {
    // Notification received while app is in foreground
    const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      
      // Show in-app toast or alert
      Alert.alert(
        notification.request.content.title || 'Notification',
        notification.request.content.body || ''
      );
    });

    // Notification tapped by user
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      
      // Navigate based on notification type
      if (data.type === 'import_complete' || data.type === 'import_ready') {
        navigation.navigate('ImportThirdParty', { jobId: data.jobId });
      } else if (data.type === 'import_failed') {
        navigation.navigate('ImportThirdParty', { jobId: data.jobId, error: true });
      }
    });

    return () => {
      foregroundSubscription.remove();
      responseSubscription.remove();
    };
  }, []);

  return (
    // ... your app layout
  );
}
```

---

## 🎯 Backend Endpoints to Add

### 1. Push Token Management

**POST `/v1/me/push-tokens`** - Register token
```typescript
// backend-vercel/app/api/v1/me/push-tokens/route.ts
export async function POST(req: Request) {
  const user = await getUser(req);
  const { token, platform } = await req.json();
  
  await supabase
    .from('push_tokens')
    .upsert({
      user_id: user.id,
      token,
      platform,
      enabled: true,
      last_used_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,token'
    });
  
  return ok({ success: true });
}
```

**DELETE `/v1/me/push-tokens/:token`** - Unregister token

---

### 2. Notifications API

**GET `/v1/me/notifications`** - List notifications
```typescript
export async function GET(req: Request) {
  const user = await getUser(req);
  
  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);
  
  return ok({ items: data });
}
```

**POST `/v1/me/notifications/:id/read`** - Mark as read

**POST `/v1/me/notifications/read-all`** - Mark all as read

---

## 📊 User Experience Improvements

### Current Flow (Polling - Bad UX)

1. User connects Google ✅
2. Redirected to import page ✅
3. **User stares at screen polling every 3 seconds** ❌
4. After 30-60 seconds, contacts appear ⏰
5. User selects contacts ✅

**Problems:**
- User must wait and watch
- Battery drain from polling
- Network waste
- User might navigate away and miss completion

### New Flow (Push Notifications - Great UX)

1. User connects Google ✅
2. Redirected to import page ✅
3. **User sees: "Fetching contacts... We'll notify you when ready!"** ✅
4. **User can navigate away or close app** ✅
5. **Push notification: "📋 604 contacts ready to review!"** 🎉
6. User taps notification → Opens to selection screen ✅

**Benefits:**
- ✅ User doesn't wait
- ✅ No battery drain
- ✅ Works even if app is closed
- ✅ Better conversion (users come back)

---

## 🚀 Deployment Checklist

### Backend (Ready to Deploy!)

- [x] Notification system created (`lib/notifications.ts`)
- [x] Import cron updated to send notifications
- [x] Migration created (`20251104_notifications_system.sql`)
- [ ] Run migration in Supabase
- [ ] Create push token endpoints
- [ ] Create notifications API endpoints
- [ ] Deploy to Vercel

### Frontend (Needs Work)

- [ ] Fix route mismatch (Option A or B above)
- [ ] Add push token registration
- [ ] Add notification center screen
- [ ] Add push notification listener
- [ ] Show "We'll notify you" message
- [ ] Handle notification taps
- [ ] Test on iOS and Android

---

## 🔧 Quick Migration Commands

### 1. Run the notifications migration

**In Supabase Dashboard:**
```sql
-- Go to SQL Editor and run:
-- backend-vercel/supabase/migrations/20251104_notifications_system.sql
```

**Or via CLI:**
```bash
cd backend-vercel
npx supabase db push
```

### 2. Run the persona notes migration

```sql
-- backend-vercel/supabase/migrations/20251104_fix_persona_notes_complete.sql
```

### 3. Verify migrations

```sql
-- Check notifications table
SELECT COUNT(*) FROM notifications;

-- Check push_tokens table
SELECT COUNT(*) FROM push_tokens;

-- Check persona_notes has file_url (not image_url)
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'persona_notes' 
  AND column_name IN ('file_url', 'image_url');
-- Should only show 'file_url'
```

---

## 📝 Additional Improvements

### 1. Better Error Messages

Currently: `status: "failed"`  
Better: Show actual error to user

```typescript
if (job.status === 'failed') {
  Alert.alert(
    'Import Failed',
    `Google import failed: ${job.error_message || 'Unknown error'}. Please try again.`,
    [
      { text: 'Try Again', onPress: () => restartImport() },
      { text: 'Cancel', style: 'cancel' }
    ]
  );
}
```

### 2. Progress Bar

Show actual progress during fetch:
```typescript
<ProgressBar 
  value={job.processed_contacts / job.total_contacts} 
  label={`${job.processed_contacts} / ${job.total_contacts} contacts`}
/>
```

### 3. Import History

Show previous imports:
```typescript
GET /v1/contacts/import/list?limit=10

// Show:
// ✅ Google - 604 contacts - Oct 25, 2025
// ✅ Microsoft - 312 contacts - Oct 20, 2025
// ❌ Google - Failed - Oct 15, 2025
```

### 4. Retry Failed Imports

```typescript
POST /v1/contacts/import/{jobId}/retry

// Reuse same OAuth tokens, retry the import
```

---

## 🎉 Summary

**Current Status:**
- ✅ Backend notification system complete
- ✅ Push notifications integrated into import cron
- ✅ Persona notes screenshot fix complete
- ⏳ Migrations ready to run
- ⏳ Frontend needs route fix + push integration

**Next Steps:**
1. Run migrations (5 min)
2. Fix frontend route mismatch (30 min)
3. Add push token registration (1 hour)
4. Add notification center (1 hour)
5. Test end-to-end (30 min)

**Total Time:** ~3 hours for complete notification system

**Impact:**
- Users get notified when imports complete
- No more staring at loading screens
- Better conversion (users come back)
- Professional UX

---

**Ready to run migrations?** Just need to execute the SQL files in Supabase dashboard! 🚀
