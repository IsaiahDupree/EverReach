# EverReach Web Deployment Guide

## Overview
This guide covers deploying the EverReach web app (Expo Web) to Vercel with the custom domain `www.everreach.app`.

---

## Prerequisites

1. **Vercel Account**: Access to https://vercel.com/isaiahduprees-projects
2. **Domain**: www.everreach.app (configured in Vercel)
3. **Environment Variables**: Production credentials ready
4. **Git Repository**: Push access to main branch

---

## Vercel Project Setup

### Project Information
- **Project Name**: `web`
- **Vercel URL**: https://vercel.com/isaiahduprees-projects/web
- **Production Domain**: www.everreach.app
- **Framework**: Expo (React Native Web)
- **Build Command**: `npx expo export:web`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### Configuration File
The project includes `vercel.json` with:
- Build configuration
- Security headers
- SPA routing (all routes → index.html)
- Static asset caching
- Environment variable references

---

## Deployment Steps

### 1. Connect Repository to Vercel

```bash
# In Vercel Dashboard:
1. Go to https://vercel.com/isaiahduprees-projects
2. Click "Add New..." → "Project"
3. Import Git Repository:
   - Repository: IsaiahDupree/rork-ai-enhanced-personal-crm
   - Branch: main (or your deployment branch)
```

### 2. Configure Build Settings

```
Framework Preset: Other
Build Command: npx expo export:web
Output Directory: dist
Install Command: npm install
Node Version: 18.x (or latest LTS)
```

### 3. Set Environment Variables

Go to Project Settings → Environment Variables and add:

#### Required Production Variables

```env
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://utasetfxiqcrnwyfforx.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=your_supabase_anon_key

# Backend API
EXPO_PUBLIC_API_URL=https://ever-reach-be.vercel.app
EXPO_PUBLIC_BACKEND_BASE_URL=https://ever-reach-be.vercel.app

# Analytics
EXPO_PUBLIC_POSTHOG_KEY=phc_v71DkKbXSBTdfrhIuWrnTgIb21tiPfx29iZNVyVBqIb
EXPO_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# Subscriptions
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_vFMuKNRSMlJOSINeBHtjivpcZNs
EXPO_PUBLIC_SUPERWALL_IOS_KEY=pk_ACiUJ9wcjUecu-9D2eK3I

# Feature Flags
EXPO_PUBLIC_SHOW_DEV_SETTINGS=false
EXPO_PUBLIC_DISABLE_ONBOARDING=false
EXPO_PUBLIC_LOCAL_ONLY=false

# Storage
EXPO_PUBLIC_SUPABASE_STORAGE_BUCKET=attachments
```

**Important**: Set these for "Production", "Preview", and "Development" environments as needed.

### 4. Configure Custom Domain

```bash
# In Vercel Dashboard:
1. Go to Project Settings → Domains
2. Add Domain: www.everreach.app
3. Configure DNS (if not already done):
   - Type: CNAME
   - Name: www
   - Value: cname.vercel-dns.com
   - TTL: Auto
4. Wait for SSL certificate provisioning (~1 minute)
```

### 5. Deploy

```bash
# Option A: Auto-deploy (recommended)
git push origin main
# Vercel will automatically build and deploy

# Option B: Manual deploy via Vercel CLI
npm install -g vercel
vercel --prod

# Option C: Deploy via Vercel Dashboard
# Click "Deployments" → "Deploy" → Select branch
```

---

## Build Configuration

### Package.json Scripts

Add these scripts if not present:

```json
{
  "scripts": {
    "web": "expo start --web",
    "build:web": "expo export:web",
    "deploy": "npm run build:web && vercel --prod"
  }
}
```

### Expo Configuration (app.json)

Ensure web configuration is set:

```json
{
  "expo": {
    "web": {
      "bundler": "metro",
      "output": "static",
      "favicon": "./assets/favicon.png"
    }
  }
}
```

---

## Post-Deployment Verification

### 1. Check Production URL
Visit https://www.everreach.app and verify:
- ✅ App loads without errors
- ✅ Authentication works (Supabase)
- ✅ API calls succeed (backend)
- ✅ Navigation works (all routes)
- ✅ Styles render correctly

### 2. Test Critical Flows
- [ ] Sign up / Sign in
- [ ] Add a contact
- [ ] View contacts list
- [ ] Navigate between tabs
- [ ] Settings page loads
- [ ] Warmth calculations display

### 3. Check Browser Console
Look for:
- ❌ No CORS errors
- ❌ No 404s for assets
- ❌ No console errors
- ✅ Analytics tracking works

### 4. Performance Check
Use Lighthouse audit:
- Performance: >90
- Accessibility: >90
- Best Practices: >90
- SEO: >90

---

## CI/CD Pipeline

### Automatic Deployments

Vercel automatically deploys on:
- **Production**: Pushes to `main` branch → www.everreach.app
- **Preview**: PRs and other branches → temporary URLs

### Deployment Status

Monitor at: https://vercel.com/isaiahduprees-projects/web/deployments

---

## Rollback Procedure

### If deployment fails or has issues:

```bash
# Option 1: Via Vercel Dashboard
1. Go to Deployments
2. Find previous working deployment
3. Click "..." → "Promote to Production"

# Option 2: Via Git
git revert <commit-hash>
git push origin main

# Option 3: Via Vercel CLI
vercel rollback
```

---

## Troubleshooting

### Build Fails

**Error**: "Module not found"
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build:web
```

**Error**: "expo export:web failed"
```bash
# Check Expo CLI version
npx expo --version
# Update if needed
npm install -g expo-cli@latest
```

### Routing Issues

**Problem**: 404 on page refresh

**Solution**: Already handled in `vercel.json`:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### Environment Variables Not Loading

**Solution**:
1. Check variables are set in Vercel Dashboard
2. Redeploy to pick up new variables
3. Prefix must be `EXPO_PUBLIC_` for web access

### CORS Errors

**Solution**: Ensure backend (ever-reach-be.vercel.app) has correct CORS headers:
```javascript
Access-Control-Allow-Origin: https://www.everreach.app
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH
Access-Control-Allow-Headers: Content-Type, Authorization
```

---

## Monitoring & Maintenance

### Analytics
- **PostHog Dashboard**: https://us.i.posthog.com
- Monitor: Page views, user sessions, feature usage

### Error Tracking
- Check Vercel deployment logs
- Monitor PostHog for console errors
- Review Supabase logs for API issues

### Performance
- Vercel Analytics (auto-enabled)
- Web Vitals tracking
- Bundle size monitoring

---

## Domain Configuration

### Current Setup
- **Primary Domain**: www.everreach.app
- **SSL**: Automatic (Let's Encrypt via Vercel)
- **DNS Provider**: (Your domain registrar)

### DNS Records Needed

```
Type    Name    Value                   TTL
CNAME   www     cname.vercel-dns.com    Auto
```

### Optional: Redirect apex domain

If you want `everreach.app` to redirect to `www.everreach.app`:

```
Type    Name    Value                   TTL
A       @       76.76.21.21            Auto
```

Then in Vercel, add both domains and set `www.everreach.app` as primary.

---

## Security Checklist

- [x] HTTPS enabled (automatic via Vercel)
- [x] Security headers configured in `vercel.json`
- [x] API keys use `EXPO_PUBLIC_` prefix (safe for web)
- [x] Sensitive keys kept server-side only
- [x] CORS properly configured on backend
- [x] CSP headers set (if needed)
- [x] Dev settings disabled in production

---

## Support

### Vercel Issues
- Dashboard: https://vercel.com/isaiahduprees-projects/web
- Documentation: https://vercel.com/docs
- Status: https://www.vercel-status.com

### Expo Web Issues
- Documentation: https://docs.expo.dev/workflow/web/
- GitHub: https://github.com/expo/expo/issues

---

## Changelog

### November 2, 2025
- ✅ Created deployment configuration
- ✅ Documented previous frontend (feat/e2e-test-infra)
- ✅ Set up Vercel project structure
- ✅ Configured custom domain www.everreach.app
- ✅ Added production environment variables
- ✅ Prepared for first deployment
