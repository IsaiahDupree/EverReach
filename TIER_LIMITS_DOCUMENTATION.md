# 💎 Subscription Tiers & Usage Limits

## Overview

The CRM implements tier-based usage limits for AI features to manage costs and provide upgrade paths. Currently, screenshot analysis has tiered limits, with other AI features unlimited for all tiers.

---

## 🎯 Tier Comparison

| Feature | Core (Free) | Pro | Enterprise |
|---------|-------------|-----|------------|
| **Price** | $0/month | $29.99/month | $99.99/month |
| **Screenshots** | 100/month | 300/month | Unlimited |
| **Voice Notes** | Unlimited | Unlimited | Unlimited |
| **AI Chat** | Unlimited | Unlimited | Unlimited |
| **Smart Compose** | Unlimited | Unlimited | Unlimited |

---

## 📊 Core Tier (Free)

**Perfect for:** Individual users getting started

### Limits
- ✅ **100 screenshots/month** - AI analysis of message screenshots
- ✅ **Unlimited voice notes** - Process as many voice notes as needed
- ✅ **Unlimited AI chat** - Chat with AI agent without limits
- ✅ **Unlimited smart compose** - Generate messages anytime

### When You Hit the Limit
When you reach 100 screenshots in a month:
- You'll receive a `429` error with clear messaging
- Limit resets on the 1st of each month
- Other features remain fully functional
- Consider upgrading to Pro for 10x more screenshots

---

## 🚀 Pro Tier

**Perfect for:** Power users and small teams

### Limits
- ✅ **300 screenshots/month** - 3x more than Core
- ✅ **Unlimited voice notes**
- ✅ **Unlimited AI chat**
- ✅ **Unlimited smart compose**

### Additional Benefits
- Priority support
- Advanced analytics (coming soon)
- Custom integrations (coming soon)

### Upgrade
Contact support or upgrade via settings to switch to Pro tier.

---

## 💼 Enterprise Tier

**Perfect for:** Large teams and organizations

### Limits
- ✅ **Unlimited screenshots** - No monthly limits
- ✅ **Unlimited voice notes**
- ✅ **Unlimited AI chat**
- ✅ **Unlimited smart compose**

### Additional Benefits
- Dedicated account manager
- Custom SLA
- Advanced security features
- Custom AI model training
- Priority feature requests

### Upgrade
Contact sales for Enterprise pricing and setup.

---

## 🔧 Technical Implementation

### Database Schema

#### profiles table
```sql
ALTER TABLE profiles ADD COLUMN subscription_tier TEXT DEFAULT 'core' 
  CHECK (subscription_tier IN ('core', 'pro', 'enterprise'));
```

#### user_usage_limits table
```sql
CREATE TABLE user_usage_limits (
    user_id UUID,
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    screenshots_used INT DEFAULT 0,
    screenshots_limit INT,
    -- Monthly tracking per user
);
```

### API Response Format

When usage limits are enforced, the API returns:

**Success Response:**
```json
{
  "analysis_id": "uuid",
  "ocr_text": "...",
  "inferred_goal": {...},
  "usage": {
    "current": 45,
    "limit": 100,
    "remaining": 55,
    "resets_at": "2025-11-01T00:00:00Z",
    "tier": "core"
  }
}
```

**Limit Exceeded Response (429):**
```json
{
  "error": {
    "code": "usage_limit_exceeded",
    "message": "Monthly screenshot limit reached",
    "details": {
      "current_usage": 100,
      "limit": 100,
      "remaining": 0,
      "resets_at": "2025-11-01T00:00:00Z",
      "tier": "core"
    }
  }
}
```

**HTTP Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 2025-11-01T00:00:00Z
```

---

## 📱 Frontend Integration

### Checking Usage

```typescript
import { apiFetch } from '@/lib/api';

async function checkScreenshotUsage() {
  try {
    const result = await apiFetch('/v1/agent/analyze/screenshot', {
      method: 'POST',
      body: JSON.stringify({
        image_url: screenshotUrl,
        channel: 'email'
      })
    });
    
    // Show usage info
    console.log('Usage:', result.usage.current, '/', result.usage.limit);
    console.log('Remaining:', result.usage.remaining);
    
    return result;
  } catch (error) {
    if (error.message.includes('usage_limit_exceeded')) {
      // Show upgrade prompt
      showUpgradeModal({
        current: error.details.current_usage,
        limit: error.details.limit,
        tier: error.details.tier,
        resetsAt: error.details.resets_at
      });
    }
  }
}
```

### Usage Indicator Component

```tsx
function UsageIndicator({ usage }) {
  const percentage = (usage.current / usage.limit) * 100;
  const isNearLimit = percentage >= 80;
  
  return (
    <View>
      <Text>Screenshots: {usage.current} / {usage.limit}</Text>
      <ProgressBar value={percentage} warning={isNearLimit} />
      {isNearLimit && (
        <Button onPress={showUpgradeModal}>
          Upgrade to Pro for 3x more
        </Button>
      )}
    </View>
  );
}
```

### Upgrade Modal

```tsx
function UpgradeModal({ tier, usage }) {
  return (
    <Modal>
      <Text>You've used {usage.current} of {usage.limit} screenshots</Text>
      <Text>Resets on {formatDate(usage.resets_at)}</Text>
      
      <TierCard tier="pro">
        <Text>Upgrade to Pro</Text>
        <Text>300 screenshots/month</Text>
        <Text>$29.99/month</Text>
        <Button onPress={upgradeToPro}>Upgrade Now</Button>
      </TierCard>
      
      <TierCard tier="enterprise">
        <Text>Enterprise Plan</Text>
        <Text>Unlimited everything</Text>
        <Text>$99.99/month</Text>
        <Button onPress={contactSales}>Contact Sales</Button>
      </TierCard>
    </Modal>
  );
}
```

---

## 🔄 Usage Reset Logic

### Monthly Reset (1st of Month)
- Usage resets automatically on the 1st of each month at 00:00 UTC
- New period created with limits based on current tier
- Previous period archived for billing/analytics

### Implementation
```sql
-- Function automatically creates new period when needed
SELECT get_or_create_usage_period(user_id);

-- Periods are monthly: Nov 1 00:00:00 to Dec 1 00:00:00
```

---

## 🧪 Testing

### Run Tier Limit Tests
```bash
# Test tier limits
node test/agent/agent-screenshot-tier-limits.mjs

# All agent tests
node test/agent/run-all.mjs
```

### Test Coverage
- ✅ Usage info in response
- ✅ Tier detection
- ✅ Limit enforcement (100/1000/unlimited)
- ✅ Usage counter increments
- ✅ Remaining count tracking
- ✅ Limit exceeded errors
- ✅ Monthly reset dates
- ✅ User isolation
- ✅ HTTP headers

---

## 🛠️ Admin Operations

### Check User Usage
```sql
-- Current usage for user
SELECT * FROM user_usage_limits 
WHERE user_id = 'user-uuid' 
  AND period_end > NOW();

-- User's tier
SELECT subscription_tier FROM profiles 
WHERE user_id = 'user-uuid';
```

### Upgrade User
```sql
-- Upgrade to Pro
UPDATE profiles 
SET subscription_tier = 'pro' 
WHERE user_id = 'user-uuid';

-- Upgrade to Enterprise
UPDATE profiles 
SET subscription_tier = 'enterprise' 
WHERE user_id = 'user-uuid';
```

### Reset Usage (Emergency)
```sql
-- Reset current period usage
UPDATE user_usage_limits 
SET screenshots_used = 0 
WHERE user_id = 'user-uuid' 
  AND period_end > NOW();
```

### View Tier Statistics
```sql
-- Count users by tier
SELECT subscription_tier, COUNT(*) as users
FROM profiles
GROUP BY subscription_tier;

-- Average usage by tier
SELECT 
  p.subscription_tier,
  AVG(u.screenshots_used) as avg_screenshots,
  MAX(u.screenshots_used) as max_screenshots
FROM user_usage_limits u
JOIN profiles p ON u.user_id = p.user_id
WHERE u.period_end > NOW()
GROUP BY p.subscription_tier;
```

---

## 💰 Pricing Strategy

### Core (Free)
- **Goal:** Acquisition and activation
- **Limit:** 100 screenshots/month (~3/day)
- **Target:** Individual users exploring the product

### Pro ($29.99/month)
- **Goal:** Monetization of power users
- **Limit:** 300 screenshots/month (~10/day)
- **Target:** Daily users and small teams
- **Value:** 3x more screenshots than free

### Enterprise ($99.99/month)
- **Goal:** Large organizations
- **Limit:** Unlimited
- **Target:** Teams with heavy usage
- **Value:** No limits + premium support

---

## 📈 Future Enhancements

### Planned Features
- [ ] Usage analytics dashboard
- [ ] Email notifications at 80% usage
- [ ] Annual billing discounts
- [ ] Team sharing (shared limits)
- [ ] Rollover unused screenshots
- [ ] Usage forecasting
- [ ] Custom tier creation

### Additional Limits (Coming Soon)
- Voice note processing limits
- AI chat message limits
- Smart compose generation limits
- API call rate limits per tier

---

## 🚦 Migration Guide

### Existing Users
1. **Run migration:** `subscription-tiers-and-usage-limits.sql`
2. **All existing users → Core tier** (100 screenshots/month)
3. **Usage tracking starts immediately**
4. **No retroactive limits** - only counts future usage

### Upgrading Users
1. User subscribes via Stripe
2. Webhook updates `profiles.subscription_tier`
3. Next API call creates new period with higher limits
4. Usage preserved, limits updated

---

## 🔒 Security

### RLS Policies
- Users can only view their own usage
- Users cannot modify tier (admin-only)
- Usage increments via secure functions
- Tier validation on all API calls

### Rate Limiting
- Still enforced (20 req/min)
- Independent of tier limits
- Prevents abuse

---

## 📞 Support

### User Questions
- **"When does my limit reset?"** - 1st of each month
- **"Can I buy more screenshots?"** - Upgrade to Pro or Enterprise
- **"What happens if I go over?"** - APIs return 429 until next month
- **"Are other features affected?"** - No, only screenshots are limited

### Troubleshooting
- **"Limit showing incorrect"** - Check tier in profiles table
- **"Usage not tracking"** - Verify RPC functions exist
- **"Reset not happening"** - Check period_end dates

---

**Built for scalable monetization** 💎

