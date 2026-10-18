# Frontend E2E Test Results

**Last Run**: 10/18/2025, 10:15:48 PM  
**Duration**: 63.1s  
**Status**: ❌ WITH FAILURES  

## Summary

| Metric | Count |
|--------|-------|
| **Total** | 70 |
| **Passed** | ✅ 37 |
| **Failed** | ❌ 21 |
| **Skipped** | ⏭️ 12 |
| **Pass Rate** | 52.9% |

## Test Details

### ✅ add-contact (3/3)

- ✅ **add-contact page loads** (7.07s)
- ✅ **form inputs are present** (3.95s)
- ✅ **page does not crash on load** (4.30s)

### ⚠️ api-coverage (11/12)

- ✅ **UI triggers expected API calls** (7.00s)
- ✅ **UI triggers expected API calls** (3.96s)
- ✅ **UI triggers expected API calls** (4.42s)
- ✅ **UI triggers expected API calls** (4.05s)
- ✅ **UI triggers expected API calls** (4.28s)
- ✅ **UI triggers expected API calls** (4.30s)
- ❌ **UI triggers expected API calls** (4.23s)
  - ❌ Error: Error: [2mexpect([22m[31mreceived[39m[2m).[22mtoBeTruthy[2m()[22m
- ✅ **UI triggers expected API calls** (5.24s)
- ✅ **UI triggers expected API calls** (3.98s)
- ✅ **UI triggers expected API calls** (4.28s)
- ✅ **UI triggers expected API calls** (4.01s)
- ✅ **UI triggers expected API calls** (3.87s)

### ✅ auth.setup.ts (1/1)

- ✅ **authenticate** (4.73s)

### ⚠️ avatar-upload (0/1)

- ❌ **page loads and shows test actions** (10.02s)
  - ❌ Error: Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoBeVisible[2m()[22m failed

### ✅ contact-detail (4/4)

- ✅ **contact detail page structure** (7.00s)
- ✅ **contact context page loads** (3.97s)
- ✅ **contact notes page loads** (4.32s)
- ✅ **contact history page loads** (3.90s)

### ⚠️ contact-search (0/1)

- ⏭️ **typing filters to a known contact** (1.53s)

### ⚠️ edit-contact-server-actions (0/5)

- ⏭️ **set pipeline triggers POST /contacts/:id/pipeline** (1.63s)
- ⏭️ **recompute warmth triggers POST /contacts/:id/warmth/recompute** (0.39s)
- ⏭️ **attachments sign triggers POST /uploads/sign** (0.37s)
- ⏭️ **initial note create triggers POST /contacts/:id/notes** (0.38s)
- ⏭️ **avatar patch call (optional)** (0.26s)

### ⚠️ goal-suggestions (0/1)

- ⏭️ **header visible and request fires when getting suggestions** (2.14s)

### ⚠️ goals (1/2)

- ✅ **goals endpoint structure** (7.09s)
- ❌ **message templates accessible** (4.24s)
  - ❌ Error: Error: [2mexpect([22m[31mreceived[39m[2m).[22mtoBeTruthy[2m()[22m

### ⚠️ health-detailed (0/3)

- ❌ **should show backend connectivity status** (12.79s)
  - ❌ Error: Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoBeVisible[2m()[22m failed
- ❌ **should show Supabase connectivity status** (9.93s)
  - ❌ Error: Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoBeVisible[2m()[22m failed
- ❌ **should display backend base URL** (4.31s)
  - ❌ Error: Error: [2mexpect([22m[31mreceived[39m[2m).[22mtoBeTruthy[2m()[22m

### ⚠️ health (0/1)

- ❌ **Health page renders connectivity cards** (17.07s)
  - ❌ Error: Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoBeVisible[2m()[22m failed

### ⚠️ home (0/2)

- ❌ **should load home page after authentication** (7.20s)
  - ❌ Error: Error: expect.not.toBeVisible: Error: strict mode violation: getByText('Sign In') resolved to 2 elements:
- ❌ **should remain authenticated on page reload** (6.30s)
  - ❌ Error: Error: expect.not.toBeVisible: Error: strict mode violation: getByText('Sign In') resolved to 2 elements:

### ✅ interactions (2/2)

- ✅ **interactions endpoint is accessible** (1.61s)
- ✅ **contact interactions page accessible** (4.63s)

### ⚠️ messages (2/3)

- ❌ **message-templates page loads** (7.12s)
  - ❌ Error: Error: [2mexpect([22m[31mreceived[39m[2m).[22mtoBeTruthy[2m()[22m
- ✅ **message-results page is accessible** (3.93s)
- ✅ **goal-picker page loads** (3.99s)

### ⚠️ navigation (0/3)

- ❌ **should navigate to health page via URL** (19.24s)
  - ❌ Error: Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoBeVisible[2m()[22m failed
- ❌ **should navigate to subscription plans via URL** (16.06s)
  - ❌ Error: Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoBeVisible[2m()[22m failed
- ❌ **should handle back navigation** (15.69s)
  - ❌ Error: Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoBeVisible[2m()[22m failed

### ⚠️ notes-crud (0/1)

- ⏭️ **add a text note and see it in the timeline** (0.35s)

### ⚠️ payments-subscription (2/4)

- ❌ **subscription plans page displays pricing tiers** (9.25s)
  - ❌ Error: Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoBeVisible[2m()[22m failed
- ✅ **paywall displays when accessing premium features** (3.87s)
- ✅ **payment modal/page contains required elements** (5.68s)
- ❌ **free trial information is clearly displayed** (3.24s)
  - ❌ Error: Error: [2mexpect([22m[31mreceived[39m[2m).[22mtoBeTruthy[2m()[22m

### ⚠️ paywall-video-showcase (2/6)

- ✅ **paywall page displays video element** (4.50s)
- ❌ **paywall showcases features and solutions** (3.21s)
  - ❌ Error: Error: [2mexpect([22m[31mreceived[39m[2m).[22mtoBeTruthy[2m()[22m
- ❌ **paywall displays transformation messaging** (3.08s)
  - ❌ Error: Error: [2mexpect([22m[31mreceived[39m[2m).[22mtoBeTruthy[2m()[22m
- ✅ **paywall has clear call-to-action buttons** (3.09s)
- ❌ **paywall displays pricing tiers with features** (3.44s)
  - ❌ Error: Error: [2mexpect([22m[31mreceived[39m[2m).[22mtoBeTruthy[2m()[22m
- ⏭️ **video plays when user interacts with it** (3.93s)

### ✅ search (2/2)

- ✅ **search input is accessible** (3.42s)
- ✅ **people page loads** (6.20s)

### ⚠️ sign-out (1/2)

- ⏭️ **user can sign out and is redirected to auth** (3.35s)
- ✅ **signed out user cannot access protected routes** (3.10s)

### ⚠️ subscription-plans (0/1)

- ❌ **Subscription Plans shows title** (13.12s)
  - ❌ Error: Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoBeVisible[2m()[22m failed

### ⚠️ timeline-details (0/1)

- ⏭️ **shows channel badge, summary, and date** (0.80s)

### ⚠️ trial-expiration (3/4)

- ✅ **trial status is visible in UI** (3.85s)
- ❌ **settings page shows subscription status** (3.58s)
  - ❌ Error: Error: [2mexpect([22m[31mreceived[39m[2m).[22mtoBeTruthy[2m()[22m
- ✅ **post-trial paywall blocks premium features** (3.71s)
- ✅ **trial end reminder appears before expiration** (3.68s)

### ✅ user-profile (3/3)

- ✅ **settings page loads** (4.40s)
- ✅ **user profile accessible** (6.00s)
- ✅ **mode settings page loads** (4.59s)

### ⚠️ warmth-on-send (0/1)

- ❌ **Warmth updates after sending a message** (2.71s)
  - ❌ Error: Error: [2mexpect([22m[31mreceived[39m[2m).[22mtoBeTruthy[2m()[22m

### ⚠️ warmth-visuals (0/1)

- ⏭️ **contact detail shows warmth badge and score** (0.54s)

## ❌ Failed Tests

### message-templates page loads

**File**: `messages.spec.ts`  
**Duration**: 7.12s  

**Error**:
```
Error: [2mexpect([22m[31mreceived[39m[2m).[22mtoBeTruthy[2m()[22m

Received: [31mfalse[39m
```

### should load home page after authentication

**File**: `home.spec.ts`  
**Duration**: 7.20s  

**Error**:
```
Error: expect.not.toBeVisible: Error: strict mode violation: getByText('Sign In') resolved to 2 elements:
    1) <div dir="auto" class="css-text-146c3p1 r-color-5z6vms r-fontSize-a023e6 r-lineHeight-r5x6eb">Sign in to continue building relationships</div> aka getByText('Sign in to continue building')
    2) <div dir="auto" class="css-text-146c3p1 r-color-jwli3a r-fontSize-a023e6 r-fontWeight-1kfrs79">Sign In</div> aka getByTestId('primary-auth-button')

Call log:
[2m  - Expect "not toBeVisible" with timeout 5000ms[22m
[2m  - waiting for getByText('Sign In')[22m

```

### paywall showcases features and solutions

**File**: `paywall-video-showcase.spec.ts`  
**Duration**: 3.21s  

**Error**:
```
Error: [2mexpect([22m[31mreceived[39m[2m).[22mtoBeTruthy[2m()[22m

Received: [31mfalse[39m
```

### page loads and shows test actions

**File**: `avatar-upload.spec.ts`  
**Duration**: 10.02s  

**Error**:
```
Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoBeVisible[2m()[22m failed

Locator:  getByText('Avatar Upload Test')
Expected: visible
Received: <element(s) not found>
Timeout:  5000ms

Call log:
[2m  - Expect "toBeVisible" with timeout 5000ms[22m
[2m  - waiting for getByText('Avatar Upload Test')[22m

```

### subscription plans page displays pricing tiers

**File**: `payments-subscription.spec.ts`  
**Duration**: 9.25s  

**Error**:
```
Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoBeVisible[2m()[22m failed

Locator:  getByText(/Choose Your Plan|Select Plan|Pricing/i).first()
Expected: visible
Received: <element(s) not found>
Timeout:  5000ms

Call log:
[2m  - Expect "toBeVisible" with timeout 5000ms[22m
[2m  - waiting for getByText(/Choose Your Plan|Select Plan|Pricing/i).first()[22m

```

### message templates accessible

**File**: `goals.spec.ts`  
**Duration**: 4.24s  

**Error**:
```
Error: [2mexpect([22m[31mreceived[39m[2m).[22mtoBeTruthy[2m()[22m

Received: [31mfalse[39m
```

### should show backend connectivity status

**File**: `health-detailed.spec.ts`  
**Duration**: 12.79s  

**Error**:
```
Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoBeVisible[2m()[22m failed

Locator:  getByText('Backend')
Expected: visible
Received: <element(s) not found>
Timeout:  5000ms

Call log:
[2m  - Expect "toBeVisible" with timeout 5000ms[22m
[2m  - waiting for getByText('Backend')[22m

```

### paywall displays transformation messaging

**File**: `paywall-video-showcase.spec.ts`  
**Duration**: 3.08s  

**Error**:
```
Error: [2mexpect([22m[31mreceived[39m[2m).[22mtoBeTruthy[2m()[22m

Received: [31mfalse[39m
```

### should remain authenticated on page reload

**File**: `home.spec.ts`  
**Duration**: 6.30s  

**Error**:
```
Error: expect.not.toBeVisible: Error: strict mode violation: getByText('Sign In') resolved to 2 elements:
    1) <div dir="auto" class="css-text-146c3p1 r-color-5z6vms r-fontSize-a023e6 r-lineHeight-r5x6eb">Sign in to continue building relationships</div> aka getByText('Sign in to continue building')
    2) <div dir="auto" class="css-text-146c3p1 r-color-jwli3a r-fontSize-a023e6 r-fontWeight-1kfrs79">Sign In</div> aka getByTestId('primary-auth-button')

Call log:
[2m  - Expect "not toBeVisible" with timeout 5000ms[22m
[2m  - waiting for getByText('Sign In')[22m

```

### Warmth updates after sending a message

**File**: `warmth-on-send.spec.ts`  
**Duration**: 2.71s  

**Error**:
```
Error: [2mexpect([22m[31mreceived[39m[2m).[22mtoBeTruthy[2m()[22m

Received: [31mnull[39m
```

### Health page renders connectivity cards

**File**: `health.spec.ts`  
**Duration**: 17.07s  

**Error**:
```
Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoBeVisible[2m()[22m failed

Locator:  getByText('Connectivity Checks')
Expected: visible
Received: <element(s) not found>
Timeout:  10000ms

Call log:
[2m  - Expect "toBeVisible" with timeout 10000ms[22m
[2m  - waiting for getByText('Connectivity Checks')[22m

```

### should navigate to health page via URL

**File**: `navigation.spec.ts`  
**Duration**: 19.24s  

**Error**:
```
Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoBeVisible[2m()[22m failed

Locator:  getByText('Connectivity Checks')
Expected: visible
Received: <element(s) not found>
Timeout:  10000ms

Call log:
[2m  - Expect "toBeVisible" with timeout 10000ms[22m
[2m  - waiting for getByText('Connectivity Checks')[22m

```

### settings page shows subscription status

**File**: `trial-expiration.spec.ts`  
**Duration**: 3.58s  

**Error**:
```
Error: [2mexpect([22m[31mreceived[39m[2m).[22mtoBeTruthy[2m()[22m

Received: [31mfalse[39m
```

### paywall displays pricing tiers with features

**File**: `paywall-video-showcase.spec.ts`  
**Duration**: 3.44s  

**Error**:
```
Error: [2mexpect([22m[31mreceived[39m[2m).[22mtoBeTruthy[2m()[22m

Received: [31mfalse[39m
```

### should show Supabase connectivity status

**File**: `health-detailed.spec.ts`  
**Duration**: 9.93s  

**Error**:
```
Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoBeVisible[2m()[22m failed

Locator:  getByText('Supabase (Auth Settings)')
Expected: visible
Received: <element(s) not found>
Timeout:  5000ms

Call log:
[2m  - Expect "toBeVisible" with timeout 5000ms[22m
[2m  - waiting for getByText('Supabase (Auth Settings)')[22m

```

### Subscription Plans shows title

**File**: `subscription-plans.spec.ts`  
**Duration**: 13.12s  

**Error**:
```
Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoBeVisible[2m()[22m failed

Locator:  getByText('Choose Your Plan')
Expected: visible
Received: <element(s) not found>
Timeout:  10000ms

Call log:
[2m  - Expect "toBeVisible" with timeout 10000ms[22m
[2m  - waiting for getByText('Choose Your Plan')[22m

```

### free trial information is clearly displayed

**File**: `payments-subscription.spec.ts`  
**Duration**: 3.24s  

**Error**:
```
Error: [2mexpect([22m[31mreceived[39m[2m).[22mtoBeTruthy[2m()[22m

Received: [31mfalse[39m
```

### should display backend base URL

**File**: `health-detailed.spec.ts`  
**Duration**: 4.31s  

**Error**:
```
Error: [2mexpect([22m[31mreceived[39m[2m).[22mtoBeTruthy[2m()[22m

Received: [31mfalse[39m
```

### UI triggers expected API calls

**File**: `api-coverage.spec.ts`  
**Duration**: 4.23s  

**Error**:
```
Error: [2mexpect([22m[31mreceived[39m[2m).[22mtoBeTruthy[2m()[22m

Received: [31mfalse[39m
```

### should navigate to subscription plans via URL

**File**: `navigation.spec.ts`  
**Duration**: 16.06s  

**Error**:
```
Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoBeVisible[2m()[22m failed

Locator:  getByText('Choose Your Plan')
Expected: visible
Received: <element(s) not found>
Timeout:  10000ms

Call log:
[2m  - Expect "toBeVisible" with timeout 10000ms[22m
[2m  - waiting for getByText('Choose Your Plan')[22m

```

### should handle back navigation

**File**: `navigation.spec.ts`  
**Duration**: 15.69s  

**Error**:
```
Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoBeVisible[2m()[22m failed

Locator:  getByText('Connectivity Checks')
Expected: visible
Received: <element(s) not found>
Timeout:  10000ms

Call log:
[2m  - Expect "toBeVisible" with timeout 10000ms[22m
[2m  - waiting for getByText('Connectivity Checks')[22m

```

---

*Generated by Playwright MD Reporter*
