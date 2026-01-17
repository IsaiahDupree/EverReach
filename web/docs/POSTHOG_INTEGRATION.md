# PostHog Integration Guide

## Overview

PostHog is integrated into the EverReach web app for product analytics, feature flags, and user behavior tracking.

## Setup

### Environment Variables

Add to `.env.local` and Vercel:

```env
NEXT_PUBLIC_POSTHOG_KEY=phc_v71DkKbXSBTdfrhIuWrnTgIb21tiPfx29iZNVyVBqIb
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

### Installation

```bash
npm install posthog-js
```

## Architecture

### Provider Setup

- **PostHogProvider** (`app/providers/PostHogProvider.tsx`): Wraps the app and initializes PostHog
- **Auto-tracking**: Automatic pageview tracking on route changes
- **Configuration**: 
  - `person_profiles: 'identified_only'` - Only create profiles for logged-in users
  - `capture_pageview: false` - Manual pageview control for accuracy
  - `capture_pageleave: true` - Track when users leave pages

### Utility Functions

Use `lib/posthog.ts` for consistent tracking:

```typescript
import { trackEvent, identifyUser, resetUser, EVENTS } from '@/lib/posthog'

// Track an event
trackEvent(EVENTS.CONTACT_CREATED, { 
  contact_id: '123',
  source: 'web_ui' 
})

// Identify user after login
identifyUser(user.id, {
  email: user.email,
  plan: 'pro',
  created_at: user.created_at
})

// Reset on logout
resetUser()
```

## Usage Examples

### 1. Track User Login

```typescript
// In your login callback
import { identifyUser, EVENTS, trackEvent } from '@/lib/posthog'

async function handleLogin(user) {
  // Identify the user
  identifyUser(user.id, {
    email: user.email,
    name: user.name,
    plan: user.subscription_plan,
  })
  
  // Track login event
  trackEvent(EVENTS.LOGIN, {
    method: 'google_oauth',
  })
}
```

### 2. Track Contact Creation

```typescript
'use client'

import { trackEvent, EVENTS } from '@/lib/posthog'

function CreateContactButton() {
  const handleCreate = async () => {
    const contact = await createContact(formData)
    
    trackEvent(EVENTS.CONTACT_CREATED, {
      contact_id: contact.id,
      source: 'manual_entry',
      has_email: !!contact.email,
      has_phone: !!contact.phone,
    })
  }
  
  return <button onClick={handleCreate}>Create Contact</button>
}
```

### 3. Track AI Feature Usage

```typescript
import { trackEvent, EVENTS } from '@/lib/posthog'

async function composeMessage(contactId: string, goal: string) {
  const startTime = Date.now()
  
  const message = await aiCompose({ contactId, goal })
  
  trackEvent(EVENTS.AI_MESSAGE_COMPOSED, {
    contact_id: contactId,
    goal,
    duration_ms: Date.now() - startTime,
    message_length: message.length,
  })
  
  return message
}
```

### 4. Track Button Clicks

```typescript
'use client'

import { trackEvent } from '@/lib/posthog'

function ImportantButton() {
  return (
    <button 
      onClick={() => {
        trackEvent('button_clicked', {
          button_id: 'upgrade_cta',
          location: 'dashboard',
        })
        // ... handle click
      }}
    >
      Upgrade Plan
    </button>
  )
}
```

### 5. Track Form Submissions

```typescript
import { trackEvent } from '@/lib/posthog'

function ContactForm() {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    trackEvent('form_submitted', {
      form_type: 'contact_edit',
      fields_changed: ['name', 'email'],
    })
    
    // ... submit logic
  }
  
  return <form onSubmit={handleSubmit}>...</form>
}
```

## Event Naming Convention

Use the predefined `EVENTS` constants from `lib/posthog.ts`:

### Auth Events
- `EVENTS.LOGIN` - User logged in
- `EVENTS.LOGOUT` - User logged out
- `EVENTS.SIGNUP` - User signed up

### Contact Events
- `EVENTS.CONTACT_VIEWED` - Contact detail page viewed
- `EVENTS.CONTACT_CREATED` - New contact created
- `EVENTS.CONTACT_UPDATED` - Contact updated
- `EVENTS.CONTACT_DELETED` - Contact deleted

### Interaction Events
- `EVENTS.INTERACTION_LOGGED` - Interaction logged
- `EVENTS.MESSAGE_SENT` - Message sent

### Voice Notes
- `EVENTS.VOICE_NOTE_UPLOADED` - Voice note uploaded
- `EVENTS.VOICE_NOTE_TRANSCRIBED` - Voice note transcribed

### AI Features
- `EVENTS.AI_CHAT_MESSAGE` - AI chat message sent
- `EVENTS.AI_MESSAGE_COMPOSED` - AI composed a message
- `EVENTS.AI_CONTACT_ANALYZED` - AI analyzed a contact

### Alerts
- `EVENTS.ALERT_VIEWED` - Alert viewed
- `EVENTS.ALERT_ACTIONED` - Alert actioned (approved/skipped)

## Best Practices

### 1. Privacy & PII

❌ **DON'T track sensitive data:**
```typescript
// BAD - Don't send PII
trackEvent('message_sent', {
  message_content: 'Hi John...',  // ❌ Sensitive
  recipient_email: 'john@example.com',  // ❌ PII
})
```

✅ **DO track aggregates and metadata:**
```typescript
// GOOD - Track metadata only
trackEvent('message_sent', {
  message_length: 150,
  channel: 'email',
  has_attachments: false,
})
```

### 2. Event Properties

Keep properties consistent and typed:

```typescript
// Define event property types
type ContactCreatedEvent = {
  contact_id: string
  source: 'manual' | 'import' | 'api' | 'voice_note'
  has_email: boolean
  has_phone: boolean
}

trackEvent(EVENTS.CONTACT_CREATED, {
  contact_id: '123',
  source: 'manual',
  has_email: true,
  has_phone: false,
} as ContactCreatedEvent)
```

### 3. Identify Users on Auth

```typescript
// After successful login/signup
import { identifyUser } from '@/lib/posthog'
import { useEffect } from 'react'

function AuthCallback() {
  const { user } = useAuth()
  
  useEffect(() => {
    if (user) {
      identifyUser(user.id, {
        email: user.email,
        created_at: user.created_at,
        plan: user.plan,
      })
    }
  }, [user])
  
  return null
}
```

### 4. Reset on Logout

```typescript
import { resetUser } from '@/lib/posthog'

async function handleLogout() {
  await signOut()
  resetUser() // Clear PostHog identity
  router.push('/login')
}
```

## Feature Flags (Future)

PostHog supports feature flags for A/B testing:

```typescript
import { getPostHog } from '@/lib/posthog'

function FeatureGatedComponent() {
  const posthog = getPostHog()
  const showNewUI = posthog?.isFeatureEnabled('new-dashboard-ui')
  
  if (showNewUI) {
    return <NewDashboard />
  }
  
  return <OldDashboard />
}
```

## Debugging

### View Events in PostHog

1. Go to https://us.i.posthog.com
2. Navigate to "Activity" → "Live Events"
3. Filter by your user ID or event name

### Local Development

Events are sent in development. To disable:

```typescript
// app/providers/PostHogProvider.tsx
posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  opt_out_capturing_by_default: process.env.NODE_ENV === 'development', // Disable in dev
})
```

### Console Debugging

```typescript
import { getPostHog } from '@/lib/posthog'

// Enable debug mode
getPostHog()?.debug()

// View captured events
getPostHog()?.get_property('$session_id')
```

## Vercel Deployment

Add environment variables in Vercel dashboard:

1. Go to Project Settings → Environment Variables
2. Add:
   - `NEXT_PUBLIC_POSTHOG_KEY`
   - `NEXT_PUBLIC_POSTHOG_HOST`
3. Deploy

Environment variables are available on both server and client (prefixed with `NEXT_PUBLIC_`).

## Performance

- **Bundle size**: ~15KB gzipped
- **Initialization**: < 50ms
- **Event capture**: < 10ms (async, non-blocking)
- **Network**: Events batched and sent in background

## Resources

- [PostHog Docs](https://posthog.com/docs)
- [Next.js Integration Guide](https://posthog.com/docs/libraries/next-js)
- [API Reference](https://posthog.com/docs/libraries/js)
- [Event Properties Guide](https://posthog.com/docs/data/events)

## Support

- PostHog Dashboard: https://us.i.posthog.com
- Project API Key: `phc_v71DkKbXSBTdfrhIuWrnTgIb21tiPfx29iZNVyVBqIb`
- Host: `https://us.i.posthog.com`
