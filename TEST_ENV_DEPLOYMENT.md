# Test Environment Variables Deployment

## 🧪 Quick Test Commands

### **Test Local Development**
```bash
node test/test-env-deployment.mjs http://localhost:3001
```

### **Test Vercel Deployment**
```bash
# Replace with your actual Vercel URL
node test/test-env-deployment.mjs https://backend-vercel-ozkif4pug-isaiahduprees-projects.vercel.app
```

### **Or just check the endpoint directly**
Visit in browser:
```
https://your-domain.vercel.app/api/test/env-check
```

---

## 📊 What Gets Tested

The test checks for **25 environment variables** across 10 categories:

### ✅ Required Variables (20)
- **Supabase** (3): URL, Service Role Key, Anon Key
- **OpenAI** (1): API Key
- **Twilio** (3): Account SID, Auth Token, Phone Number
- **Resend** (1): API Key
- **PostHog** (2): Key, Host
- **WhatsApp** (2): Access Token, Phone Number ID
- **Instagram** (3): App ID, App Secret, Access Token
- **Facebook Ads** (3): App ID, Account ID, Access Token
- **Meta** (2): App Secret, Verify Token
- **Cron** (1): Secret

### 📝 Optional Variables (3)
- **Resend Webhook Secret** (add after webhook creation)
- **Stripe Webhook Secret** (if using payments)
- **Clay Webhook Secret** (if using async enrichment)

---

## 📖 Understanding the Results

### ✅ **Success Output**
```
Status: ✅ SUCCESS
Message: All required environment variables are configured!
Total Variables: 25
✅ Configured: 22 (88%)
❌ Missing: 3
📝 Optional: 3
🔴 Required Missing: 0
```
**Meaning**: All required variables are set, deployment is ready!

### ⚠️ **Warning Output**
```
Status: ⚠️ WARNING
Message: 2 required environment variable(s) missing
🔴 REQUIRED - TWILIO_AUTH_TOKEN (Twilio)
🔴 REQUIRED - RESEND_API_KEY (Resend)
```
**Meaning**: Some required variables are missing, add them and redeploy.

---

## 🔧 How to Fix Missing Variables

### **If variables are missing:**

1. **Check Vercel Dashboard**
   - Go to: https://vercel.com/your-project/settings/environment-variables
   - Verify each missing variable is added
   - Make sure it's enabled for "Production" environment

2. **Add missing variables**
   - Use `ENV_QUICK_COPY.txt` as reference
   - Copy the variable name and value
   - Add to Vercel dashboard
   - Click "Save"

3. **Redeploy**
   ```bash
   cd backend-vercel
   vercel --prod
   ```

4. **Test again**
   ```bash
   node test/test-env-deployment.mjs https://your-domain.vercel.app
   ```

---

## 🚨 Common Issues

### **Issue: "fetch failed" or "ECONNREFUSED"**
**Solution**: Backend is not running
```bash
# Start local backend
cd backend-vercel
npm run dev
# Then test
node test/test-env-deployment.mjs http://localhost:3001
```

### **Issue: "404 Not Found"**
**Solution**: Deploy the new test endpoint
```bash
cd backend-vercel
vercel --prod
```

### **Issue: "All variables missing"**
**Solution**: Wrong environment selected in Vercel
- Check that variables are set for "Production" environment
- Not just "Preview" or "Development"

---

## 📝 Quick Checklist

Before testing, make sure:
- [ ] All variables from `ENV_QUICK_COPY.txt` are in Vercel
- [ ] Variables are set for "Production" environment
- [ ] Backend has been deployed to Vercel
- [ ] You're using the correct deployment URL

---

## 🎯 Expected Results

### **Immediate (after adding variables)**
```
✅ Supabase (3/3)
✅ OpenAI (1/1)
✅ Twilio (3/3)
✅ Resend (1/1) - API Key only
✅ PostHog (2/2)
✅ WhatsApp (2/2)
✅ Instagram (3/3)
✅ Facebook Ads (3/3)
✅ Meta (2/2)
✅ Cron (1/1)
⚠️  Resend (0/1) - Webhook Secret (add after webhook creation)
📝 Stripe (0/1) - Optional
📝 Clay (0/1) - Optional

Total: 22/25 (88%) ✅ READY TO USE
```

### **After webhook setup**
```
Total: 25/25 (100%) ✅ FULLY CONFIGURED
```

---

## 🚀 Next Steps After Success

Once you see ✅ SUCCESS:

1. **Test webhooks**
   ```bash
   node test/agent/bucket-10-webhooks.mjs
   ```

2. **Test marketing intelligence**
   ```bash
   node test/agent/bucket-1-marketing-intelligence.mjs
   ```

3. **Run full test suite**
   ```bash
   node test/agent/run-all-test-buckets.mjs
   ```

4. **Configure webhook URLs** (see `WEBHOOKS_IMPLEMENTATION_COMPLETE.md`)

---

**Good luck! 🎉**
