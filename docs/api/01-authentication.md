# Authentication

All API requests require authentication using a Supabase JWT token passed in the `Authorization` header.

---

## Overview

**Authentication Method**: Bearer Token (JWT from Supabase Auth)  
**Token Location**: `Authorization` header  
**Session Duration**: 1 hour (auto-refreshes)  

---

## Getting a JWT Token

### Sign In with Email/Password

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://utasetfxiqcrnwyfforx.supabase.co',
  'your-anon-key'
);

const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
});

if (error) {
  console.error('Login failed:', error.message);
  return;
}

const jwt = data.session.access_token;
console.log('JWT token:', jwt);
```

### Sign Up New User

```typescript
const { data, error } = await supabase.auth.signUp({
  email: 'newuser@example.com',
  password: 'securepassword123',
  options: {
    data: {
      display_name: 'John Doe'
    }
  }
});
```

### OAuth Providers (Google, GitHub, etc.)

```typescript
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: 'https://everreach.app/auth/callback'
  }
});
```

---

## Using the JWT Token

### In API Requests

```typescript
const response = await fetch('https://ever-reach-be.vercel.app/api/v1/contacts', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${jwt}`,
    'Content-Type': 'application/json',
    'Origin': 'https://everreach.app'
  }
});

const data = await response.json();
```

### With cURL

```bash
curl -X GET \
  https://ever-reach-be.vercel.app/api/v1/contacts \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -H "Origin: https://everreach.app"
```

---

## Session Management

### Get Current Session

```typescript
const { data: { session } } = await supabase.auth.getSession();

if (session) {
  console.log('User is logged in');
  console.log('JWT:', session.access_token);
  console.log('Expires:', new Date(session.expires_at * 1000));
}
```

### Refresh Session

```typescript
const { data, error } = await supabase.auth.refreshSession();
const newJWT = data.session.access_token;
```

### Sign Out

```typescript
const { error } = await supabase.auth.signOut();
```

---

## Auth State Listener

```typescript
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    console.log('User signed in:', session.user.email);
  } else if (event === 'SIGNED_OUT') {
    console.log('User signed out');
  } else if (event === 'TOKEN_REFRESHED') {
    console.log('Token refreshed');
  }
});
```

---

## Error Responses

### 401 Unauthorized

```json
{
  "error": "Unauthorized",
  "request_id": "req_abc123"
}
```

**Common Causes**:
- Missing Authorization header
- Expired JWT token
- Invalid JWT token
- User doesn't exist

**Solutions**:
1. Check header format: `Bearer <token>` (note the space)
2. Refresh the session if token expired
3. Re-authenticate user if session invalid

---

## Security Best Practices

### 1. Never Store JWT in LocalStorage (Web)
```typescript
// ❌ Bad - XSS vulnerable
localStorage.setItem('jwt', token);

// ✅ Good - Use httpOnly cookies or memory
// Supabase client handles this automatically
```

### 2. Always Use HTTPS
```typescript
// ✅ All API calls use HTTPS
const API_BASE = 'https://ever-reach-be.vercel.app/api';
```

### 3. Handle Token Expiration
```typescript
async function apiCall(endpoint, options) {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    // Redirect to login
    window.location.href = '/login';
    return;
  }
  
  // Auto-refresh if near expiration
  const expiresAt = session.expires_at * 1000;
  const now = Date.now();
  
  if (expiresAt - now < 5 * 60 * 1000) { // Less than 5 min remaining
    await supabase.auth.refreshSession();
  }
  
  return fetch(endpoint, options);
}
```

### 4. Validate Origin Header
The API validates the `Origin` header to prevent CSRF. Always include it:

```typescript
headers: {
  'Origin': 'https://everreach.app' // or your domain
}
```

---

## User Profile Data

### Get Current User

```typescript
const { data: { user } } = await supabase.auth.getUser();

console.log('User ID:', user.id);
console.log('Email:', user.email);
console.log('Metadata:', user.user_metadata);
```

### Update User Profile

```typescript
const { data, error } = await supabase.auth.updateUser({
  data: {
    display_name: 'Jane Smith',
    avatar_url: 'https://example.com/avatar.jpg'
  }
});
```

---

## Testing

### Test Credentials

Create a test user in Supabase Dashboard for development:

```typescript
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'testpassword123';

const { data } = await supabase.auth.signInWithPassword({
  email: TEST_EMAIL,
  password: TEST_PASSWORD
});
```

---

## Next Steps

- [Contacts API](./02-contacts.md) - Start making authenticated requests
- [Error Handling](./12-error-handling.md) - Handle auth errors gracefully
- [Frontend Integration](./14-frontend-integration.md) - Complete auth flow examples
