# Setup and Prerequisites

## ✅ Prerequisites

### Backend Requirements
- ✅ Backend deployed to Vercel
- ✅ OpenAI API key configured in Vercel environment variables
- ✅ Database migration run (`agent-schema.sql`)

### Frontend Requirements
- ✅ Expo app with TypeScript
- ✅ Existing `lib/api.ts` with authenticated API client
- ✅ Backend URL configured in `.env`

## 🔧 Environment Configuration

### 1. Check Backend URL

In `fifth_pull/.env`:
```bash
EXPO_PUBLIC_API_URL=https://backend-vercel-xxx.vercel.app
```

### 2. Verify API Authentication

Your existing `lib/api.ts` should export:
- `apiFetch()` - Authenticated fetch wrapper
- `authHeader()` - Auth header generator

Example:
```typescript
// lib/api.ts
export const backendBase = process.env.EXPO_PUBLIC_API_URL;

export async function authHeader() {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const url = `${backendBase}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(await authHeader()),
    ...options.headers
  };
  
  const response = await fetch(url, { ...options, headers });
  if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
  return response.json();
}
```

## 🧪 Test Backend Connection

### Test OpenAI Configuration

```typescript
// Quick test in a component or screen
import { useEffect } from 'react';

useEffect(() => {
  const testOpenAI = async () => {
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/v1/openai/test`,
        {
          headers: await authHeader()
        }
      );
      const data = await response.json();
      console.log('OpenAI Status:', data);
    } catch (err) {
      console.error('OpenAI test failed:', err);
    }
  };
  
  testOpenAI();
}, []);
```

Expected response:
```json
{
  "configured": true,
  "model": "gpt-4o-mini",
  "message": "OpenAI is configured and ready"
}
```

## 📦 File Structure

After integration, your structure will look like:

```
fifth_pull/
├── lib/
│   ├── api.ts              # ✅ Already exists
│   ├── agent-types.ts      # 📝 You'll create this
│   └── agent-api.ts        # 📝 You'll create this
├── hooks/
│   ├── useAgent.ts         # 📝 Optional - for chat
│   ├── useVoiceProcess.ts  # 📝 Optional - for voice notes
│   └── useSmartCompose.ts  # 📝 Optional - for composition
└── components/
    ├── VoiceNoteProcessor.tsx  # 📝 Optional
    ├── SmartComposer.tsx       # 📝 Optional
    └── AgentChat.tsx           # 📝 Optional
```

## 🚦 Readiness Checklist

Before proceeding, ensure:

- [ ] Backend is deployed and accessible
- [ ] `EXPO_PUBLIC_API_URL` is set in `.env`
- [ ] `lib/api.ts` exists with `apiFetch()` and `authHeader()`
- [ ] You can authenticate users (Supabase auth working)
- [ ] OpenAI test endpoint returns `configured: true`

## ⚠️ Common Issues

### Issue: 401 Unauthorized
**Solution**: Check that `authHeader()` is properly attaching the Bearer token

### Issue: 503 Service Unavailable
**Solution**: OpenAI API key not configured in Vercel. Add `OPENAI_API_KEY` environment variable.

### Issue: 404 Not Found
**Solution**: Verify backend URL is correct and agent routes are deployed

## Next Steps

Once setup is complete, continue to [02-types.md](./02-types.md) to add type definitions.
