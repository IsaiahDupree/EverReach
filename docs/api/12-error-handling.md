# Error Handling

Understanding API errors and how to handle them effectively.

---

## HTTP Status Codes

| Code | Status | Meaning | Action |
|------|--------|---------|--------|
| 200 | OK | Request succeeded | Parse response |
| 201 | Created | Resource created | Get resource ID from response |
| 400 | Bad Request | Invalid input | Check request body/params |
| 401 | Unauthorized | Missing/invalid auth | Refresh token or re-login |
| 403 | Forbidden | Insufficient permissions | Check user role/scopes |
| 404 | Not Found | Resource doesn't exist | Verify ID, check ownership |
| 429 | Too Many Requests | Rate limited | Wait, check Retry-After header |
| 500 | Server Error | Internal error | Retry, contact support |

---

## Error Response Format

All errors return JSON with consistent structure:

```json
{
  "error": "Error description",
  "request_id": "req_abc123"
}
```

### Validation Errors (400)

```json
{
  "error": "Validation failed",
  "details": {
    "display_name": "Required field missing",
    "warmth": "Must be between 0 and 100"
  },
  "request_id": "req_abc123"
}
```

---

## Common Errors

### 401 Unauthorized

**Causes**:
- Missing Authorization header
- Expired JWT token
- Invalid token format
- User doesn't exist

**Example**:
```json
{
  "error": "Unauthorized",
  "request_id": "req_abc123"
}
```

**Solution**:
```typescript
async function handleUnauthorized() {
  // Try refreshing the session
  const { data, error } = await supabase.auth.refreshSession();
  
  if (error) {
    // Redirect to login
    window.location.href = '/login';
    return;
  }
  
  // Retry request with new token
  const newJWT = data.session.access_token;
  return retryRequest(newJWT);
}
```

---

### 400 Bad Request

**Causes**:
- Missing required fields
- Invalid field values
- Malformed JSON
- Invalid query parameters

**Example**:
```json
{
  "error": "display_name is required",
  "request_id": "req_abc123"
}
```

**Solution**:
```typescript
// Validate before sending
function validateContact(data) {
  const errors = [];
  
  if (!data.display_name) {
    errors.push('display_name is required');
  }
  
  if (data.warmth && (data.warmth < 0 || data.warmth > 100)) {
    errors.push('warmth must be 0-100');
  }
  
  if (errors.length > 0) {
    throw new Error(errors.join(', '));
  }
}
```

---

### 404 Not Found

**Causes**:
- Resource doesn't exist
- Wrong ID
- Resource belongs to different user/org
- Resource was deleted

**Example**:
```json
{
  "error": "Contact not found",
  "request_id": "req_abc123"
}
```

**Solution**:
```typescript
async function getContact(id) {
  const response = await fetch(`/v1/contacts/${id}`, {
    headers: { 'Authorization': `Bearer ${jwt}` }
  });
  
  if (response.status === 404) {
    // Handle gracefully
    console.error('Contact not found or no access');
    return null;
  }
  
  return response.json();
}
```

---

### 429 Too Many Requests

**Causes**:
- Rate limit exceeded
- Too many requests in time window
- Burst limit exceeded

**Example**:
```json
{
  "error": "rate_limited",
  "retryAfter": 42,
  "request_id": "req_abc123"
}
```

**Headers**:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1705075200
Retry-After: 42
```

**Solution**:
```typescript
async function apiCallWithRetry(url, options) {
  const response = await fetch(url, options);
  
  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
    console.log(`Rate limited. Retrying in ${retryAfter}s`);
    
    await sleep(retryAfter * 1000);
    return apiCallWithRetry(url, options); // Retry
  }
  
  return response;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

---

### 500 Server Error

**Causes**:
- Database error
- External service failure (OpenAI, Stripe)
- Unexpected exception
- Configuration issue

**Example**:
```json
{
  "error": "Internal server error",
  "request_id": "req_abc123"
}
```

**Solution**:
```typescript
async function apiCallWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      
      if (response.status === 500) {
        if (i === maxRetries - 1) {
          throw new Error('Server error after retries');
        }
        
        // Exponential backoff
        await sleep(Math.pow(2, i) * 1000);
        continue;
      }
      
      return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(Math.pow(2, i) * 1000);
    }
  }
}
```

---

## Error Handling Patterns

### Centralized Error Handler

```typescript
class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public requestId?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

async function apiCall(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(
    `https://ever-reach-be.vercel.app/api${endpoint}`,
    {
      ...options,
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new APIError(
      error.error || 'Request failed',
      response.status,
      error.request_id
    );
  }
  
  return response.json();
}

// Usage
try {
  const contact = await apiCall('/v1/contacts/123');
} catch (error) {
  if (error instanceof APIError) {
    if (error.status === 401) {
      // Handle auth error
      redirectToLogin();
    } else if (error.status === 404) {
      // Handle not found
      showNotFoundMessage();
    } else {
      // Generic error
      showError(error.message);
    }
    
    // Log for debugging
    console.error('API Error:', error.requestId, error.message);
  }
}
```

---

### React Error Boundary

```typescript
import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class APIErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };
  
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: any) {
    console.error('API Error:', error, errorInfo);
    
    // Send to error tracking service
    if (error instanceof APIError) {
      trackError({
        message: error.message,
        status: error.status,
        requestId: error.requestId
      });
    }
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()}>
            Refresh Page
          </button>
        </div>
      );
    }
    
    return this.props.children;
  }
}
```

---

### React Query Error Handling

```typescript
import { useQuery } from '@tanstack/react-query';

function useContact(id: string) {
  return useQuery({
    queryKey: ['contact', id],
    queryFn: () => apiCall(`/v1/contacts/${id}`),
    retry: (failureCount, error) => {
      // Don't retry on 404 or 401
      if (error instanceof APIError) {
        if (error.status === 404 || error.status === 401) {
          return false;
        }
      }
      // Retry up to 3 times for other errors
      return failureCount < 3;
    },
    onError: (error) => {
      if (error instanceof APIError) {
        if (error.status === 401) {
          // Redirect to login
          window.location.href = '/login';
        } else {
          // Show toast notification
          toast.error(error.message);
        }
      }
    }
  });
}
```

---

## Debugging

### Using Request IDs

Every error includes a `request_id` for tracking:

```typescript
try {
  await apiCall('/v1/contacts');
} catch (error) {
  if (error instanceof APIError) {
    console.error('Request ID:', error.requestId);
    // Share this ID with support for debugging
  }
}
```

### Logging

```typescript
function logAPICall(endpoint: string, options: RequestInit, response: Response) {
  console.log({
    timestamp: new Date().toISOString(),
    method: options.method || 'GET',
    endpoint,
    status: response.status,
    headers: Object.fromEntries(response.headers.entries())
  });
}
```

---

## Best Practices

### 1. Always Handle Errors

```typescript
// ❌ Bad - Unhandled promise rejection
fetch('/v1/contacts');

// ✅ Good - Proper error handling
fetch('/v1/contacts')
  .then(r => r.json())
  .catch(error => console.error('Failed:', error));
```

### 2. Provide User-Friendly Messages

```typescript
// ❌ Bad
throw new Error('fetch failed');

// ✅ Good
throw new APIError(
  'Unable to load contacts. Please try again.',
  response.status
);
```

### 3. Implement Retry Logic

```typescript
// For transient errors (500, network issues)
const response = await retryWithBackoff(
  () => fetch('/v1/contacts'),
  { maxRetries: 3, baseDelay: 1000 }
);
```

### 4. Log for Debugging

```typescript
if (process.env.NODE_ENV === 'development') {
  console.log('API Request:', endpoint, options);
  console.log('API Response:', response);
}
```

---

## Next Steps

- [Rate Limiting](./13-rate-limiting.md) - Understand rate limits
- [Frontend Integration](./14-frontend-integration.md) - Complete examples
- [Authentication](./01-authentication.md) - Fix auth errors
