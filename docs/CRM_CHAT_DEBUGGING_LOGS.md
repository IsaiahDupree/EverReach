# CRM Chat Assistant - Debugging Logs Guide

## Overview
The CRM Chat Assistant has comprehensive logging at every layer to help diagnose connection issues and errors.

## Where to View Logs

### Web App
1. Open browser DevTools (F12 or right-click → Inspect)
2. Go to the **Console** tab
3. All logs will appear here with emoji prefixes for easy identification

### Mobile App (React Native)
1. **Metro Bundler**: Check the terminal where you ran `npm start` or `expo start`
2. **React Native Debugger**: If using standalone debugger
3. **Expo Go**: Shake device → "Debug Remote JS" → Opens Chrome DevTools

## Log Sections

### 1. API Request Logs (lib/api.ts)
Every API call logs:
```
========== API REQUEST ==========
🌐 URL: https://ever-reach-be.vercel.app/v1/agent/chat
📤 Method: POST
🔗 Base: https://ever-reach-be.vercel.app
📍 Path: /v1/agent/chat
🔐 Needs Auth: true
🎫 Has Token: true
🔄 Is Retry: false
🎫 Token Preview: Bearer eyJhbGciOiJIUzI1NiIsInR5...
📋 Headers: { "Content-Type": "application/json", "Authorization": "Bearer ..." }
📦 Body: {"message":"test","context":{"use_tools":true}}
=================================
```

### 2. API Response Logs (lib/api.ts)
Every API response logs:
```
========== API RESPONSE ==========
⏱️  Duration: 1234ms
📊 Status: 200 OK
✅ OK: true
🏷️  Status Code: 200
📥 Response Body: {"conversation_id":"...","message":"..."}
📥 Response (parsed): { "conversation_id": "...", "message": "..." }
==================================
```

### 3. API Error Logs (lib/api.ts)
Network or fetch errors log:
```
========== API ERROR ==========
⏱️  Duration: 5000ms
❌ Error: TypeError: Network request failed
💥 Message: Network request failed
🔍 Type: Network Error
===============================
```

### 4. Agent Message Send Logs (lib/agent-api.ts)
Before sending to agent:
```
========== AGENT MESSAGE SEND ==========
📤 Sending agent message...
📝 Request: {
  "message": "test message",
  "context": {
    "use_tools": true
  }
}
========================================
```

### 5. Agent Message Response Logs (lib/agent-api.ts)
After receiving response:
```
========== AGENT MESSAGE RESPONSE ==========
✅ Response status: 200 OK
📊 Response OK: true
============================================

📥 Agent response data: {
  "conversation_id": "...",
  "message": "...",
  "tools_used": [],
  "usage": { "total_tokens": 123 }
}
```

### 6. Agent API Error Logs (lib/agent-api.ts)
When API returns error:
```
========== AGENT API ERROR ==========
❌ Response not OK
📊 Status: 500
📝 Error body: {"error":"Internal server error"}
=====================================
```

### 7. Chat Interface Error Logs (components/ChatInterface.tsx)
When error occurs in UI:
```
========== CHAT INTERFACE ERROR ==========
❌ AI chat error: Error: Agent API error: 500 Internal Server Error
💥 Error type: Error
📝 Error message: Agent API error: 500 Internal Server Error
📚 Error stack: Error: Agent API error...
    at sendAgentMessage (lib/agent-api.ts:66)
    at sendMessageToAI (components/ChatInterface.tsx:72)
🔍 Full error object: {"message":"Agent API error: 500..."}
==========================================
```

## Common Error Patterns

### 1. Authentication Error (401)
**Logs to look for:**
- `📊 Status: 401 Unauthorized`
- `🔄 401 Unauthorized - Attempting token refresh and retry...`
- `❌ Token refresh failed`

**User sees:** "Authentication error. Please sign in again."

**Solution:** User needs to sign in again

### 2. Service Not Available (404)
**Logs to look for:**
- `📊 Status: 404 Not Found`
- `🌐 URL: https://ever-reach-be.vercel.app/v1/agent/chat`

**User sees:** "Service not available. Please check your connection."

**Solution:** Check if backend endpoint exists or if URL is correct

### 3. Network Error
**Logs to look for:**
- `❌ Error: TypeError: Network request failed`
- `🔍 Type: Network Error`

**User sees:** "Network error. Please check your internet connection."

**Solution:** Check internet connection, firewall, or CORS settings

### 4. Server Error (500)
**Logs to look for:**
- `📊 Status: 500 Internal Server Error`
- `📝 Error body: {...}`

**User sees:** "I'm having trouble connecting right now. Please try again shortly."

**Solution:** Check backend logs for server-side errors

## Backend Logs (backend-vercel/app/api/v1/agent/chat/route.ts)

The backend also logs:
```javascript
console.error('Agent chat error:', err);
```

Check Vercel logs or backend console for:
- OpenAI API errors
- Database connection errors
- Authentication errors
- Missing environment variables

## Debugging Checklist

When investigating "I'm having trouble connecting right now" error:

1. ✅ Check console for `========== API REQUEST ==========`
   - Is the URL correct?
   - Is auth token present?

2. ✅ Check console for `========== API RESPONSE ==========`
   - What is the status code?
   - What is the response body?

3. ✅ Check console for `========== AGENT MESSAGE ERROR ==========`
   - What is the error type?
   - What is the error message?

4. ✅ Check console for `========== CHAT INTERFACE ERROR ==========`
   - What is the full error stack?

5. ✅ Check backend logs (Vercel dashboard)
   - Are there server-side errors?
   - Is OpenAI API key configured?

6. ✅ Check environment variables
   - Is `EXPO_PUBLIC_API_URL` set correctly?
   - Is `OPENAI_API_KEY` set in backend?

## Environment Variables

### Frontend (.env)
```bash
EXPO_PUBLIC_API_URL=https://ever-reach-be.vercel.app
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

### Backend (Vercel Environment Variables)
```bash
OPENAI_API_KEY=sk-...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## Quick Test

To quickly test if the agent endpoint is working:

1. Open browser console
2. Run this code:
```javascript
fetch('https://ever-reach-be.vercel.app/v1/agent/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN_HERE'
  },
  body: JSON.stringify({
    message: 'test',
    context: { use_tools: true }
  })
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

Replace `YOUR_TOKEN_HERE` with actual token from Supabase session.

## Additional Resources

- **API Documentation**: `docs/agent-integration/`
- **Backend Code**: `backend-vercel/app/api/v1/agent/chat/route.ts`
- **Frontend Code**: `components/ChatInterface.tsx`
- **API Client**: `lib/agent-api.ts`
