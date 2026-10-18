# Mobile App Workspace Separation Guide

**Date**: October 21, 2025  
**Goal**: Properly separate mobile app from monorepo for independent development

---

## 🎯 Current Structure vs Target

### Current (Monorepo)
```
PersonalCRM/
├── app/                    # Mobile app screens
├── components/             # Mobile components
├── backend-vercel/         # Backend API
├── web/                    # Web app
├── docs/                   # Shared docs
└── test/                   # Shared tests
```

### Target (Separated)
```
PersonalCRM/
├── mobile/                 # 📱 MOBILE APP (new location)
│   ├── app/
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   ├── types/
│   ├── assets/
│   └── package.json       # Mobile-specific deps
├── backend-vercel/        # Backend API (stays)
├── web/                   # Web app (stays)
└── docs/                  # Shared docs (stays)
```

---

## 📋 Separation Strategy

### Option A: Keep in Monorepo (Recommended)

**Why**: 
- Share types between mobile, web, backend
- Single `node_modules` install
- Easier to sync API changes
- Unified testing

**Structure**:
```
PersonalCRM/
├── apps/
│   ├── mobile/           # Mobile app
│   ├── web/              # Web app
│   └── backend/          # Backend (Vercel)
├── packages/
│   ├── shared-types/     # Shared TypeScript types
│   ├── api-client/       # Shared API hooks
│   └── ui/               # Shared components (optional)
├── docs/
├── test/
└── package.json          # Root workspace config
```

**Setup**:
```json
// package.json (root)
{
  "name": "everreach-monorepo",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "mobile": "npm run start --workspace=apps/mobile",
    "web": "npm run dev --workspace=apps/web",
    "backend": "npm run dev --workspace=apps/backend"
  }
}
```

### Option B: Separate Repositories

**Why**:
- Complete independence
- Different deployment cycles
- Separate teams can own each repo

**Repos**:
1. `everreach-mobile` - React Native app
2. `everreach-web` - Next.js web app
3. `everreach-backend` - Vercel API

**Shared Code**:
- Publish shared types to npm
- Or use git submodules
- Or duplicate (less ideal)

---

## 🚀 Quick Migration (Option A - Monorepo)

### Step 1: Create Workspace Structure

```bash
# Create apps directory
mkdir -p apps/mobile apps/web apps/backend

# Move mobile files
mv app apps/mobile/
mv components apps/mobile/
mv hooks apps/mobile/
mv lib apps/mobile/
mv types apps/mobile/
mv assets apps/mobile/
mv providers apps/mobile/
mv helpers apps/mobile/
mv services apps/mobile/
mv storage apps/mobile/
mv auth apps/mobile/
mv constants apps/mobile/
mv utils apps/mobile/

# Copy mobile configs
cp app.json apps/mobile/
cp tsconfig.json apps/mobile/
cp package.json apps/mobile/
cp .env apps/mobile/

# Move web files
mv web/* apps/web/

# Move backend files
mv backend-vercel/* apps/backend/
```

### Step 2: Create Shared Packages

```bash
# Create shared types package
mkdir -p packages/shared-types
cd packages/shared-types

cat > package.json << 'EOF'
{
  "name": "@everreach/shared-types",
  "version": "1.0.0",
  "main": "index.ts",
  "types": "index.ts"
}
EOF

cat > index.ts << 'EOF'
// Shared types between mobile, web, backend
export * from './contact';
export * from './interaction';
export * from './warmth';
export * from './api';
EOF

# Create shared API client
mkdir -p packages/api-client
cd packages/api-client

cat > package.json << 'EOF'
{
  "name": "@everreach/api-client",
  "version": "1.0.0",
  "main": "index.ts",
  "dependencies": {
    "@everreach/shared-types": "*"
  }
}
EOF
```

### Step 3: Update Root package.json

```json
{
  "name": "everreach-monorepo",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "mobile": "npm run start --workspace=apps/mobile",
    "mobile:ios": "npm run ios --workspace=apps/mobile",
    "mobile:android": "npm run android --workspace=apps/mobile",
    "web": "npm run dev --workspace=apps/web",
    "backend": "npm run dev --workspace=apps/backend",
    "test:all": "npm run test --workspaces",
    "build:all": "npm run build --workspaces"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
```

### Step 4: Update Mobile App Imports

```typescript
// apps/mobile/app/index.tsx (before)
import { Contact } from '../types/contact';
import { useContacts } from '../hooks/useContacts';

// apps/mobile/app/index.tsx (after)
import { Contact } from '@everreach/shared-types';
import { useContacts } from '../hooks/useContacts';
```

### Step 5: Update Mobile package.json

```json
{
  "name": "@everreach/mobile",
  "version": "1.0.0",
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "web": "expo start --web"
  },
  "dependencies": {
    "@everreach/shared-types": "*",
    "@everreach/api-client": "*",
    "expo": "^51.0.0",
    "react-native": "^0.74.0"
  }
}
```

---

## 📦 Minimal Separation (Keep Current Structure)

If you want to keep the current flat structure but just organize better:

### Step 1: Create Admin Directory

```bash
mkdir -p app/admin
mkdir -p components/admin
mkdir -p hooks/admin
```

### Step 2: Add Admin Screens

```bash
# Create admin screens
touch app/admin/_layout.tsx
touch app/admin/analytics.tsx
touch app/admin/billing.tsx
touch app/admin/organization.tsx
touch app/admin/team.tsx
touch app/admin/data.tsx
```

### Step 3: Update Navigation

Add admin tab to your existing tabs:

```typescript
// app/(tabs)/_layout.tsx
<Tabs.Screen
  name="admin"
  options={{
    title: 'Admin',
    tabBarIcon: ({ color }) => <Settings2 size={24} color={color} />,
  }}
/>
```

---

## 🎨 Admin Features - Quick Start

Let me create the initial admin screen structure for you:

### Analytics Dashboard (Priority #1)

```typescript
// app/admin/analytics.tsx
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useAnalytics } from '@/hooks/admin/useAnalytics';
import { AnalyticsCard } from '@/components/admin/AnalyticsCard';
import { WarmthDistribution } from '@/components/admin/WarmthDistribution';

export default function AnalyticsScreen() {
  const { data: analytics, isLoading } = useAnalytics();

  if (isLoading) return <LoadingScreen />;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Your Analytics</Text>
      
      {/* Key Metrics */}
      <View style={styles.grid}>
        <AnalyticsCard
          title="Total Contacts"
          value={analytics.totalContacts}
          change="+12%"
          icon="users"
        />
        <AnalyticsCard
          title="Interactions This Week"
          value={analytics.weeklyInteractions}
          change="+5%"
          icon="message-circle"
        />
        <AnalyticsCard
          title="Avg Warmth Score"
          value={analytics.avgWarmth}
          change="+8%"
          icon="thermometer"
        />
        <AnalyticsCard
          title="AI Messages"
          value={analytics.aiMessages}
          change="+25%"
          icon="sparkles"
        />
      </View>

      {/* Warmth Distribution */}
      <WarmthDistribution data={analytics.warmthDistribution} />

      {/* Activity Timeline */}
      <ActivityChart data={analytics.activityTimeline} />
    </ScrollView>
  );
}
```

### Billing Dashboard

```typescript
// app/admin/billing.tsx
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useBilling } from '@/hooks/admin/useBilling';
import { PlanCard } from '@/components/admin/PlanCard';
import { UsageBar } from '@/components/admin/UsageBar';

export default function BillingScreen() {
  const { subscription, usage } = useBilling();

  const handleUpgrade = () => {
    // Navigate to subscription plans
  };

  const handleManage = async () => {
    // Open Stripe portal
    const { url } = await fetch('/api/v1/billing/portal').then(r => r.json());
    Linking.openURL(url);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Current Plan */}
      <PlanCard
        plan={subscription.plan}
        features={subscription.features}
        nextBillingDate={subscription.nextBillingDate}
        onUpgrade={handleUpgrade}
        onManage={handleManage}
      />

      {/* Usage */}
      <Text style={styles.sectionTitle}>Usage This Month</Text>
      <UsageBar
        label="Contacts"
        current={usage.contacts}
        limit={subscription.limits.contacts}
      />
      <UsageBar
        label="AI Messages"
        current={usage.aiMessages}
        limit={subscription.limits.aiMessages}
      />
      <UsageBar
        label="Screenshot Analyses"
        current={usage.screenshots}
        limit={subscription.limits.screenshots}
      />
    </ScrollView>
  );
}
```

---

## 🔑 Recommendation

**I recommend Option A (Monorepo with apps/ structure)** because:

1. ✅ **Type Safety**: Share types across mobile/web/backend
2. ✅ **Code Reuse**: Share API hooks, utilities
3. ✅ **Easier Testing**: Test all apps together
4. ✅ **Single Install**: `npm install` once
5. ✅ **Atomic Updates**: Update API + mobile + web together

**But start simple**: Don't migrate everything now. Just:
1. Create `app/admin/` for new admin screens
2. Create `components/admin/` for admin components  
3. Create `hooks/admin/` for admin hooks
4. Build the features

Then migrate to full workspace structure later if needed.

---

## 📋 Next Actions

**Immediate** (Today):
1. ✅ Create admin directories
2. ✅ Build analytics screen
3. ✅ Build billing screen
4. ✅ Add admin tab to navigation

**This Week**:
1. Organization settings
2. Data export
3. Feature access view
4. Team management (if Pro)

**Later** (Optional):
1. Full monorepo migration
2. Shared packages
3. Separate deployments

---

**Which approach do you prefer?**
1. Start with `app/admin/` in current structure (quick)
2. Full monorepo migration with `apps/` (better long-term)
3. Separate repository (complete independence)

I can help implement whichever you choose!
