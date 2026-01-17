# PostHog Deployment Checklist

## ✅ Completed

- [x] Installed `posthog-js` package
- [x] Created `PostHogProvider` component with auto pageview tracking
- [x] Integrated provider into root layout
- [x] Created utility functions in `lib/posthog.ts`
- [x] Added environment variables to `.env.local`
- [x] Updated `.env.example` with PostHog config
- [x] Created comprehensive documentation (`docs/POSTHOG_INTEGRATION.md`)

## 🚀 Vercel Deployment

### Add Environment Variables to Vercel

1. Go to https://vercel.com/isaiahduprees-projects/web/settings/environment-variables
2. Add the following variables:

```
NEXT_PUBLIC_POSTHOG_KEY=phc_v71DkKbXSBTdfrhIuWrnTgIb21tiPfx29iZNVyVBqIb
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

3. Apply to: **Production**, **Preview**, and **Development**
4. Click "Save"

### Deploy

```bash
cd web
git add .
git commit -m "feat: integrate PostHog analytics"
git push origin main
```

Or deploy directly:

```bash
vercel --prod
```

## 📊 Verify Installation

### Local Testing

1. Open http://localhost:3000
2. Open browser DevTools → Network tab
3. Filter by "posthog"
4. You should see requests to `https://us.i.posthog.com/e/`
5. Navigate between pages to see pageview events

### PostHog Dashboard

1. Go to https://us.i.posthog.com
2. Navigate to **Activity** → **Live Events**
3. You should see events coming in:
   - `$pageview` - Page views
   - `$pageleave` - Page exits
   - Custom events (once you add tracking)

## 🎯 Next Steps

### 1. Add User Identification

Update your auth callback to identify users:

```typescript
// In your login/auth component
import { identifyUser, EVENTS, trackEvent } from '@/lib/posthog'

useEffect(() => {
  if (user) {
    identifyUser(user.id, {
      email: user.email,
      created_at: user.created_at,
      plan: user.subscription_plan,
    })
    
    trackEvent(EVENTS.LOGIN, {
      method: 'google_oauth',
    })
  }
}, [user])
```

### 2. Add Event Tracking

Track important user actions:

**Contact Actions:**
```typescript
import { trackEvent, EVENTS } from '@/lib/posthog'

// When viewing a contact
trackEvent(EVENTS.CONTACT_VIEWED, { contact_id: id })

// When creating a contact
trackEvent(EVENTS.CONTACT_CREATED, { 
  source: 'manual',
  has_email: true 
})
```

**AI Features:**
```typescript
// When using AI chat
trackEvent(EVENTS.AI_CHAT_MESSAGE, { 
  message_length: 150,
  has_context: true 
})

// When composing with AI
trackEvent(EVENTS.AI_MESSAGE_COMPOSED, { 
  goal: 're-engage',
  duration_ms: 2500 
})
```

**Voice Notes:**
```typescript
trackEvent(EVENTS.VOICE_NOTE_UPLOADED, { 
  duration_seconds: 45,
  file_size_mb: 2.3 
})
```

### 3. Add Logout Tracking

```typescript
import { resetUser, trackEvent, EVENTS } from '@/lib/posthog'

async function handleLogout() {
  trackEvent(EVENTS.LOGOUT)
  resetUser() // Important: Clear PostHog identity
  await signOut()
  router.push('/login')
}
```

## 📈 Analytics to Implement

### Key Metrics to Track

1. **User Engagement**
   - Daily/Weekly Active Users
   - Session duration
   - Pages per session
   - Feature usage rates

2. **Contact Management**
   - Contacts created/updated/deleted
   - Contacts viewed
   - Interactions logged
   - Warmth score changes

3. **AI Usage**
   - AI chat sessions
   - Messages composed by AI
   - Contact analyses performed
   - Voice notes transcribed

4. **Conversion Funnels**
   - Signup → First Contact → First Interaction → First Message
   - Free → Trial → Paid conversion
   - Feature discovery and adoption

5. **Retention**
   - Day 1, 7, 30 retention
   - Cohort analysis
   - Churn risk indicators

## 🔍 Debugging

### Events Not Showing Up?

1. Check browser console for errors
2. Verify environment variables are set
3. Check Network tab for blocked requests
4. Verify PostHog key is correct
5. Check PostHog dashboard for project status

### PostHog Not Initializing?

```typescript
// Add debug mode in development
import { getPostHog } from '@/lib/posthog'

if (process.env.NODE_ENV === 'development') {
  getPostHog()?.debug()
}
```

## 📚 Resources

- [PostHog Dashboard](https://us.i.posthog.com)
- [Integration Guide](docs/POSTHOG_INTEGRATION.md)
- [PostHog Next.js Docs](https://posthog.com/docs/libraries/next-js)
- [Event Best Practices](https://posthog.com/docs/data/events)

## ✨ Features to Explore

- **Feature Flags**: A/B test new features
- **Session Recordings**: Watch user sessions
- **Heatmaps**: See where users click
- **Experiments**: Run multivariate tests
- **Cohorts**: Segment users for analysis
- **Funnels**: Track conversion flows
- **Retention Tables**: Analyze user retention

## 🔐 Privacy & Compliance

✅ **Current Setup**:
- Only identified users create profiles (`person_profiles: 'identified_only'`)
- No automatic PII tracking
- Manual pageview tracking for accuracy

⚠️ **Important**:
- Never track message content
- Never track contact names/emails in events
- Use metadata and aggregates only
- Follow GDPR/privacy guidelines

## 📦 Files Created

- `app/providers/PostHogProvider.tsx` - Provider component
- `lib/posthog.ts` - Utility functions and event constants
- `docs/POSTHOG_INTEGRATION.md` - Comprehensive guide
- `POSTHOG_DEPLOYMENT.md` - This checklist

## 🎉 Done!

PostHog is now integrated and ready to use. Deploy to Vercel and start tracking events!
