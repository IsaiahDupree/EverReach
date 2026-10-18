# Personal CRM Backend (Vercel)

This is a standalone Next.js project that exposes the backend API for the AI‑Enhanced Personal CRM. It reuses the existing backend code from the parent repo and is meant to be deployed independently on Vercel.

## Structure

- `app/api/[...api]/route.ts` — Catch‑all that proxies to the Hono app defined in `../../backend/hono.ts`.
- `app/api/trpc/[trpc]/route.ts` — tRPC handler bound to the router defined in `../../backend/trpc/app-router.ts` with context from `../../backend/trpc/server.ts`.

The project is configured with `experimental.externalDir=true` so it can import code from the parent directory without duplicating logic.

## Local dev

```bash
bun install # or npm/pnpm/yarn
bun run dev # or npm run dev
```

Note: API routes run on port 3000 by default; this project uses 3001 in the `start` script.

## Deploy to Vercel

- Create a new Vercel project pointing to this `backend-vercel/` directory as the Root Directory.
- Set Environment Variables:
  - Server‑only: `OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (and optionally `SUPABASE_ANON_KEY`)
  - Client‑safe (optional): `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_KEY`
- After deploy:
  - `GET https://<your-project>.vercel.app/api/health` should return JSON
  - `POST https://<your-project>.vercel.app/api/llm/chat` should proxy OpenAI
  - `https://<your-project>.vercel.app/api/trpc` serves your tRPC router

See the parent repo docs at `../docs/API_and_Deployment.md` for more details.

## Resend DNS & Relay Setup

Use Resend as the ESP. Verify a dedicated sending subdomain (recommended) and optionally the apex domain if you want to send from it as well.

- **Verify `mail.everreach.app` in Resend (recommended transactional domain)**
  - Add DKIM (copy the exact value from Resend):
    - Type: `TXT`
    - Name: `resend._domainkey.mail.everreach.app`
    - Value: `p=...` (very long DKIM key provided by Resend)
  - Add DMARC (start permissive; tighten later):
    - Type: `TXT`
    - Name: `_dmarc.mail.everreach.app`
    - Value: `v=DMARC1; p=none; rua=mailto:dmarc@everreach.app; pct=100; fo=1`
  - Optional return-path/bounce subdomain for DMARC alignment (Resend recommends `send.<domain>`):
    - Type: `MX`
    - Name: `send.mail.everreach.app`
    - Mail Server (Value): `feedback-smtp.us-east-1.amazonses.com`
    - Priority: `10`
    - Type: `TXT`
    - Name: `send.mail.everreach.app`
    - Value: `"v=spf1 include:amazonses.com ~all"`

- **Verify `everreach.app` in Resend (if you plan to send From the apex, e.g., `support@everreach.app`)**
  - DKIM:
    - Type: `TXT`
    - Name: `resend._domainkey.everreach.app`
    - Value: `p=...` (from Resend)
  - DMARC:
    - Type: `TXT`
    - Name: `_dmarc.everreach.app`
    - Value: `v=DMARC1; p=none; rua=mailto:dmarc@everreach.app; pct=100; fo=1`
  - Optional return-path for apex (same pattern as above):
    - `send.everreach.app` MX -> `feedback-smtp.us-east-1.amazonses.com` (priority 10)
    - `send.everreach.app` TXT -> `"v=spf1 include:amazonses.com ~all"`

- **Apple Private Email Relay**
  - In Apple Developer → “Register your email sources”.
  - Add domains: `everreach.app` and `mail.everreach.app`.
  - Add From addresses you’ll use: `noreply@mail.everreach.app`, `help@mail.everreach.app`, `support@everreach.app`.
  - Ensure SPF/DKIM pass and the DKIM `d=` domain equals your `From:` domain (e.g., sending from `noreply@mail.everreach.app` should use `d=mail.everreach.app`).

- **Backend env (Vercel Project)**
  - `RESEND_API_KEY`: your Resend API key.
  - `EMAIL_FROM`: default From, e.g., `EverReach <noreply@mail.everreach.app>`.
  - You can override From per send using the `sendEmail` helper.

- **Live smoke tests (optional, guarded)**
  - In the test runner: `test/automated-tests/run.mjs`.
  - Set envs before running:
    - `ENABLE_EMAIL_SMOKE=1`
    - `TEST_SMOKE_EMAIL_TO=you@yourdomain.com`
  - This will send test emails using:
    - `EverReach <noreply@mail.everreach.app>`
    - `EverReach Help <help@mail.everreach.app>`
    - `EverReach Support <support@everreach.app>`

## Apple App Store Connect API Key (.p8)

Some server-to-server Apple APIs (e.g., App Store Server API for subscription status) require a `.p8` private key in addition to Key ID and Issuer ID. Do not commit `.p8` files to the repo.

- **Keep the `.p8` file out of the repository**
  - Example local path: `C:\Users\Isaia\Documents\Coding\PersonalCRM\AuthKey_M99WN9MW26.p8` (do not commit this).
  - Ensure your `.gitignore` excludes `*.p8`.

- **Recommended env variables (Vercel)**
  - `APPLE_APPSTORE_KEY_ID` → e.g., `M99WN9MW26` (from App Store Connect)
  - `APPLE_APPSTORE_ISSUER_ID` → Issuer ID (UUID) from App Store Connect
  - `APPLE_APPSTORE_BUNDLE_ID` → your app’s bundle identifier
  - One of:
    - `APPLE_APPSTORE_PRIVATE_KEY` → paste the full `.p8` contents (including header/footer)
    - or `APPLE_APPSTORE_PRIVATE_KEY_BASE64` → base64 of the `.p8` contents

- **Usage note**
  - Our current Apple ASN v2 webhook verification uses Apple’s JWKS and does not require the `.p8`.
  - If/when you call Apple App Store Server API (e.g., to refresh subscription state during a manual restore), use the above envs to build a client JWT with the `.p8` key.
  - Example retrieval pattern (pseudo-code):

    ```ts
    const raw = process.env.APPLE_APPSTORE_PRIVATE_KEY || (
      process.env.APPLE_APPSTORE_PRIVATE_KEY_BASE64
        ? Buffer.from(process.env.APPLE_APPSTORE_PRIVATE_KEY_BASE64, 'base64').toString('utf8')
        : ''
    );
    // Use raw with your JWT signer to call Apple APIs.
    ```

