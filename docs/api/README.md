# API Documentation - EverReach Backend

**Base URL**: `https://ever-reach-be.vercel.app/api`  
**Supabase**: `https://utasetfxiqcrnwyfforx.supabase.co`  
**Status**: ✅ Production Ready (95.2% test pass rate)

---

## Documentation by Feature

### Core Features

1. [Authentication](./01-authentication.md) - JWT tokens, OAuth, session management
2. [Contacts](./02-contacts.md) - CRUD, search, filtering, warmth tracking
3. [Interactions](./03-interactions.md) - Log communications and activities
4. [Templates](./04-templates.md) - Reusable message templates
5. [Warmth & Scoring](./05-warmth-scoring.md) - Automatic relationship health tracking
6. [AI Analysis](./06-ai-analysis.md) - AI-powered relationship insights
7. [AI Compose](./07-ai-compose.md) - Smart message generation
8. [AI Suggestions](./08-ai-suggestions.md) - Proactive action recommendations
9. [Pipelines & Goals](./09-pipelines-goals.md) - Sales pipelines and goal tracking
10. [Search](./10-search.md) - Full-text contact search
11. [Billing](./11-billing.md) - Stripe subscription management

### Developer Resources

12. [Error Handling](./12-error-handling.md) - HTTP status codes, debugging
13. [Rate Limiting](./13-rate-limiting.md) - Rate limits, headers, best practices
14. [Frontend Integration](./14-frontend-integration.md) - React, React Native examples

### AI & Agent Features

15. [Agent Chat](./15-agent-chat.md) - Conversational AI assistant
16. [Voice Notes](./16-voice-notes.md) - AI voice note processing
17. [Screenshots](./17-screenshots.md) - AI screenshot analysis & OCR

### Advanced Features

18. [Custom Fields](./18-custom-fields.md) - Flexible contact data with AI integration
19. [Warmth Alerts](./19-warmth-alerts.md) - Proactive relationship monitoring
20. [Feature Requests](./20-feature-requests.md) - AI-powered feature voting
21. [Contact Extensions](./21-contact-extensions.md) - Files, channels, notes, preferences
22. [User Settings](./22-user-settings.md) - Persona notes, compose settings
23. [Messages & Outbox](./23-messages-outbox.md) - Message queue with approval workflow
24. [Autopilot Policies](./24-autopilot-policies.md) - Automated relationship management

---

## Getting Started

### 1. Install Supabase Client

```bash
# For web apps
npm install @supabase/supabase-js

# For React Native
npm install @supabase/supabase-js react-native-url-polyfill
```

### 2. Initialize Supabase

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://utasetfxiqcrnwyfforx.supabase.co',
  'your-anon-key'
);
```

### 3. Authenticate User

```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
});

const jwt = data.session.access_token;
```

### 4. Make API Calls

```typescript
const response = await fetch('https://ever-reach-be.vercel.app/api/v1/contacts', {
  headers: {
    'Authorization': `Bearer ${jwt}`,
    'Content-Type': 'application/json',
    'Origin': 'https://everreach.app'
  }
});

const { contacts } = await response.json();
```

---

## API Conventions

### Request Headers
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
Origin: https://everreach.app
```

### Response Format
```json
{
  "data": { ... },
  "meta": {
    "timestamp": "2025-10-12T15:00:00Z",
    "request_id": "req_abc123"
  }
}
```

### Error Format
```json
{
  "error": "Error description",
  "request_id": "req_abc123"
}
```

### Pagination
```json
{
  "items": [...],
  "limit": 20,
  "nextCursor": "2025-01-15T09:00:00Z"
}
```

---

## HTTP Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | OK | Successful GET/PATCH/DELETE |
| 201 | Created | Successful POST |
| 400 | Bad Request | Invalid input |
| 401 | Unauthorized | Missing/invalid JWT |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Server Error | Internal error |

---

## Common Patterns

### Create Resource
```http
POST /v1/{resource}
Content-Type: application/json

{
  "field": "value"
}
```

### List Resources
```http
GET /v1/{resource}?limit=20&cursor=...
```

### Get Single Resource
```http
GET /v1/{resource}/:id
```

### Update Resource
```http
PATCH /v1/{resource}/:id
Content-Type: application/json

{
  "field": "new_value"
}
```

### Delete Resource
```http
DELETE /v1/{resource}/:id
```

---

## Feature Categories

### 📇 Contact Management
- CRUD operations for contacts
- Search and filtering
- Tags and custom fields
- Warmth scoring

### 💬 Communication
- Interaction logging
- Message templates
- AI-powered composition
- Multi-channel support (email, SMS, DM)

### 🤖 AI Features
- Relationship analysis
- Smart message generation
- Proactive suggestions
- Context assembly

### 📊 Organization
- Pipeline management
- Goal tracking
- Progress monitoring
- Stage transitions

### 💳 Billing
- Stripe integration
- Subscription management
- Usage tracking

---

## Development Workflow

1. **Read Feature Docs**: Start with the feature guide (e.g., [Contacts](./02-contacts.md))
2. **Test with cURL**: Use examples to test endpoints
3. **Integrate in App**: Use [Frontend Integration](./14-frontend-integration.md) patterns
4. **Handle Errors**: Review [Error Handling](./12-error-handling.md)
5. **Monitor Limits**: Check [Rate Limiting](./13-rate-limiting.md)

---

## Support & Resources

- **E2E Test Results**: See [E2E_TEST_SUCCESS_GUIDE.md](../E2E_TEST_SUCCESS_GUIDE.md)
- **Backend Repo**: `feat/backend-vercel-only-clean` branch
- **Supabase Dashboard**: https://supabase.com/dashboard/project/utasetfxiqcrnwyfforx
- **Test Reports**: `test/agent/reports/`

---

## Version History

### v1.0 (October 12, 2025)
- ✅ All core features deployed
- ✅ 95.2% E2E test pass rate
- ✅ Production ready
- 📝 Complete API documentation

**Next**: API key system, webhooks, advanced analytics
