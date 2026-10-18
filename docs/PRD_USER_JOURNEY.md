# PRD: EverReach User Journey & Conversion Flow

> **Document Type:** Product Requirements Document (PRD)  
> **Version:** 1.0  
> **Last Updated:** December 30, 2025  
> **Author:** EverReach Product Team  
> **Status:** Draft - Pending Changes

---

## 📋 Executive Summary

This PRD documents the complete user journey from initial landing to signup to purchase for EverReach. It covers both web and mobile flows, identifies current gaps, and proposes changes to improve conversion.

---

## 📊 Flow Overview Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER ENTRY POINTS                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   🌐 WEB                          📱 MOBILE (iOS/Android)                   │
│   └── Landing Page                └── Welcome Screen (OnboardingV2)         │
│       ├── "Get Early Access"          ├── Pre-Auth Questions               │
│       │   └── /waitlist               │   └── Sign Up/Sign In               │
│       │       └── /thank-you          │       └── Post-Auth Questions       │
│       │                               │           └── Paywall (Superwall)   │
│       └── "Sign In"                   │               └── Home Dashboard    │
│           └── /auth                   │                                      │
│               └── Home Dashboard      └── "Sign In" (existing user)          │
│                                           └── /auth                          │
│                                               └── Home Dashboard             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🌐 WEB USER JOURNEY

### Entry Point: `everreach.app` or `www.everreach.app`

```
Landing Page (/landing)
│
├─── Header
│    ├── Logo + "EverReach"
│    └── [Sign In] button → /auth
│
├─── Hero Section
│    ├── "Never Let A Relationship Go Cold Again"
│    ├── [Get Early Access →] button → /waitlist  ⭐ PRIMARY CTA
│    └── [See How It Works] → scrolls down
│
├─── Problem Section
│    └── Pain points about losing touch
│
├─── Solution Section  
│    └── How EverReach solves it
│
├─── How It Works
│    └── 3-step process
│
├─── Testimonials (placeholder)
│
├─── Pricing Section
│    ├── Monthly: $15/month
│    └── Yearly: $150/year (save 17%)
│    └── Both buttons → /auth (redirects to auth, not Stripe)
│
└─── Footer
     ├── Terms → /terms
     └── Privacy → /privacy-policy
```

### Waitlist Flow (Web Primary Funnel)

```
/waitlist (4-step form)
│
├── Step 1: PAIN POINT
│   ├── "I forget to follow up with people" 🤦
│   ├── "I don't know who to reach out to" 🤔
│   ├── "I don't know what to say" 💬
│   ├── "My contacts are scattered everywhere" 📱
│   └── "Just curious, no real problem" 👀
│
├── Step 2: NETWORK SIZE
│   ├── 0-50 contacts (Close friends & family)
│   ├── 50-200 contacts (Growing network)
│   ├── 200-1000 contacts (Active networker)
│   └── 1000+ contacts (Power connector)
│
├── Step 3: URGENCY
│   ├── "This week" (I need this now)
│   ├── "This month" (Soon would be great)
│   └── "Eventually" (Just exploring)
│
└── Step 4: EMAIL
    └── Enter email → Submit
        │
        ├── HIGH INTENT (score ≥ 70) → /thank-you-qualified
        │   └── Priority access perks
        │   └── "You're at the front of the line!"
        │
        └── STANDARD INTENT → /thank-you
            └── "You're on the list! 🎉"
```

### Intent Scoring Logic

| Selection | Points |
|-----------|--------|
| Pain: "forget to follow up" | +30 |
| Pain: "who to reach out to" | +25 |
| Pain: "what to say" | +20 |
| Pain: "scattered contacts" | +15 |
| Pain: "just curious" | +0 |
| Network: 1000+ | +25 |
| Network: 200-1000 | +20 |
| Network: 50-200 | +15 |
| Network: 0-50 | +10 |
| Urgency: "this week" | +25 |
| Urgency: "this month" | +15 |
| Urgency: "eventually" | +5 |

**High Intent Threshold:** ≥ 70 points

---

## 📱 MOBILE (NATIVE) USER JOURNEY

### Entry Point: App Store Download

```
App Launch
│
├── First-Time User (welcomeSeen = false)
│   │
│   └── OnboardingV2 Screen (S1 - Welcome)
│       │
│       ├── "EverReach"
│       ├── [Start Your 14-Day Free Trial] → Pre-Auth Questions
│       └── [I already have an account] → /auth
│       
├── Pre-Auth Questions (S2)
│   │
│   ├── Q1: "How did you hear about EverReach?"
│   ├── Q2: "What's your biggest challenge with staying in touch?"
│   ├── Q3: "How many people do you actively try to stay connected with?"
│   └── Q4: "What type of relationships matter most to you?"
│       │
│       └── After questions → Sign Up Screen (A1)
│           │
│           ├── Apple Sign In
│           ├── Email/Password Sign Up
│           └── Magic Link Option
│               │
│               └── On Success → Post-Auth Questions
│
├── Post-Auth Questions (after authentication)
│   │
│   ├── More personalization questions loaded from Supabase
│   └── Complete → Paywall or Home
│
└── Returning User (welcomeSeen = true, not authenticated)
    │
    └── /auth (Sign In screen)
        │
        └── On Success → Home Dashboard
```

### Paywall Flow (Superwall)

```
After Onboarding Complete
│
├── If NOT paid user
│   │
│   └── Superwall Paywall (placement: "onboarding")
│       │
│       ├── Show subscription options
│       │   ├── Monthly: $15/month
│       │   └── Yearly: $150/year
│       │
│       ├── [Subscribe] → RevenueCat purchase
│       │   └── On success → Home Dashboard
│       │
│       └── [Close/Skip] → Home Dashboard (free trial)
│
└── If PAID user
    │
    └── Skip paywall → Home Dashboard
```

---

## 🔐 AUTHENTICATION FLOW

### Auth Screen (`/auth`)

```
/auth
│
├── Mode: Email Entry
│   ├── Enter email
│   └── [Continue] → Mode: Password
│
├── Mode: Password
│   │
│   ├── Sign Up (isSignUp = true)
│   │   ├── Enter password
│   │   └── [Create Account]
│   │       └── Supabase signUp → Email verification
│   │           └── On verify → Onboarding or Home
│   │
│   └── Sign In (isSignUp = false)
│       ├── Enter password
│       └── [Sign In]
│           └── Supabase signInWithPassword
│               └── On success → returnTo param or Home
│
├── Apple Sign In (iOS only)
│   └── [Continue with Apple]
│       └── Supabase signInWithApple
│           └── On success → Onboarding or Home
│
└── Magic Link Option
    └── [Use Magic Link instead]
        └── Supabase signInWithOtp
            └── Check email → Click link → Auth callback
```

---

## 🏠 POST-AUTH USER FLOW

### Home Dashboard (`/(tabs)/home`)

```
Home Dashboard
│
├── Header: "Welcome back, [Name]"
│
├── Quick Actions
│   ├── [Add Contact] → /add-contact
│   ├── [Voice Note] → /voice-note
│   └── [Screenshot] → /screenshot-analysis
│
├── Warmth Alerts (cold contacts)
│   └── [View All] → /alerts
│
├── Recent Interactions
│   └── Tap contact → /contact-context/[id]
│
├── Stats Cards
│   ├── Total Contacts
│   ├── Average Warmth
│   └── This Week Activity
│
└── Bottom Tab Navigation
    ├── Home (current)
    ├── People → /(tabs)/people
    ├── Chat → /chat-intro
    └── Settings → /(tabs)/settings
```

### Subscription/Billing Flow

```
Settings → Account & Billing
│
└── /subscription-plans
    │
    ├── Current Plan Status
    │   ├── Plan name
    │   ├── Price
    │   └── Renewal date
    │
    ├── Usage Summary (API call)
    │   ├── Compose runs used
    │   ├── Voice minutes used
    │   └── Screenshots analyzed
    │
    ├── Upgrade Options
    │   └── [Upgrade to Pro] → Superwall paywall
    │
    └── Cancel/Manage
        └── [Cancel Subscription] → Confirmation modal
```

---

## 📊 TRACKING & ANALYTICS

### Meta Pixel Events

| Event | Trigger | Properties |
|-------|---------|------------|
| `PageView` | Landing page load | - |
| `ViewContent` | Landing page | content_name, content_category |
| `StartTrial` | Pricing CTA click | plan, value, currency |
| `Lead` | Waitlist submit (standard) | content_name, lead_quality |
| `LeadQualified` | Waitlist submit (high intent) | content_name, lead_quality |
| `CompleteRegistration` | Auth success | - |
| `Share` | Share button click | content_name |

### Backend Funnel Events

```javascript
// Session init
POST /api/v1/funnel/session
{
  session_id: "ws_<timestamp>_<random>",
  idea_id: "everreach_waitlist",
  landing_url: "...",
  referrer: "..."
}

// Step events
POST /api/v1/funnel/event
{
  session_id: "...",
  event_type: "step_completed",
  event_data: { step: 1, value: "forget_followup" }
}

// Waitlist submit
POST /api/v1/waitlist
{
  session_id: "...",
  email: "...",
  pain_point: "...",
  network_size: "...",
  urgency: "...",
  intent_score: 75,
  source: "web"
}
```

---

## ⚠️ CURRENT ISSUES & GAPS

### 1. **Web vs Mobile Disconnect**
- Web: Waitlist flow → No direct path to app
- Mobile: Onboarding → Paywall → App
- **Gap:** No bridge between web signup and mobile app access

### 2. **Pricing Buttons on Landing Page**
- Currently redirect to `/auth` 
- **Should:** Either go to Stripe checkout OR waitlist with upsell

### 3. **No Email Collection Before Auth (Mobile)**
- Mobile users can skip to Sign Up without email capture
- **Risk:** Lost leads if they abandon during auth

### 4. **Thank You Pages Missing Next Steps**
- After waitlist signup, no way to:
  - Download app
  - Sign up immediately
  - Start trial

### 5. **Paywall Timing**
- Shows after onboarding (native only)
- Web has no paywall - just pricing on landing

---

## 🔄 SUGGESTED CHANGES

### Priority 1: Unify Web & Mobile Funnel
```
Landing → Waitlist → Thank You
                        │
                        ├── [Download iOS App] → App Store
                        ├── [Download Android App] → Play Store
                        └── [Continue on Web] → /auth?email=<captured>
```

### Priority 2: Add Email Pre-fill to Auth
```
/waitlist → captures email
          → /thank-you?email=<captured>
                    → [Create Account] → /auth?email=<captured>&signup=true
```

### Priority 3: Landing Page Pricing CTAs
```
Option A: Waitlist First
[Start Free Trial] → /waitlist (capture intent)
                        → /thank-you
                            → /auth?signup=true

Option B: Direct Auth
[Start Free Trial] → /auth?signup=true&plan=monthly
                        → Onboarding
                            → Paywall
```

---

## 📁 KEY FILES

| File | Purpose |
|------|---------|
| `app/_layout.tsx` | Route gating & auth checks |
| `app/landing.tsx` | Web landing page |
| `app/waitlist.tsx` | Web waitlist funnel |
| `app/thank-you.tsx` | Standard thank you |
| `app/thank-you-qualified.tsx` | High-intent thank you |
| `app/auth.tsx` | Authentication screen |
| `app/onboarding-v2.tsx` | Mobile onboarding |
| `app/subscription-plans.tsx` | Subscription management |
| `lib/metaPixel.ts` | Meta Pixel tracking |
| `providers/AuthProviderV2.tsx` | Auth state management |
| `providers/SubscriptionProvider.tsx` | Subscription state |

---

## 📝 NOTES FOR CHANGES

_Add your notes here for what changes need to be made:_

1. 
2. 
3. 

