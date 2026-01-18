# Product Requirements Document (PRD)
# EverReach iOS Starter Kit - Option A

## Executive Summary

Transform the existing EverReach iOS app codebase into a reusable starter kit that developers can clone and customize with their own business logic while retaining the production-ready infrastructure.

---

## Product Vision

**One-liner:** A production-ready iOS app template that developers clone, swap the business logic, and ship in weeks instead of months.

**Target User:** Independent developers and small teams who want to build subscription-based iOS apps without starting from scratch.

**Value Proposition:** Skip 3-6 months of infrastructure work. Get auth, payments, navigation, and App Store-ready architecture out of the box.

---

## Goals & Success Metrics

### Goals

1. **Reduce time-to-market** from months to weeks
2. **Eliminate boilerplate** - auth, payments, settings already done
3. **Provide clear customization path** - developers know exactly what to change
4. **Maintain production quality** - code that's already App Store approved

### Success Metrics

| Metric | Target |
|--------|--------|
| Time to first run | < 15 minutes |
| Time to customize core entity | < 2 hours |
| Time to submit to App Store | < 2 weeks |
| Customer support tickets | < 3 per customer |

---

## Scope

### In Scope (What We Ship)

| Component | Description |
|-----------|-------------|
| **Authentication** | Email/password, Google OAuth, Apple Sign In, magic links |
| **User Management** | Profile, settings, account deletion |
| **Subscription System** | RevenueCat integration, paywall, restore purchases |
| **Navigation** | Tab bar, stack navigation, modals |
| **Data Layer** | Supabase client, React Query, offline support patterns |
| **UI Components** | Themed components, dark mode, accessibility |
| **Developer Mode** | In-app overlay showing what to customize |
| **Documentation** | 14 guides covering all aspects |
| **Database Schema** | Generic schema with RLS policies |
| **Backend API** | Vercel serverless functions template |

### Out of Scope (What Users Build)

| Component | User Responsibility |
|-----------|---------------------|
| Business logic | Core app functionality |
| Data models | Their specific entities |
| Custom UI | App-specific screens |
| Third-party integrations | APIs specific to their app |
| App Store assets | Screenshots, descriptions |

---

## User Journey

### Phase 1: Setup (15 minutes)

```
1. Clone repository
2. Install dependencies (npm install)
3. Create Supabase project
4. Copy environment variables
5. Run app (npx expo start)
6. See working app with sample data
```

### Phase 2: Understand (1-2 hours)

```
1. Explore the running app
2. Tap DEV MODE button to see customization checklist
3. Read QUICKSTART.md
4. Identify which files map to which screens
5. Understand data flow: Screen → Hook → API → Supabase
```

### Phase 3: Customize (1-2 weeks)

```
1. Rename app (app.json, config)
2. Replace Contact model with their entity
3. Update database schema
4. Modify main list screen
5. Customize detail screen
6. Update subscription tiers
7. Remove EverReach-specific features
8. Add their business logic
```

### Phase 4: Ship (1-2 weeks)

```
1. Set up production Supabase
2. Configure RevenueCat with real products
3. Create App Store Connect listing
4. Build with EAS
5. Submit for review
6. Launch!
```

---

## Technical Architecture

### Current ios-app Structure (What We Have)

```
ios-app/
├── app/                    # Expo Router screens
│   ├── (tabs)/            # Tab navigation
│   │   ├── index.tsx      # Contacts list ← REPLACE
│   │   ├── search.tsx     # Search ← MODIFY
│   │   └── settings.tsx   # Settings ← KEEP
│   ├── (auth)/            # Auth screens ← KEEP
│   ├── contact/[id].tsx   # Contact detail ← REPLACE
│   └── ...
├── components/            # UI components
│   ├── contacts/          # Contact-specific ← REPLACE
│   ├── common/            # Shared UI ← KEEP
│   └── ...
├── hooks/                 # Data hooks
│   ├── useContacts.ts     # Contact queries ← REPLACE
│   ├── useAuth.ts         # Auth hooks ← KEEP
│   └── ...
├── providers/             # Context providers ← KEEP
├── lib/                   # Utilities
│   ├── supabase.ts        # DB client ← KEEP
│   └── ...
├── types/                 # TypeScript types
│   ├── contact.ts         # Contact types ← REPLACE
│   └── ...
└── supabase-setup.sql     # Database schema ← MODIFY
```

### Transformation Plan

#### Layer 1: Keep As-Is (Infrastructure)

```
✅ Authentication system
✅ Subscription/payment flow
✅ Settings screens
✅ Navigation structure
✅ Theme system
✅ Error handling
✅ Analytics setup
✅ Push notifications setup
```

#### Layer 2: Genericize (Make Reusable)

```
🔄 contacts → items (generic entity)
🔄 interactions → activities (generic)
🔄 warmth_score → score (generic metric)
🔄 Contact-specific hooks → Item hooks
🔄 Database schema → Generic schema
```

#### Layer 3: Add Developer Experience

```
➕ DevModeOverlay component
➕ QUICKSTART.md guide
➕ Code comments with customization hints
➕ .env.example with all variables
➕ Database migration guide
```

---

## File-by-File Transformation Guide

### High Priority (Must Change)

| Current File | Action | New Name/Purpose |
|--------------|--------|------------------|
| `types/contact.ts` | Rename + genericize | `types/item.ts` |
| `hooks/useContacts.ts` | Rename + genericize | `hooks/useItems.ts` |
| `app/(tabs)/index.tsx` | Replace contact list | Generic item list |
| `app/contact/[id].tsx` | Replace detail view | `app/item/[id].tsx` |
| `components/contacts/*` | Replace or remove | `components/items/*` |
| `supabase-setup.sql` | Simplify schema | Generic items table |

### Medium Priority (Modify)

| Current File | Action | Notes |
|--------------|--------|-------|
| `app.json` | Template values | `YOUR_APP_NAME` placeholders |
| `constants/config.ts` | Add DEV_MODE flag | Enable developer overlay |
| `app/(tabs)/search.tsx` | Genericize | Search items instead of contacts |
| `components/common/*` | Keep, document | Add customization comments |

### Low Priority (Keep As-Is)

| Current File | Action | Notes |
|--------------|--------|-------|
| `providers/AuthProvider.tsx` | Keep | Works for any app |
| `app/(auth)/*` | Keep | Auth flow is universal |
| `app/(tabs)/settings.tsx` | Keep | Standard settings |
| `hooks/useSubscription.ts` | Keep | RevenueCat integration |
| `lib/supabase.ts` | Keep | Standard client setup |

---

## Database Schema Transformation

### Current Schema (EverReach-specific)

```sql
-- contacts, interactions, goals, warmth_scores, etc.
-- Complex CRM-specific schema
```

### Target Schema (Generic Starter)

```sql
-- Users table (synced with Supabase Auth)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generic items table (REPLACE WITH YOUR ENTITY)
CREATE TABLE public.items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- TODO: Replace these fields with your entity fields
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  status TEXT DEFAULT 'active',
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tier TEXT DEFAULT 'free',
  status TEXT DEFAULT 'active',
  provider TEXT,
  provider_subscription_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
ON public.users FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can CRUD own items"
ON public.items FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can read own subscription"
ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
```

---

## Developer Experience Features

### 1. DevModeOverlay (In-App Guide)

Floating button that shows:
- Checklist of files to customize
- Priority levels (high/medium/low)
- Direct file paths
- Progress tracking

### 2. Code Comments

```typescript
// app/(tabs)/index.tsx

/**
 * 🔧 APP-KIT: MAIN LIST SCREEN
 * 
 * This is your app's home screen. Replace the item list
 * with your core feature.
 * 
 * CUSTOMIZE:
 * - Replace `useItems` hook with your data hook
 * - Replace `ItemCard` with your list item component
 * - Update empty state messaging
 * - Modify FAB action
 * 
 * KEEP:
 * - Navigation structure
 * - Pull-to-refresh pattern
 * - Loading states
 * - Subscription limit checks
 */
```

### 3. Environment Template

```bash
# .env.example

# === REQUIRED ===
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# === PAYMENTS (Required for subscriptions) ===
REVENUECAT_API_KEY_IOS=your_revenuecat_ios_key
REVENUECAT_API_KEY_ANDROID=your_revenuecat_android_key

# === OPTIONAL ===
EXPO_PUBLIC_POSTHOG_API_KEY=your_posthog_key
SENTRY_DSN=your_sentry_dsn

# === DEV MODE ===
EXPO_PUBLIC_DEV_MODE=true  # Set to false for production
```

---

## Deliverables Checklist

### Code Changes

- [ ] Rename contact → item throughout codebase
- [ ] Simplify database schema to generic starter
- [ ] Add DevModeOverlay component
- [ ] Add customization comments to key files
- [ ] Create .env.example with all variables
- [ ] Update app.json with placeholder values
- [ ] Remove EverReach-specific features (voice notes, warmth, goals)
- [ ] Keep infrastructure (auth, payments, settings, navigation)

### Documentation

- [ ] QUICKSTART.md - 15-minute setup
- [ ] CUSTOMIZATION_GUIDE.md - What to change
- [ ] DATABASE_SETUP.md - Schema and migrations
- [ ] DEPLOYMENT.md - App Store submission
- [ ] FILE_MAP.md - What each file does
- [ ] ARCHITECTURE.md - System overview

### Quality Assurance

- [ ] App runs on first clone
- [ ] All auth flows work
- [ ] Subscription flow works (sandbox)
- [ ] No EverReach branding visible
- [ ] DevModeOverlay appears and functions
- [ ] All 404s and broken links fixed

---

## Timeline Estimate

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| **Phase 1: Rename & Genericize** | 2-3 days | Item-based codebase |
| **Phase 2: Remove EverReach Logic** | 1-2 days | Clean starter |
| **Phase 3: Add DevModeOverlay** | 1 day | In-app guidance |
| **Phase 4: Documentation** | 1-2 days | All guides |
| **Phase 5: QA & Polish** | 1-2 days | Bug-free starter |
| **Total** | **6-10 days** | Production-ready kit |

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking changes during transformation | High | Test after each major change |
| Missing dependencies | Medium | Document all in package.json |
| Confusing file structure | Medium | Add FILE_MAP.md |
| Hard-coded EverReach values | Low | Search and replace all instances |

---

## Success Criteria

The starter kit is ready when a developer can:

1. ✅ Clone and run in < 15 minutes
2. ✅ Understand what to customize via DevModeOverlay
3. ✅ Replace the Item model with their entity in < 2 hours
4. ✅ Submit to App Store in < 2 weeks
5. ✅ Get no "EverReach" branding anywhere

---

## Appendix: Files to Search & Replace

```bash
# Find all EverReach references
grep -r "EverReach" --include="*.ts" --include="*.tsx" --include="*.json"
grep -r "everreach" --include="*.ts" --include="*.tsx" --include="*.json"
grep -r "contact" --include="*.ts" --include="*.tsx" 
grep -r "Contact" --include="*.ts" --include="*.tsx"
grep -r "warmth" --include="*.ts" --include="*.tsx"
grep -r "interaction" --include="*.ts" --include="*.tsx"
```

---

## Next Steps

1. **Approve this PRD**
2. Begin Phase 1: Rename & Genericize
3. Create new branch: `app-kit-starter`
4. Execute transformation
5. QA and document
6. Push to GitHub
