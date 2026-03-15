# Quick Start Guide

## Get Running in 15 Minutes

This is the fast track to getting your app running. For detailed explanations, see the [full documentation](./docs/).

---

## Prerequisites

- Node.js 18+
- Git
- Expo CLI: `npm install -g expo-cli`
- Supabase account (free): [supabase.com](https://supabase.com)

---

## Step 1: Copy Templates (2 min)

```bash
# Copy template files to your project root
cp -r templates/* ./

# Your structure should now look like:
# ├── app/
# ├── components/
# ├── constants/
# ├── services/
# └── types/
```

---

## Step 2: Install Dependencies (2 min)

```bash
npm install

# Or with bun
bun install
```

---

## Step 3: Supabase Setup (5 min)

1. Create project at [supabase.com](https://supabase.com)
2. Get your keys from Settings → API
3. Create `.env`:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...your_anon_key
```

4. Run SQL in Supabase SQL Editor:

```sql
-- Create items table (replace with your data)
CREATE TABLE public.items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "Users can CRUD own items"
ON public.items FOR ALL
USING (auth.uid() = user_id);
```

---

## Step 4: Run the App (1 min)

```bash
npx expo start
```

Press:
- `i` for iOS simulator
- `a` for Android emulator
- `w` for web browser

---

## Step 5: See Dev Mode

When the app runs, you'll see a **purple floating button** in the corner. Tap it to see the customization checklist!

---

## What to Customize Next

1. **App name** → `constants/config.ts`
2. **Data model** → `types/models.ts` (replace `Item` with your entity)
3. **API calls** → `services/api.ts` (update table names)
4. **Main screen** → `app/(tabs)/index.tsx` (replace item list)

---

## Full Documentation

| Guide | Description |
|-------|-------------|
| [01-GETTING-STARTED](./docs/01-GETTING-STARTED.md) | Detailed setup |
| [02-ARCHITECTURE](./docs/02-ARCHITECTURE.md) | System design |
| [03-BACKEND-SETUP](./docs/03-BACKEND-SETUP.md) | API configuration |
| [04-DATABASE](./docs/04-DATABASE.md) | Schema & queries |
| [05-AUTHENTICATION](./docs/05-AUTHENTICATION.md) | Auth flows |
| [06-PAYMENTS](./docs/06-PAYMENTS.md) | Stripe & RevenueCat |
| [07-DEPLOYMENT](./docs/07-DEPLOYMENT.md) | App Store & web |
| [08-CUSTOMIZATION](./docs/08-CUSTOMIZATION.md) | Rebrand guide |

---

## Need Help?

- 📖 Read the [Troubleshooting Guide](./docs/09-TROUBLESHOOTING.md)
- 💬 Join [Discord Community](#)
- 📧 Email support@everreach.app
