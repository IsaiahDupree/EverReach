# Frontend-Backend Integration Testing Checklist

## Pre-Flight Checks

### Environment Configuration
- [x] `.env` file exists with correct values
- [x] Supabase project ref: `utasetfxiqcrnwyfforx`
- [x] Backend API URL: `https://ever-reach-be.vercel.app`
- [x] App scheme: `everreach`
- [x] Dependencies installed (with `--legacy-peer-deps`)

### Code Integration
- [x] `lib/api.ts` created with auth helpers
- [x] Health check uses `lib/api.ts`
- [x] CORS includes `https://everreach.app`
- [x] Redirect URIs use `everreach://` scheme

## Testing Steps

### 1. Basic App Launch
```bash
npm start
```
**Expected**: Expo dev server starts without errors

**Test**: 
- [ ] App loads on web
- [ ] App loads on iOS simulator (if available)
- [ ] App loads on Android emulator (if available)
- [ ] No console errors on startup

### 2. Backend Connectivity Test

#### Health Check (Mode Settings)
Navigate to: **Settings → Mode Settings**

**Expected Behavior**:
- [ ] Health status shows "ok" (green)
- [ ] Backend URL displays: `https://ever-reach-be.vercel.app`
- [ ] Response time shown (e.g., "120ms")
- [ ] No CORS errors in console

**Troubleshooting**:
- If CORS error → Check backend CORS allowlist includes everreach.app
- If 401 error → Check Supabase configuration
- If timeout → Check backend is deployed and accessible

#### Health Status Component
If using `HealthStatus` component directly:

**Expected Behavior**:
- [ ] Health status: "ok"
- [ ] Server time displayed
- [ ] Version info shows (if `showVersion=true`)
  - Branch name
  - Commit hash (8 chars)
  - Build timestamp

### 3. Authentication Flow

#### Supabase Auth Test
**Action**: Try to sign in/sign up

**Expected**:
- [ ] Sign-up redirects to Supabase auth page
- [ ] OAuth providers available (Apple, Google, etc.)
- [ ] After auth, redirects to `everreach://auth/callback`
- [ ] Session token stored
- [ ] User profile loaded

**Check in DevTools**:
```javascript
// In browser console or React Native debugger
supabase.auth.getSession()
```

**Expected Output**:
```javascript
{
  data: {
    session: {
      access_token: "ey...",
      user: { id: "...", email: "..." }
    }
  }
}
```

### 4. API Authentication Test

#### Test Authenticated Endpoint
Try accessing a protected route (requires login):

**Example**: Contact list or user profile

**Expected**:
- [ ] Request includes `Authorization: Bearer <token>` header
- [ ] Backend validates token successfully
- [ ] Data returns without 401 error

**Check in Network Tab**:
- Look for requests to `https://ever-reach-be.vercel.app`
- Verify `Authorization` header present
- Verify `Origin: https://everreach.app` header

### 5. tRPC Integration Test

#### Check tRPC Client
The tRPC client should automatically use the backend URL.

**File**: `lib/trpc.ts`

**Expected**:
- [ ] tRPC requests go to backend URL
- [ ] Queries execute without errors
- [ ] Mutations work correctly

**Test Example**:
```typescript
// Try a simple tRPC query
const { data } = trpc.contacts.list.useQuery();
```

### 6. Feature-Specific Tests

#### Voice Recording & Transcription
**Note**: Currently uses external service `toolkit.rork.com`

**Action**: Record a voice note

**Expected**:
- [ ] Recording starts/stops
- [ ] Audio saved to Supabase storage
- [ ] Transcription request sent (to external service)
- [ ] Transcript displayed

**Known Issue**: Backend transcription requires persona note ID. Need generic endpoint.

#### Chat Interface
**Note**: Currently uses external service `toolkit.rork.com`

**Action**: Send a chat message

**Expected**:
- [ ] Message sent
- [ ] AI response received
- [ ] Chat history persisted

**Known Issue**: Backend doesn't have chat/LLM endpoint yet.

### 7. Error Handling Tests

#### Network Error Simulation
Temporarily set `EXPO_PUBLIC_API_URL` to invalid URL.

**Expected**:
- [ ] Error displayed gracefully
- [ ] No app crash
- [ ] User-friendly error message

#### Auth Expiration
Clear Supabase session and try authenticated request.

**Expected**:
- [ ] 401 Unauthorized response
- [ ] Redirect to login
- [ ] Session restored after re-login

## Common Issues & Solutions

### Issue: CORS Error
**Error**: `Access to fetch at '...' from origin 'https://everreach.app' has been blocked by CORS policy`

**Solution**:
1. Verify `https://everreach.app` in `backend-vercel/lib/cors.ts`
2. Redeploy backend to Vercel
3. Clear browser cache
4. Check backend logs for CORS rejections

### Issue: 401 Unauthorized
**Error**: All API calls return 401

**Solution**:
1. Check Supabase JWT secret matches between frontend and backend
2. Verify `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_KEY`
3. Check token in request: `await supabase.auth.getSession()`
4. Verify backend `getUser()` function works

### Issue: Module Not Found
**Error**: `Cannot find module 'react'` or similar

**Solution**:
1. Delete `node_modules` and reinstall:
   ```bash
   rm -rf node_modules
   npm install --legacy-peer-deps
   ```
2. Clear Metro bundler cache:
   ```bash
   npx expo start -c
   ```

### Issue: Redirect Not Working
**Error**: Auth callback fails or doesn't redirect

**Solution**:
1. Verify Supabase dashboard → Authentication → URL Configuration:
   - Site URL: `https://everreach.app`
   - Redirect URLs: `everreach://auth/callback`
2. Check `app.json` scheme matches: `"scheme": "everreach"`
3. Verify `lib/redirectUri.ts` uses correct scheme

### Issue: Environment Variables Not Loading
**Error**: `process.env.EXPO_PUBLIC_API_URL` is undefined

**Solution**:
1. Restart Expo dev server completely
2. Verify `.env` file in root of `fifth_pull/`
3. Check variable names start with `EXPO_PUBLIC_`
4. Try hardcoding temporarily to verify it's an env issue

## Performance Benchmarks

### Expected Response Times
- Health check: < 200ms
- tRPC query (cached): < 100ms
- tRPC query (fresh): < 500ms
- Auth token refresh: < 300ms
- Supabase query: < 400ms

### Known Slow Operations
- Voice transcription: 2-10 seconds (depends on audio length)
- AI chat response: 1-5 seconds (streaming)
- Image upload: 1-3 seconds (depends on size)

## Deployment Checklist

Before deploying to production:

### Backend
- [ ] Merge `recover-work` to `main`
- [ ] Deploy to Vercel production
- [ ] Verify environment variables in Vercel dashboard
- [ ] Test health endpoint: `https://ever-reach-be.vercel.app/api/health`
- [ ] Monitor logs for errors

### Frontend
- [ ] Test on physical iOS device
- [ ] Test on physical Android device
- [ ] Build production bundle: `expo build`
- [ ] Configure app store redirect URIs
- [ ] Submit to Apple App Store
- [ ] Submit to Google Play Store

### Supabase
- [ ] Verify redirect URLs in dashboard
- [ ] Test OAuth providers (Apple, Google)
- [ ] Check RLS policies are correct
- [ ] Monitor auth logs

## Success Criteria

✅ **Integration Complete** when:
1. App starts without errors
2. Health check returns "ok"
3. User can sign in/sign up
4. tRPC queries work
5. Supabase data loads
6. No CORS errors
7. Auth tokens automatically attached
8. All protected routes accessible when logged in

---

**Last Updated**: 2025-09-30
**Status**: 🟡 Ready for testing (dependencies installing)
