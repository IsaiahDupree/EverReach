# Frontend Implementation Guide: Public API Platform

## 📋 Overview

This guide covers implementing the Public API developer platform in the EverReach frontend (web + mobile).

**Features to Build:**
1. **API Documentation Viewer** - Public, SEO-friendly docs
2. **API Keys Manager** - Create, rotate, revoke keys
3. **Try-It Console** - Test API endpoints interactively
4. **Usage Analytics** - View API usage stats

**Backend Status:** ✅ Complete (auth, rate limiting, endpoints all ready)  
**Frontend Status:** ⏳ Needs implementation

---

## 🎯 Available Public API Endpoints

### Core CRM (8 endpoints)
- `GET /v1/contacts` - List contacts
- `POST /v1/contacts` - Create contact
- `GET /v1/contacts/:id` - Get contact details
- `PATCH /v1/contacts/:id` - Update contact
- `DELETE /v1/contacts/:id` - Delete contact
- `GET /v1/contacts/:id/context-bundle` - Get LLM-ready context (AI agents)
- `GET /v1/interactions` - List interactions
- `POST /v1/interactions` - Log interaction

### Warmth & Alerts (3 endpoints)
- `GET /v1/warmth/summary` - Get warmth overview
- `POST /v1/contacts/:id/warmth/recompute` - Recalculate warmth
- `GET /v1/alerts` - List warmth alerts

### AI Features (5 endpoints)
- `POST /v1/agent/chat` - Chat with AI agent
- `POST /v1/agent/compose/smart` - Generate messages
- `GET /v1/agent/analyze/contact` - Get AI insights
- `POST /v1/agent/voice-note/process` - Process voice notes
- `GET /v1/agent/tools` - List available AI tools

### Templates & Messages (4 endpoints)
- `GET /v1/templates` - List templates
- `POST /v1/templates` - Create template
- `POST /v1/messages/prepare` - Prepare message
- `POST /v1/messages/send` - Send message

### Advanced Features (6 endpoints)
- `GET /v1/custom-fields` - List custom fields
- `POST /v1/custom-fields` - Create custom field
- `GET /v1/segments` - List segments
- `POST /v1/segments` - Create segment
- `GET /v1/automation-rules` - List automation rules
- `POST /v1/webhooks` - Create webhook

---

## 🏗️ Pages to Build

### 1. Developer Landing Page
**Route:** `/developers`  
**Access:** Public  
**Purpose:** Marketing page for API

**Content:**
- Hero section explaining API capabilities
- Key features (AI-ready, rate-limited, secure)
- Code examples
- "Get Started" CTA → Sign up or go to `/developers/keys`
- Links to docs, console, status page

### 2. API Documentation Viewer
**Route:** `/developers/api`  
**Access:** Public  
**Purpose:** Interactive API reference

**Implementation:**
```tsx
// app/developers/api/page.tsx
'use client';
import { useEffect, useRef } from 'react';

export default function APIDocsPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load ReDoc dynamically (client-side only)
    import('redoc').then(({ RedocStandalone }) => {
      if (containerRef.current) {
        const root = createRoot(containerRef.current);
        root.render(
          <RedocStandalone
            specUrl="/openapi.json"
            options={{
              theme: {
                colors: {
                  primary: { main: '#7c3aed' }
                }
              },
              hideDownloadButton: false,
              expandResponses: '200,201',
              jsonSampleExpandLevel: 2
            }}
          />
        );
      }
    });
  }, []);

  return <div ref={containerRef} />;
}
```

**OpenAPI Spec Location:**  
Create `public/openapi.json` with API specification (see example below)

### 3. API Keys Manager
**Route:** `/developers/keys`  
**Access:** Authenticated users only  
**Purpose:** Create, view, rotate, revoke API keys

**Features:**
- List existing keys (show prefix only: `evr_test_abc123...`)
- Create new key (show full key ONCE in modal)
- Set key name, scopes, expiration
- Copy key to clipboard
- Revoke key
- View usage stats

**API Endpoints to Use:**
```typescript
// These need to be created in backend
POST /api/v1/api-keys/create
  Body: { name, scopes[], environment: 'test'|'live', expires_at? }
  Response: { api_key: 'evr_test_...', key_id, prefix }

GET /api/v1/api-keys
  Response: { keys: [{ id, prefix, name, scopes, created_at, last_used_at }] }

DELETE /api/v1/api-keys/:id
  Body: { reason }
```

**Component Example:**
```tsx
// components/APIKeyCard.tsx
export function APIKeyCard({ keyData }: { keyData: APIKey }) {
  const [showRevoke, setShowRevoke] = useState(false);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between">
          <div>
            <h3 className="font-mono text-sm">{keyData.prefix}...</h3>
            <p className="text-xs text-gray-500">{keyData.name}</p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowRevoke(true)}
          >
            Revoke
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div>
            <span className="text-xs font-semibold">Scopes:</span>
            <div className="flex gap-1 mt-1">
              {keyData.scopes.map(scope => (
                <Badge key={scope} variant="secondary">{scope}</Badge>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-gray-500">Created:</span>
              <p>{new Date(keyData.created_at).toLocaleDateString()}</p>
            </div>
            <div>
              <span className="text-gray-500">Last Used:</span>
              <p>
                {keyData.last_used_at 
                  ? new Date(keyData.last_used_at).toLocaleDateString()
                  : 'Never'}
              </p>
            </div>
          </div>
        </div>
      </CardContent>

      {showRevoke && (
        <RevokeKeyModal
          keyId={keyData.id}
          onClose={() => setShowRevoke(false)}
        />
      )}
    </Card>
  );
}
```

### 4. Try-It Console
**Route:** `/developers/console`  
**Access:** Authenticated users only  
**Purpose:** Interactive API testing

**Features:**
- Select API key (dropdown of user's keys)
- Select endpoint (dropdown)
- Configure request (headers, body, query params)
- Send request
- View response (formatted JSON)
- View request/response headers
- Copy as cURL command

**Implementation:**
```tsx
// app/developers/console/page.tsx
export default function APIConsolePage() {
  const [selectedKey, setSelectedKey] = useState<string>('');
  const [endpoint, setEndpoint] = useState<string>('/v1/contacts');
  const [method, setMethod] = useState<'GET'|'POST'|'PATCH'|'DELETE'>('GET');
  const [body, setBody] = useState<string>('');
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const sendRequest = async () => {
    setLoading(true);
    try {
      const res = await fetch(`https://api.everreach.app${endpoint}`, {
        method,
        headers: {
          'Authorization': `Bearer ${selectedKey}`,
          'Content-Type': 'application/json'
        },
        body: method !== 'GET' ? body : undefined
      });
      
      const data = await res.json();
      setResponse({
        status: res.status,
        headers: Object.fromEntries(res.headers.entries()),
        body: data
      });
    } catch (error) {
      setResponse({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">API Console</h1>
      
      <div className="grid grid-cols-2 gap-6">
        {/* Request Panel */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Request</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedKey} onValueChange={setSelectedKey}>
              <SelectTrigger>
                <SelectValue placeholder="Select API Key" />
              </SelectTrigger>
              <SelectContent>
                {apiKeys.map(key => (
                  <SelectItem key={key.id} value={key.full_key}>
                    {key.prefix}... ({key.name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PATCH">PATCH</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                </SelectContent>
              </Select>
              
              <Input
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder="/v1/contacts"
              />
            </div>

            {method !== 'GET' && (
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder='{"name": "John Doe"}'
                rows={10}
                className="font-mono text-sm"
              />
            )}

            <Button onClick={sendRequest} disabled={loading || !selectedKey}>
              {loading ? 'Sending...' : 'Send Request'}
            </Button>
          </CardContent>
        </Card>

        {/* Response Panel */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Response</h2>
          </CardHeader>
          <CardContent>
            {response && (
              <div className="space-y-4">
                <div>
                  <Badge variant={response.status < 300 ? 'success' : 'destructive'}>
                    {response.status}
                  </Badge>
                </div>
                
                <div>
                  <h3 className="text-sm font-semibold mb-2">Headers</h3>
                  <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
                    {JSON.stringify(response.headers, null, 2)}
                  </pre>
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-2">Body</h3>
                  <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-96">
                    {JSON.stringify(response.body, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

---

## 📊 OpenAPI Specification

Create `public/openapi.json`:

```json
{
  "openapi": "3.0.3",
  "info": {
    "title": "EverReach Public API",
    "version": "1.0.0",
    "description": "Secure, AI-ready API for building on EverReach CRM"
  },
  "servers": [
    { "url": "https://api.everreach.app", "description": "Production" },
    { "url": "https://api-staging.everreach.app", "description": "Staging" }
  ],
  "security": [{ "BearerAuth": [] }],
  "paths": {
    "/v1/contacts": {
      "get": {
        "summary": "List contacts",
        "tags": ["Contacts"],
        "parameters": [
          { "name": "limit", "in": "query", "schema": { "type": "integer", "default": 20 } },
          { "name": "cursor", "in": "query", "schema": { "type": "string" } }
        ],
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "contacts": { "type": "array" },
                    "cursor": { "type": "string" }
                  }
                }
              }
            }
          }
        }
      },
      "post": {
        "summary": "Create contact",
        "tags": ["Contacts"],
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "display_name": { "type": "string" },
                  "emails": { "type": "array", "items": { "type": "string" } }
                },
                "required": ["display_name"]
              }
            }
          }
        },
        "responses": {
          "201": { "description": "Created" }
        }
      }
    },
    "/v1/contacts/{id}/context-bundle": {
      "get": {
        "summary": "Get AI context bundle",
        "description": "Returns LLM-ready context for AI agents",
        "tags": ["AI"],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "string" } },
          { "name": "interactions", "in": "query", "schema": { "type": "integer", "default": 20 } }
        ],
        "responses": {
          "200": { "description": "Success" }
        }
      }
    }
  },
  "components": {
    "securitySchemes": {
      "BearerAuth": {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "API Key",
        "description": "Use your API key: `evr_live_...`"
      }
    }
  }
}
```

---

## 🔧 Backend Endpoints to Create

These endpoints don't exist yet and need to be added:

```typescript
// app/api/v1/api-keys/route.ts
export async function POST(req: Request) {
  // Create new API key
  const { name, scopes, environment, expires_at } = await req.json();
  const apiKey = generateApiKey(environment);
  const keyHash = hashApiKey(apiKey);
  
  // Store in database
  const { data } = await supabase
    .from('api_keys')
    .insert({
      key_hash: keyHash,
      key_prefix: apiKey.substring(0, 12),
      name,
      scopes,
      environment,
      expires_at
    })
    .select()
    .single();

  return ok({
    api_key: apiKey, // Show ONCE
    key_id: data.id,
    prefix: data.key_prefix
  });
}

export async function GET(req: Request) {
  // List user's API keys (without full keys)
  const { data } = await supabase
    .from('api_keys')
    .select('id, key_prefix, name, scopes, created_at, last_used_at, environment')
    .eq('user_id', user.id);

  return ok({ keys: data });
}

// app/api/v1/api-keys/[id]/route.ts
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  // Revoke API key
  const { reason } = await req.json();
  
  await supabase
    .from('api_keys')
    .update({ 
      revoked_at: new Date().toISOString(),
      revocation_reason: reason
    })
    .eq('id', params.id);

  return ok({ revoked: true });
}
```

---

## 📱 Mobile Implementation

For mobile app (Expo/React Native):

**Option 1: WebView** (Recommended for MVP)
```tsx
// app/(tabs)/settings.tsx
<Button onPress={() => {
  Linking.openURL('https://everreach.app/developers');
}}>
  Developer Tools
</Button>
```

**Option 2: Native Screens** (Future)
- Create native API key manager
- Show keys in FlatList
- Use Modal for creating keys
- Use react-native-sensitive-info for secure key storage

---

## ✅ Implementation Checklist

### Phase 1: Core Features (Week 1)
- [ ] Create OpenAPI spec (`public/openapi.json`)
- [ ] Build developer landing page (`/developers`)
- [ ] Implement API docs viewer (`/developers/api` with ReDoc)
- [ ] Create backend endpoints for API key management
- [ ] Build API keys manager UI (`/developers/keys`)

### Phase 2: Testing Tools (Week 2)
- [ ] Build Try-It console (`/developers/console`)
- [ ] Add usage analytics dashboard
- [ ] Add code examples for popular languages
- [ ] Create "Quick Start" guide

### Phase 3: Polish (Week 3)
- [ ] Add webhook tester
- [ ] Add rate limit visualizer
- [ ] Add API status page
- [ ] Mobile WebView integration

---

## 📚 Documentation References

**Backend Docs:**
- `docs/PUBLIC_API_GUIDE.md` - Complete API reference
- `docs/PUBLIC_API_DEVELOPERS_PORTAL_GUIDE.md` - Portal design guide
- `__tests__/PUBLIC_API_TESTS.md` - API testing guide

**Database Tables:**
- `api_keys` - API key storage
- `api_rate_limits` - Rate limiting
- `api_audit_logs` - Usage tracking

---

## 🎯 Success Metrics

**MVP Goals:**
- Users can create/revoke API keys
- API documentation is publicly accessible
- Users can test API in console
- All public endpoints documented

**Future:**
- SDK generation (TypeScript, Python, Go)
- Webhook testing tools
- Real-time API logs viewer
- Usage analytics dashboard

---

**Status:** ⏳ Ready for implementation  
**Priority:** 🟡 MEDIUM (after contact import selection)  
**Estimated Effort:** 2-3 weeks  
**Dependencies:** Backend endpoints for key management
