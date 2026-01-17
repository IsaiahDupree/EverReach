# Email Setup Checklist - EverReach

## ✅ Completed

- [x] **Resend API Key** configured in `.env`
- [x] **EMAIL_FROM** address configured
- [x] **Resend package** installed in backend
- [x] **Test email sent successfully**
  - Email ID: `a69b1caf-3cf7-4a73-83ab-40703246040e`
  - Sent to: `isaiahdupree33@gmail.com`
  - From: `EverReach <onboarding@resend.dev>`

---

## 📋 Next Steps (15 minutes)

### 1. Configure Supabase SMTP (5 min)

1. Go to: https://supabase.com/dashboard
2. Select project: **utasetfxiqcrnwyfforx**
3. Navigate to: **Authentication → Settings**
4. Scroll to: **SMTP Settings**
5. Click: **Enable Custom SMTP Server**
6. Fill in:

```
Sender name: EverReach
Sender email: onboarding@resend.dev

Host: smtp.resend.com
Port: 465
Username: resend
Password: re_3EnhLU75_ArKrpH2AQwBaLF847MLQzg5P

Minimum interval: 60 seconds
Max frequency: 50 per hour
```

7. Click **Save**
8. Click **Send Test Email** → Check your inbox!

---

### 2. Apply Email Templates (10 min)

Go to: **Authentication → Email Templates**

#### Template 1: Confirm Sign Up

**Subject:**
```
Confirm your EverReach account
```

**Message Body:** (Copy from test result below)

```html
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  
  <div style="text-align: center; margin-bottom: 32px;">
    <h2 style="color: #111827; font-size: 28px; font-weight: 700; margin: 0 0 12px 0;">
      Welcome to EverReach! 🎉
    </h2>
    <p style="color: #6B7280; font-size: 16px; margin: 0;">
      We're excited to have you here
    </p>
  </div>

  <div style="background: linear-gradient(135deg, #F3E8FF 0%, #EEF2FF 100%); border-radius: 16px; padding: 32px; margin-bottom: 32px;">
    <p style="color: #374151; font-size: 16px; margin: 0 0 24px 0;">
      To get started with EverReach, please confirm your email address:
    </p>
    
    <div style="text-align: center;">
      <a 
        href="{{ .ConfirmationURL }}" 
        style="background: linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(124, 58, 237, 0.25);"
      >
        ✨ Confirm Email Address
      </a>
    </div>
  </div>

  <div style="background-color: #F9FAFB; border-left: 4px solid #7C3AED; border-radius: 8px; padding: 16px 20px; margin-bottom: 32px;">
    <p style="color: #6B7280; font-size: 14px; margin: 0;">
      <strong style="color: #374151;">⏰ Quick heads up:</strong> This link expires in 24 hours
    </p>
  </div>

  <p style="color: #9CA3AF; font-size: 14px; text-align: center; margin: 0 0 24px 0;">
    If you didn't create an account, you can safely ignore this email.
  </p>

  <div style="border-top: 2px solid #F3F4F6; padding-top: 24px; text-align: center;">
    <p style="color: #6B7280; font-size: 14px; margin: 0 0 8px 0;">
      Need help? <a href="mailto:support@everreach.app" style="color: #7C3AED; text-decoration: none; font-weight: 600;">support@everreach.app</a>
    </p>
    <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
      💜 Stay connected with the people who matter most
    </p>
  </div>

</div>
```

Click **Save**

#### Template 2: Reset Password

**Subject:**
```
Reset your EverReach password
```

**Message Body:**

```html
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  
  <div style="text-align: center; margin-bottom: 32px;">
    <h2 style="color: #111827; font-size: 28px; font-weight: 700; margin: 0 0 12px 0;">
      Reset Your Password 🔐
    </h2>
    <p style="color: #6B7280; font-size: 16px; margin: 0;">
      Let's get you back into your account
    </p>
  </div>

  <div style="background: linear-gradient(135deg, #F3E8FF 0%, #EEF2FF 100%); border-radius: 16px; padding: 32px; margin-bottom: 32px;">
    <p style="color: #374151; font-size: 16px; margin: 0 0 24px 0;">
      Click the button below to create a new password:
    </p>
    
    <div style="text-align: center;">
      <a 
        href="{{ .ConfirmationURL }}" 
        style="background: linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(124, 58, 237, 0.25);"
      >
        🔑 Reset Password
      </a>
    </div>
  </div>

  <div style="background-color: #F9FAFB; border-left: 4px solid #7C3AED; border-radius: 8px; padding: 16px 20px; margin-bottom: 32px;">
    <p style="color: #6B7280; font-size: 14px; margin: 0;">
      <strong style="color: #374151;">⏰ Quick heads up:</strong> This link expires in 1 hour
    </p>
  </div>

  <p style="color: #9CA3AF; font-size: 14px; text-align: center; margin: 0 0 24px 0;">
    If you didn't request this, you can safely ignore this email.
  </p>

  <div style="border-top: 2px solid #F3F4F6; padding-top: 24px; text-align: center;">
    <p style="color: #6B7280; font-size: 14px; margin: 0 0 8px 0;">
      Need help? <a href="mailto:support@everreach.app" style="color: #7C3AED; text-decoration: none; font-weight: 600;">support@everreach.app</a>
    </p>
    <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
      💜 Stay connected with the people who matter most
    </p>
  </div>

</div>
```

Click **Save**

---

### 3. Enable Email Confirmations

1. In Supabase Dashboard → **Authentication → Settings**
2. Find **Email Auth** section
3. **Enable email confirmations** → Turn **ON**
4. **Secure email change** → Turn **ON**
5. Click **Save**

---

### 4. Test End-to-End

1. Open your app
2. Try signing up with a new email
3. Check inbox for confirmation email
4. Click confirmation link
5. Should redirect and auto-sign-in

---

## 📊 Current Status

### ✅ Working
- Resend API connection
- Email sending
- Beautiful HTML templates
- Test email delivery

### ⏳ Pending
- Supabase SMTP configuration
- Email template upload
- End-to-end auth flow test

---

## 🔍 Verification Commands

### Test Email Sending
```bash
cd backend-vercel
node test-email.mjs your-email@example.com
```

### Check Configuration
```bash
node test-email-setup.mjs
```

### View Resend Dashboard
- **URL:** https://resend.com/emails
- **API Keys:** https://resend.com/api-keys
- **Domains:** https://resend.com/domains

### View Supabase Dashboard
- **URL:** https://supabase.com/project/utasetfxiqcrnwyfforx
- **Auth Settings:** https://supabase.com/project/utasetfxiqcrnwyfforx/auth/settings
- **Email Templates:** https://supabase.com/project/utasetfxiqcrnwyfforx/auth/templates

---

## 💡 Tips

### Using Test Domain
- **Current:** `onboarding@resend.dev`
- **Limit:** 100 emails/day
- **Good for:** Development & testing

### Upgrading to Custom Domain
1. Add domain in Resend Dashboard
2. Configure DNS records
3. Wait for verification
4. Update `EMAIL_FROM` to: `EverReach <noreply@mail.everreach.app>`
5. Update Supabase SMTP sender email

---

## 📈 Limits

### Resend Free Tier
- 100 emails/day (test domain)
- 3,000 emails/month (custom domain)
- All features included

### Resend Pro ($20/month)
- 50,000 emails/month
- Custom domains
- Dedicated IP
- Priority support

---

## ✅ Final Checklist

Before going live:

- [ ] SMTP configured in Supabase
- [ ] All email templates uploaded
- [ ] Email confirmations enabled
- [ ] Test signup flow
- [ ] Test password reset
- [ ] Verify emails not in spam
- [ ] Monitor Resend dashboard

---

**Estimated Time to Complete:** 15 minutes  
**Current Progress:** 60% complete  
**Next Action:** Configure Supabase SMTP settings
