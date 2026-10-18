# Custom Domain Setup for www.everreach.app

## ✅ Step 1: Code Changes (DONE)

- [x] Added `vercel.json` with CORS headers
- [x] Committed changes

## 📋 Step 2: Add Domain in Vercel (Do this now)

1. **Go to**: https://vercel.com/isaiahduprees-projects/web/settings/domains

2. **Add domain**: `www.everreach.app`

3. **Vercel will show DNS records needed**

## 🌐 Step 3: Configure DNS (Your Domain Registrar)

After adding domain in Vercel, you'll get DNS records like:

### Option A: CNAME (Recommended)
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

### Option B: A Record
```
Type: A
Name: www
Value: 76.76.21.21
```

**Where to add these:**
- Go to your domain registrar (where you bought everreach.app)
- Find DNS settings
- Add the records Vercel provided

## ⏱️ Step 4: Wait for DNS Propagation

- **Typical time**: 5-30 minutes
- **Max time**: 48 hours
- **Check progress**: https://www.whatsmydns.net/#CNAME/www.everreach.app

## 🔒 Step 5: SSL Certificate (Automatic)

Vercel automatically provisions SSL certificates via Let's Encrypt once DNS is verified.

## ✅ Step 6: Test

Once DNS is propagated:

1. Visit: https://www.everreach.app
2. Should redirect to your Next.js app
3. Login should work
4. No CORS errors

## 🚨 Troubleshooting

### "Domain not verified"
- Wait 5-10 more minutes
- Check DNS records are correct
- Use `nslookup www.everreach.app` to verify

### "SSL certificate error"
- Wait for Vercel to provision SSL (automatic)
- Can take 5-10 minutes after DNS verification

### "CORS error"
- Already fixed with vercel.json ✅
- Make sure you redeployed after adding vercel.json

## 📌 Current Status

- **Code**: ✅ Ready (CORS headers added)
- **Vercel Domain**: ⏳ Pending (add domain in dashboard)
- **DNS Configuration**: ⏳ Pending (configure after step 2)
- **SSL Certificate**: ⏳ Automatic (after DNS verification)

---

## Quick Commands

**Push changes:**
```bash
git push origin feat/backend-vercel-only-clean
```

**Redeploy:**
```bash
cd web
vercel --prod
```

**Check deployment:**
```bash
vercel ls
```

---

## Alternative: Redirect apex (everreach.app → www.everreach.app)

If you also want the apex domain to work:

1. Add `everreach.app` in Vercel domains
2. Enable "Redirect to www" in Vercel settings
3. Add DNS records for apex domain too
