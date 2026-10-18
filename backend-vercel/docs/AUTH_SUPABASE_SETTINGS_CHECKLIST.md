# Supabase Auth Settings Checklist (Email/Password + OAuth)

Use this checklist to configure Supabase Auth for sign-in/sign-up, forgot/reset password, and optional Resend SMTP.

---

## 1) Project Settings → Authentication → URL Configuration

- [ ] **Site URL**: `https://everreach.app`
- [ ] **Additional Redirect URLs**:
  - `http://localhost:3000`
  - `http://localhost:3000/auth/reset`
  - `https://everreach.app/auth/reset`
  - `https://everreach.app/auth/callback`

Notes:
- Reset flow redirects to `/auth/reset`.
- OAuth may use `/auth/callback` (or let Supabase handle via detectSessionInUrl).

---

## 2) Authentication → Email Templates

- [ ] Customize branding (logo, colors, support link)
- [ ] Verify email template (signup)
- [ ] Reset password (recovery) template
- [ ] Use the provided recovery link variable (e.g. `{{ .ConfirmationURL }}`) that points to `/auth/reset`

Content tips:
- Keep messages generic (avoid email enumeration)
- Add support contact if users didn’t request the email

---

## 3) Authentication → Email (Provider)

Choose ONE of:

- [ ] A. Supabase built-in email (quickest)
  - Ensure domain and from-name are set

- [ ] B. Custom SMTP via Resend (recommended)
  - Host: `smtp.resend.com`
  - Port: `587`
  - Username: `resend`
  - Password: `RESEND_API_KEY`
  - From: `EverReach <no-reply@yourdomain.com>`
  - Verify sending domain in Resend

Deliverability tips:
- DKIM/SPF for your domain
- Use production "From" address consistently

---

## 4) Authentication → Policies & Security

- [ ] Confirm Email required on sign-up (recommended)
- [ ] Password strength requirements set (min length; consider complexity)
- [ ] Disable phone auth if unused
- [ ] Session expiration/refresh policies validated
- [ ] Rate-limiting configured (WAF, CDN, or app-level throttling where applicable)

---

## 5) Environment Variables (Web App)

Add (do not overwrite existing .env blindly):

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `NEXT_PUBLIC_SITE_URL` (dev: `http://localhost:3000`, prod: `https://everreach.app`)

Not needed in app code, but used in Supabase SMTP settings:
- [ ] `RESEND_API_KEY` (stored in Supabase email provider configuration)

---

## 6) OAuth Providers (Optional)

- [ ] Enable Google (or others) in Supabase
- [ ] Add OAuth redirect URL(s) to provider console if required
- [ ] Ensure `/auth/callback` is added in Redirect URLs

---

## 7) QA Smoke Tests (After Config)

- [ ] Sign-up → receive verify email → confirm → redirected
- [ ] Sign-in with email/password → session present, route guarded pages load
- [ ] Forgot password → receive email → `/auth/reset` opens with code
- [ ] Reset password → new password saved → redirected
- [ ] Change password while logged in → success
- [ ] OAuth (if enabled) → round-trip works

---

## 8) Monitoring & Logs

- [ ] Supabase Auth logs checked for errors (rate limits, SMTP failures)
- [ ] Email bounce/complaint rates monitored in Resend
- [ ] PostHog or analytics events for auth flows (optional)
