# Auth Rearchitecture Plan (Web + Backend)

This plan redesigns authentication to support email/password sign-in, password reset, password change, and robust session handling while preserving existing OAuth. It uses Supabase Auth as the identity provider and optionally Resend as SMTP for higher deliverability.

---

## Goals

- Email/password support alongside OAuth
- Password reset flow (request → email → reset form → save new password)
- Password change for logged-in users
- Email verification on signup
- Clean redirect/callback handling for all auth flows
- High deliverability via Resend SMTP (optional, recommended)
- Secure UX (no email enumeration, throttling, short-lived tokens)

---

## Architecture Overview

- **Identity**: Supabase Auth (email/password, OAuth)
- **Session**: Supabase JS on web (PKCE), HttpOnly cookies optional for SSR
- **Email Delivery**: Supabase built-in email OR Custom SMTP via Resend
- **Frontend**: Next.js app router pages for sign-in/up, forgot, reset, change password
- **Backend API**: Continues to trust Supabase JWT (no changes required)

---

## Redirects & URLs

- Production Site URL: `https://everreach.app`
- Backend API Base: `https://ever-reach-be.vercel.app`

Configure in Supabase → Authentication → URL Configuration:
- **Site URL**: `https://everreach.app`
- **Additional Redirect URLs** (dev + production):
  - `http://localhost:3000`
  - `http://localhost:3000/auth/reset`
  - `https://everreach.app/auth/reset`
  - `https://everreach.app/auth/callback`

---

## Email Settings

Option A — Use Supabase default email (quickest)
- Customize email templates in Supabase (brand, links)

Option B — Use Resend SMTP (recommended)
- Domain: verified in Resend
- Supabase Auth → SMTP settings:
  - Host: `smtp.resend.com`
  - Port: `587`
  - Username: `resend`
  - Password: `RESEND_API_KEY`
  - From Name/Email: `EverReach <no-reply@yourdomain.com>`

Notes:
- All auth emails (verify, magic link, reset) go via Resend automatically
- No frontend/backend code changes needed to send reset emails

---

## Core Flows

1) Sign Up (Email/Password)
- User submits email + password → `supabase.auth.signUp`
- If „Confirm email” setting is ON → user must verify via email before full access

2) Sign In (Email/Password)
- `supabase.auth.signInWithPassword({ email, password })`
- On success → set session in client; redirect to dashboard

3) Forgot Password
- User submits email → `supabase.auth.resetPasswordForEmail(email, { redirectTo: SITE_URL + '/auth/reset' })`
- Email contains recovery link that redirects to `/auth/reset?code=...`

4) Reset Password (from email link)
- On `/auth/reset`, exchange the `code` for a session: `supabase.auth.exchangeCodeForSession(code)`
- Then set new password: `supabase.auth.updateUser({ password: newPassword })`
- Redirect to success page or auto-login

5) Change Password (logged-in)
- Re-authenticate by prompting current password (optional but recommended)
- If current password valid → `supabase.auth.updateUser({ password: newPassword })`
- Invalidate other sessions if desired (security policy)

6) OAuth (Google, etc.)
- Leave existing provider set up
- Callback: `/auth/callback` (add to redirect list)

---

## Security & UX

- Do NOT reveal whether an email exists (generic success message for “forgot password”)
- Rate-limit password reset requests (client debounce + backend throttling via Supabase policies or edge middleware if used)
- Enforce strong password policy (min length, complexity, breached password check optional)
- Short-lived recovery links (Supabase default)
- Log auth events (PostHog or Supabase logs)
- Protect routes with auth guards; handle 401 gracefully

---

## Environment Variables (Web)

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL` (e.g., `https://everreach.app`)

Optional (for custom SMTP via Supabase settings, not consumed by web directly):
- `RESEND_API_KEY` (used in Supabase Dashboard SMTP; not needed in app code)

---

## Backend Considerations

- Existing APIs using `getUser(req)` remain valid
- No schema changes required
- Consider adding user-audit table for auth events if needed

---

## Rollout Checklist

1. Configure Supabase URLs (Site/Redirects)
2. Choose email delivery (Resend SMTP recommended)
3. Create pages: sign-in, sign-up, forgot, reset, change-password
4. Add route guards and post-auth redirects
5. Test the 6 flows end-to-end (prod + dev)
6. Update links in UI (Settings → Change Password, Sign-in/Sign-up, Forgot)

---

## Risks & Mitigations

- Email deliverability → Use verified domain on Resend
- Token misuse → Keep recovery link short TTL (Supabase default)
- Enumeration → Generic messages, rate-limit
- Session confusion → After reset, refresh client state; consider sign-out others

---

## Timeline (est.)

- Config + Pages + QA: 0.5–1 day
- Email branding: 30–45 min
