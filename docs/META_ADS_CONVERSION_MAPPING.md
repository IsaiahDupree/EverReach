# Meta Ads → URL → Event Mapping for EverReach

## Current State
- **Web app**: Live at `https://www.everreach.app`
- **Onboarding**: Ready (9-step flow)
- **Mobile apps**: Pending app store approval
- **Email confirmation**: ON (Supabase requires email verification)

---

## Recommended Ad Destinations

### Primary: Activation Flow
```
Ad Click → /landing → /auth → [email verify] → /auth/callback → Onboarding → /home
```

### Secondary: Lead Capture (mobile-first users)
```
Ad Click → /landing → /waitlist → /thank-you-qualified (high intent)
                                → /thank-you (standard)
```

---

## URL Structure

| URL | Purpose | Auth Required |
|-----|---------|---------------|
| `/landing` | Marketing landing page | No |
| `/auth` | Sign up / Sign in | No |
| `/auth?isSignUp=true` | Direct to sign up mode | No |
| `/auth/callback` | Email verification callback | No |
| `/onboarding` | 9-step onboarding | Yes |
| `/(tabs)/home` | Main app dashboard | Yes |
| `/waitlist` | Email capture for mobile-first users | No |
| `/thank-you` | Waitlist confirmation (standard) | No |
| `/thank-you-qualified` | Waitlist confirmation (high intent) | No |

---

## Conversion Events for Meta

### Primary Conversion: `CompleteRegistration`
**When**: User verifies email and gets first authenticated session (NOT on initial signup)

**Where fired**: `app/auth/callback.tsx` after successful `exchangeCodeForSession()`

**Implementation** (already done ✅):
```typescript
// Fires only for new users (created within 10 min) and only once per user
if (!alreadyFired && isNewUser && userId) {
  await trackEvent('CompleteRegistration', {
    content_name: 'Account Verified',
    status: 'complete',
    method: type === 'magiclink' ? 'magic_link' : 'email',
  });
  await AsyncStorage.setItem(COMPLETE_REGISTRATION_FIRED_KEY, userId);
}
```

### Secondary Conversion: `Activate` (Single Event)
**When**: User completes onboarding (Step 8) - ONE event, not multiple

**Where fired**: `app/onboarding.tsx` in `handleComplete()`

**Implementation** (already done ✅):
```typescript
await trackEvent('Activate', {
  content_name: 'Onboarding Completed',
  activation_type: 'onboarding_completed',
});
```

### Tertiary: `Lead` (Waitlist - Standard)
**When**: User signs up for waitlist (any intent level)

**Where to fire**: `/app/thank-you.tsx`

```typescript
trackEvent('Lead', {
  content_name: 'Waitlist Signup',
  lead_quality: 'standard',
});
```

### Tertiary: `LeadQualified` (Waitlist - High Intent)
**When**: User signs up with high-intent answers (custom event, NOT value-based)

**Where to fire**: `/app/thank-you-qualified.tsx`

```typescript
trackEvent('LeadQualified', {
  content_name: 'Waitlist Signup - High Intent',
  lead_quality: 'high',
  pain_point: data.pain_point,
  network_size: data.network_size,
  urgency: data.urgency,
});
```

---

## Meta Custom Conversions Setup

| Conversion Name | Rule | Standard Event | Optimize For |
|-----------------|------|----------------|--------------|
| `account_created` | **Event: CompleteRegistration** (no URL rule) | CompleteRegistration | Primary |
| `activated` | **Event: Activate** | Custom | After volume |
| `waitlist_complete` | URL contains `/thank-you` | Lead | Secondary |
| `waitlist_high_intent` | URL contains `/thank-you-qualified` OR Event: LeadQualified | Custom | Quality leads |

---

## Campaign Structure

### Campaign 1: Prospecting (Main)
- **Objective**: Sales → Conversions → Website
- **Optimize for**: `CompleteRegistration` (account_created)
- **Audience**: Broad + interests (entrepreneurs, sales, founders, consultants, networkers)
- **Creative**: 3-5 variations

### Campaign 2: Retargeting
- **Audience**: 
  - Visited `/landing` but didn't sign up
  - Started `/auth` but didn't complete
  - Created account but didn't complete onboarding
- **Optimize for**: `Activate` or `CompleteRegistration`

### Campaign 3: Lead Ads (Optional)
- **Use case**: Capture mobile-first users
- **Questions**: Same 3 intent questions from waitlist
- **Follow-up**: Push to web via email

---

## Landing Page CTA Updates Needed

### Current
```
"Start Free Trial →" → /auth
```

### Recommended
```
Primary:   "Start on Web (2 min setup)" → /auth?isSignUp=true
Secondary: "Get mobile invite + playbook" → /waitlist
```

---

## Ad Copy Angles

### Angle 1: Relationship Decay
> "If you don't follow up, relationships cool off. EverReach shows who's going cold and writes the message for you. Web access is live — mobile invite coming."
> 
> **Headline**: Keep your network warm
> **CTA**: Get Started

### Angle 2: Blank-Message Problem
> "Ever stare at a chat like 'what do I even say?' EverReach generates a real reconnect message with context in seconds. Start on web today."
> 
> **Headline**: Never overthink outreach again

### Angle 3: Scattered Contacts
> "Your relationships are spread across phone, email, LinkedIn… and memory. EverReach centralizes the context + tells you who to hit this week."
> 
> **Headline**: Your memory for relationships

---

## Implementation Checklist

### 1. Add Meta Events to Auth Flow ✅
- [x] Fire `CompleteRegistration` after email verification in `/app/auth/callback.tsx`
- [x] Only fires for new users (created within 10 min)
- [x] Deduped with AsyncStorage flag per user ID
- [ ] Fire `CompleteRegistration` after Apple Sign In success (TODO)

### 2. Add Activation Event ✅
- [x] Fire `Activate` on onboarding completion (single event)
- [x] Added to `handleComplete()` in `/app/onboarding.tsx`
- [ ] Create `Activate` custom event in Meta Events Manager

### 3. Update Landing Page
- [ ] Add dual CTA: "Start on Web" + "Get mobile invite"
- [ ] Update hero copy to reflect web access is live

### 4. Create High-Intent Waitlist Path (if implementing waitlist)
- [ ] Create `/app/thank-you-qualified.tsx` for high-intent leads
- [ ] Fire `LeadQualified` event (NOT value-based Lead)
- [ ] Use URL path, not querystring for Meta matching

### 5. Set Up Custom Conversions in Meta
- [ ] Create `account_created` = Event: CompleteRegistration (NO URL rule)
- [ ] Create `activated` = Event: Activate
- [ ] Create `waitlist_high_intent` = URL contains `/thank-you-qualified`

### 6. AEM (Aggregated Event Measurement) Priority
Set priority in Meta Events Manager:
1. **CompleteRegistration** (highest)
2. **Activate** (if volume exists)
3. **Lead** (waitlist)
4. **Purchase** (later, if Stripe live)

### 7. Campaign Setup
- [ ] Create prospecting campaign optimizing for `CompleteRegistration`
- [ ] Create retargeting audience from pixel data
- [ ] Test 3-5 creative variations

---

## Event Flow Diagram

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Ad Click  │───▶│  /landing   │───▶│    /auth    │───▶│ /onboarding │
│             │    │ (PageView)  │    │             │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                            │                   │
                                            ▼                   ▼
                                    CompleteRegistration    Activate
                                    (account created)    (first action)
                                                               │
                                                               ▼
                                                        onboarding_completed
                                                          → /home
```

---

## Files to Modify

| File | Change |
|------|--------|
| `app/auth.tsx` | Add `trackEvent('CompleteRegistration')` after signup |
| `app/onboarding.tsx` | Add `trackEvent('Activate')` on first meaningful action |
| `app/landing.tsx` | Update CTAs for dual path |
| `lib/metaPixel.ts` | Ensure `Activate` is in allowed event types |

---

## Positioning Line for All Ads

> **"Web access is live today. Mobile invites are coming — waitlist gets priority."**

This prevents "guess I'll just wait" drop-off.
