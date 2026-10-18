# Backend Billing Checkout Error - 500 Internal Server Error

Complete debugging guide for the `/api/billing/checkout` endpoint failure.

---

## ✅ ROOT CAUSE IDENTIFIED

**From Vercel Logs (Nov 2, 21:39:23 GMT-5):**

```
1. POST api.stripe.com/v1/customers        → 200 ✅ (Customer created)
2. POST api.stripe.com/v1/checkout/sessions → 400 ❌ (FAILED HERE!)
3. Supabase profile operations              → 200 ✅ (All successful)
```

**The Problem:**
- Customer creation works ✅
- Checkout session creation **fails with 400 Bad Request** ❌
- This means invalid parameters are being sent to Stripe

**Most Likely Cause:**
Invalid `price_id` - The price ID `price_core_monthly` **does not exist** in your Stripe account!

---

## 🔧 IMMEDIATE FIX

### Step 1: Get Real Price IDs from Stripe

1. **Go to Stripe Dashboard:** https://dashboard.stripe.com/test/products
2. **Find your subscription plans** (Core, Pro, etc.)
3. **Click on each product** to see its pricing
4. **Copy the Price ID** - looks like: `price_1Oxxxxxxxxxxxxxxxxxxxxxx`

Example:
```
Core Monthly  → price_1OABCxxxxxxxxxxxxxxxxXX
Pro Monthly   → price_1OXYZxxxxxxxxxxxxxxxxXX
```

### Step 2: Update Frontend Code

Edit: `app/subscription-plans.tsx`

**Find this:**
```typescript
const PLANS = [
  {
    id: 'core',
    name: 'Core',
    priceId: 'price_core_monthly', // ❌ WRONG - doesn't exist!
    // ...
  },
  {
    id: 'pro',
    name: 'Pro',
    priceId: 'price_pro_monthly', // ❌ WRONG - doesn't exist!
    // ...
  },
];
```

**Replace with:**
```typescript
const PLANS = [
  {
    id: 'core',
    name: 'Core',
    priceId: 'price_1OABCxxxxxxxxxxxxxxxxXX', // ✅ Real ID from Stripe
    // ...
  },
  {
    id: 'pro',
    name: 'Pro',
    priceId: 'price_1OXYZxxxxxxxxxxxxxxxxXX', // ✅ Real ID from Stripe
    // ...
  },
];
```

### Step 3: Test

1. Refresh the app
2. Click "Subscribe to Core"
3. Should now redirect to Stripe checkout ✅

---

## 🐛 The Error

### Frontend Error:
```
POST https://ever-reach-be.vercel.app/api/billing/checkout
Status: 500 (Internal Server Error)
Duration: 898ms
```

### Request Details:
```json
{
  "priceId": "price_core_monthly",
  "successUrl": "http://localhost:8081/billing/success",
  "cancelUrl": "http://localhost:8081/billing/cancel"
}
```

### What's Working:
- ✅ Frontend sends correct payload
- ✅ Request reaches backend
- ✅ Analytics tracking works
- ✅ Authentication works

### What's Failing:
- ❌ Backend crashes with 500 error
- ❌ Checkout session not created
- ❌ User not redirected to Stripe

---

## 🔍 Where to Check

### 1. Vercel Backend Logs

**Go to:** https://vercel.com/[your-team]/ever-reach-be/logs

**Filter by:**
- Function: `/api/billing/checkout`
- Status: `500`
- Time: Recent (last hour)

**Look for:**
```
Error: Stripe API key not found
Error: Invalid price ID
Error: Customer creation failed
TypeError: Cannot read property 'xxx' of undefined
```

---

## 🚨 Common Causes

### 1. Missing Stripe API Key

**Error:**
```
Error: No API key provided
```

**Fix:**
Add to Vercel environment variables:
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

**Verify:**
```typescript
console.log('Stripe key exists:', !!process.env.STRIPE_SECRET_KEY);
```

---

### 2. Invalid Price ID

**Error:**
```
Error: No such price: 'price_core_monthly'
```

**Fix:**
1. Go to Stripe Dashboard → Products
2. Find your Core Monthly plan
3. Copy the actual Price ID (e.g., `price_1ABC123def456`)
4. Update your frontend to use the correct ID

**Current ID sent:**
```
price_core_monthly
```

**Should be something like:**
```
price_1OxxxxxxxxxxxxxxxxxxxxXX
```

---

### 3. Stripe Customer Creation Failed

**Error:**
```
Error: Failed to create customer
```

**Possible causes:**
- Missing email
- Invalid email format
- Stripe account issue

**Check backend code:**
```typescript
const customer = await stripe.customers.create({
  email: user.email, // Make sure this exists!
  metadata: {
    supabase_user_id: user.id,
  },
});
```

---

### 4. Missing Required Parameters

**Error:**
```
TypeError: Cannot read property 'priceId' of undefined
```

**Check backend code:**
```typescript
// ❌ BAD - No validation
const { priceId } = req.body;

// ✅ GOOD - With validation
const { priceId, successUrl, cancelUrl } = req.body;

if (!priceId) {
  return res.status(400).json({ error: 'Missing priceId' });
}
```

---

### 5. Stripe Not Initialized

**Error:**
```
TypeError: stripe.checkout is not a function
```

**Fix:**
```typescript
// Make sure Stripe is imported and initialized
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});
```

---

## 🛠️ Debugging Steps

### Step 1: Check Vercel Logs

```bash
# If you have Vercel CLI
vercel logs ever-reach-be --follow

# Look for the exact error message
```

### Step 2: Add Debug Logging

Update backend `/api/billing/checkout`:

```typescript
export async function POST(req: Request) {
  console.log('=== CHECKOUT REQUEST START ===');
  
  try {
    const body = await req.json();
    console.log('Request body:', JSON.stringify(body, null, 2));
    
    // Get user
    const user = await getAuthenticatedUser(req);
    console.log('User:', user?.id, user?.email);
    
    // Check Stripe key
    console.log('Stripe key exists:', !!process.env.STRIPE_SECRET_KEY);
    
    // Validate price ID
    console.log('Price ID:', body.priceId);
    
    // Create customer
    console.log('Creating Stripe customer...');
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { supabase_user_id: user.id },
    });
    console.log('Customer created:', customer.id);
    
    // Create checkout session
    console.log('Creating checkout session...');
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      line_items: [{ price: body.priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: body.successUrl,
      cancel_url: body.cancelUrl,
    });
    console.log('Session created:', session.id);
    
    return Response.json({ url: session.url });
  } catch (error) {
    console.error('=== CHECKOUT ERROR ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

### Step 3: Test Price ID in Stripe

```bash
# Using Stripe CLI
stripe prices retrieve price_core_monthly

# Expected output:
# {
#   "id": "price_1...",
#   "object": "price",
#   "active": true,
#   ...
# }

# If you get an error:
# Error: No such price: 'price_core_monthly'
# → The price ID doesn't exist in Stripe
```

### Step 4: Verify Environment Variables

In Vercel Dashboard:
```
Settings → Environment Variables → Production

Required:
- STRIPE_SECRET_KEY=sk_live_... or sk_test_...
- STRIPE_PUBLISHABLE_KEY=pk_live_... or pk_test_...
- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... or pk_test_...
```

**Important:** After adding env vars, you must **redeploy**!

---

## 🎯 Quick Fixes

### Fix 1: Add Missing Stripe Key

```bash
# Add to Vercel
vercel env add STRIPE_SECRET_KEY

# Or in Vercel Dashboard:
# Settings → Environment Variables → Add
# Name: STRIPE_SECRET_KEY
# Value: ${STRIPE_SECRET_KEY}
# Environment: Production, Preview, Development
```

### Fix 2: Update Price IDs

**Frontend:** `app/subscription-plans.tsx`

```typescript
// ❌ Current (wrong)
const PLANS = [
  {
    id: 'core',
    priceId: 'price_core_monthly', // Doesn't exist in Stripe
    // ...
  },
];

// ✅ Fixed (use real Stripe price IDs)
const PLANS = [
  {
    id: 'core',
    priceId: 'price_1OxxxxxxxxxxxxxxxxxxxxXX', // Real ID from Stripe
    // ...
  },
];
```

### Fix 3: Add Error Handling

```typescript
export async function POST(req: Request) {
  try {
    // ... existing code ...
  } catch (error) {
    // Log the full error for debugging
    console.error('[Billing Checkout] Error:', {
      name: error.constructor.name,
      message: error.message,
      code: error.code, // Stripe error code
      type: error.type, // Stripe error type
      stack: error.stack,
    });
    
    // Return user-friendly error
    return Response.json(
      { 
        error: 'Failed to create checkout session',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
```

---

## 📋 Checklist

Before deploying, verify:

- [ ] ✅ Stripe secret key is set in Vercel env vars
- [ ] ✅ Stripe publishable key is set
- [ ] ✅ Price IDs match actual Stripe prices
- [ ] ✅ Backend has Stripe package installed (`stripe` npm package)
- [ ] ✅ Backend initializes Stripe correctly
- [ ] ✅ User authentication works
- [ ] ✅ Request body validation exists
- [ ] ✅ Error logging is comprehensive
- [ ] ✅ Deployed after adding env vars

---

## 🧪 Testing

### Test 1: Check Stripe Connection

```typescript
// Add a test endpoint: /api/billing/test
export async function GET() {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const balance = await stripe.balance.retrieve();
    
    return Response.json({ 
      success: true, 
      stripe_connected: true,
      currency: balance.available[0]?.currency 
    });
  } catch (error) {
    return Response.json({ 
      success: false, 
      error: error.message 
    });
  }
}
```

Navigate to:
```
https://ever-reach-be.vercel.app/api/billing/test
```

Expected response:
```json
{
  "success": true,
  "stripe_connected": true,
  "currency": "usd"
}
```

### Test 2: Verify Price IDs

```typescript
// Add another test endpoint: /api/billing/test-price
export async function GET(req: Request) {
  const url = new URL(req.url);
  const priceId = url.searchParams.get('priceId');
  
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const price = await stripe.prices.retrieve(priceId!);
    
    return Response.json({ 
      success: true, 
      price: {
        id: price.id,
        active: price.active,
        currency: price.currency,
        unit_amount: price.unit_amount,
      }
    });
  } catch (error) {
    return Response.json({ 
      success: false, 
      error: error.message 
    });
  }
}
```

Test with:
```
https://ever-reach-be.vercel.app/api/billing/test-price?priceId=price_core_monthly
```

If it returns an error, the price ID is invalid!

---

## 📊 Expected vs Actual

### Expected Flow:
```
1. User clicks "Subscribe to Core" ✅
2. Frontend sends POST to /api/billing/checkout ✅
3. Backend creates Stripe customer ❌
4. Backend creates checkout session ❌
5. Backend returns session URL ❌
6. Frontend redirects to Stripe ❌
7. User completes payment ❌
```

### Current Flow:
```
1. User clicks "Subscribe to Core" ✅
2. Frontend sends POST to /api/billing/checkout ✅
3. Backend crashes with 500 error ❌
4. User sees error message ❌
```

---

## 🔧 Backend Files to Check

### 1. `/backend-vercel/app/api/billing/checkout/route.ts`
Main checkout endpoint - likely where the error is.

### 2. `/backend-vercel/lib/stripe.ts`
Stripe initialization - check if exists.

### 3. `/backend-vercel/.env.local`
Local environment variables - for testing.

### 4. Vercel Environment Variables
Production keys - must be set in dashboard.

---

## 🚀 Action Items

### Immediate:
1. ✅ Check Vercel logs for exact error
2. ✅ Verify Stripe keys are set
3. ✅ Verify price IDs are correct
4. ✅ Add debug logging
5. ✅ Redeploy if env vars changed

### Short-term:
1. Add comprehensive error handling
2. Add test endpoints for Stripe connection
3. Validate price IDs at startup
4. Add health check endpoint
5. Document Stripe setup process

### Long-term:
1. Add retry logic for transient failures
2. Add monitoring/alerting for 500 errors
3. Create admin dashboard for price management
4. Add automated tests for billing flow

---

## 📖 Related Documentation

- [Stripe Node.js SDK](https://stripe.com/docs/api/node)
- [Stripe Checkout Sessions](https://stripe.com/docs/api/checkout/sessions)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Debugging Vercel Functions](https://vercel.com/docs/functions/debugging)

---

## 💡 Common Error Messages

### "No API key provided"
```
Fix: Add STRIPE_SECRET_KEY to Vercel env vars
```

### "No such price"
```
Fix: Use real Stripe price ID (e.g., price_1OxxxxxxxxxxxxxxxxxxxxXX)
```

### "Invalid token"
```
Fix: Make sure you're using the secret key (sk_...), not publishable key (pk_...)
```

### "Cannot read property of undefined"
```
Fix: Check request body validation and user object
```

### "Stripe is not defined"
```
Fix: Import and initialize Stripe in your endpoint
```

---

**Last Updated:** November 2, 2025  
**Status:** ❌ Backend Error - Needs Investigation  
**Priority:** High - Blocks user subscriptions  
**Next Step:** Check Vercel logs for exact error message
