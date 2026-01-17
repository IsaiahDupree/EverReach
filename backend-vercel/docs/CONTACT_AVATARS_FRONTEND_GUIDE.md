# Contact Avatars Frontend Implementation Guide

**Complete guide for implementing contact profile pictures across web and mobile frontends**

**Status:** Production Ready  
**Last Updated:** November 2, 2025  
**Backend:** `/api/v1/contacts/:id` returns `avatar_url`

---

## Table of Contents

1. [Overview](#overview)
2. [Backend Schema](#backend-schema)
3. [React Native Implementation](#react-native-implementation)
4. [Web Implementation](#web-implementation)
5. [Optimization Strategies](#optimization-strategies)
6. [Backend Enhancements](#backend-enhancements)
7. [Best Practices](#best-practices)

---

## Overview

### What This Provides

✅ Single reusable avatar component  
✅ Automatic caching with React Query  
✅ Prefetch all avatars on app startup  
✅ Initials-based fallback with consistent colors  
✅ Multiple sizes (sm, md, lg, xl)  
✅ Upload/update functionality  

---

## Backend Schema

### Database

```sql
-- contacts table (already exists)
CREATE TABLE contacts (
  id uuid PRIMARY KEY,
  display_name text,
  avatar_url text,  -- URL to profile picture
  -- ... other fields
);
```

### API Response

```json
GET /api/v1/contacts/:id

{
  "contact": {
    "id": "uuid",
    "display_name": "Ada Lovelace",
    "avatar_url": "https://storage.supabase.co/contacts/uuid/avatar.jpg"
  }
}
```

---

## React Native Implementation

### 1. Avatar Hook

```typescript
// lib/hooks/useContactAvatar.ts
import { useQuery } from '@tanstack/react-query';

export function useContactAvatar(contactId: string) {
  return useQuery({
    queryKey: ['contact-avatar', contactId],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/api/v1/contacts/${contactId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      return data.contact.avatar_url;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    cacheTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}
```

### 2. Avatar Component

```typescript
// components/ContactAvatar.tsx
import { Image, View, Text } from 'react-native';
import { useContactAvatar } from '@/lib/hooks/useContactAvatar';
import { useState } from 'react';

const SIZES = {
  sm: { container: 32, text: 12 },
  md: { container: 48, text: 16 },
  lg: { container: 64, text: 20 },
  xl: { container: 96, text: 32 },
};

export function ContactAvatar({ contactId, size = 'md', name }) {
  const { data: avatarUrl, isLoading } = useContactAvatar(contactId);
  const [imageError, setImageError] = useState(false);

  const { container, text } = SIZES[size];

  // Generate initials
  const initials = name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  // Generate consistent color from contactId
  const hue = parseInt(contactId.slice(0, 8), 16) % 360;
  const bgColor = `hsl(${hue}, 70%, 50%)`;

  const containerStyle = {
    width: container,
    height: container,
    borderRadius: container / 2,
    backgroundColor: bgColor,
    justifyContent: 'center',
    alignItems: 'center',
  };

  if (isLoading) {
    return <View style={[containerStyle, { backgroundColor: '#E5E7EB' }]} />;
  }

  if (avatarUrl && !imageError) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={{ width: container, height: container, borderRadius: container / 2 }}
        onError={() => setImageError(true)}
      />
    );
  }

  // Fallback: Initials
  return (
    <View style={containerStyle}>
      <Text style={{ fontSize: text, fontWeight: '600', color: '#fff' }}>
        {initials}
      </Text>
    </View>
  );
}
```

### 3. Prefetch on Startup

```typescript
// app/_layout.tsx
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

export default function AppLayout() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (user) prefetchContactData();
  }, [user]);

  async function prefetchContactData() {
    const response = await fetch(`${API_BASE}/api/v1/contacts?limit=1000`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();

    // Cache contacts list
    queryClient.setQueryData(['contacts', 'list'], data.contacts);

    // Pre-cache individual avatar URLs
    data.contacts.forEach(contact => {
      queryClient.setQueryData(['contact-avatar', contact.id], contact.avatar_url);
    });

    console.log(`✅ Prefetched ${data.contacts.length} contact avatars`);
  }

  return <Slot />;
}
```

### 4. Usage Examples

```typescript
// Contact List
<FlatList
  data={contacts}
  renderItem={({ item }) => (
    <View style={styles.row}>
      <ContactAvatar contactId={item.id} name={item.display_name} size="md" />
      <Text>{item.display_name}</Text>
    </View>
  )}
/>

// Contact Detail
<View style={styles.header}>
  <ContactAvatar contactId={contactId} name={contact.display_name} size="xl" />
  <Text style={styles.name}>{contact.display_name}</Text>
</View>

// Warmth Card
<ContactAvatar contactId={contact.id} name={contact.display_name} size="sm" />
```

---

## Web Implementation

### 1. Avatar Component (Tailwind CSS)

```typescript
// components/ContactAvatar.tsx
import { useContactAvatar } from '@/lib/hooks/useContactAvatar';
import { useState } from 'react';
import clsx from 'clsx';

const SIZES = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-12 h-12 text-sm',
  lg: 'w-16 h-16 text-base',
  xl: 'w-24 h-24 text-2xl',
};

export function ContactAvatar({ contactId, size = 'md', name, className }) {
  const { data: avatarUrl, isLoading } = useContactAvatar(contactId);
  const [imgError, setImgError] = useState(false);

  const initials = name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  const hue = parseInt(contactId.slice(0, 8), 16) % 360;
  const bgColor = `hsl(${hue}, 70%, 50%)`;

  if (isLoading) {
    return <div className={clsx(SIZES[size], 'rounded-full bg-gray-200 animate-pulse', className)} />;
  }

  if (avatarUrl && !imgError) {
    return (
      <img
        src={avatarUrl}
        alt={name || 'Contact'}
        className={clsx(SIZES[size], 'rounded-full object-cover', className)}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      className={clsx(SIZES[size], 'rounded-full flex items-center justify-center text-white font-semibold', className)}
      style={{ backgroundColor: bgColor }}
    >
      {initials}
    </div>
  );
}
```

---

## Optimization Strategies

### Strategy 1: Aggressive Caching (Recommended)

Prefetch ALL contacts on app startup, cache for 24 hours.

**Pros:** Instant loading, no flicker  
**Cons:** Initial load +1-2s for 1000 contacts  
**Best For:** Most apps (< 5000 contacts)

### Strategy 2: Lazy Loading

Only load avatars when visible on screen using Intersection Observer.

**Pros:** Minimal initial load  
**Cons:** Slight delay when scrolling  
**Best For:** Very long lists (10,000+ contacts)

### Strategy 3: Service Worker + Cache

Cache avatars in browser cache via service worker.

**Pros:** Works offline permanently  
**Cons:** More complex setup  
**Best For:** Web apps with offline requirements

---

## Backend Enhancements

### Batch Avatar Endpoint

```typescript
// app/api/v1/contacts/avatars/batch/route.ts
export async function POST(req: Request) {
  const { ids } = await req.json();
  
  const { data } = await supabase
    .from('contacts')
    .select('id, avatar_url')
    .in('id', ids);

  const avatars = data.reduce((acc, c) => ({ ...acc, [c.id]: c.avatar_url }), {});
  return ok({ avatars }, req);
}
```

### Avatar Upload Endpoint

```typescript
// app/api/v1/contacts/[id]/avatar/route.ts
export async function POST(req: Request, { params }) {
  const formData = await req.formData();
  const file = formData.get('avatar');

  // Upload to Supabase Storage
  const { data } = await supabase.storage
    .from('contacts')
    .upload(`${params.id}/avatar.jpg`, file, { upsert: true });

  // Update contact record
  await supabase
    .from('contacts')
    .update({ avatar_url: data.publicUrl })
    .eq('id', params.id);

  return ok({ avatar_url: data.publicUrl }, req);
}
```

---

## Best Practices

### ✅ DO

1. Use consistent sizes: `sm: 32px, md: 48px, lg: 64px, xl: 96px`
2. Generate consistent colors from contactId hash
3. Cache aggressively (1 hour stale, 24 hour cache)
4. Provide initials fallback
5. Handle image errors gracefully

### ❌ DON'T

1. Fetch avatars individually (use batch endpoint)
2. Skip caching (always use React Query)
3. Use large images for small avatars
4. Hardcode fallback colors

---

## Troubleshooting

### Avatars Not Loading

**Check:**
- CORS headers on storage bucket
- `avatar_url` not null in database
- Network tab for 403/404 errors
- Supabase Storage bucket is public

### Slow Initial Load

**Solutions:**
- Implement prefetch on app startup
- Use batch endpoint
- Enable React Query caching
- Reduce image sizes

### Avatars Not Updating After Upload

**Solutions:**
- Invalidate React Query cache: `queryClient.invalidateQueries(['contact-avatar', contactId])`
- Add timestamp to URL: `${avatarUrl}?t=${Date.now()}`

---

## Implementation Checklist

- [ ] Create `ContactAvatar` component
- [ ] Add `useContactAvatar` hook
- [ ] Implement prefetch on app startup
- [ ] Add avatar upload endpoint (backend)
- [ ] Add batch avatar endpoint (backend)
- [ ] Test with 1000+ contacts
- [ ] Verify offline caching works
- [ ] Add upload UI to contact detail screen

---

**Ready to implement!** Start with the basic `ContactAvatar` component, then add caching and prefetch. 🚀
