# Deploy e2e Branch to Vercel

## Overview
Deploy the `e2e` branch directly to production at www.everreach.app without merging to main.

---

## Option 1: Change Production Branch in Vercel (Recommended)

### Steps:
1. Go to https://vercel.com/isaiahduprees-projects/web
2. Click **Settings** → **Git**
3. Under **Production Branch**, change from `main` to `e2e`
4. Click **Save**
5. Go to **Deployments** tab
6. Vercel will auto-deploy from `e2e` on next push

### Result:
- Every push to `e2e` → deploys to www.everreach.app
- Main branch won't trigger deployments

---

## Option 2: Manual Deploy via Vercel CLI

### Install Vercel CLI:
```bash
npm install -g vercel
```

### Deploy from e2e branch:
```bash
# Make sure you're on e2e branch
git checkout e2e
git pull origin e2e

# Deploy to production
vercel --prod

# Follow prompts:
# - Link to existing project: Yes
# - Choose: isaiahduprees-projects/web
# - Deploy: Yes
```

### Result:
- Deploys current e2e branch to production
- One-time manual deployment

---

## Option 3: Deploy Specific Branch via Vercel Dashboard

### Steps:
1. Go to https://vercel.com/isaiahduprees-projects/web
2. Click **Deployments** tab
3. Click **"..."** menu on a deployment
4. Select **"Redeploy"**
5. Choose branch: `e2e`
6. Click **"Deploy"**
7. Once complete, click **"..."** → **"Promote to Production"**

### Result:
- Deploys e2e branch to production
- Manual process for each deployment

---

## Recommended: Change Production Branch

Since you're actively developing on `e2e`, I recommend **Option 1**:

### Quick Steps:
1. Open: https://vercel.com/isaiahduprees-projects/web/settings/git
2. Change Production Branch: `main` → `e2e`
3. Save changes
4. Push to e2e triggers automatic deployment

---

## Current Status

✅ e2e branch is up to date on GitHub
✅ All changes committed and pushed
✅ Ready to deploy to Vercel

**Next Action**: Choose deployment option above

---

## Environment Variables

Make sure these are set in Vercel Dashboard:
- `EXPO_PUBLIC_SHOW_DEV_SETTINGS=false` (for production)
- All other variables from `.env`

Go to: https://vercel.com/isaiahduprees-projects/web/settings/environment-variables

---

## Verify Deployment

After deploying:
1. Visit www.everreach.app
2. Check functionality:
   - Login/signup works
   - Contacts load
   - Navigation works
   - API calls succeed
3. Check browser console for errors
4. Test on mobile browser

---

## Rollback

If needed, you can rollback:
1. Go to Deployments
2. Find previous working deployment
3. Click "..." → "Promote to Production"
