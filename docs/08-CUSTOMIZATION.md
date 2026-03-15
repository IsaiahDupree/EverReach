# Customization Guide

## Make the App Kit Your Own

This guide shows you how to rebrand, customize, and extend the App Kit for your specific product.

---

## Quick Rebrand Checklist

- [ ] Change app name in `app.json`
- [ ] Update bundle ID / package name
- [ ] Replace app icons
- [ ] Update splash screen
- [ ] Change color theme
- [ ] Update company info in legal pages
- [ ] Replace logo images

---

## Part 1: App Identity

### Update app.json

```json
{
  "expo": {
    "name": "Your App Name",
    "slug": "your-app-name",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#YOUR_COLOR"
    },
    "ios": {
      "bundleIdentifier": "com.yourcompany.yourapp",
      "supportsTablet": true
    },
    "android": {
      "package": "com.yourcompany.yourapp",
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#YOUR_COLOR"
      }
    }
  }
}
```

### App Icons Required

| Platform | Size | File |
|----------|------|------|
| iOS | 1024x1024 | `icon.png` |
| Android | 1024x1024 | `adaptive-icon.png` |
| Web | 512x512 | `favicon.png` |

Use [Icon Kitchen](https://icon.kitchen) or [App Icon Generator](https://appicon.co) to generate all sizes.

---

## Part 2: Theme & Colors

### Define Your Color Palette

```typescript
// constants/colors.ts
export const Colors = {
  light: {
    primary: '#3B82F6',      // Your brand color
    primaryDark: '#2563EB',
    secondary: '#8B5CF6',
    background: '#FFFFFF',
    surface: '#F3F4F6',
    text: '#111827',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    error: '#EF4444',
    success: '#10B981',
    warning: '#F59E0B',
  },
  dark: {
    primary: '#60A5FA',
    primaryDark: '#3B82F6',
    secondary: '#A78BFA',
    background: '#111827',
    surface: '#1F2937',
    text: '#F9FAFB',
    textSecondary: '#9CA3AF',
    border: '#374151',
    error: '#F87171',
    success: '#34D399',
    warning: '#FBBF24',
  },
};
```

### Tailwind Configuration (NativeWind)

```javascript
// tailwind.config.js
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',  // Main brand color
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
```

---

## Part 3: Typography

### Custom Fonts

1. Add font files to `assets/fonts/`
2. Load in app entry:

```typescript
// app/_layout.tsx
import { useFonts } from 'expo-font';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Inter-Regular': require('../assets/fonts/Inter-Regular.ttf'),
    'Inter-Medium': require('../assets/fonts/Inter-Medium.ttf'),
    'Inter-SemiBold': require('../assets/fonts/Inter-SemiBold.ttf'),
    'Inter-Bold': require('../assets/fonts/Inter-Bold.ttf'),
  });

  if (!fontsLoaded) {
    return null;
  }

  return <Stack />;
}
```

---

## Part 4: Feature Toggles

### Enable/Disable Features

```typescript
// constants/features.ts
export const Features = {
  // Authentication
  enableEmailAuth: true,
  enableGoogleAuth: true,
  enableAppleAuth: true,
  enableMagicLink: false,
  
  // Core Features
  enableVoiceNotes: true,
  enableAnalytics: true,
  enableNotifications: true,
  
  // Monetization
  enableSubscriptions: true,
  enableInAppPurchases: true,
  freeTrialDays: 7,
  
  // Development
  enableDebugMode: __DEV__,
  enableMockData: false,
};
```

### Using Feature Flags

```tsx
import { Features } from '@/constants/features';

function SettingsScreen() {
  return (
    <View>
      {Features.enableVoiceNotes && (
        <VoiceNotesSection />
      )}
      
      {Features.enableSubscriptions && (
        <SubscriptionSection />
      )}
    </View>
  );
}
```

---

## Part 5: Navigation Structure

### Modify Tab Navigation

```typescript
// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { Home, Users, MessageSquare, Settings } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Home color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="contacts"
        options={{
          title: 'Contacts',
          tabBarIcon: ({ color }) => <Users color={color} size={24} />,
        }}
      />
      {/* Add or remove tabs as needed */}
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <Settings color={color} size={24} />,
        }}
      />
    </Tabs>
  );
}
```

---

## Part 6: Database Customization

### Add New Tables

```sql
-- supabase/migrations/xxx_add_custom_table.sql

CREATE TABLE public.your_custom_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Your fields
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.your_custom_table ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "Users can CRUD own records"
  ON public.your_custom_table FOR ALL
  USING (auth.uid() = user_id);
```

### Generate TypeScript Types

```bash
supabase gen types typescript --project-id your-project-ref > types/database.ts
```

---

## Part 7: API Customization

### Add New Endpoint

```typescript
// backend-vercel/app/api/your-feature/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  // Your logic here
  return NextResponse.json({ data: [] });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  // Your logic here
  return NextResponse.json({ success: true });
}
```

---

## Part 8: Component Library

### Create Custom Components

```tsx
// components/ui/CustomButton.tsx
import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { cn } from '@/lib/utils';

interface CustomButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  loading?: boolean;
  disabled?: boolean;
}

export function CustomButton({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
}: CustomButtonProps) {
  const variants = {
    primary: 'bg-primary-500 text-white',
    secondary: 'bg-gray-200 text-gray-900',
    outline: 'border border-primary-500 text-primary-500',
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      className={cn(
        'py-4 px-6 rounded-lg items-center justify-center',
        variants[variant],
        disabled && 'opacity-50'
      )}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? 'white' : '#3B82F6'} />
      ) : (
        <Text className={cn(
          'font-semibold',
          variant === 'primary' ? 'text-white' : 'text-gray-900'
        )}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}
```

---

## Examples Directory

The `examples/` folder contains reference implementations:

```
examples/
├── custom-auth-flow/      # Custom login screens
├── additional-features/   # Feature module templates
├── payment-variations/    # Different paywall designs
└── theme-examples/        # Color scheme examples
```

---

## Need More Customization?

- 📖 Check component source code in `components/`
- 💬 Ask in [Discord Community](#)
- 📧 Contact support for custom development
