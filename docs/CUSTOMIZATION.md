# iOS Starter Kit - Customization Guide

This guide walks you through transforming this generic starter kit into your unique iOS application. Follow the priority levels to systematically customize the template.

---

## Table of Contents

1. [File Map](#file-map)
2. [What to Change (Priority Levels)](#what-to-change-priority-levels)
3. [Data Flow Architecture](#data-flow-architecture)
4. [Customization Checklist](#customization-checklist)
5. [Common Examples](#common-examples)
6. [Advanced Customization](#advanced-customization)

---

## File Map

Understanding the codebase structure is crucial for effective customization. Here's what each directory contains:

### Directory Structure

```
ios-starter/
├── app/                          # 📱 SCREENS (Expo Router)
│   ├── _layout.tsx               # Root layout - providers, navigation
│   ├── (auth)/                   # Auth screens (login, signup, forgot)
│   │   ├── _layout.tsx           # ✅ KEEP - Auth stack layout
│   │   ├── login.tsx             # ✅ KEEP - Login screen
│   │   ├── signup.tsx            # ✅ KEEP - Signup screen
│   │   └── forgot-password.tsx   # ✅ KEEP - Password reset
│   ├── (tabs)/                   # Main tab navigation
│   │   ├── _layout.tsx           # 🔧 CUSTOMIZE - Tab configuration
│   │   ├── index.tsx             # 🔧 CUSTOMIZE - Home/list screen
│   │   ├── search.tsx            # 🔧 CUSTOMIZE - Search screen
│   │   └── settings.tsx          # ✅ KEEP - Settings
│   ├── item/                     # Item detail screens
│   │   └── [id].tsx              # 🔧 CUSTOMIZE - Detail view
│   ├── paywall.tsx               # ✅ KEEP - Subscription screen
│   └── profile.tsx               # ✅ KEEP - User profile
│
├── components/                   # 🧩 UI COMPONENTS
│   ├── common/                   # ✅ KEEP - Shared components
│   │   ├── Button.tsx            # Themed button
│   │   ├── Input.tsx             # Themed input
│   │   ├── Card.tsx              # Card container
│   │   └── LoadingSpinner.tsx    # Loading state
│   ├── items/                    # 🔧 CUSTOMIZE - Entity components
│   │   ├── ItemCard.tsx          # List item card
│   │   ├── ItemForm.tsx          # Create/edit form
│   │   └── ItemDetail.tsx        # Detail view
│   ├── auth/                     # ✅ KEEP - Auth components
│   │   └── OAuthButtons.tsx      # Google/Apple sign in
│   └── dev/                      # Developer tools
│       └── DevModeOverlay.tsx    # 🗑️ REMOVE before production
│
├── hooks/                        # 🪝 DATA HOOKS
│   ├── useAuth.ts                # ✅ KEEP - Auth state & actions
│   ├── useSubscription.ts        # ✅ KEEP - Subscription status
│   ├── useItems.ts               # 🔧 CUSTOMIZE - Your entity queries
│   └── useUser.ts                # ✅ KEEP - User profile
│
├── providers/                    # 🔌 CONTEXT PROVIDERS
│   ├── AuthProvider.tsx          # ✅ KEEP - Auth context
│   ├── ThemeProvider.tsx         # ✅ KEEP - Theme/dark mode
│   └── QueryProvider.tsx         # ✅ KEEP - React Query
│
├── lib/                          # 📚 UTILITIES
│   ├── supabase.ts               # ✅ KEEP - Supabase client
│   ├── revenuecat.ts             # ✅ KEEP - RevenueCat setup
│   └── analytics.ts              # ✅ KEEP - Analytics helpers
│
├── types/                        # 📝 TYPESCRIPT TYPES
│   ├── item.ts                   # 🔧 CUSTOMIZE - Your entity types
│   ├── user.ts                   # ✅ KEEP - User types
│   └── subscription.ts           # ✅ KEEP - Subscription types
│
├── constants/                    # ⚙️ CONFIGURATION
│   ├── config.ts                 # 🔧 CUSTOMIZE - App config
│   └── colors.ts                 # 🔧 CUSTOMIZE - Theme colors
│
├── supabase/                     # 🗄️ DATABASE
│   └── schema.sql                # 🔧 CUSTOMIZE - Your schema
│
├── app.json                      # 🔧 CUSTOMIZE - Expo config
├── eas.json                      # ✅ KEEP - Build configuration
├── package.json                  # ✅ KEEP - Dependencies
├── tsconfig.json                 # ✅ KEEP - TypeScript config
└── .env.example                  # 🔧 CUSTOMIZE - Environment template
```

### Legend
- ✅ **KEEP** - Use as-is, production-ready infrastructure
- 🔧 **CUSTOMIZE** - Adapt to your business logic
- 🗑️ **REMOVE** - Delete before production release

---

## What to Change (Priority Levels)

### High Priority (Must Change)

These files contain the generic "Item" entity and must be replaced with your specific business logic.

| File | Action | Description |
|------|--------|-------------|
| `types/item.ts` | Replace | Define your core entity type (Product, Task, Workout, etc.) |
| `hooks/useItems.ts` | Rename & modify | Update to match your entity (useProducts, useTasks, etc.) |
| `app/(tabs)/index.tsx` | Replace | Build your main list/home screen |
| `app/item/[id].tsx` | Rename & replace | Create detail view for your entity |
| `components/items/*` | Replace | Build components for your entity |
| `supabase/schema.sql` | Modify | Replace `items` table with your schema |
| `app.json` | Modify | Update app name, slug, bundle ID |

### Medium Priority (Modify)

These files work as-is but should be customized for your brand and features.

| File | Action | Description |
|------|--------|-------------|
| `constants/config.ts` | Modify | App name, version, feature flags |
| `constants/colors.ts` | Modify | Brand colors, theme palette |
| `app/(tabs)/search.tsx` | Modify | Search your entity instead of items |
| `app/(tabs)/_layout.tsx` | Modify | Tab bar icons, labels, order |
| `components/common/*` | Optionally modify | Adjust button styles, input variants |
| `.env.example` | Update | Add your API keys, remove unused vars |

### Low Priority (Keep)

These are production-ready infrastructure components. Keep them as-is unless you have specific needs.

| File | Action | Description |
|------|--------|-------------|
| `providers/AuthProvider.tsx` | Keep | Universal auth flow |
| `app/(auth)/*` | Keep | Login, signup, password reset |
| `app/(tabs)/settings.tsx` | Keep | Standard settings screen |
| `app/paywall.tsx` | Keep | RevenueCat subscription screen |
| `hooks/useSubscription.ts` | Keep | Subscription management |
| `hooks/useAuth.ts` | Keep | Authentication hooks |
| `lib/supabase.ts` | Keep | Supabase client configuration |
| `lib/revenuecat.ts` | Keep | Payment provider setup |

---

## Data Flow Architecture

Understanding how data flows through the app helps you customize effectively.

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                           │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    Screen Component                      │    │
│  │                   app/(tabs)/index.tsx                   │    │
│  │                                                          │    │
│  │  • Renders UI                                            │    │
│  │  • Handles user interactions                             │    │
│  │  • Displays loading/error states                         │    │
│  └──────────────────────────┬──────────────────────────────┘    │
│                             │                                    │
│                             ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                      Custom Hook                         │    │
│  │                    hooks/useItems.ts                     │    │
│  │                                                          │    │
│  │  • Manages loading/error states                          │    │
│  │  • Caches data with React Query                          │    │
│  │  • Provides CRUD operations                              │    │
│  │  • Handles optimistic updates                            │    │
│  └──────────────────────────┬──────────────────────────────┘    │
│                             │                                    │
│                             ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                     Supabase Client                      │    │
│  │                      lib/supabase.ts                     │    │
│  │                                                          │    │
│  │  • Executes database queries                             │    │
│  │  • Handles authentication                                │    │
│  │  • Manages real-time subscriptions                       │    │
│  └──────────────────────────┬──────────────────────────────┘    │
│                             │                                    │
└─────────────────────────────┼────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         SUPABASE                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │     Auth     │  │   Database   │  │   Storage    │           │
│  │              │  │  (PostgreSQL)│  │              │           │
│  │ • Users      │  │ • items      │  │ • avatars    │           │
│  │ • Sessions   │  │ • users      │  │ • uploads    │           │
│  │ • OAuth      │  │ • subs       │  │              │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

### Customization Flow

When you customize your entity, follow this flow:

1. **Define Type** (`types/item.ts`) → Replace with your entity interface
2. **Update Schema** (`supabase/schema.sql`) → Create your database table
3. **Modify Hook** (`hooks/useItems.ts`) → Update queries for your entity
4. **Build UI** (`app/(tabs)/index.tsx`, `app/item/[id].tsx`) → Create screens
5. **Create Components** (`components/items/*`) → Build reusable UI components

---

## Customization Checklist

Follow this step-by-step checklist to transform the starter kit into your app.

### Week 1: Identity & Branding

- [ ] **Update app.json** - Change app name, slug, bundle identifier
- [ ] **Update constants/config.ts** - Set APP_NAME, version, company info
- [ ] **Update constants/colors.ts** - Replace with your brand colors
- [ ] **Replace assets/images/** - Add your app icon and splash screen
- [ ] **Update .env.example** - Document your required environment variables

### Week 2: Data Model

- [ ] **Design your entity** - Sketch your data model on paper
- [ ] **Create/update types/item.ts** - Define TypeScript interfaces
- [ ] **Update supabase/schema.sql** - Write CREATE TABLE statements
- [ ] **Run schema migration** - Execute SQL in Supabase dashboard
- [ ] **Generate types** - Run `npx supabase gen types typescript`

### Week 3: Core Functionality

- [ ] **Rename hooks/useItems.ts** - Match your entity (e.g., useProducts.ts)
- [ ] **Update CRUD operations** - Modify queries for your table
- [ ] **Build components/items/** - Create ItemCard, ItemForm, ItemDetail
- [ ] **Update app/(tabs)/index.tsx** - Display your entity list
- [ ] **Update app/item/[id].tsx** - Show entity details

### Week 4: Polish & Features

- [ ] **Customize app/(tabs)/search.tsx** - Search your entity
- [ ] **Update subscription tiers** - Configure RevenueCat products
- [ ] **Remove DevModeOverlay** - Set DEV_MODE=false in config
- [ ] **Add app-specific features** - Your unique functionality
- [ ] **Test all flows** - Auth, CRUD, payments, offline mode

### Week 5: Launch Preparation

- [ ] **Create production Supabase project** - Separate from dev
- [ ] **Configure App Store Connect** - Screenshots, description
- [ ] **Run EAS build** - `eas build --platform ios`
- [ ] **Submit for review** - Upload to App Store Connect
- [ ] **Monitor TestFlight feedback** - Iterate based on testers

---

## Common Examples

Here are concrete examples of customizing the Item entity for different app types.

### Example 1: E-commerce Product App

Replace the generic Item with a Product entity.

**types/item.ts → types/product.ts**

```typescript
export interface Product {
  id: string;
  user_id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  category: 'electronics' | 'clothing' | 'home' | 'other';
  images: string[];
  inventory_count: number;
  sku: string;
  status: 'active' | 'sold_out' | 'archived';
  created_at: string;
  updated_at: string;
}

export type CreateProductInput = Omit<Product, 'id' | 'created_at' | 'updated_at'>;
export type UpdateProductInput = Partial<CreateProductInput>;
```

**supabase/schema.sql**

```sql
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  category TEXT NOT NULL,
  images TEXT[] DEFAULT '{}',
  inventory_count INTEGER DEFAULT 0,
  sku TEXT UNIQUE,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_user_id ON public.products(user_id);
CREATE INDEX idx_products_category ON public.products(category);
```

**hooks/useItems.ts → hooks/useProducts.ts**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Product, CreateProductInput } from '@/types/product';

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Product[];
    },
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateProductInput) => {
      const { data, error } = await supabase
        .from('products')
        .insert([input])
        .select()
        .single();

      if (error) throw error;
      return data as Product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
```

---

### Example 2: Fitness Workout Tracker

Replace the generic Item with a Workout entity.

**types/item.ts → types/workout.ts**

```typescript
export interface Exercise {
  name: string;
  sets: number;
  reps: number;
  weight?: number;
  duration_seconds?: number;
}

export interface Workout {
  id: string;
  user_id: string;
  name: string;
  exercises: Exercise[];
  duration_minutes: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  calories_burned?: number;
  notes?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export type CreateWorkoutInput = Omit<Workout, 'id' | 'created_at' | 'updated_at'>;
```

**supabase/schema.sql**

```sql
CREATE TABLE public.workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  exercises JSONB DEFAULT '[]',
  duration_minutes INTEGER NOT NULL,
  difficulty TEXT NOT NULL,
  calories_burned INTEGER,
  notes TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workouts_user_id ON public.workouts(user_id);
CREATE INDEX idx_workouts_completed_at ON public.workouts(completed_at);
```

---

### Example 3: Task Management App

Replace the generic Item with a Task entity.

**types/item.ts → types/task.ts**

```typescript
export interface Task {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  due_date?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in_progress' | 'done' | 'archived';
  tags: string[];
  assignee?: string;
  project_id?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export type CreateTaskInput = Omit<Task, 'id' | 'created_at' | 'updated_at' | 'completed_at'>;
export type UpdateTaskInput = Partial<CreateTaskInput>;
```

**supabase/schema.sql**

```sql
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'todo',
  tags TEXT[] DEFAULT '{}',
  assignee TEXT,
  project_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);
```

---

## Advanced Customization

### Adding New Screens

To add a new screen to the app:

1. **Create screen file** in `app/` directory:
   ```typescript
   // app/analytics.tsx
   import { View, Text } from 'react-native';

   export default function AnalyticsScreen() {
     return (
       <View>
         <Text>Analytics</Text>
       </View>
     );
   }
   ```

2. **Add to tab navigation** in `app/(tabs)/_layout.tsx`:
   ```typescript
   <Tabs.Screen
     name="analytics"
     options={{
       title: 'Analytics',
       tabBarIcon: ({ color }) => <ChartIcon color={color} />,
     }}
   />
   ```

### Customizing Theme

Edit `constants/colors.ts` to match your brand:

```typescript
export const Colors = {
  light: {
    primary: '#007AFF',      // Your primary brand color
    secondary: '#5856D6',    // Secondary accent
    background: '#FFFFFF',
    text: '#000000',
  },
  dark: {
    primary: '#0A84FF',
    secondary: '#5E5CE6',
    background: '#000000',
    text: '#FFFFFF',
  },
};
```

### Adding Third-Party Services

1. **Install package**: `npm install @segment/analytics-react-native`
2. **Create wrapper** in `lib/segment.ts`
3. **Initialize in provider** or `app/_layout.tsx`
4. **Use throughout app** via hooks or direct calls

### Removing Features

To remove unused features:

- **Remove OAuth**: Delete `components/auth/OAuthButtons.tsx`, update login screen
- **Remove Subscriptions**: Delete `paywall.tsx`, `hooks/useSubscription.ts`, remove RevenueCat
- **Remove Search**: Delete `app/(tabs)/search.tsx`, update tab bar layout

---

## Need Help?

- **Documentation**: Read QUICKSTART.md for initial setup
- **Community**: Join our Discord (coming soon)
- **Support**: Email support@everreach.app
- **Issues**: Report bugs on GitHub

Happy building! 🚀
