# PRD: EverReach User Journey & Conversion Flow

> **Document Type:** Product Requirements Document (PRD)  
> **Version:** 2.0  
> **Last Updated:** December 30, 2025  
> **Author:** EverReach Product Team  
> **Status:** APPROVED - Ready for Implementation

---

## 🚨 THE CORE PROBLEM (1 Sentence)

**Your web landing is selling a live product + trial + pricing, but your primary CTA sends people to a waitlist. That's a conversion-killer and makes ads feel scammy.**

---

## ✅ THE NEW FLOW (Product-Live Story)

### Primary Flow (Always True)
```
Ad → /landing → /auth?isSignUp=true → /onboarding → /home
```

### Secondary Flow (Waitlist as Fallback)
```
Ad retarget → /waitlist → /thank-you → /auth?isSignUp=true&email=<prefilled>
```

---

## 📊 Flow Overview Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         EVERREACH CONVERSION FLOWS                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   🌐 WEB (PRIMARY)                                                          │
│   └── /landing                                                               │
│       ├── [Start Free Trial] → /auth?isSignUp=true  ⭐ PRIMARY CTA          │
│       │       └── /onboarding                                                │
│       │           └── /home                                                  │
│       │               └── (upgrade via Stripe)                               │
│       │                                                                      │
│       └── "Prefer mobile?" → /waitlist  (secondary link)                    │
│           └── /thank-you                                                     │
│               └── [Continue on Web] → /auth?isSignUp=true&email=<prefilled> │
│                                                                              │
│   📱 MOBILE (when live)                                                      │
│   └── App Store → /auth → /onboarding → /home                               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔧 REQUIRED CHANGES (5 Files, High Impact)

### Change 1: Rewrite `/landing` CTAs

**File:** `app/landing.tsx`

| Current | New |
|---------|-----|
| Primary CTA: "Get Early Access →" → `/waitlist` | Primary CTA: "Start Free Trial (Web)" → `/auth?isSignUp=true` |
| No secondary option | Secondary link: "Prefer mobile? Get priority invite" → `/waitlist` |

**Hero Section Copy Change:**

```diff
- "14-day free trial • No credit card required"
+ "Web access is live today. Mobile apps are coming — waitlist gets priority."
```

**Exact Hero Code:**
```tsx
// PRIMARY CTA
<TouchableOpacity onPress={() => router.push('/auth?isSignUp=true')}>
  <Text>Start Free Trial (Web)</Text>
</TouchableOpacity>

// SECONDARY LINK (below primary)
<TouchableOpacity onPress={() => router.push('/waitlist')}>
  <Text>Prefer mobile? Get priority invite →</Text>
</TouchableOpacity>

// MICROCOPY
<Text>Works on desktop + mobile web. iOS/Android apps coming soon.</Text>
```

---

### Change 2: Fix Pricing Buttons

**File:** `app/landing.tsx`

| Current | New |
|---------|-----|
| Monthly → `/auth` | Monthly → `/auth?isSignUp=true&plan=monthly` |
| Yearly → `/auth` | Yearly → `/auth?isSignUp=true&plan=yearly` |

**Purpose:** Preserve plan selection through auth flow for paywall/checkout.

---

### Change 3: Thank-You Pages Need "Continue on Web" Button

**Files:** `app/thank-you.tsx`, `app/thank-you-qualified.tsx`

**Current:** Journey ends at thank-you page.

**New:** Add primary CTA that moves toward activation.

```tsx
// PRIMARY CTA
<TouchableOpacity 
  onPress={() => router.push(`/auth?isSignUp=true&email=${capturedEmail}&returnTo=/onboarding`)}
>
  <Text>Continue on Web (Start Trial) →</Text>
</TouchableOpacity>

// SECONDARY (keep existing)
<TouchableOpacity onPress={handleShare}>
  <Text>Share with a friend</Text>
</TouchableOpacity>
```

**Rule:** Every thank-you page MUST have a next step toward activation.

---

### Change 4: Pass Email Forward from Waitlist

**File:** `app/waitlist.tsx`

On submit, pass email to thank-you page:

```tsx
// After successful submit
router.push(`/thank-you?email=${encodeURIComponent(formData.email)}`);
// or for qualified:
router.push(`/thank-you-qualified?email=${encodeURIComponent(formData.email)}`);
```

---

### Change 5: Auth Reads Query Params

**File:** `app/auth.tsx`

Read and use query params:

```tsx
const params = useLocalSearchParams();
const prefillEmail = params.email as string;
const isSignUpParam = params.isSignUp === 'true';
const selectedPlan = params.plan as string; // 'monthly' | 'yearly'
const returnTo = params.returnTo as string;

// Pre-fill email if provided
useEffect(() => {
  if (prefillEmail) setEmail(prefillEmail);
  if (isSignUpParam) setIsSignUp(true);
}, [prefillEmail, isSignUpParam]);

// After auth success
if (returnTo) {
  router.replace(returnTo);
} else {
  router.replace('/(tabs)/home');
}

// Store plan selection for later checkout
if (selectedPlan) {
  AsyncStorage.setItem('selected_plan', selectedPlan);
}
```

---

## 🎚️ MOBILE_STATUS Toggle

**Add one flag to control copy/buttons based on mobile availability:**

```typescript
// constants/flags.ts or .env
export const MOBILE_STATUS: 'pending' | 'live' = 'pending';
```

### If `MOBILE_STATUS = 'pending'`

| Location | Copy |
|----------|------|
| Landing hero | "Web access is live today. Mobile apps are coming." |
| Thank-you primary | "Start on web now" |
| Thank-you secondary | "We'll email your mobile invite" |

### If `MOBILE_STATUS = 'live'`

| Location | Copy |
|----------|------|
| Landing hero | "Use on web + mobile." |
| Thank-you primary | "Continue on Web" |
| Thank-you buttons | + "Download on iOS" + "Download on Android" |

**No new funnel needed. Just swap copy + buttons.**

---

## 📊 Meta Ads Optimization

### Current Problem
Over-invested in waitlist `Lead` event.

### New Event Priority

| Priority | Event | Trigger | Value |
|----------|-------|---------|-------|
| 1 | `CompleteRegistration` | Account created + session established | Primary conversion |
| 2 | `Activate` | Onboarding "aha" action | Secondary conversion |
| 3 | `Lead` | Waitlist submit | Fallback for bounced users |

### Activation Event Options (pick ONE)
- `onboarding_mark_sent` - User marks a message as sent
- `onboarding_completed` - User finishes onboarding

**File:** `lib/metaPixel.ts`
```typescript
// Fire once on auth success
trackEvent('CompleteRegistration', { method: 'email' | 'apple' });

// Fire once on activation (choose one trigger point)
trackEvent('Activate', { action: 'onboarding_completed' });
```

---

## 🌐 WEB USER JOURNEY (Updated)

### Entry Point: `everreach.app`

```
Landing Page (/landing)
│
├─── Header
│    ├── Logo + "EverReach"
│    └── [Sign In] → /auth
│
├─── Hero Section
│    ├── "Never Let A Relationship Go Cold Again"
│    ├── [Start Free Trial (Web)] → /auth?isSignUp=true  ⭐ PRIMARY
│    ├── "Prefer mobile? Get priority invite →" → /waitlist
│    └── "Works on desktop + mobile web. iOS/Android apps coming soon."
│
├─── Problem Section
│
├─── Solution Section  
│
├─── How It Works
│
├─── Testimonials
│
├─── Pricing Section
│    ├── Monthly: $15/month → /auth?isSignUp=true&plan=monthly
│    └── Yearly: $150/year → /auth?isSignUp=true&plan=yearly
│
└─── Footer
     ├── Terms → /terms
     └── Privacy → /privacy-policy
```

### Waitlist Flow (Secondary/Retarget)

```
/waitlist (4-step form)
│
├── Step 1: PAIN POINT
├── Step 2: NETWORK SIZE
├── Step 3: URGENCY
└── Step 4: EMAIL
    └── Submit
        │
        ├── HIGH INTENT → /thank-you-qualified?email=<captured>
        │   └── [Continue on Web] → /auth?isSignUp=true&email=<captured>
        │
        └── STANDARD → /thank-you?email=<captured>
            └── [Continue on Web] → /auth?isSignUp=true&email=<captured>
```

---

## 📱 MOBILE JOURNEY (Native)

### Entry Point: App Store Download

```
App Launch
│
├── First-Time User
│   └── OnboardingV2 Screen (S1 - Welcome)
│       ├── [Start Your 14-Day Free Trial] → Pre-Auth Questions
│       └── [I already have an account] → /auth
│       
├── Pre-Auth Questions → Sign Up → Post-Auth Questions
│   └── Complete → Paywall (Superwall) → Home
│
└── Returning User → /auth → Home
```

---

## 🔐 AUTH FLOW (Updated)

### Auth Screen (`/auth`)

**Query Parameters:**
- `isSignUp` - Pre-select sign up mode
- `email` - Pre-fill email field
- `plan` - Store for checkout (`monthly` | `yearly`)
- `returnTo` - Redirect after success

```
/auth?isSignUp=true&email=user@example.com&plan=monthly&returnTo=/onboarding
│
├── Email pre-filled from query param
├── Sign Up mode pre-selected
├── On success:
│   ├── Store plan selection
│   ├── Fire CompleteRegistration event
│   └── Redirect to returnTo || /home
```

---

## 🎯 THE CONVERSION JOURNEY (Clean)

```
Cold Ad → /landing → /auth signup → onboarding step 3 "mark sent" → CONVERSION
```

**That's a real conversion, not "joined a list."**

---

## ⚠️ MESSAGING TO KILL

Stop saying:
- ❌ "Get Early Access"
- ❌ "Join the waitlist" (as primary)
- ❌ "We'll notify you when spots open"
- ❌ "Invite when spots open up"

Replace with:
- ✅ "Start Free Trial (Web)"
- ✅ "Your account works on web today"
- ✅ "Mobile invites are rolling out soon"
- ✅ "Web is live. Mobile coming."

---

## 📁 FILES TO MODIFY

| File | Changes |
|------|---------|
| `app/landing.tsx` | Hero CTA, pricing buttons, add secondary waitlist link |
| `app/thank-you.tsx` | Add "Continue on Web" button with email passthrough |
| `app/thank-you-qualified.tsx` | Add "Continue on Web" button with email passthrough |
| `app/waitlist.tsx` | Pass email to thank-you via query param |
| `app/auth.tsx` | Read email, isSignUp, plan, returnTo from query params |
| `lib/metaPixel.ts` | Fire CompleteRegistration + Activate events |
| `constants/flags.ts` | Add MOBILE_STATUS flag |

---

## ✅ IMPLEMENTATION CHECKLIST

- [ ] Update landing.tsx hero CTA to `/auth?isSignUp=true`
- [ ] Add secondary "Prefer mobile?" link to `/waitlist`
- [ ] Update pricing buttons to pass `plan` param
- [ ] Update waitlist.tsx to pass email to thank-you
- [ ] Add "Continue on Web" to thank-you.tsx
- [ ] Add "Continue on Web" to thank-you-qualified.tsx
- [ ] Update auth.tsx to read query params
- [ ] Add MOBILE_STATUS flag
- [ ] Update metaPixel.ts events
- [ ] Test full flow: landing → auth → onboarding → home
- [ ] Test waitlist flow: waitlist → thank-you → auth (prefilled)

---

## 📝 NOTES

_Implementation notes:_

1. Start with landing.tsx CTA change - highest impact
2. Auth query param support unlocks everything else
3. Thank-you "Continue" button is critical for waitlist-to-conversion bridge
