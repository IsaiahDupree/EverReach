# Frontend Auth Implementation (Next.js App Router)

End-to-end implementation for email/password auth alongside OAuth, including Forgot Password → Reset Password flow and Change Password for logged-in users. Uses Supabase Auth (PKCE) and optionally Resend SMTP via Supabase.

---

## Pages & Routes

Recommended route structure (App Router):

- `/auth/sign-in` — Email/password sign-in, OAuth buttons
- `/auth/sign-up` — Email/password sign-up
- `/auth/forgot` — Request reset email
- `/auth/reset` — Landing for email recovery link (sets new password)
- `/auth/callback` — OAuth callback (optional if using helper)
- `/settings/security` — Change password (logged-in only)

Redirects after success:
- Sign-in → `/`
- Sign-up (confirmed) → `/`
- Reset password → `/` (or `/settings/security?changed=1`)

---

## Client Setup

- `@supabase/supabase-js` in the web app.
- Initialize once, reuse across pages; prefer a shared client module.

```ts
// lib/supabase-browser.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
);
```

Session guard:

```ts
// lib/auth-guard.ts
import { supabase } from './supabase-browser';

export async function requireSession(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  return !!data.session;
}
```

---

## Sign In (Email/Password)

```tsx
// app/auth/sign-in/page.tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-browser';

export default function SignInPage() {
  const r = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setError('Invalid credentials');
    r.replace('/');
  }

  return (
    <form onSubmit={onSubmit} className="max-w-sm mx-auto space-y-3">
      <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" required />
      <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" required />
      {error && <p className="text-red-600">{error}</p>}
      <button disabled={loading}>{loading ? 'Signing in…' : 'Sign In'}</button>
      <a href="/auth/forgot">Forgot password?</a>
    </form>
  );
}
```

OAuth (optional):

```ts
await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback` } });
```

---

## Sign Up (Email/Password)

```tsx
// app/auth/sign-up/page.tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-browser';

export default function SignUpPage() {
  const r = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/` } });
    if (error) return setError(error.message);
    setOk(true);
  }

  if (ok) return <p>Check your email to confirm your account.</p>;

  return (
    <form onSubmit={onSubmit} className="max-w-sm mx-auto space-y-3">
      <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" required />
      <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" required />
      {error && <p className="text-red-600">{error}</p>}
      <button>Create account</button>
    </form>
  );
}
```

---

## Forgot Password → Reset Password

### Forgot (request email)

```tsx
// app/auth/forgot/page.tsx
'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase-browser';

export default function ForgotPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset` });
    setSent(true);
  }

  return (
    <form onSubmit={onSubmit} className="max-w-sm mx-auto space-y-3">
      {sent ? <p>If an account exists, a reset link has been sent.</p> : (
        <>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" required />
          <button>Send reset link</button>
        </>
      )}
    </form>
  );
}
```

### Reset (set new password)

```tsx
// app/auth/reset/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase-browser';

export default function ResetPage() {
  const r = useRouter();
  const q = useSearchParams();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = q.get('code');
    async function run() {
      if (!code) return setError('Invalid or missing recovery code');
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) setError('Recovery link invalid or expired');
      setReady(true);
    }
    run();
  }, [q]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return setError(error.message);
    r.replace('/');
  }

  if (!ready) return <p>Loading…</p>;

  return (
    <form onSubmit={onSubmit} className="max-w-sm mx-auto space-y-3">
      <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="New password" required />
      {error && <p className="text-red-600">{error}</p>}
      <button>Save new password</button>
    </form>
  );
}
```

---

## Change Password (Logged-in)

```tsx
// app/settings/security/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-browser';

export default function SecurityPage() {
  const r = useRouter();
  const [authed, setAuthed] = useState(false);
  useEffect(() => { supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session)); }, []);
  if (!authed) { r.replace('/auth/sign-in'); return null; }

  const [password, setPassword] = useState('');
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); setOk(false); setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return setError(error.message);
    setOk(true);
  }

  return (
    <form onSubmit={onSubmit} className="max-w-sm mx-auto space-y-3">
      <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="New password" required />
      {ok && <p className="text-green-700">Password updated.</p>}
      {error && <p className="text-red-600">{error}</p>}
      <button>Update password</button>
    </form>
  );
}
```

Optionally, add a current password verification step by attempting a silent `signInWithPassword` before `updateUser`.

---

## Routing & Guards

- For protected pages, redirect to `/auth/sign-in` if no session.
- On auth state change, revalidate client caches and UI.

```ts
// lib/auth-listener.ts
import { supabase } from './supabase-browser';

export function onAuthChange(cb: () => void) {
  const { data: sub } = supabase.auth.onAuthStateChange(() => cb());
  return () => sub.subscription.unsubscribe();
}
```

Use in layout or provider to refresh UI on sign-in/out.

---

## Email Delivery via Resend (SMTP through Supabase)

- Configure SMTP in Supabase → Authentication → Email → SMTP
- Host: `smtp.resend.com`, Port: `587`, User: `resend`, Pass: `RESEND_API_KEY`
- From: `EverReach <no-reply@yourdomain.com>`
- Customize Supabase templates (reset/verify) with your brand + links

No code changes are required for reset emails when using Supabase Auth; the Forgot flow triggers email automatically.

---

## Environment (dev/test/prod)

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL` (http://localhost:3000 in dev, https://everreach.app in prod)

Do not overwrite .env; add new variables explicitly.

---

## Testing Checklist (Frontend)

- Sign-up → verify email → auto-login → loads `/`
- Sign-in wrong password → error shown, no leak of existence
- Forgot with unknown email → generic success message
- Reset link → opens `/auth/reset?code=…` → set new password → redirected
- Change password while logged in → success message → re-login optional
- OAuth sign-in (Google) → redirected back → session valid
- Mobile browser and desktop browsers

---

## Notes

- Keep components small (<200–300 LOC per user rules)
- Reuse shared Input/Button components; avoid duplication
- Add analytics events if desired (auth_* events)
