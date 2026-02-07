# API Reference

**EverReach Backend Starter Kit - Backend API Documentation**

Version: 1.0.0
Base URL: `https://your-domain.com` (or `http://localhost:3000` for development)

---

## Table of Contents

1. [Authentication](#authentication)
2. [Authentication Endpoints](#authentication-endpoints)
3. [User Management Endpoints](#user-management-endpoints)
4. [Items CRUD Endpoints](#items-crud-endpoints)
5. [Subscription Endpoints](#subscription-endpoints)
6. [Webhook Endpoints](#webhook-endpoints)
7. [Utility Endpoints](#utility-endpoints)
8. [Error Handling](#error-handling)
9. [Rate Limiting](#rate-limiting)

---

## Authentication

Most endpoints require authentication using a Bearer token obtained from the login or signup endpoints.

### Headers

Include the access token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

### Token Refresh

Access tokens expire after 1 hour. Use the refresh token with the `/api/auth/refresh` endpoint to obtain a new access token.

---

## Authentication Endpoints

### POST /api/auth/login

Authenticate a user with email and password.

**Authentication:** Not required

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600,
  "token_type": "bearer",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

**Error Responses:**

- **400 Bad Request** - Invalid request body or validation error
  ```json
  {
    "error": "Validation Error",
    "message": "Invalid email format"
  }
  ```

- **401 Unauthorized** - Invalid credentials
  ```json
  {
    "error": "Unauthorized",
    "message": "Invalid login credentials"
  }
  ```

- **500 Internal Server Error** - Server error
  ```json
  {
    "error": "Internal Server Error",
    "message": "An error occurred during login"
  }
  ```

---

### POST /api/auth/signup

Create a new user account.

**Authentication:** Not required

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "password": "SecurePassword123!"
}
```

**Response (201 Created):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600,
  "token_type": "bearer",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "email": "newuser@example.com",
    "created_at": "2024-01-15T11:00:00Z"
  }
}
```

**Error Responses:**

- **400 Bad Request** - Validation error or user already exists
- **500 Internal Server Error** - Server error

---

### POST /api/auth/logout

End the current user session.

**Authentication:** Required

**Request Body:** None

**Response (200 OK):**
```json
{
  "message": "Logged out successfully"
}
```

**Error Responses:**

- **401 Unauthorized** - Invalid or missing token
- **500 Internal Server Error** - Server error

---

### POST /api/auth/refresh

Refresh an expired access token using a refresh token.

**Authentication:** Required (refresh token)

**Request Body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600,
  "token_type": "bearer"
}
```

**Error Responses:**

- **401 Unauthorized** - Invalid or expired refresh token
- **500 Internal Server Error** - Server error

---

### GET /api/auth/me

Get the currently authenticated user's information.

**Authentication:** Required

**Request Body:** None

**Response (200 OK):**
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
}
```

**Error Responses:**

- **401 Unauthorized** - Invalid or missing token
- **500 Internal Server Error** - Server error

---

### POST /api/auth/forgot-password

Request a password reset email.

**Authentication:** Not required

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200 OK):**
```json
{
  "message": "Password reset email sent"
}
```

**Error Responses:**

- **400 Bad Request** - Invalid email format
- **500 Internal Server Error** - Server error

**Note:** This endpoint returns 200 even if the email doesn't exist (security best practice to prevent email enumeration).

---

## User Management Endpoints

### GET /api/users/profile

Get the authenticated user's profile.

**Authentication:** Required

**Request Body:** None

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "name": "John Doe",
  "avatar_url": "https://storage.supabase.co/avatars/user.jpg",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

**Error Responses:**

- **401 Unauthorized** - Invalid or missing token
- **500 Internal Server Error** - Server error

---

### PUT /api/users/profile

Update the authenticated user's profile.

**Authentication:** Required

**Request Body:**
```json
{
  "name": "Jane Doe",
  "avatar_url": "https://storage.supabase.co/avatars/newavatar.jpg"
}
```

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "name": "Jane Doe",
  "avatar_url": "https://storage.supabase.co/avatars/newavatar.jpg",
  "updated_at": "2024-01-15T12:00:00Z"
}
```

**Error Responses:**

- **400 Bad Request** - Invalid input data
- **401 Unauthorized** - Invalid or missing token
- **500 Internal Server Error** - Server error

---

### DELETE /api/users/profile

Delete the authenticated user's account and all associated data.

**Authentication:** Required

**Request Body:** None

**Response (200 OK):**
```json
{
  "message": "Account deleted successfully"
}
```

**Error Responses:**

- **401 Unauthorized** - Invalid or missing token
- **500 Internal Server Error** - Server error

**Warning:** This action is irreversible and will delete all user data including items and subscriptions.

---

## Items CRUD Endpoints

The Items endpoints provide a generic CRUD interface. Developers should customize these endpoints to match their specific entity type.

### GET /api/items

List items for the authenticated user with pagination.

**Authentication:** Required

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `pageSize` (optional): Items per page (default: 20, max: 100)

**Example Request:**
```
GET /api/items?page=1&pageSize=20
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440010",
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "My First Item",
      "description": "This is a sample item",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440011",
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Another Item",
      "description": null,
      "created_at": "2024-01-15T11:00:00Z",
      "updated_at": "2024-01-15T11:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 2,
    "totalPages": 1
  }
}
```

**Error Responses:**

- **401 Unauthorized** - Invalid or missing token
- **500 Internal Server Error** - Server error

---

### POST /api/items

Create a new item for the authenticated user.

**Authentication:** Required

**Request Body:**
```json
{
  "title": "New Item",
  "description": "Optional description"
}
```

**Response (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440012",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "New Item",
  "description": "Optional description",
  "created_at": "2024-01-15T12:00:00Z",
  "updated_at": "2024-01-15T12:00:00Z"
}
```

**Error Responses:**

- **400 Bad Request** - Missing or invalid title
  ```json
  {
    "error": "Bad Request",
    "message": "Missing required field: title"
  }
  ```

- **401 Unauthorized** - Invalid or missing token
- **500 Internal Server Error** - Server error

---

### GET /api/items/:id

Get a specific item by ID.

**Authentication:** Required

**URL Parameters:**
- `id`: The item ID

**Example Request:**
```
GET /api/items/550e8400-e29b-41d4-a716-446655440010
```

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440010",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "My First Item",
  "description": "This is a sample item",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

**Error Responses:**

- **401 Unauthorized** - Invalid or missing token
- **403 Forbidden** - Item belongs to another user
- **404 Not Found** - Item does not exist
  ```json
  {
    "error": "Not Found",
    "message": "Item not found"
  }
  ```

- **500 Internal Server Error** - Server error

---

### PUT /api/items/:id

Update an existing item.

**Authentication:** Required

**URL Parameters:**
- `id`: The item ID

**Request Body:**
```json
{
  "title": "Updated Title",
  "description": "Updated description"
}
```

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440010",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Updated Title",
  "description": "Updated description",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T13:00:00Z"
}
```

**Error Responses:**

- **400 Bad Request** - Invalid input data
- **401 Unauthorized** - Invalid or missing token
- **403 Forbidden** - Item belongs to another user
- **404 Not Found** - Item does not exist
- **500 Internal Server Error** - Server error

---

### DELETE /api/items/:id

Delete an item.

**Authentication:** Required

**URL Parameters:**
- `id`: The item ID

**Example Request:**
```
DELETE /api/items/550e8400-e29b-41d4-a716-446655440010
```

**Response (200 OK):**
```json
{
  "message": "Item deleted successfully"
}
```

**Error Responses:**

- **401 Unauthorized** - Invalid or missing token
- **403 Forbidden** - Item belongs to another user
- **404 Not Found** - Item does not exist
- **500 Internal Server Error** - Server error

---

### GET /api/items/search

Search items by title or description.

**Authentication:** Required

**Query Parameters:**
- `q`: Search query string (required)
- `page` (optional): Page number (default: 1)
- `pageSize` (optional): Results per page (default: 20)

**Example Request:**
```
GET /api/items/search?q=sample&page=1&pageSize=20
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440010",
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "My Sample Item",
      "description": "This is a sample item",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

**Error Responses:**

- **400 Bad Request** - Missing search query
- **401 Unauthorized** - Invalid or missing token
- **500 Internal Server Error** - Server error

---

## Subscription Endpoints

### GET /api/subscriptions/status

Get the authenticated user's current subscription status.

**Authentication:** Required

**Request Body:** None

**Response (200 OK):**
```json
{
  "subscription": {
    "id": "550e8400-e29b-41d4-a716-446655440020",
    "tier": "pro",
    "status": "active",
    "expires_at": "2024-02-15T10:30:00Z",
    "is_active": true,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
}
```

**Response (200 OK) - Free Tier:**
```json
{
  "subscription": {
    "id": "free-550e8400-e29b-41d4-a716-446655440000",
    "tier": "free",
    "status": "active",
    "expires_at": null,
    "is_active": true,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
}
```

**Subscription Tiers:**
- `free`: Free tier (default)
- `pro`: Professional tier
- `enterprise`: Enterprise tier

**Subscription Statuses:**
- `active`: Subscription is active
- `trialing`: In trial period
- `canceled`: Subscription canceled
- `expired`: Subscription expired
- `incomplete`: Payment incomplete

**Error Responses:**

- **401 Unauthorized** - Invalid or missing token
- **500 Internal Server Error** - Server error

---

### GET /api/subscriptions/tiers

Get available subscription tiers and pricing.

**Authentication:** Not required (public endpoint)

**Request Body:** None

**Response (200 OK):**
```json
{
  "tiers": [
    {
      "id": "free",
      "name": "Free",
      "price": 0,
      "currency": "USD",
      "interval": null,
      "features": [
        "5 items limit",
        "Basic support"
      ]
    },
    {
      "id": "pro",
      "name": "Professional",
      "price": 9.99,
      "currency": "USD",
      "interval": "month",
      "features": [
        "Unlimited items",
        "Priority support",
        "Advanced features"
      ]
    },
    {
      "id": "enterprise",
      "name": "Enterprise",
      "price": 49.99,
      "currency": "USD",
      "interval": "month",
      "features": [
        "Everything in Pro",
        "Dedicated support",
        "Custom integrations",
        "SLA guarantee"
      ]
    }
  ]
}
```

**Error Responses:**

- **500 Internal Server Error** - Server error

---

### POST /api/subscriptions/checkout

Create a Stripe checkout session for subscribing to a tier.

**Authentication:** Required

**Request Body:**
```json
{
  "tier": "pro",
  "billing_period": "monthly"
}
```

**Billing Periods:**
- `monthly`: Monthly subscription
- `yearly`: Yearly subscription (if available)

**Response (200 OK):**
```json
{
  "checkout_url": "https://checkout.stripe.com/pay/cs_test_...",
  "session_id": "cs_test_a1b2c3d4e5f6..."
}
```

**Error Responses:**

- **400 Bad Request** - Invalid tier or billing period
- **401 Unauthorized** - Invalid or missing token
- **500 Internal Server Error** - Server error

**Usage:**
Redirect the user to the `checkout_url` to complete payment. Stripe will redirect back to your success/cancel URLs after payment.

---

### POST /api/subscriptions/portal

Create a Stripe billing portal session for managing subscriptions.

**Authentication:** Required

**Request Body:** None

**Response (200 OK):**
```json
{
  "portal_url": "https://billing.stripe.com/session/..."
}
```

**Error Responses:**

- **401 Unauthorized** - Invalid or missing token
- **404 Not Found** - No subscription found
- **500 Internal Server Error** - Server error

**Usage:**
Redirect the user to the `portal_url` to manage their subscription (cancel, upgrade, update payment method, etc.).

---

## Webhook Endpoints

Webhook endpoints handle events from payment providers. These endpoints verify signatures to ensure the webhooks are authentic.

### POST /api/webhooks/stripe

Handle Stripe webhook events.

**Authentication:** Signature verification (not Bearer token)

**Headers:**
```
stripe-signature: t=1234567890,v1=abc123...
```

**Supported Events:**
- `checkout.session.completed`: New subscription purchased
- `customer.subscription.updated`: Subscription status changed
- `customer.subscription.deleted`: Subscription canceled

**Request Body:** (Varies by event type)

**Response (200 OK):**
```json
{
  "received": true
}
```

**Error Responses:**

- **400 Bad Request** - Invalid signature or missing headers
  ```json
  {
    "error": "Bad Request",
    "message": "Webhook signature verification failed"
  }
  ```

- **500 Internal Server Error** - Server error

**Configuration:**
Set up this endpoint in your Stripe Dashboard at https://dashboard.stripe.com/webhooks

Webhook URL: `https://your-domain.com/api/webhooks/stripe`

---

### POST /api/webhooks/revenuecat

Handle RevenueCat webhook events for mobile subscriptions.

**Authentication:** Signature verification (not Bearer token)

**Headers:**
```
X-RevenueCat-Signature: signature_string
```

**Supported Events:**
- `INITIAL_PURCHASE`: New subscription
- `RENEWAL`: Subscription renewed
- `CANCELLATION`: Subscription canceled
- `UNCANCELLATION`: Subscription reactivated

**Request Body:** (Varies by event type)

**Response (200 OK):**
```json
{
  "received": true
}
```

**Error Responses:**

- **400 Bad Request** - Invalid signature
- **500 Internal Server Error** - Server error

**Configuration:**
Set up this endpoint in your RevenueCat Dashboard under Project Settings → Webhooks

Webhook URL: `https://your-domain.com/api/webhooks/revenuecat`

---

## Utility Endpoints

### GET /api/health

Health check endpoint for monitoring and load balancers.

**Authentication:** Not required

**Request Body:** None

**Response (200 OK):**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T12:00:00Z",
  "database": "connected",
  "version": "1.0.0"
}
```

**Response (503 Service Unavailable) - Degraded:**
```json
{
  "status": "degraded",
  "timestamp": "2024-01-15T12:00:00Z",
  "database": "disconnected",
  "version": "1.0.0"
}
```

**Status Values:**
- `ok`: All systems operational
- `degraded`: Some systems unavailable (e.g., database down)

---

### POST /api/upload

Upload a file to Supabase Storage.

**Authentication:** Required

**Content-Type:** `multipart/form-data`

**Request Body:**
```
file: <binary file data>
```

**Example using curl:**
```bash
curl -X POST https://your-domain.com/api/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@/path/to/image.jpg"
```

**Response (200 OK):**
```json
{
  "url": "https://your-project.supabase.co/storage/v1/object/public/uploads/abc123.jpg",
  "path": "uploads/abc123.jpg"
}
```

**Error Responses:**

- **400 Bad Request** - No file provided or invalid file
- **401 Unauthorized** - Invalid or missing token
- **413 Payload Too Large** - File exceeds size limit
- **500 Internal Server Error** - Server error

**File Restrictions:**
- Maximum file size: 5MB (configurable)
- Allowed types: Images (jpg, png, gif, webp), PDFs, documents

---

## Error Handling

All API endpoints follow a consistent error response format.

### Error Response Format

```json
{
  "error": "Error Type",
  "message": "Detailed error message"
}
```

### HTTP Status Codes

| Status Code | Meaning | Description |
|-------------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request data or validation error |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | Authenticated but not authorized to access resource |
| 404 | Not Found | Resource not found |
| 413 | Payload Too Large | Request body or file too large |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Service temporarily unavailable |

### Common Error Types

**Validation Error (400)**
```json
{
  "error": "Validation Error",
  "message": "Invalid email format"
}
```

**Unauthorized (401)**
```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing authentication token"
}
```

**Not Found (404)**
```json
{
  "error": "Not Found",
  "message": "Item not found"
}
```

**Rate Limit Exceeded (429)**
```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Please try again later."
}
```

---

## Rate Limiting

API endpoints are rate-limited to prevent abuse and ensure fair usage.

### Rate Limit Rules

- **Authentication endpoints:** 10 requests per minute per IP
- **General API endpoints:** 100 requests per minute per user
- **File uploads:** 20 requests per hour per user
- **Webhook endpoints:** No rate limit (verified by signature)

### Rate Limit Headers

Each response includes rate limit information in headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642252800
```

**Headers:**
- `X-RateLimit-Limit`: Maximum requests allowed in the window
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Unix timestamp when the rate limit resets

### Handling Rate Limits

When you exceed the rate limit, you'll receive a 429 response:

```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Please try again later."
}
```

**Best Practices:**
1. Check the `X-RateLimit-Remaining` header
2. Implement exponential backoff when receiving 429 responses
3. Cache responses when appropriate
4. Use pagination to reduce request frequency

---

## Quick Start Examples

### JavaScript/TypeScript

```typescript
// Login
const loginResponse = await fetch('https://your-domain.com/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePassword123!'
  })
});

const { access_token } = await loginResponse.json();

// Fetch items
const itemsResponse = await fetch('https://your-domain.com/api/items?page=1', {
  headers: {
    'Authorization': `Bearer ${access_token}`
  }
});

const { data: items } = await itemsResponse.json();

// Create item
const createResponse = await fetch('https://your-domain.com/api/items', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${access_token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'New Item',
    description: 'Description here'
  })
});

const newItem = await createResponse.json();
```

### Python

```python
import requests

# Login
response = requests.post('https://your-domain.com/api/auth/login', json={
    'email': 'user@example.com',
    'password': 'SecurePassword123!'
})

access_token = response.json()['access_token']

# Fetch items
headers = {'Authorization': f'Bearer {access_token}'}
response = requests.get('https://your-domain.com/api/items', headers=headers)
items = response.json()['data']

# Create item
response = requests.post(
    'https://your-domain.com/api/items',
    headers=headers,
    json={'title': 'New Item', 'description': 'Description here'}
)
new_item = response.json()
```

### cURL

```bash
# Login
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecurePassword123!"}'

# Fetch items (replace <token> with actual token)
curl https://your-domain.com/api/items?page=1 \
  -H "Authorization: Bearer <token>"

# Create item
curl -X POST https://your-domain.com/api/items \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"New Item","description":"Description here"}'
```

---

## Support

For issues or questions:

- GitHub Issues: https://github.com/IsaiahDupree/EverReach/issues
- Documentation: See `QUICKSTART.md` and `CUSTOMIZATION.md`
- Supabase Docs: https://supabase.com/docs
- Stripe API Docs: https://stripe.com/docs/api
- RevenueCat Docs: https://docs.revenuecat.com

---

**Last Updated:** 2024-01-15
**Version:** 1.0.0
