# Vercel API Overview

## 🌐 API Architecture

The Personal CRM backend is deployed on Vercel Edge Functions, providing:
- **Fast global response** - Edge network deployment
- **Type-safe** - TypeScript throughout
- **Authenticated** - Supabase JWT validation
- **Scalable** - Auto-scaling serverless functions

## 📁 API Structure

```
backend-vercel/app/api/
├── health/                  # Health check
├── v1/                      # V1 API (primary)
│   ├── agent/              # AI Agent system (12 endpoints)
│   ├── contacts/           # Contact management
│   ├── interactions/       # Interaction tracking
│   ├── messages/           # Message threads
│   ├── me/                 # User profile & data
│   ├── compose/            # Message composition
│   ├── analysis/           # Screenshot analysis
│   ├── webhooks/           # External webhooks
│   └── billing/            # Billing operations
├── billing/                # Stripe billing
├── webhooks/               # Webhook handlers
├── files/                  # File management
├── uploads/                # Upload signing
├── cron/                   # Scheduled jobs
└── trpc/                   # TRPC procedures
```

## 🔑 Key Features

### Authentication
All API routes use middleware for authentication:
```typescript
// lib/auth.ts
export async function getUser(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  
  const token = authHeader.slice(7);
  const supabase = createClient(url, anonKey);
  const { data: { user } } = await supabase.auth.getUser(token);
  return user;
}
```

### CORS
Configured to allow requests from:
- `https://everreach.app` (production)
- `exp://192.168.*` (Expo development)
- `http://localhost:*` (local development)

### Response Helpers
```typescript
// lib/responses.ts
export function ok(data: any, req: Request) {
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders(req) }
  });
}

export function badRequest(error: string, req: Request) {
  return new Response(
    JSON.stringify({ error }),
    { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders(req) } }
  );
}
```

## 📊 Endpoint Categories

### Core CRM (40+ endpoints)
- Contacts management
- Interactions tracking
- Message threads
- File attachments
- Pipeline management

### AI Agent System (12 endpoints)
- OpenAI testing
- Agent chat (single-turn & streaming)
- Conversation management
- Voice note processing
- Contact analysis
- Smart composition
- Action suggestions
- Tools listing

### Billing & Commerce (8 endpoints)
- Stripe checkout & portal
- App Store webhooks
- Play Store webhooks
- Purchase restoration
- Transaction history

### Analytics & Admin (10+ endpoints)
- Usage summaries
- Impact metrics
- Audit logs
- Daily recommendations
- Telemetry tracking

### Cron Jobs (6 endpoints)
- Daily recommendations generation
- Entitlements sanity check
- Interaction metrics rollup
- Paywall analytics
- Prompts analytics
- Lead scoring

## 🔐 Security Layers

### 1. Authentication
- Supabase JWT validation on every request
- Service role key for admin operations only

### 2. Authorization
- User ID extracted from JWT
- All queries scoped to authenticated user
- RLS enforced at database level

### 3. Validation
- Zod schemas for request validation
- Type-safe parameters
- Input sanitization

### 4. Rate Limiting
- Vercel's built-in rate limiting
- OpenAI API usage tracking

## 🚀 Deployment

### Environment Variables
```bash
# Supabase
SUPABASE_URL=https://utasetfxiqcrnwyfforx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# OpenAI (for Agent system)
OPENAI_API_KEY=sk-proj-...

# Stripe (for billing)
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Apple/Google (for IAP)
APPLE_SHARED_SECRET=...
GOOGLE_SERVICE_ACCOUNT_JSON=...
```

### Deploy Process
1. Push to `feat/backend-vercel-only-clean` branch
2. Vercel auto-deploys to production
3. Environment variables managed in Vercel dashboard

## 📝 API Conventions

### URL Structure
```
/api/v{version}/{resource}/{id?}/{action?}
```

Examples:
- `/api/v1/contacts` - List contacts
- `/api/v1/contacts/:id` - Get contact
- `/api/v1/contacts/:id/pipeline/move` - Action on resource

### HTTP Methods
- `GET` - Retrieve data
- `POST` - Create or trigger action
- `PUT` - Full update
- `PATCH` - Partial update
- `DELETE` - Delete resource

### Response Format
```typescript
// Success (200)
{
  "data_field": "value",
  ...metadata
}

// Error (4xx, 5xx)
{
  "error": "error_code",
  "message": "Human readable message"
}
```

### Headers
```
Content-Type: application/json
Authorization: Bearer <supabase_token>
Idempotency-Key: unique-key (optional, for POST)
```

## 🎯 Performance

### Edge Optimization
- Deployed to Vercel Edge Network
- ~50-200ms response times globally
- Automatic CDN caching where appropriate

### Database
- Connection pooling via Supabase
- Optimized queries with indexes
- RLS policies for security

### Caching
- No client-side caching (fresh data)
- Server-side caching for static data
- Stale-while-revalidate patterns

## 🔄 Versioning

Current API version: **v1**

Future versions will be added as:
- `/api/v2/...`

Breaking changes require new version. Non-breaking changes can be added to existing version.

## 📚 Related Documentation

- Complete endpoint reference: [06-vercel-endpoints.md](./06-vercel-endpoints.md)
- Frontend integration: [08-vercel-integration.md](./08-vercel-integration.md)
- Quick examples: [09-quick-reference.md](./09-quick-reference.md)
