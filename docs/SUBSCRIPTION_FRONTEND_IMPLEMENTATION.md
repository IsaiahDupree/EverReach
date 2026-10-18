# Subscription System - Frontend Implementation

**Production-ready subscription system integrated with backend API**

**Status:** ✅ Implemented  
**Backend API:** `https://ever-reach-be.vercel.app/api`  
**Last Updated:** November 2, 2025

---

## Quick Start

### 1. Add Provider to App

```typescript
// app/_layout.tsx
import { EntitlementsProviderV3 } from '@/providers/EntitlementsProviderV3';

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <EntitlementsProviderV3>  {/* ← Add here */}
          <Slot />
        </EntitlementsProviderV3>
      </AuthProvider>
    </QueryClientProvider>
  );
}
```

### 2. Use in Components

```typescript
import { useEntitlements } from '@/providers/EntitlementsProviderV3';

export function MyFeature() {
  const { requireFeature, hasFeature, isPro } = useEntitlements();

  const handlePremiumAction = async () => {
    // Gate the feature - automatically shows paywall if user doesn't have access
    if (!(await requireFeature('compose_runs', 'my_feature'))) {
      return;
    }

    // User has access, proceed
    performPremiumAction();
  };

  return (
    <View>
      {isPro && <TierBadge />}
      <Button onPress={handlePremiumAction}>Premium Feature</Button>
    </View>
  );
}
```

---

## Core Concepts

### Tiers

| Tier | Compose Runs | Voice Minutes | Messages | Contacts |
|------|-------------|---------------|----------|----------|
| **free** | 50 | 30 | 200 | 100 |
| **core** | 500 | 120 | 1,000 | 500 |
| **pro** | 1,000 | 300 | 2,000 | Unlimited (-1) |
| **team** | Unlimited | Unlimited | Unlimited | Unlimited |

### Statuses

- **trial** - Free trial active
- **active** - Paid subscription active  
- **canceled** - Canceled but still has access until period end
- **expired** - No longer has access
- **refunded** - Refunded

---

## API Reference

### `useEntitlements()` Hook

```typescript
const {
  // Data
  entitlements,    // Full entitlements object
  loading,         // Loading state
  error,           // Error state

  // Feature gates
  hasFeature,      // Check if user has feature
  requireFeature,  // Require feature (shows paywall if not)
  getFeatureLimit, // Get limit for a feature

  // Tier checks
  isFree,          // Is on free tier
  isCore,          // Is on core tier
  isPro,           // Is on pro tier
  isTeam,          // Is on team tier
  isPaid,          // Is on any paid tier (core/pro/team)

  // Status checks
  isTrial,         // Is on trial
  isActive,        // Has active subscription
  isCanceled,      // Subscription is canceled
  isExpired,       // Subscription expired

  // Actions
  refreshEntitlements,  // Refresh from backend
  restorePurchases,     // Restore purchases (native only)
} = useEntitlements();
```

---

## Usage Examples

### 1. Feature Gate (Basic)

```typescript
export function ExportCSVButton() {
  const { requireFeature } = useEntitlements();

  const handleExport = async () => {
    // Gate the feature
    if (!(await requireFeature('contacts', 'export_csv'))) {
      return; // User redirected to paywall
    }

    // Feature allowed
    exportContactsToCSV();
  };

  return <Button onPress={handleExport}>Export CSV</Button>;
}
```

### 2. Quota Check

```typescript
export function ComposeMessage() {
  const { hasFeature, getFeatureLimit, entitlements } = useEntitlements();

  const composeLimit = getFeatureLimit('compose_runs');
  const canCompose = hasFeature('compose_runs', 1);

  const handleCompose = async () => {
    if (!canCompose) {
      Alert.alert(
        'Compose Limit Reached',
        `You've used all ${composeLimit} compose runs this month. Upgrade to get more!`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: () => router.push('/subscription-plans') },
        ]
      );
      return;
    }

    composeMessage();
  };

  return (
    <View>
      <Button onPress={handleCompose}>Compose Message</Button>
      <Text>{composeLimit === -1 ? 'Unlimited' : composeLimit} remaining</Text>
    </View>
  );
}
```

### 3. Show Tier Badge

```typescript
import TierBadge from '@/components/TierBadge';

export function ProfileHeader() {
  return (
    <View style={styles.header}>
      <Text style={styles.name}>John Doe</Text>
      <TierBadge size="small" paidOnly />  {/* Only shows for paid users */}
    </View>
  );
}
```

### 4. Conditional UI Based on Tier

```typescript
export function SettingsScreen() {
  const { isPro, isTeam, entitlements } = useEntitlements();

  return (
    <ScrollView>
      {/* Always show */}
      <SettingSection title="General" />

      {/* Pro and Team only */}
      {(isPro || isTeam) && (
        <SettingSection title="Advanced Analytics" />
      )}

      {/* Team only */}
      {isTeam && (
        <SettingSection title="Team Management" />
      )}

      {/* Show tier info */}
      <View style={styles.tierInfo}>
        <Text>Current Tier: {entitlements?.tier}</Text>
        <Text>Status: {entitlements?.subscription_status}</Text>
      </View>
    </ScrollView>
  );
}
```

### 5. Trial Expiry Warning

```typescript
export function TrialBanner() {
  const { isTrial, entitlements } = useEntitlements();

  if (!isTrial || !entitlements?.trial_ends_at) {
    return null;
  }

  const daysRemaining = Math.ceil(
    (new Date(entitlements.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  if (daysRemaining > 3) {
    return null; // Don't show banner if more than 3 days left
  }

  return (
    <View style={styles.banner}>
      <Text style={styles.bannerText}>
        Trial ends in {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}
      </Text>
      <TouchableOpacity onPress={() => router.push('/subscription-plans')}>
        <Text style={styles.upgradeButton}>Upgrade Now</Text>
      </TouchableOpacity>
    </View>
  );
}
```

### 6. Restore Purchases Button

```typescript
export function RestorePurchasesButton() {
  const { restorePurchases } = useEntitlements();
  const [loading, setLoading] = useState(false);

  const handleRestore = async () => {
    setLoading(true);
    const result = await restorePurchases();
    setLoading(false);

    Alert.alert(
      result.restored ? 'Success' : 'No Purchases Found',
      result.message
    );
  };

  return (
    <TouchableOpacity onPress={handleRestore} disabled={loading}>
      <Text>{loading ? 'Restoring...' : 'Restore Purchases'}</Text>
    </TouchableOpacity>
  );
}
```

### 7. Usage Stats Display

```typescript
export function UsageStats() {
  const { entitlements, getFeatureLimit } = useEntitlements();

  if (!entitlements) return null;

  const stats = [
    {
      name: 'Compose Runs',
      used: 0, // TODO: Get from usage API
      limit: getFeatureLimit('compose_runs'),
    },
    {
      name: 'Voice Minutes',
      used: 0, // TODO: Get from usage API
      limit: getFeatureLimit('voice_minutes'),
    },
    {
      name: 'Messages',
      used: 0, // TODO: Get from usage API
      limit: getFeatureLimit('messages'),
    },
    {
      name: 'Contacts',
      used: 0, // TODO: Get from usage API
      limit: getFeatureLimit('contacts'),
    },
  ];

  return (
    <View style={styles.statsContainer}>
      {stats.map((stat) => (
        <View key={stat.name} style={styles.statCard}>
          <Text style={styles.statName}>{stat.name}</Text>
          <Text style={styles.statValue}>
            {stat.used} / {stat.limit === -1 ? '∞' : stat.limit}
          </Text>
          {stat.limit !== -1 && (
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${(stat.used / stat.limit) * 100}%` },
                ]}
              />
            </View>
          )}
        </View>
      ))}
    </View>
  );
}
```

---

## Backend Integration

### Environment Variables

```bash
# .env
EXPO_PUBLIC_API_URL=https://ever-reach-be.vercel.app/api
EXPO_PUBLIC_REVENUECAT_IOS_KEY=your_ios_key
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=your_android_key
```

### API Endpoints Used

**GET `/api/v1/me/entitlements`**
- Primary endpoint
- Returns tier, status, features, dates
- Called on app startup and after purchases

**POST `/api/v1/billing/restore`**
- Restore purchases from Apple/Google
- Syncs with RevenueCat
- Returns restored tier

---

## Analytics Events

The system automatically tracks:

- `feature_locked_clicked` - When user tries to access locked feature
- `restore_purchases_initiated` - When restore is started
- `restore_purchases_success` - When restore succeeds
- `restore_purchases_no_subscription` - When no purchases found
- `restore_purchases_failed` - When restore fails

---

## Components Created

| File | Purpose |
|------|---------|
| `providers/EntitlementsProviderV3.tsx` | Main provider with backend integration |
| `components/TierBadge.tsx` | Display tier badge |
| `lib/types/subscription.ts` | Type definitions |

---

## Migration from Old System

If you're migrating from the old `SubscriptionProvider`:

**Old:**
```typescript
const { isPaid, tier } = useSubscription();
if (!isPaid) {
  // Show paywall
}
```

**New:**
```typescript
const { isPaid, requireFeature } = useEntitlements();
if (!(await requireFeature('pro', 'feature_name'))) {
  return; // Automatically shows paywall
}
```

---

## Testing

### Development Testing

Use the dev override screen to test different states:
```
/dev/subscription-override
```

### Manual Testing Checklist

- [ ] Free tier shows correct limits
- [ ] Core tier shows correct limits
- [ ] Pro tier shows unlimited contacts
- [ ] Team tier shows all unlimited
- [ ] Feature gates work correctly
- [ ] Paywall appears when feature locked
- [ ] Tier badge displays correctly
- [ ] Restore purchases works on native
- [ ] Trial warning shows correctly
- [ ] Quota displays work

---

## Troubleshooting

### Entitlements not loading
- Check backend API is reachable
- Verify auth token is valid
- Check network tab in DevTools

### Feature gates not working
- Ensure `EntitlementsProviderV3` is in app tree
- Check `entitlements` object is not null
- Verify feature key matches backend

### Restore not working
- Only works on native (iOS/Android)
- Requires RevenueCat SDK initialized
- Check user has previous purchases

---

## Next Steps

1. ✅ **Integrate Provider** - Add to `_layout.tsx`
2. ✅ **Add Feature Gates** - Use `requireFeature()` for premium features
3. ⏳ **Create Paywall** - Build subscription plans screen
4. ⏳ **Add Usage Tracking** - Track feature usage against limits
5. ⏳ **Implement Purchase Flow** - RevenueCat integration
6. ⏳ **Add Status Banners** - Trial warnings, cancel notices

---

**🎉 Subscription system is ready for integration!**

The frontend now matches the backend API structure and provides a clean, type-safe interface for feature gating and subscription management.
