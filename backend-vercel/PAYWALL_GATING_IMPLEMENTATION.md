# Backend Paywall Gating Implementation Guide

Complete guide for implementing server-side access control based on active paywall configuration.

---

## Overview

### What is Paywall Gating?

Paywall gating enforces access control on backend endpoints based on:
- **User's subscription status** (free, trial, premium)
- **Active paywall configuration** (strategy, trial settings)
- **Feature-specific permissions** (defined per strategy)
- **Time/usage-based triggers** (trial expiration, usage limits)

### Key Principles

1. **Backend is Source of Truth** - Never trust client-side checks
2. **Fail Secure** - Default to denying access when uncertain
3. **Graceful Degradation** - Provide clear error messages and upgrade paths
4. **Performance** - Cache config, minimize DB queries
5. **Audit Trail** - Log all access decisions for analytics

---

## Architecture

```
API Request → Auth Middleware → Paywall Guard → Route Handler
                                     ↓
                          1. Fetch Active Config (cached)
                          2. Determine User Status (trial/premium)
                          3. Check Feature Permission
                          4. Evaluate Access Level
                          5. Allow or Deny
```

---

## Core Concepts

### 1. User Status States

```typescript
type UserStatus = 
  | 'premium'           // Active paid subscription
  | 'trial_active'      // Within trial period
  | 'trial_expired'     // Trial ended, not subscribed
  | 'always_locked';    // HH_LOGIN_LOCKED mode
```

### 2. Feature Areas

```typescript
type FeatureArea = 
  | 'login_auth'        // Can user log in?
  | 'onboarding'        // Can complete onboarding?
  | 'contacts_list'     // Can view contacts list?
  | 'contact_detail'    // Can view contact details?
  | 'settings'          // Can access settings?
  | 'pro_features';     // Can access premium features?
```

### 3. Access Levels

```typescript
type AccessLevel = 
  | 'none'       // Completely blocked
  | 'view_only'  // Read-only access
  | 'full';      // Full CRUD access
```

---

## Implementation

### Step 1: Paywall Service

**File:** `lib/paywall-service.ts`

```typescript
export class PaywallService {
  /**
   * Get active paywall configuration (cached for 5 minutes)
   */
  async getActiveConfig(platform: 'mobile' | 'web'): Promise<PaywallConfig> {
    // Check cache first
    const cached = this.configCache.get(`config_${platform}`);
    if (cached && cached.expires > Date.now()) return cached.config;

    // Fetch from database with joined permissions
    const { data } = await this.supabase
      .from('active_paywall_config')
      .select(`
        *,
        strategy:paywall_strategies(*),
        trial:trial_types(*),
        permissions:paywall_access_permissions(*)
      `)
      .eq('platform', platform)
      .single();

    // Cache and return
    const config = this.transformConfig(data);
    this.configCache.set(`config_${platform}`, {
      config,
      expires: Date.now() + 5 * 60 * 1000,
    });
    return config;
  }

  /**
   * Determine user's current status
   */
  async getUserStatus(userId: string, config: PaywallConfig): Promise<UserStatusResult> {
    // Check for active subscription first
    const subscription = await this.getActiveSubscription(userId);
    if (subscription) {
      return { status: 'premium', subscription_id: subscription.id };
    }

    // Check trial based on trial type
    if (config.trial_type === 'time') {
      return await this.checkTimeTrial(userId, config.trial_duration_days);
    } else if (config.trial_type === 'usage') {
      return await this.checkUsageTrial(userId, config.trial_usage_hours);
    } else {
      return { status: 'always_locked' };
    }
  }

  /**
   * Check if user can access a feature area
   */
  canAccess(
    config: PaywallConfig,
    userStatus: UserStatusResult,
    featureArea: FeatureArea
  ): { allowed: boolean; access_level: AccessLevel } {
    // Premium users get full access
    if (userStatus.status === 'premium') {
      return { allowed: true, access_level: 'full' };
    }

    // Find permission for this feature
    const permission = config.permissions.find(p => p.feature_area === featureArea);
    if (!permission) {
      return { allowed: false, access_level: 'none' };
    }

    // Return configured permission
    return {
      allowed: permission.can_access,
      access_level: permission.access_level,
    };
  }
}

export const paywallService = new PaywallService();
```

---

### Step 2: Middleware

**File:** `lib/middleware/paywall-guard.ts`

```typescript
/**
 * Middleware to enforce paywall restrictions
 */
export function withPaywallGuard(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: { featureArea: FeatureArea; requiredAccessLevel?: AccessLevel }
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    // Get user ID from auth middleware
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Determine platform
    const platform = req.headers.get('user-agent')?.includes('Mobile') ? 'mobile' : 'web';

    // Get config and user status
    const config = await paywallService.getActiveConfig(platform);
    const userStatus = await paywallService.getUserStatus(userId, config);

    // Check access
    const access = paywallService.canAccess(config, userStatus, options.featureArea);

    if (!access.allowed) {
      // Return paywall response
      return NextResponse.json(
        {
          error: 'paywall_required',
          message: `Subscription required to access ${options.featureArea}`,
          user_status: userStatus.status,
          upgrade_url: '/subscription',
          can_skip: config.can_skip,
        },
        { status: 403 }
      );
    }

    // Check access level
    if (options.requiredAccessLevel && access.access_level !== 'full') {
      if (options.requiredAccessLevel === 'full' && access.access_level !== 'full') {
        return NextResponse.json(
          { error: 'insufficient_permissions', current_access: access.access_level },
          { status: 403 }
        );
      }
    }

    // Access granted
    return await handler(req);
  };
}
```

---

### Step 3: Apply to Routes

**Example: Contact Detail (View-Only During Trial)**

```typescript
// app/api/v1/contacts/[id]/route.ts
export const GET = withPaywallGuard(
  async (req) => {
    const contactId = req.url.split('/').pop();
    const contact = await fetchContact(contactId);
    return NextResponse.json(contact);
  },
  { featureArea: 'contact_detail', requiredAccessLevel: 'view_only' }
);
```

**Example: Contact Create (Requires Full Access)**

```typescript
export const POST = withPaywallGuard(
  async (req) => {
    const body = await req.json();
    const contact = await createContact(body);
    return NextResponse.json(contact);
  },
  { featureArea: 'contacts_list', requiredAccessLevel: 'full' }
);
```

---

## Feature Area Permission Matrix

| Feature Area      | HH_LOGIN_LOCKED | HARD_AFTER_7D (Trial) | HARD_AFTER_7D (Expired) | SOFT_AFTER_7D (Expired) |
|-------------------|-----------------|------------------------|-------------------------|-------------------------|
| `login_auth`      | ✅ Full         | ✅ Full                | ✅ Full                 | ✅ Full                 |
| `onboarding`      | ✅ Full         | ✅ Full                | ✅ Full                 | ✅ Full                 |
| `contacts_list`   | ❌ None         | ✅ View Only           | ✅ View Only            | ✅ View Only            |
| `contact_detail`  | ❌ None         | ✅ Full                | ❌ None → Paywall       | ❌ None → Paywall (Skip)|
| `settings`        | ✅ Full         | ✅ Full                | ✅ Full                 | ✅ Full                 |
| `pro_features`    | ❌ None         | ✅ Full                | ❌ None → Paywall       | ❌ None → Paywall (Skip)|

---

## API Response Patterns

### Access Denied (Hard Paywall)

**Status:** `403 Forbidden`

```json
{
  "error": "paywall_required",
  "message": "Your trial has ended. Upgrade to continue.",
  "user_status": "trial_expired",
  "required_permission": "contact_detail",
  "upgrade_url": "/subscription?from=/contacts/123",
  "can_skip": false,
  "strategy_mode": "hard"
}
```

### Access Denied (Soft Paywall)

```json
{
  "error": "paywall_required",
  "message": "Upgrade for unlimited contacts.",
  "user_status": "trial_expired",
  "can_skip": true,
  "strategy_mode": "hard-soft"
}
```

### Insufficient Permissions

```json
{
  "error": "insufficient_permissions",
  "message": "This action requires full access",
  "current_access": "view_only"
}
```

---

## Testing

### Unit Tests

```typescript
describe('PaywallService', () => {
  it('returns premium for active subscription', async () => {
    const status = await paywallService.getUserStatus(userId, config);
    expect(status.status).toBe('premium');
  });

  it('denies expired trial users access to gated features', () => {
    const access = paywallService.canAccess(config, expiredStatus, 'contact_detail');
    expect(access.allowed).toBe(false);
  });
});
```

### Integration Tests

```typescript
it('blocks expired trial users from contact detail', async () => {
  const response = await fetch(`${API_URL}/v1/contacts/${contactId}`, {
    headers: { Authorization: `Bearer ${expiredUserToken}` }
  });

  expect(response.status).toBe(403);
  expect(body.error).toBe('paywall_required');
});
```

---

## Troubleshooting

### Config Not Updating

**Solution:** Clear cache or reduce TTL

```typescript
paywallService['configCache'].clear();
```

### Premium Users Getting Blocked

**Solution:** Verify subscription query returns active subscriptions

```typescript
const { data } = await supabase
  .from('subscriptions')
  .select('*')
  .eq('user_id', userId)
  .eq('status', 'active');
```

### Trial Calculation Wrong

**Solution:** Use UTC and log calculations

```typescript
const daysPassed = Math.floor((now - signupDate) / (24 * 60 * 60 * 1000));
console.log(`Days since signup: ${daysPassed}, Trial: ${trialDays}`);
```

---

## Quick Reference

### Checklist for Gating a New Endpoint

- [ ] Identify feature area (`contact_detail`, `pro_features`, etc.)
- [ ] Determine required access level (`view_only` or `full`)
- [ ] Wrap handler with `withPaywallGuard()`
- [ ] Test with premium, trial, and expired users
- [ ] Verify error responses match spec
- [ ] Update API documentation

### Common Feature Areas

- **Public:** `login_auth`, `onboarding`
- **Always Accessible:** `settings`
- **Trial-Gated:** `contact_detail`, `pro_features`
- **View-Only:** `contacts_list` (during expired trial)

---

**Status:** ✅ Production-Ready
**Last Updated:** Nov 2025
