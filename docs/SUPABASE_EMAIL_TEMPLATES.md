# Supabase Email Templates - EverReach

Complete email templates for all authentication flows. Copy and paste these into your Supabase Dashboard → Authentication → Email Templates.

---

## 1. Confirm Sign Up

**When to use:** User creates new account and needs to verify email

**Subject:** Confirm your EverReach account

**Message Body:**

```html
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  
  <div style="text-align: center; margin-bottom: 32px;">
    <h2 style="color: #111827; font-size: 28px; font-weight: 700; margin: 0 0 12px 0; line-height: 1.3;">
      Welcome to EverReach! 🎉
    </h2>
    <p style="color: #6B7280; font-size: 16px; margin: 0; line-height: 1.5;">
      We're so excited to have you here
    </p>
  </div>

  <div style="background: linear-gradient(135deg, #F3E8FF 0%, #EEF2FF 100%); border-radius: 16px; padding: 32px; margin-bottom: 32px;">
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
      To get started with EverReach and unlock all the amazing features, please confirm your email address:
    </p>
    
    <div style="text-align: center;">
      <a 
        href="{{ .ConfirmationURL }}" 
        style="background: linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(124, 58, 237, 0.25); transition: transform 0.2s;"
      >
        ✨ Confirm Email Address
      </a>
    </div>
  </div>

  <div style="background-color: #F9FAFB; border-left: 4px solid #7C3AED; border-radius: 8px; padding: 16px 20px; margin-bottom: 32px;">
    <p style="color: #6B7280; font-size: 14px; margin: 0; line-height: 1.5;">
      <strong style="color: #374151;">⏰ Quick heads up:</strong> This link expires in 24 hours
    </p>
  </div>

  <p style="color: #9CA3AF; font-size: 14px; text-align: center; line-height: 1.5; margin: 0 0 24px 0;">
    If you didn't create an account, you can safely ignore this email.
  </p>

  <div style="border-top: 2px solid #F3F4F6; padding-top: 24px; text-align: center;">
    <p style="color: #6B7280; font-size: 14px; margin: 0 0 8px 0;">
      Need help? We're here for you! <a href="mailto:support@everreach.app" style="color: #7C3AED; text-decoration: none; font-weight: 600;">support@everreach.app</a>
    </p>
    <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
      💜 Stay connected with the people who matter most
    </p>
  </div>

</div>
```

---

## 2. Invite User

**When to use:** Admin invites new user to join

**Subject:** You've been invited to join EverReach

**Message Body:**

```html
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  
  <div style="text-align: center; margin-bottom: 32px;">
    <h2 style="color: #111827; font-size: 28px; font-weight: 700; margin: 0 0 12px 0; line-height: 1.3;">
      You're Invited! 🎊
    </h2>
    <p style="color: #6B7280; font-size: 16px; margin: 0; line-height: 1.5;">
      Join EverReach and stay connected
    </p>
  </div>

  <div style="background: linear-gradient(135deg, #F3E8FF 0%, #EEF2FF 100%); border-radius: 16px; padding: 32px; margin-bottom: 32px;">
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
      Someone thought you'd love EverReach - the personal CRM that helps you build and maintain meaningful relationships.
    </p>
    
    <div style="text-align: center;">
      <a 
        href="{{ .ConfirmationURL }}" 
        style="background: linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(124, 58, 237, 0.25);"
      >
        🎉 Accept Invitation
      </a>
    </div>
  </div>

  <div style="background-color: #F9FAFB; border-left: 4px solid #7C3AED; border-radius: 8px; padding: 16px 20px; margin-bottom: 32px;">
    <p style="color: #6B7280; font-size: 14px; margin: 0; line-height: 1.5;">
      <strong style="color: #374151;">⏰ Quick heads up:</strong> This invitation expires in 7 days
    </p>
  </div>

  <p style="color: #9CA3AF; font-size: 14px; text-align: center; line-height: 1.5; margin: 0 0 24px 0;">
    If you weren't expecting this invitation, you can safely ignore this email.
  </p>

  <div style="border-top: 2px solid #F3F4F6; padding-top: 24px; text-align: center;">
    <p style="color: #6B7280; font-size: 14px; margin: 0 0 8px 0;">
      Need help? We're here for you! <a href="mailto:support@everreach.app" style="color: #7C3AED; text-decoration: none; font-weight: 600;">support@everreach.app</a>
    </p>
    <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
      💜 Stay connected with the people who matter most
    </p>
  </div>

</div>
```

---

## 3. Magic Link

**When to use:** User signs in with magic link (passwordless)

**Subject:** Your EverReach sign-in link

**Message Body:**

```html
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  
  <div style="text-align: center; margin-bottom: 32px;">
    <h2 style="color: #111827; font-size: 28px; font-weight: 700; margin: 0 0 12px 0; line-height: 1.3;">
      Your Magic Link is Ready ✨
    </h2>
    <p style="color: #6B7280; font-size: 16px; margin: 0; line-height: 1.5;">
      Sign in to EverReach with one click
    </p>
  </div>

  <div style="background: linear-gradient(135deg, #F3E8FF 0%, #EEF2FF 100%); border-radius: 16px; padding: 32px; margin-bottom: 32px;">
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
      Click the button below to securely sign in to your account:
    </p>
    
    <div style="text-align: center;">
      <a 
        href="{{ .ConfirmationURL }}" 
        style="background: linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(124, 58, 237, 0.25);"
      >
        🔐 Sign In to EverReach
      </a>
    </div>
  </div>

  <div style="background-color: #F9FAFB; border-left: 4px solid #7C3AED; border-radius: 8px; padding: 16px 20px; margin-bottom: 32px;">
    <p style="color: #6B7280; font-size: 14px; margin: 0; line-height: 1.5;">
      <strong style="color: #374151;">⏰ Quick heads up:</strong> This link expires in 1 hour
    </p>
  </div>

  <p style="color: #9CA3AF; font-size: 14px; text-align: center; line-height: 1.5; margin: 0 0 24px 0;">
    If you didn't request this link, you can safely ignore this email.
  </p>

  <div style="border-top: 2px solid #F3F4F6; padding-top: 24px; text-align: center;">
    <p style="color: #6B7280; font-size: 14px; margin: 0 0 8px 0;">
      Need help? We're here for you! <a href="mailto:support@everreach.app" style="color: #7C3AED; text-decoration: none; font-weight: 600;">support@everreach.app</a>
    </p>
    <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
      💜 Stay connected with the people who matter most
    </p>
  </div>

</div>
```

---

## 4. Change Email Address

**When to use:** User changes their email address

**Subject:** Confirm your new email address

**Message Body:**

```html
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  
  <div style="text-align: center; margin-bottom: 32px;">
    <h2 style="color: #111827; font-size: 28px; font-weight: 700; margin: 0 0 12px 0; line-height: 1.3;">
      Confirm Your New Email 📧
    </h2>
    <p style="color: #6B7280; font-size: 16px; margin: 0; line-height: 1.5;">
      One quick step to update your account
    </p>
  </div>

  <div style="background: linear-gradient(135deg, #F3E8FF 0%, #EEF2FF 100%); border-radius: 16px; padding: 32px; margin-bottom: 32px;">
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
      We received a request to change your EverReach account email to this address. Click below to confirm:
    </p>
    
    <div style="text-align: center;">
      <a 
        href="{{ .ConfirmationURL }}" 
        style="background: linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(124, 58, 237, 0.25);"
      >
        ✅ Confirm New Email
      </a>
    </div>
  </div>

  <div style="background-color: #F9FAFB; border-left: 4px solid #7C3AED; border-radius: 8px; padding: 16px 20px; margin-bottom: 32px;">
    <p style="color: #6B7280; font-size: 14px; margin: 0; line-height: 1.5;">
      <strong style="color: #374151;">⏰ Quick heads up:</strong> This link expires in 24 hours
    </p>
  </div>

  <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; border-radius: 8px; padding: 16px 20px; margin-bottom: 32px;">
    <p style="color: #92400E; font-size: 14px; margin: 0; line-height: 1.5;">
      <strong>🔒 Security note:</strong> If you didn't request this change, please ignore this email and consider changing your password.
    </p>
  </div>

  <div style="border-top: 2px solid #F3F4F6; padding-top: 24px; text-align: center;">
    <p style="color: #6B7280; font-size: 14px; margin: 0 0 8px 0;">
      Need help? We're here for you! <a href="mailto:support@everreach.app" style="color: #7C3AED; text-decoration: none; font-weight: 600;">support@everreach.app</a>
    </p>
    <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
      💜 Stay connected with the people who matter most
    </p>
  </div>

</div>
```

---

## 5. Reset Password

**When to use:** User forgets password and requests reset

**Subject:** Reset your EverReach password

**Message Body:**

```html
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  
  <div style="text-align: center; margin-bottom: 32px;">
    <h2 style="color: #111827; font-size: 28px; font-weight: 700; margin: 0 0 12px 0; line-height: 1.3;">
      Reset Your Password 🔐
    </h2>
    <p style="color: #6B7280; font-size: 16px; margin: 0; line-height: 1.5;">
      Let's get you back into your account
    </p>
  </div>

  <div style="background: linear-gradient(135deg, #F3E8FF 0%, #EEF2FF 100%); border-radius: 16px; padding: 32px; margin-bottom: 32px;">
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
      We received a request to reset your password. Click the button below to create a new one:
    </p>
    
    <div style="text-align: center;">
      <a 
        href="{{ .SiteURL }}/auth/reset-password?code={{ .TokenHash }}" 
        style="background: linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(124, 58, 237, 0.25);"
      >
        🔑 Reset Password
      </a>
    </div>
  </div>

  <div style="background-color: #F9FAFB; border-left: 4px solid #7C3AED; border-radius: 8px; padding: 16px 20px; margin-bottom: 32px;">
    <p style="color: #6B7280; font-size: 14px; margin: 0; line-height: 1.5;">
      <strong style="color: #374151;">⏰ Quick heads up:</strong> This link expires in 1 hour
    </p>
  </div>

  <p style="color: #9CA3AF; font-size: 14px; text-align: center; line-height: 1.5; margin: 0 0 24px 0;">
    If you didn't request this reset, you can safely ignore this email.
  </p>

  <div style="border-top: 2px solid #F3F4F6; padding-top: 24px; text-align: center;">
    <p style="color: #6B7280; font-size: 14px; margin: 0 0 8px 0;">
      Need help? We're here for you! <a href="mailto:support@everreach.app" style="color: #7C3AED; text-decoration: none; font-weight: 600;">support@everreach.app</a>
    </p>
    <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
      💜 Stay connected with the people who matter most
    </p>
  </div>

</div>
```

---

## 6. Reauthentication

**When to use:** User needs to verify identity for sensitive action

**Subject:** Confirm your identity

**Message Body:**

```html
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  
  <div style="text-align: center; margin-bottom: 32px;">
    <h2 style="color: #111827; font-size: 28px; font-weight: 700; margin: 0 0 12px 0; line-height: 1.3;">
      Confirm It's You 🛡️
    </h2>
    <p style="color: #6B7280; font-size: 16px; margin: 0; line-height: 1.5;">
      Quick security check
    </p>
  </div>

  <div style="background: linear-gradient(135deg, #F3E8FF 0%, #EEF2FF 100%); border-radius: 16px; padding: 32px; margin-bottom: 32px;">
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
      You're about to perform a sensitive action on your EverReach account. Please verify your identity:
    </p>
    
    <div style="text-align: center;">
      <a 
        href="{{ .ConfirmationURL }}" 
        style="background: linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(124, 58, 237, 0.25);"
      >
        🔐 Confirm Identity
      </a>
    </div>
  </div>

  <div style="background-color: #F9FAFB; border-left: 4px solid #7C3AED; border-radius: 8px; padding: 16px 20px; margin-bottom: 32px;">
    <p style="color: #6B7280; font-size: 14px; margin: 0; line-height: 1.5;">
      <strong style="color: #374151;">⏰ Quick heads up:</strong> This link expires in 15 minutes
    </p>
  </div>

  <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; border-radius: 8px; padding: 16px 20px; margin-bottom: 32px;">
    <p style="color: #92400E; font-size: 14px; margin: 0; line-height: 1.5;">
      <strong>🔒 Security note:</strong> If you didn't attempt this action, please ignore this email and consider changing your password.
    </p>
  </div>

  <div style="border-top: 2px solid #F3F4F6; padding-top: 24px; text-align: center;">
    <p style="color: #6B7280; font-size: 14px; margin: 0 0 8px 0;">
      Need help? We're here for you! <a href="mailto:support@everreach.app" style="color: #7C3AED; text-decoration: none; font-weight: 600;">support@everreach.app</a>
    </p>
    <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
      💜 Stay connected with the people who matter most
    </p>
  </div>

</div>
```

---

## Variables Reference

Supabase provides these variables you can use in your templates:

### Common Variables:
- `{{ .ConfirmationURL }}` - Auto-generated confirmation link
- `{{ .Token }}` - Raw token (rarely needed)
- `{{ .TokenHash }}` - Hashed token (for custom URLs)
- `{{ .SiteURL }}` - Your site URL from Supabase settings
- `{{ .Email }}` - User's email address
- `{{ .Data }}` - Custom data (if passed)

### When to Use Each:

**Use `{{ .ConfirmationURL }}`:**
- Confirm sign up
- Invite user
- Magic link
- Change email address
- Reauthentication

**Use `{{ .SiteURL }}/auth/reset-password?code={{ .TokenHash }}`:**
- Reset password (custom route handling)

---

## Styling Guide

### Colors:
- **Primary Purple:** `#7C3AED`
- **Text Primary:** `#111827`
- **Text Secondary:** `#6B7280`
- **Text Tertiary:** `#9CA3AF`
- **Border:** `#E5E7EB`

### Button Style:
```css
background-color: #7C3AED;
color: white;
padding: 12px 24px;
text-decoration: none;
border-radius: 8px;
display: inline-block;
font-weight: 600;
```

### Typography:
- **Heading:** `<h2>` - Main title
- **Body:** `<p>` - 16px default
- **Small:** `font-size: 14px` - Secondary text
- **Tiny:** `font-size: 12px` - Footer text

---

## How to Apply These Templates

### Step 1: Access Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to **Authentication → Email Templates**

### Step 2: Update Each Template
For each template:
1. Click the template tab (Confirm sign up, Reset password, etc.)
2. Update the **Subject heading**
3. Copy the HTML from this document
4. Paste into the **Message body** field
5. Click **Preview** to test
6. Click **Save**

### Step 3: Test Each Template
In Supabase:
1. Click **"Send test email"** button
2. Enter your email
3. Check inbox (and spam folder)
4. Verify:
   - ✅ Subject is correct
   - ✅ Content displays properly
   - ✅ Link works
   - ✅ Styling looks good

---

## Testing Checklist

- [ ] **Confirm Sign Up**
  - Subject: "Confirm your EverReach account"
  - Content: Welcome message
  - Link: Email verification
  
- [ ] **Invite User**
  - Subject: "You've been invited to join EverReach"
  - Content: Invitation message
  - Link: Account creation
  
- [ ] **Magic Link**
  - Subject: "Your EverReach sign-in link"
  - Content: Sign-in instructions
  - Link: Passwordless login
  
- [ ] **Change Email Address**
  - Subject: "Confirm your new email address"
  - Content: Email change confirmation
  - Link: New email verification
  
- [ ] **Reset Password**
  - Subject: "Reset your EverReach password"
  - Content: Password reset instructions
  - Link: `/auth/reset-password?code=...`
  
- [ ] **Reauthentication**
  - Subject: "Confirm your identity"
  - Content: Identity verification
  - Link: Reauthentication

---

## Common Mistakes to Avoid

### ❌ Don't Do This:
```html
<!-- Using wrong URL for reset password -->
<a href="{{ .ConfirmationURL }}">Reset Password</a>
```

### ✅ Do This Instead:
```html
<!-- Use custom URL with TokenHash -->
<a href="{{ .SiteURL }}/auth/reset-password?code={{ .TokenHash }}">Reset Password</a>
```

---

### ❌ Don't Do This:
```html
<!-- Missing styling -->
<a href="{{ .ConfirmationURL }}">Click here</a>
```

### ✅ Do This Instead:
```html
<!-- Properly styled button -->
<a 
  href="{{ .ConfirmationURL }}" 
  style="background-color: #7C3AED; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;"
>
  Confirm Email Address
</a>
```

---

### ❌ Don't Do This:
```html
<!-- No alternative plain-text URL -->
<a href="{{ .ConfirmationURL }}">Click here</a>
```

### ✅ Do This Instead:
```html
<!-- Include both button and plain URL -->
<a href="{{ .ConfirmationURL }}" style="...">Click here</a>

<p>Or copy and paste this link:</p>
<code>{{ .ConfirmationURL }}</code>
```

---

## Customization Ideas

### Add Your Logo:
```html
<p style="text-align: center; margin-bottom: 24px;">
  <img src="https://your-domain.com/logo.png" alt="EverReach" width="120" />
</p>
```

### Add Social Links:
```html
<p style="text-align: center; color: #9CA3AF; font-size: 14px;">
  Follow us: 
  <a href="https://twitter.com/everreach" style="color: #7C3AED;">Twitter</a> | 
  <a href="https://linkedin.com/company/everreach" style="color: #7C3AED;">LinkedIn</a>
</p>
```

### Add Company Address:
```html
<p style="color: #9CA3AF; font-size: 12px; text-align: center;">
  EverReach Inc.<br>
  123 Main Street, San Francisco, CA 94101
</p>
```

---

## Troubleshooting

### Emails Going to Spam

**Fixes:**
1. Set up custom SMTP (Resend, SendGrid, etc.)
2. Verify your sending domain (SPF, DKIM, DMARC)
3. Use consistent "From" address
4. Avoid spam trigger words ("Free", "Click now", etc.)
5. Include unsubscribe link (for marketing emails)

### Links Not Working

**Check:**
1. `{{ .SiteURL }}` is set correctly in Supabase
2. Redirect URLs are added to allowlist
3. Links are not broken across lines
4. Variables are spelled correctly
5. Code hasn't expired (1 hour for reset, 24 hours for signup)

### Styling Not Showing

**Fixes:**
1. Use inline styles (not `<style>` tags)
2. Test in multiple email clients
3. Use simple HTML (avoid complex CSS)
4. Use tables for layout if needed
5. Preview in Supabase before saving

---

## Production Checklist

Before going live:

- [ ] All 6 templates updated
- [ ] All subjects are branded correctly
- [ ] All templates tested with real emails
- [ ] Links work on desktop and mobile
- [ ] Styling looks good in Gmail, Outlook, Apple Mail
- [ ] Support email address is correct
- [ ] Logo added (optional)
- [ ] Custom SMTP configured (recommended)
- [ ] Emails not going to spam
- [ ] Legal footer added if required
- [ ] Team reviewed and approved

---

**Last Updated:** November 2, 2025  
**Version:** 1.0  
**Status:** ✅ Ready for Production
