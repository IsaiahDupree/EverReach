# Screenshot API Deployment Test Plan

## Deployment Status

**Branch**: `feat/backend-vercel-only-clean`  
**Commit**: `29430c5`  
**Pushed**: Oct 20, 2025 @ 11:30pm  
**Vercel**: Auto-deploying now...

---

## 1. Wait for Vercel Deployment

Check deployment status:
1. Go to: https://vercel.com/isaiah-duprees-projects/ever-reach-be/deployments
2. Look for commit `29430c5` or message "feat(backend): implement AI screenshot analysis"
3. Wait for status: ✅ Ready (usually 3-5 minutes)

---

## 2. Manual API Test (Quick Smoke Test)

Once deployed, test the health of the API:

```bash
# Test that backend is responding
curl https://ever-reach-be.vercel.app/api/health

# Expected: {"status":"healthy"}
```

Test screenshot endpoint exists (will require auth):
```bash
curl https://ever-reach-be.vercel.app/api/v1/screenshots

# Expected: 401 Unauthorized (good - means endpoint exists and requires auth)
```

---

## 3. Run E2E Tests

Once Vercel deployment is complete:

```bash
# Make sure env vars are set
export TEST_EMAIL=isaiahdupree33@gmail.com
export TEST_PASSWORD=frogger12

# Run screenshot E2E tests
node test/agent/e2e-screenshot-crud.mjs
```

**Expected output**:
```
✅ Passed: 13
❌ Failed: 0
📊 Success Rate: 100%
```

If tests fail:
- Check Vercel deployment logs
- Verify OPENAI_API_KEY is set in Vercel
- Verify storage bucket exists
- Check Supabase migrations applied

---

## 4. Run Backend Integration Tests

```bash
cd test/backend

# Set auth token (get from Supabase or your session)
export TEST_AUTH_TOKEN=your_jwt_token_here

# Run tests
npm test screenshots-api.test.ts
```

**Expected output**:
```
PASS __tests__/screenshots-api.test.ts
  ✓ 25 tests passed
Time: ~2 minutes
```

---

## 5. Test in Production (Manual Upload)

If you have the mobile app running:

1. Open EverReach app
2. Go to Chat screen
3. Tap camera icon
4. Upload a business card or screenshot
5. Wait for analysis (15-30s)
6. Verify results appear

Or use curl with a real auth token:

```bash
# Get your JWT token from the app or Supabase
AUTH_TOKEN="your_token_here"

# Upload a test image
curl -X POST https://ever-reach-be.vercel.app/api/v1/screenshots \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -F "file=@path/to/test/image.png" \
  -F "context=business_card"

# Expected: {"screenshot_id":"...","analysis_id":"...","status":"queued"}
```

---

## 6. Monitor Analytics

Check PostHog for events:
- `screenshot_uploaded`
- `screenshot_analyzed`

Check Supabase `app_events` table:
```sql
SELECT * FROM app_events 
WHERE event_name IN ('screenshot_uploaded', 'screenshot_analyzed')
ORDER BY occurred_at DESC 
LIMIT 10;
```

---

## Troubleshooting

### Deployment Failed
- Check Vercel logs: https://vercel.com/isaiah-duprees-projects/ever-reach-be
- Common issues:
  - Missing `OPENAI_API_KEY` env var
  - Missing `SUPABASE_SERVICE_ROLE_KEY`
  - npm install failed (check package.json syntax)

### Tests Failing
- **401 Unauthorized**: Auth token expired or invalid
- **404 Not Found**: Routes not deployed yet (wait for Vercel)
- **500 Internal Error**: Check backend logs, likely OPENAI_API_KEY missing
- **Analysis stuck in "queued"**: GPT-4 Vision error, check logs

### Storage Issues
- Verify bucket exists: Supabase Dashboard → Storage → `screenshots`
- Check RLS policies allow user uploads
- Verify SUPABASE_SERVICE_ROLE_KEY is set

---

## Success Criteria

✅ Vercel deployment completes successfully  
✅ Health check returns 200  
✅ Screenshot endpoint returns 401 (auth required)  
✅ E2E tests pass (13/13)  
✅ Backend tests pass (25/25)  
✅ Manual upload works  
✅ Analysis completes within 30s  
✅ Analytics events tracked  

---

## After Tests Pass

Document results and plan Phase 2 advanced features:
1. Auto-commit rules
2. QR/vCard support  
3. Dedupe hints
4. Review Queue UI
5. Bounding boxes
6. Event extraction
7. Warmth hooks
8. On-device prepass

**Estimated Phase 2 effort**: 2-3 weeks
