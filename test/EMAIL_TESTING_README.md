# Email Authentication Testing Suite

Automated tests for Resend + Supabase email authentication flow.

## What It Tests

✅ **Sign-Up Confirmation Emails**
- User registration
- Email verification required
- Template rendering
- Delivery confirmation

✅ **Password Reset Emails**
- Password recovery flow
- Reset link generation
- Template rendering
- Delivery confirmation

✅ **Magic Link Emails**
- Passwordless authentication
- OTP email sending
- Template rendering
- Delivery confirmation

✅ **Resend API Integration**
- Direct API connectivity
- Email delivery
- HTML template rendering
- Delivery status

✅ **Configuration Checks**
- Environment variables
- Supabase connection
- SMTP settings
- Email templates

---

## Prerequisites

### Environment Variables

Create a `.env` file in the project root:

```bash
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Resend
RESEND_API_KEY=re_your_api_key_here
EMAIL_FROM=EverReach <noreply@mail.everreach.app>

# Testing
TEST_EMAIL=your-email@example.com
```

### Install Dependencies

```bash
npm install @supabase/supabase-js dotenv
```

---

## Running Tests

### Run All Tests

```bash
node test/email-auth-flow.test.mjs
```

### Test Output

```
============================================================
  🧪 EverReach Email Authentication Tests
============================================================

Test Email: your-email@example.com
Supabase URL: https://your-project.supabase.co
Timeout: 30000ms

📝 Test: Environment Configuration
✅ Found: SUPABASE_URL
✅ Found: SUPABASE_ANON_KEY
✅ Found: RESEND_API_KEY
✅ Found: TEST_EMAIL
✅ PASS: Environment variables present

📝 Test: Supabase Connection
✅ Connected to Supabase
✅ PASS: Supabase connection

📝 Test: Sign-Up Confirmation Email
ℹ️  Testing with email: test+signup1699000000@example.com
✅ User created: abc-123-def
✅ Email confirmation required (good!)
ℹ️  📧 Check your inbox for confirmation email
ℹ️  Subject: "Confirm your EverReach account"
ℹ️  Template should include: "Welcome to EverReach! 🎉"
✅ PASS: Sign-up confirmation email triggered

...

============================================================
  📊 Test Summary
============================================================
Total Tests:  9
✅ Passed:       7
❌ Failed:       0
⚠️  Skipped:      0
⚠️  Warnings:     2

Success Rate: 78%

============================================================
  ✅ All Tests Passed!
============================================================

Next Steps:
1. Check your inbox for test emails
2. Verify email templates in Supabase dashboard
3. Test sign-up flow in production
```

---

## Test Scenarios

### 1. Sign-Up Confirmation Email

**What it tests:**
- Creates a new user account
- Triggers email confirmation
- Checks if email confirmations are enabled

**Expected Result:**
- User created successfully
- Confirmation email sent
- Email received in inbox

**Common Issues:**
- ❌ User auto-confirmed → Email confirmations disabled in Supabase
- ❌ No email received → SMTP not configured
- ❌ Email in spam → Domain not verified

### 2. Password Reset Email

**What it tests:**
- Triggers password reset flow
- Sends reset link to email

**Expected Result:**
- Reset email sent
- Email received with reset link

**Common Issues:**
- ❌ No email received → SMTP not configured
- ❌ Invalid redirect URL → URL not whitelisted

### 3. Magic Link Email

**What it tests:**
- Sends passwordless sign-in link
- OTP email delivery

**Expected Result:**
- Magic link email sent
- Email received with sign-in button

**Common Issues:**
- ❌ No email received → SMTP not configured
- ❌ Link expired → Click within 1 hour

### 4. Resend Integration

**What it tests:**
- Direct Resend API call
- Email delivery via Resend
- HTML rendering

**Expected Result:**
- Test email sent via Resend
- Email received with formatted HTML

**Common Issues:**
- ❌ API error → Invalid API key
- ❌ Sender rejected → Domain not verified
- ❌ Rate limit → Free tier limit reached

---

## Interpreting Results

### All Tests Pass ✅

```
Success Rate: 100%
✅ All Tests Passed!
```

**What this means:**
- Email system is fully configured
- Supabase + Resend integration working
- All email types can be sent
- Templates are configured

**Next steps:**
1. Test production sign-up flow
2. Monitor email delivery rates
3. Check spam folder placement

### Some Tests Fail ❌

```
Success Rate: 67%
❌ Some Tests Failed
```

**Common fixes:**

**1. Environment variables missing**
```
❌ FAIL: Environment variables present
```
→ Add missing variables to `.env`

**2. Supabase connection failed**
```
❌ FAIL: Supabase connection
```
→ Check SUPABASE_URL and SUPABASE_ANON_KEY

**3. Email not sent**
```
❌ FAIL: Sign-up confirmation email
```
→ Configure SMTP in Supabase
→ Enable email confirmations
→ Check Resend API key

**4. Resend API error**
```
❌ FAIL: Resend API integration
```
→ Verify RESEND_API_KEY is correct
→ Check domain verification
→ Review Resend dashboard for errors

### Warnings ⚠️

```
⚠️  Warnings: 2
```

**Email confirmations disabled:**
```
⚠️  Email confirmations are DISABLED in Supabase
⚠️  User was auto-confirmed without email verification
```

**Fix:**
1. Go to Supabase Dashboard
2. Authentication → Settings
3. Enable "Email confirmations"
4. Save changes

---

## Manual Verification Steps

Some checks require manual verification:

### 1. Check Email Templates

**Go to:** Supabase Dashboard → Authentication → Email Templates

**Verify each template:**

✅ **Confirm Sign Up**
- Subject: "Confirm your EverReach account"
- Contains: "Welcome to EverReach! 🎉"
- Button: "✨ Confirm Email Address"

✅ **Password Reset**
- Subject: "Reset your EverReach password"
- Contains: "Reset Your Password 🔐"
- Button: "🔑 Reset Password"

✅ **Magic Link**
- Subject: "Your EverReach sign-in link"
- Contains: "Your Magic Link is Ready ✨"
- Button: "🔐 Sign In to EverReach"

### 2. Check SMTP Configuration

**Go to:** Supabase Dashboard → Authentication → Settings → SMTP Settings

**Verify:**
- ✅ Custom SMTP enabled
- ✅ Host: `smtp.resend.com`
- ✅ Port: `465` or `587`
- ✅ Username: `resend`
- ✅ Password: Your Resend API key
- ✅ Sender email: `noreply@mail.everreach.app`

### 3. Check Resend Dashboard

**Go to:** [resend.com/emails](https://resend.com/emails)

**Verify:**
- ✅ Emails showing as "Delivered"
- ✅ No bounces or complaints
- ✅ Open/click rates (if tracking enabled)

---

## Troubleshooting

### No Emails Received

**Check:**
1. ✅ Spam folder
2. ✅ Email address is correct
3. ✅ SMTP configured in Supabase
4. ✅ Resend API key valid
5. ✅ Domain verified in Resend

**Solutions:**
- Add Resend to email allowlist
- Verify domain with SPF/DKIM records
- Check Resend delivery logs
- Test with different email provider

### Emails Going to Spam

**Fixes:**
1. Verify custom domain in Resend
2. Add SPF record: `v=spf1 include:_spf.resend.com ~all`
3. Add DKIM records (provided by Resend)
4. Use professional "from" address
5. Avoid spam trigger words

### Rate Limits Hit

**Resend Free Tier:**
- 100 emails/day
- 3,000 emails/month

**Solutions:**
- Wait for daily limit reset
- Upgrade to Resend Pro ($20/month)
- Use multiple test accounts

---

## CI/CD Integration

### GitHub Actions

```yaml
name: Email Tests

on: [push, pull_request]

jobs:
  test-emails:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install @supabase/supabase-js dotenv
      
      - name: Run email tests
        env:
          EXPO_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          EXPO_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
          RESEND_API_KEY: ${{ secrets.RESEND_API_KEY }}
          TEST_EMAIL: ${{ secrets.TEST_EMAIL }}
        run: node test/email-auth-flow.test.mjs
```

---

## Test Schedule

**Recommended frequency:**
- **Daily:** Automated tests via CI/CD
- **Weekly:** Manual template verification
- **Monthly:** Full end-to-end user testing

---

## Support

If tests fail and you need help:

1. **Review test output** for specific error messages
2. **Check Supabase logs:** Authentication → Logs
3. **Check Resend logs:** [resend.com/emails](https://resend.com/emails)
4. **Review setup guide:** `SETUP_RESEND_WITH_TEMPLATES.md`

---

## Related Documentation

- **Setup Guide:** `SETUP_RESEND_WITH_TEMPLATES.md`
- **Email Templates:** `docs/SUPABASE_EMAIL_TEMPLATES.md`
- **Email Fix Guide:** `FIX_SIGNUP_EMAIL_VERIFICATION.md`

---

**Last Updated:** November 3, 2025  
**Version:** 1.0  
**Status:** ✅ Ready for Use
