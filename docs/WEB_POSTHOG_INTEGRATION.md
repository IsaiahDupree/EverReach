# PostHog Integration - Next.js Web App

## 📦 Installation

### 1. Install Package

```bash
cd web  # Your Next.js app directory
npm install posthog-js
```

### 2. Add Environment Variables

Create/update `.env.local`:

```bash
# PostHog
NEXT_PUBLIC_POSTHOG_KEY=phc_your_project_key_here
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# Existing vars
NEXT_PUBLIC_SUPABASE_URL=https://utasetfxiqcrnwyfforx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_BACKEND_BASE=https://ever-reach-be.vercel.app
```

**Important:** Also add these to Vercel environment variables:
- Go to: https://vercel.com/your-team/web/settings/environment-variables
- Add `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST`

### 3. Update `.env.example`

```bash
# PostHog Analytics
NEXT_PUBLIC_POSTHOG_KEY=phc_your_project_key_here
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

---

## 🚀 Implementation

### For Next.js 15.3+ (Recommended)

Create `instrumentation-client.js` in your project root:

```javascript
// instrumentation-client.js
import posthog from 'posthog-js';

if (typeof window !== 'undefined') {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
    person_profiles: 'identified_only',
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true,
    defaults: '2025-05-24'
  });
}
```

### For Next.js < 15.3 (App Router)

**Option A: Create a Provider (Recommended)**

Create `app/providers/posthog-provider.tsx`:

```typescript
'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { useEffect } from 'react';

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
        person_profiles: 'identified_only',
        capture_pageview: true,
        capture_pageleave: true,
        autocapture: true,
      });
    }
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
```

**Wrap your app in `app/layout.tsx`:**

```typescript
import { PostHogProvider } from './providers/posthog-provider';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <PostHogProvider>
          {children}
        </PostHogProvider>
      </body>
    </html>
  );
}
```

---

## 👤 User Identification

After user signs in with Supabase:

```typescript
'use client';

import posthog from 'posthog-js';
import { useEffect } from 'react';
import { useSupabase } from './your-supabase-hook';

export function usePostHogIdentify() {
  const { user } = useSupabase();

  useEffect(() => {
    if (user) {
      // Hash user ID for privacy
      const hash = async (str: string) => {
        const encoder = new TextEncoder();
        const data = encoder.encode(str);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      };

      hash(user.id).then((anonId) => {
        posthog.identify(anonId, {
          plan: user.user_metadata?.plan || 'free',
          locale: navigator.language,
          platform: 'web',
        });
      });
    }
  }, [user]);
}
```

**Use in your auth component:**

```typescript
import { usePostHogIdentify } from './use-posthog-identify';

export function AuthProvider({ children }) {
  usePostHogIdentify(); // Call this hook
  
  return <>{children}</>;
}
```

---

## 📊 Track Events

### Automatic Tracking

PostHog automatically captures:
- ✅ Page views
- ✅ Button clicks
- ✅ Form submissions
- ✅ Page exits

### Manual Event Tracking

```typescript
import posthog from 'posthog-js';

// Feature request submitted
posthog.capture('Feature Request Submitted', {
  feature_id: requestId,
  request_type: 'feature',
  title_length: title.length,
  description_length: description.length,
});

// Message generated
posthog.capture('Message Generated', {
  contact_id: contactId,
  channel: 'email',
  goal: 'follow_up',
  latency_ms: 1250,
});

// Paywall viewed
posthog.capture('Paywall Viewed', {
  variant: 'variant_a',
  trigger: 'feature_limit',
});
```

### Page View Tracking (if autocapture disabled)

```typescript
'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import posthog from 'posthog-js';

export function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname) {
      let url = window.origin + pathname;
      if (searchParams && searchParams.toString()) {
        url = url + `?${searchParams.toString()}`;
      }
      posthog.capture('$pageview', {
        $current_url: url,
      });
    }
  }, [pathname, searchParams]);

  return null;
}
```

Add to layout:

```typescript
import { PostHogPageView } from './posthog-pageview';

export default function Layout({ children }) {
  return (
    <>
      <PostHogPageView />
      {children}
    </>
  );
}
```

---

## 🎯 Feature Flags

### Check Flag

```typescript
'use client';

import posthog from 'posthog-js';
import { useFeatureFlagEnabled } from 'posthog-js/react';

export function PaywallComponent() {
  const showNewPaywall = useFeatureFlagEnabled('new_paywall_v2');

  if (showNewPaywall) {
    return <NewPaywall />;
  }

  return <OldPaywall />;
}
```

### Get Flag Variant

```typescript
import { useFeatureFlagVariantKey } from 'posthog-js/react';

export function ExperimentComponent() {
  const variant = useFeatureFlagVariantKey('pricing_experiment');

  switch (variant) {
    case 'variant_a':
      return <PricingA />;
    case 'variant_b':
      return <PricingB />;
    default:
      return <PricingControl />;
  }
}
```

### Server-Side Flags (Next.js App Router)

```typescript
// app/page.tsx
import { cookies } from 'next/headers';
import posthog from 'posthog-node';

const client = new posthog.PostHog(
  process.env.NEXT_PUBLIC_POSTHOG_KEY!,
  { host: process.env.NEXT_PUBLIC_POSTHOG_HOST }
);

export default async function Page() {
  const cookieStore = await cookies();
  const distinctId = cookieStore.get('ph_distinct_id')?.value;

  const isEnabled = await client.isFeatureEnabled(
    'new_feature',
    distinctId || 'anonymous'
  );

  return (
    <div>
      {isEnabled ? <NewFeature /> : <OldFeature />}
    </div>
  );
}
```

---

## 🔒 Privacy & Opt-Out

### Respect User Consent

```typescript
import posthog from 'posthog-js';

// Opt out
posthog.opt_out_capturing();

// Opt in
posthog.opt_in_capturing();

// Check status
const hasOptedOut = posthog.has_opted_out_capturing();
```

### Privacy-Safe Properties

```typescript
// ❌ BAD - Don't track PII
posthog.capture('Contact Created', {
  name: 'John Doe',           // ❌ PII
  email: 'john@example.com',  // ❌ PII
});

// ✅ GOOD - Only derived metrics
posthog.capture('Contact Created', {
  contact_id: 'uuid-here',       // ✅ ID
  source: 'manual',              // ✅ Enum
  has_company: true,             // ✅ Boolean
  field_count: 5,                // ✅ Count
});
```

---

## 🧪 Testing

### Test Events Locally

```typescript
// Enable debug mode in development
if (process.env.NODE_ENV === 'development') {
  posthog.debug();
}

// Capture test event
posthog.capture('Test Event', {
  test: true,
  timestamp: new Date().toISOString(),
});
```

### Verify in PostHog

1. Go to: https://app.posthog.com/events
2. Click "Live Events"
3. Trigger an action in your app
4. Event should appear within seconds

### Check Webhook Integration

```sql
-- In Supabase SQL Editor
SELECT 
  name,
  anon_user_id,
  ts,
  props
FROM analytics_events
WHERE ingestion = 'posthog'
ORDER BY ts DESC
LIMIT 10;
```

---

## 📈 Common Use Cases

### Track Button Click

```typescript
<button
  onClick={() => {
    posthog.capture('CTA Clicked', {
      cta_key: 'upgrade_to_pro',
      screen_name: 'dashboard',
    });
    // ... rest of your logic
  }}
>
  Upgrade to Pro
</button>
```

### Track Form Submission

```typescript
const handleSubmit = async (data) => {
  posthog.capture('Form Submitted', {
    form_name: 'contact_form',
    field_count: Object.keys(data).length,
    has_errors: false,
  });

  // ... submit logic
};
```

### Track Search

```typescript
const handleSearch = (query: string) => {
  posthog.capture('Search Performed', {
    scope: 'contacts',
    query_length: query.length,
    results_count: results.length,
  });
};
```

### Track Error

```typescript
try {
  await riskyOperation();
} catch (error) {
  posthog.capture('API Error', {
    endpoint_key: 'create_contact',
    error_type: error.name,
    status_code: error.status,
  });
  throw error;
}
```

---

## 🚨 Troubleshooting

### Events Not Showing

1. **Check API key**: Verify `NEXT_PUBLIC_POSTHOG_KEY` is correct
2. **Check initialization**: Open DevTools Console, look for PostHog logs
3. **Check network**: DevTools → Network tab, filter by "posthog"
4. **Check environment**: PostHog only works in browser (`typeof window !== 'undefined'`)

### Build Errors

If you get SSR errors:

```typescript
// Wrap in dynamic import
import dynamic from 'next/dynamic';

const PostHogProvider = dynamic(
  () => import('./providers/posthog-provider').then(mod => mod.PostHogProvider),
  { ssr: false }
);
```

### TypeScript Errors

Install types:

```bash
npm install --save-dev @types/posthog-js
```

---

## 📚 Resources

- **PostHog Docs**: https://posthog.com/docs
- **Next.js Integration**: https://posthog.com/docs/libraries/next-js
- **Feature Flags**: https://posthog.com/docs/feature-flags
- **Event Tracking**: https://posthog.com/docs/product-analytics

---

## ✅ Deployment Checklist

- [ ] Install `posthog-js` package
- [ ] Add environment variables to `.env.local`
- [ ] Add environment variables to Vercel
- [ ] Create `instrumentation-client.js` (Next.js 15.3+) OR PostHogProvider
- [ ] Wrap app in provider (if using provider)
- [ ] Add user identification after auth
- [ ] Test event capture locally
- [ ] Verify events in PostHog dashboard
- [ ] Check webhook integration (Supabase)
- [ ] Deploy to production
- [ ] Verify production events

---

**Ready to track user behavior on your web app! 🚀**
