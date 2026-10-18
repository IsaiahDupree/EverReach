# Frontend Integration

Complete examples for integrating the EverReach API in web and mobile applications.

---

## React / Next.js Web App

### Setup

```bash
npm install @supabase/supabase-js @tanstack/react-query
```

### 1. API Client (`lib/api.ts`)

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const API_BASE = 'https://ever-reach-be.vercel.app/api';

export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public requestId?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export async function apiCall<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new APIError('Not authenticated', 401);
  }
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      'Origin': window.location.origin,
      ...options.headers
    }
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new APIError(
      error.error || 'Request failed',
      response.status,
      error.request_id
    );
  }
  
  return response.json();
}
```

### 2. React Query Hooks (`hooks/useContacts.ts`)

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiCall } from '@/lib/api';

// List contacts
export function useContacts(filters?: {
  q?: string;
  tag?: string;
  warmth_band?: string;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.q) params.set('q', filters.q);
  if (filters?.tag) params.set('tag', filters.tag);
  if (filters?.warmth_band) params.set('warmth_band', filters.warmth_band);
  if (filters?.limit) params.set('limit', String(filters.limit));
  
  const query = params.toString() ? `?${params}` : '';
  
  return useQuery({
    queryKey: ['contacts', filters],
    queryFn: () => apiCall<{ contacts: Contact[] }>(`/v1/contacts${query}`)
  });
}

// Get single contact
export function useContact(id: string) {
  return useQuery({
    queryKey: ['contact', id],
    queryFn: () => apiCall<{ contact: Contact }>(`/v1/contacts/${id}`),
    enabled: !!id
  });
}

// Create contact
export function useCreateContact() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateContactInput) =>
      apiCall<{ contact: Contact }>('/v1/contacts', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    }
  });
}

// Update contact
export function useUpdateContact(id: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Partial<Contact>) =>
      apiCall<{ contact: Contact }>(`/v1/contacts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact', id] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    }
  });
}

// Delete contact
export function useDeleteContact() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) =>
      apiCall(`/v1/contacts/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    }
  });
}
```

### 3. React Component

```typescript
'use client';

import { useContacts, useCreateContact } from '@/hooks/useContacts';

export function ContactsList() {
  const { data, isLoading, error } = useContacts({ limit: 50 });
  const createContact = useCreateContact();
  
  const handleCreate = async () => {
    try {
      await createContact.mutateAsync({
        display_name: 'New Contact',
        emails: ['new@example.com']
      });
    } catch (error) {
      console.error('Failed to create:', error);
    }
  };
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      <button onClick={handleCreate}>Add Contact</button>
      
      {data?.contacts.map(contact => (
        <div key={contact.id}>
          <h3>{contact.display_name}</h3>
          <p>Warmth: {contact.warmth}/100</p>
        </div>
      ))}
    </div>
  );
}
```

---

## React Native / Expo Mobile App

### Setup

```bash
npm install @supabase/supabase-js react-native-url-polyfill
```

### 1. API Client (`lib/api.ts`)

```typescript
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);

const API_BASE = 'https://ever-reach-be.vercel.app/api';

export async function apiCall<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Not authenticated');
  }
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      'Origin': 'https://everreach.app',
      ...options.headers
    }
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }
  
  return response.json();
}
```

### 2. React Native Component

```typescript
import { useQuery } from '@tanstack/react-query';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { apiCall } from '@/lib/api';

export function ContactsScreen() {
  const { data, isLoading } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => apiCall('/v1/contacts?limit=50')
  });
  
  if (isLoading) {
    return <ActivityIndicator />;
  }
  
  return (
    <FlatList
      data={data?.contacts}
      keyExtractor={item => item.id}
      renderItem={({ item }) => (
        <View style={{ padding: 16 }}>
          <Text style={{ fontSize: 18 }}>{item.display_name}</Text>
          <Text>Warmth: {item.warmth}/100</Text>
        </View>
      )}
    />
  );
}
```

---

## Vanilla JavaScript / TypeScript

### Basic Usage

```javascript
const API_BASE = 'https://ever-reach-be.vercel.app/api';
let authToken = null;

// Initialize Supabase
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Login
async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (error) throw error;
  authToken = data.session.access_token;
  return data.user;
}

// API call helper
async function api(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }
  
  return response.json();
}

// Usage
const user = await login('user@example.com', 'password');
const { contacts } = await api('/v1/contacts');
console.log('Contacts:', contacts);
```

---

## Advanced Patterns

### 1. Optimistic Updates

```typescript
function useUpdateContactOptimistic(id: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Partial<Contact>) =>
      apiCall(`/v1/contacts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      }),
    
    // Optimistically update cache before API call
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: ['contact', id] });
      
      const previous = queryClient.getQueryData(['contact', id]);
      
      queryClient.setQueryData(['contact', id], (old: any) => ({
        ...old,
        contact: { ...old?.contact, ...newData }
      }));
      
      return { previous };
    },
    
    // Rollback on error
    onError: (err, newData, context) => {
      queryClient.setQueryData(['contact', id], context?.previous);
    },
    
    // Refetch after success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['contact', id] });
    }
  });
}
```

### 2. Infinite Scroll

```typescript
function useInfiniteContacts() {
  return useInfiniteQuery({
    queryKey: ['contacts', 'infinite'],
    queryFn: ({ pageParam = null }) => {
      const params = new URLSearchParams({ limit: '20' });
      if (pageParam) params.set('cursor', pageParam);
      return apiCall(`/v1/contacts?${params}`);
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor
  });
}

// Component
function InfiniteContactsList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteContacts();
  
  return (
    <div>
      {data?.pages.map(page =>
        page.contacts.map(contact => (
          <div key={contact.id}>{contact.display_name}</div>
        ))
      )}
      
      {hasNextPage && (
        <button onClick={() => fetchNextPage()}>
          {isFetchingNextPage ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
}
```

### 3. Real-time with Supabase

```typescript
function useContactsRealtime() {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    const channel = supabase
      .channel('contacts-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'contacts' },
        (payload) => {
          // Invalidate queries on any change
          queryClient.invalidateQueries({ queryKey: ['contacts'] });
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
  
  return useContacts();
}
```

### 4. Polling for Updates

```typescript
function useContactWithPolling(id: string) {
  return useQuery({
    queryKey: ['contact', id],
    queryFn: () => apiCall(`/v1/contacts/${id}`),
    refetchInterval: 30000, // Poll every 30 seconds
    refetchIntervalInBackground: false
  });
}
```

---

## Error Handling

### Global Error Handler

```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error instanceof APIError && error.status >= 400 && error.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
      onError: (error) => {
        if (error instanceof APIError) {
          if (error.status === 401) {
            // Redirect to login
            window.location.href = '/login';
          } else {
            // Show toast
            toast.error(error.message);
          }
        }
      }
    },
    mutations: {
      onError: (error) => {
        if (error instanceof APIError) {
          toast.error(error.message);
        }
      }
    }
  }
});
```

---

## Environment Variables

### Web (.env.local)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://utasetfxiqcrnwyfforx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

### Mobile (.env)

```bash
EXPO_PUBLIC_SUPABASE_URL=https://utasetfxiqcrnwyfforx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

---

## Testing

### Mock API for Tests

```typescript
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.get('*/v1/contacts', (req, res, ctx) => {
    return res(
      ctx.json({
        contacts: [
          { id: '1', display_name: 'Test Contact', warmth: 75 }
        ]
      })
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

---

## Next Steps

- [Authentication](./01-authentication.md) - Setup auth flow
- [Error Handling](./12-error-handling.md) - Handle API errors
- [Rate Limiting](./13-rate-limiting.md) - Respect rate limits
- [Contacts](./02-contacts.md) - Contact API reference
