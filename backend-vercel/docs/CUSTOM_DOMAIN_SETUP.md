# Custom Domain Setup for Backend

## 🎯 Goal

Attach a custom domain to your backend: `ever-reach-be.vercel.app` → `api.everreach.app`

---

## 📋 Prerequisites

- ✅ You own `everreach.app` domain
- ✅ Backend deployed to Vercel: `ever-reach-be.vercel.app`
- ✅ Access to Vercel dashboard
- ✅ Access to domain DNS settings (where you purchased everreach.app)

---

## 🚀 Option 1: Via Vercel Dashboard (Recommended - 5 minutes)

### **Step 1: Open Vercel Project Settings**

1. Go to: https://vercel.com/isaiahduprees-projects/backend-vercel
2. Click **Settings** tab
3. Click **Domains** in left sidebar

### **Step 2: Add Custom Domain**

1. In the "Add Domain" field, enter: `api.everreach.app`
2. Click **Add**
3. Vercel will check if you own the domain

### **Step 3: Configure DNS**

Vercel will show you one of these options:

#### **Option A: CNAME Record (Recommended)**
```
Type:  CNAME
Name:  api
Value: cname.vercel-dns.com
TTL:   Auto
```

#### **Option B: A Records (Alternative)**
```
Type:  A
Name:  api
Value: 76.76.21.21
TTL:   Auto

Type:  A  
Name:  api
Value: 76.76.21.98
TTL:   Auto
```

### **Step 4: Add DNS Records**

**Where you bought everreach.app** (Namecheap, GoDaddy, Cloudflare, etc.):

1. Log into your domain provider
2. Go to DNS settings for `everreach.app`
3. Add the CNAME record from above
4. Save changes

### **Step 5: Wait for Propagation**

- DNS changes can take **1-60 minutes**
- Vercel will automatically detect when it's ready
- SSL certificate will be automatically issued (Let's Encrypt)

### **Step 6: Verify**

Once ready, test:
```bash
curl https://api.everreach.app/api/health
```

Expected: `{"status":"ok"}`

---

## 🖥️ Option 2: Via Vercel CLI (Alternative)

```bash
# Navigate to project
cd backend-vercel

# Add domain
vercel domains add api.everreach.app

# Vercel will show you DNS records to add
# Follow the instructions displayed

# Verify domain
vercel domains ls
```

---

## 📝 DNS Provider Examples

### **If using Cloudflare:**

1. Go to: https://dash.cloudflare.com
2. Select `everreach.app` domain
3. Click **DNS** → **Records**
4. Click **Add record**
5. Settings:
   - Type: `CNAME`
   - Name: `api`
   - Target: `cname.vercel-dns.com`
   - Proxy status: **DNS only** (gray cloud)
   - TTL: Auto
6. Click **Save**

### **If using Namecheap:**

1. Go to: https://ap.www.namecheap.com/domains/list/
2. Click **Manage** next to everreach.app
3. Go to **Advanced DNS** tab
4. Click **Add New Record**
5. Settings:
   - Type: `CNAME Record`
   - Host: `api`
   - Value: `cname.vercel-dns.com`
   - TTL: Automatic
6. Click **Save**

### **If using GoDaddy:**

1. Go to: https://dcc.godaddy.com/domains
2. Click on `everreach.app`
3. Click **DNS** → **Manage Zones**
4. Click **Add** under DNS Records
5. Settings:
   - Type: `CNAME`
   - Name: `api`
   - Value: `cname.vercel-dns.com`
   - TTL: 1 Hour
6. Click **Save**

---

## ✅ Post-Setup Checklist

Once the domain is active:

### **1. Update Environment Variables**

No changes needed! Your backend will automatically work on both:
- ✅ `https://ever-reach-be.vercel.app`
- ✅ `https://api.everreach.app`

### **2. Update Frontend API Calls**

Update your frontend to use the new domain:

```typescript
// Old
const API_BASE = 'https://ever-reach-be.vercel.app';

// New
const API_BASE = 'https://api.everreach.app';
```

**Files to update:**
- Mobile app: `lib/api.ts` or environment config
- Web app: `.env.production`
- Dashboard: Environment variables

### **3. Update CORS Settings**

Your backend already allows all origins, but you can tighten it:

```typescript
// backend-vercel/lib/cors.ts
const allowedOrigins = [
  'https://everreach.app',
  'https://www.everreach.app',
  'https://api.everreach.app',
  'http://localhost:8081', // Expo dev
  'http://localhost:3000', // Next.js dev
];
```

### **4. Update Documentation**

Update docs to reference new URL:
- API documentation
- Integration guides
- Client examples

---

## 🔐 SSL Certificate

**Automatic!** Vercel will:
- ✅ Issue SSL certificate via Let's Encrypt
- ✅ Auto-renew before expiration
- ✅ Force HTTPS (redirect HTTP → HTTPS)
- ✅ Enable HTTP/2

---

## 🐛 Troubleshooting

### **"Domain not verified"**

**Cause:** DNS records not propagated yet  
**Fix:** Wait 10-60 minutes, then click "Refresh" in Vercel

### **"Invalid Configuration"**

**Cause:** Wrong DNS record  
**Fix:** Double-check CNAME value is exactly: `cname.vercel-dns.com`

### **"404 Not Found" on new domain**

**Cause:** Domain not fully connected  
**Fix:** Check Vercel dashboard shows domain as "Active"

### **"SSL Certificate Pending"**

**Cause:** Vercel is issuing certificate  
**Fix:** Wait 5-10 minutes, it's automatic

### **Check DNS Propagation**

Use these tools to check if DNS is working:
- https://dnschecker.org
- https://www.whatsmydns.net

Enter: `api.everreach.app`

---

## 📊 Recommended Setup

```
Frontend (User-facing):
- https://everreach.app            → Web app
- https://www.everreach.app        → Web app (www redirect)

Backend (API):
- https://api.everreach.app        → Backend API
- https://ever-reach-be.vercel.app → Backup/fallback

Dashboard (Internal):
- https://dashboard.everreach.app  → Admin dashboard
  OR
- https://api.everreach.app/dashboard → Dashboard under API
```

---

## 🎯 Benefits of Custom Domain

✅ **Professional:** `api.everreach.app` vs `ever-reach-be.vercel.app`  
✅ **Branding:** Consistent domain across all services  
✅ **Flexibility:** Can move to different host without breaking clients  
✅ **SEO:** Better for API documentation  
✅ **Trust:** Users trust custom domains more  

---

## 📝 Summary

**Quick Steps:**
1. Go to Vercel project → Settings → Domains
2. Add `api.everreach.app`
3. Copy DNS records shown
4. Add CNAME to your DNS provider
5. Wait 10-60 minutes
6. Test: `curl https://api.everreach.app/api/health`
7. Update frontend to use new URL

**That's it!** Your backend will be live at `https://api.everreach.app` 🎉

---

## 🔗 Quick Links

- **Vercel Domains:** https://vercel.com/isaiahduprees-projects/backend-vercel/settings/domains
- **Vercel Docs:** https://vercel.com/docs/concepts/projects/domains
- **DNS Checker:** https://dnschecker.org
