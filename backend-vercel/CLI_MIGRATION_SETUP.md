# 🚀 CLI Migration Setup Guide

## 📋 What You Need

### 1. Supabase Project Info
- ✅ **Project Reference:** `utasetfxiqcrnwyfforx` (you have this)
- ❓ **Database Password:** Get from Supabase Dashboard
- ❓ **Access Token:** Generate from Supabase Dashboard

### 2. Get Your Credentials

#### A. Database Password
1. Go to: https://supabase.com/dashboard/project/utasetfxiqcrnwyfforx/settings/database
2. Scroll to "Database password"
3. If you don't have it, click "Reset database password"
4. **Save it securely!**

#### B. Access Token
1. Go to: https://supabase.com/dashboard/account/tokens
2. Click "Generate new token"
3. Name it: "CLI Access"
4. Copy the token (starts with `sbp_...`)
5. **Save it securely!**

### 3. Add to Your `.env` File

Add these lines to `backend-vercel/.env`:

```bash
# Supabase CLI Credentials
SUPABASE_PROJECT_REF=utasetfxiqcrnwyfforx
SUPABASE_DB_PASSWORD=your-database-password-here
SUPABASE_ACCESS_TOKEN=sbp_your_access_token_here
```

---

## 🎯 Three Ways to Run Migrations

### **Option 1: Using PowerShell Script (Easiest)**

After adding credentials to `.env`:

```powershell
# Run a specific migration
.\run-migration-with-env.ps1 migrations/fix-missing-functions.sql

# Run all migrations in order
.\run-migration-with-env.ps1 migrations/public-api-system.sql
.\run-migration-with-env.ps1 migrations/public-api-improvements.sql
.\run-migration-with-env.ps1 migrations/enable-e2e-test-data.sql
```

### **Option 2: Using Supabase CLI Directly**

```bash
# One-time setup: Link your project
supabase link --project-ref utasetfxiqcrnwyfforx
# (It will prompt for access token and password)

# Run migrations
supabase db push --file migrations/fix-missing-functions.sql
```

### **Option 3: Using psql (If Installed)**

```bash
# Get connection string from Supabase Dashboard
# Settings -> Database -> Connection string -> Direct connection

psql "postgresql://postgres.utasetfxiqcrnwyfforx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres" -f migrations/fix-missing-functions.sql
```

---

## 🔧 Install Required Tools

### Supabase CLI
```bash
# Already installed! (v2.22.12)
# To update:
npm install -g supabase@latest
```

### PostgreSQL Client (psql) - Optional but Recommended
**Windows:**
- Download: https://www.postgresql.org/download/windows/
- Or use: `choco install postgresql`
- Or use: `scoop install postgresql`

---

## ✅ Quick Test

After setup, test the connection:

```bash
node test-supabase-connection.js
```

**Expected output:**
```
✅ organizations: EXISTS
✅ users: EXISTS
✅ people: EXISTS
✅ interactions: EXISTS
✅ api_keys: EXISTS
✅ webhooks: EXISTS
✅ audit_trail: EXISTS
✅ verify_api_key(): EXISTS
✅ has_scope(): EXISTS
✅ emit_webhook_event(): EXISTS
```

---

## 📝 Migration Files to Run

Run these in order:

1. ✅ **Base Schema** - `supabase-future-schema.sql` (already done)
2. ✅ **API System** - `migrations/public-api-system.sql` (already done)
3. ❌ **Fix Functions** - `migrations/fix-missing-functions.sql` (NEED TO RUN)
4. ⚪ **Improvements** - `migrations/public-api-improvements.sql` (optional)
5. ⚪ **E2E Tests** - `migrations/enable-e2e-test-data.sql` (optional)

---

## 🚨 Troubleshooting

### "Access token not found"
- Make sure you generated a token from: https://supabase.com/dashboard/account/tokens
- Token should start with `sbp_`

### "Password authentication failed"
- Reset your database password in Supabase Dashboard
- Settings → Database → Reset database password

### "psql: command not found"
- Install PostgreSQL client
- Or use Supabase CLI method instead

### "Migration failed"
- Check the error message
- Try running in Supabase SQL Editor instead
- https://supabase.com/dashboard/project/utasetfxiqcrnwyfforx/sql

---

## 🎉 Next Steps

After running migrations:

1. **Verify:** `node test-supabase-connection.js`
2. **Update .env:** Set `TEST_SKIP_E2E=false`
3. **Run E2E tests:** `npm run test:e2e:public-api`

---

## 📚 Resources

- Supabase CLI Docs: https://supabase.com/docs/guides/cli
- PostgreSQL Download: https://www.postgresql.org/download/
- Your Project Dashboard: https://supabase.com/dashboard/project/utasetfxiqcrnwyfforx
