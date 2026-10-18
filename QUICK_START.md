# Quick Start Guide

Get the EverReach App Kit running in **under 15 minutes**. This guide covers the fastest path from clone to running app.

## Prerequisites

Before you begin, make sure you have:

- **Node.js 18+** - [Download here](https://nodejs.org)
- **npm** - Included with Node.js
- **Git** - [Download here](https://git-scm.com)
- **Supabase account** - [Sign up free](https://supabase.com)
- **Code editor** - VS Code recommended

## Choose Your Path

Pick ONE of these options based on what you want to build:

- **Option A**: Full Stack (iOS + Backend + Web) - Takes ~15 minutes
- **Option B**: Single Kit Only - Takes ~5 minutes

---

## Option A: Full Stack Setup

### Step 1: Clone and Install (2 minutes)

```bash
# Clone the repository
git clone https://github.com/IsaiahDupree/EverReach.git
cd EverReach/app-kit

# Install all dependencies
cd ios-starter && npm install && cd ..
cd backend-kit && npm install && cd ..
cd web-kit && npm install && cd ..
```

### Step 2: Set Up Supabase (5 minutes)

1. Create a new project at [supabase.com/dashboard](https://supabase.com/dashboard)
2. Go to **Project Settings** → **API** and copy:
   - `Project URL` (looks like: `https://xxx.supabase.co`)
   - `anon public` key (starts with `eyJ...`)
   - `service_role` key (starts with `eyJ...`)
3. Run the database schema:
   - Go to **SQL Editor** in Supabase
   - Copy contents from `backend-kit/supabase/schema.sql`
   - Paste and click **Run**

### Step 3: Configure Environment Variables (3 minutes)

**Backend:**
```bash
cd backend-kit
cp .env.example .env.local
```

Edit `backend-kit/.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

**Web:**
```bash
cd ../web-kit
cp .env.example .env.local
```

Edit `web-kit/.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

**iOS:**
```bash
cd ../ios-starter
cp .env.example .env
```

Edit `ios-starter/.env`:
```env
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### Step 4: Start Development Servers (2 minutes)

Open 3 terminal windows and run:

**Terminal 1 - Backend:**
```bash
cd backend-kit
npm run dev
```
Should see: `Ready on http://localhost:3000`

**Terminal 2 - Web:**
```bash
cd web-kit
npm run dev
```
Should see: `Ready on http://localhost:3001`

**Terminal 3 - iOS:**
```bash
cd ios-starter
npm start
```
Should see: QR code and Metro bundler running

### Step 5: Verify Everything Works (3 minutes)

Use this checklist:

- [ ] Backend health check: Visit `http://localhost:3000/api/health`
  - Should return: `{"status": "ok"}`
- [ ] Web app loads: Visit `http://localhost:3001`
  - Should see landing page
- [ ] Web login works: Go to `http://localhost:3001/login`
  - Try signing up with email
- [ ] iOS app loads: Scan QR code with Expo Go app
  - Should see login screen
- [ ] Database connection: Check Supabase dashboard → Table Editor
  - Should see `users`, `items`, `subscriptions` tables

---

## Option B: Single Kit Setup

Choose the kit you need and follow these condensed steps:

### iOS Only

```bash
cd ios-starter
npm install
cp .env.example .env
# Edit .env with Supabase credentials
npm start
```

See [ios-starter/README.md](./ios-starter/README.md) for details.

### Backend Only

```bash
cd backend-kit
npm install
cp .env.example .env.local
# Edit .env.local with Supabase credentials
npm run dev
```

See [backend-kit/README.md](./backend-kit/README.md) for details.

### Web Only

```bash
cd web-kit
npm install
cp .env.example .env.local
# Edit .env.local with Supabase credentials
npm run dev
```

See [web-kit/README.md](./web-kit/README.md) for details.

---

## Troubleshooting

### "Cannot connect to database"
- Verify your Supabase URL and keys in `.env` files
- Check that you ran the schema SQL in Supabase
- Ensure your Supabase project is active (not paused)

### "Port already in use"
- Backend default: `3000` - Change in `package.json` scripts
- Web default: `3001` - Change in `package.json` scripts
- Kill existing processes: `lsof -ti:3000 | xargs kill`

### "Module not found"
- Run `npm install` in the kit directory
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`

### iOS app won't load
- Make sure Metro bundler is running (you'll see "Logs" output)
- Try clearing cache: `npm start -- --clear`
- On iOS: Shake device → Reload

### Environment variables not working
- Restart dev server after editing `.env` files
- Check for typos in variable names
- Ensure no extra spaces or quotes

---

## Next Steps

Now that everything is running:

1. **Customize your app**: See [DEVELOPER_HANDOFF.md](./DEVELOPER_HANDOFF.md) for full customization guide
2. **Deploy to production**: Each kit has deployment instructions in its README
3. **Add payment processing**:
   - Stripe for web: [web-kit/README.md](./web-kit/README.md#payments)
   - RevenueCat for iOS: [ios-starter/README.md](./ios-starter/README.md#payments)

## Support

- **Documentation**: Each kit has detailed README files
- **Issues**: [GitHub Issues](https://github.com/IsaiahDupree/EverReach/issues)
- **PRDs**: See `PRD_*.md` files for complete technical specifications

---

**Time check**: You should be done in 15 minutes or less. If you hit issues, check Troubleshooting above or open an issue.
