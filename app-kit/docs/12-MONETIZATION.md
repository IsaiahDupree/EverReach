# Monetization Strategies

## Turn Your App Into a Business

This guide covers proven monetization models and implementation strategies.

---

## Monetization Models

### 1. Freemium (Recommended)

**How it works:** Free tier with limits, paid tier unlocks full features.

```
┌─────────────────────────────────────────────────┐
│                   FREE TIER                      │
│  ✓ Core features                                │
│  ✓ Limited items (e.g., 10)                     │
│  ✓ Basic support                                │
│  ✗ Advanced features                            │
│  ✗ Priority support                             │
└─────────────────────────────────────────────────┘
                      ↓ Upgrade
┌─────────────────────────────────────────────────┐
│                   PRO TIER                       │
│  ✓ Everything in Free                           │
│  ✓ Unlimited items                              │
│  ✓ Advanced features                            │
│  ✓ Priority support                             │
│  ✓ Export data                                  │
│                                                 │
│  $9.99/month or $99/year                        │
└─────────────────────────────────────────────────┘
```

**Pros:**
- Low barrier to entry
- Users can experience value before paying
- High conversion with good limits

**Cons:**
- Need to balance free vs paid features
- Free users cost money (hosting, support)

### 2. Subscription Only

**How it works:** Free trial, then paid subscription required.

```typescript
// constants/config.ts
SUBSCRIPTION: {
  FREE_TRIAL_DAYS: 7,
  TIERS: {
    basic: { price: 4.99, features: ['core'] },
    pro: { price: 9.99, features: ['core', 'advanced'] },
    business: { price: 29.99, features: ['core', 'advanced', 'team'] },
  }
}
```

**Pros:**
- Predictable recurring revenue
- Higher lifetime value
- No freeloaders

**Cons:**
- Higher barrier to entry
- Need strong value proposition

### 3. One-Time Purchase

**How it works:** Pay once, own forever.

**Pros:**
- Simple for users
- Good for utility apps

**Cons:**
- No recurring revenue
- Hard to fund ongoing development
- Not allowed for some app categories on iOS

### 4. Usage-Based

**How it works:** Pay for what you use (API calls, storage, etc.)

```typescript
// Example: AI credits
PRICING: {
  credits: {
    100: 4.99,   // $0.05 per credit
    500: 19.99,  // $0.04 per credit
    2000: 59.99, // $0.03 per credit
  }
}
```

**Pros:**
- Fair for light users
- Scales with value delivered

**Cons:**
- Unpredictable revenue
- Complex to track

---

## Pricing Strategy

### Price Anchoring

Show expensive option first to make others seem reasonable:

```typescript
const PLANS = [
  { name: 'Business', price: 29.99, highlighted: false },
  { name: 'Pro', price: 9.99, highlighted: true },  // "Most Popular"
  { name: 'Basic', price: 4.99, highlighted: false },
];
```

### Annual Discount

Offer 2 months free for annual:

```typescript
const PRICING = {
  monthly: 9.99,
  yearly: 99.99,  // 2 months free (vs $119.88)
  savings: '17%',
};
```

### Psychological Pricing

- $9.99 feels cheaper than $10.00
- $99/year feels cheaper than $8.25/month
- "Less than $1/day" reframes $29/month

---

## Conversion Optimization

### Strategic Limit Triggers

Show upgrade prompt at the right moment:

```typescript
// When user hits limit
function handleCreate() {
  if (!isPro && items.length >= FREE_LIMIT) {
    // Show paywall with context
    router.push('/paywall?trigger=item_limit&count=' + items.length);
    return;
  }
  // Continue with creation
}
```

### Feature Gating UI

Show locked features to create desire:

```tsx
function AdvancedFeature({ isPro }: { isPro: boolean }) {
  if (!isPro) {
    return (
      <TouchableOpacity 
        style={styles.lockedFeature}
        onPress={() => router.push('/paywall')}
      >
        <Lock color="#9CA3AF" size={20} />
        <Text style={styles.lockedText}>Analytics (Pro)</Text>
        <Crown color="#F59E0B" size={16} />
      </TouchableOpacity>
    );
  }
  
  return <AnalyticsDashboard />;
}
```

### Upgrade Prompts

Strategic placement without being annoying:

| Location | Trigger | Frequency |
|----------|---------|-----------|
| Item limit | User creates item at limit | Every time |
| Feature tap | User taps locked feature | Every time |
| Settings | In subscription section | Passive |
| After value | User completes first item | Once |
| Weekly | App open after 7+ days | Once/week |

---

## App Store Compliance

### iOS Rules (Important!)

1. **Digital goods must use IAP** - Can't use Stripe in app for subscriptions
2. **Apple takes 15-30%** - 30% first year, 15% after (Small Business Program)
3. **No external payment links** - Can't link to website to pay
4. **Restore purchases required** - Must have restore button

### Android Rules

1. **Digital goods must use Play Billing** - Same as iOS
2. **Google takes 15-30%** - Similar structure to Apple
3. **More flexible linking** - Can mention website

### Web Advantage

- Use Stripe directly (2.9% + $0.30 per transaction)
- No app store fees
- More payment options (PayPal, etc.)

---

## Revenue Tracking

### Key Metrics

```typescript
// Track these in your analytics
const REVENUE_METRICS = {
  // Acquisition
  signups: 'new users this period',
  trials_started: 'free trials initiated',
  
  // Conversion
  trial_to_paid: 'trials converting to paid',
  conversion_rate: 'signups → paid percentage',
  
  // Retention
  churn_rate: 'subscriptions canceled',
  mrr: 'monthly recurring revenue',
  arr: 'annual recurring revenue',
  
  // Value
  arpu: 'average revenue per user',
  ltv: 'lifetime value',
  cac: 'customer acquisition cost',
};
```

### LTV Calculation

```typescript
// Simple LTV
const ltv = arpu * averageMonthsSubscribed;

// Example
// ARPU: $8/month
// Average subscription: 14 months
// LTV: $112
```

### Target Metrics

| Metric | Good | Great |
|--------|------|-------|
| Trial → Paid | 10% | 20%+ |
| Monthly Churn | 5% | <3% |
| LTV/CAC Ratio | 3:1 | 5:1+ |

---

## Pricing Psychology

### The Rule of 10x

Your product should deliver 10x the value of its price:

- $10/month subscription
- Should save $100+/month in time or deliver $100+ in value

### Social Proof

Show subscriber count or testimonials:

```tsx
<View style={styles.socialProof}>
  <Text style={styles.proofText}>
    Join 10,000+ professionals using {APP_NAME}
  </Text>
  <View style={styles.ratings}>
    <Star color="#F59E0B" fill="#F59E0B" size={16} />
    <Text>4.8 • 2,400 reviews</Text>
  </View>
</View>
```

### Urgency (Use Sparingly)

```tsx
// Annual plan on paywall
<View style={styles.urgencyBanner}>
  <Text>🎉 New Year Sale: 40% off annual plan</Text>
  <Text style={styles.timerText}>Ends in 2 days</Text>
</View>
```

---

## Implementation Checklist

- [ ] Define free tier limits
- [ ] Choose subscription tiers and pricing
- [ ] Implement feature gating in code
- [ ] Create compelling paywall UI
- [ ] Set up Stripe (web) and RevenueCat (mobile)
- [ ] Configure products in App Store / Play Store
- [ ] Test purchase flow in sandbox
- [ ] Add restore purchases functionality
- [ ] Set up revenue analytics
- [ ] A/B test pricing (optional)

---

## Next Steps

- [Payments Setup →](06-PAYMENTS.md)
- [Deployment →](07-DEPLOYMENT.md)
