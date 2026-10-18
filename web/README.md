# EverReach Web

Next.js 14 web app for EverReach, using Tailwind CSS and Headless UI.

## Setup

1. Copy envs

```bash
cp .env.example .env.local
# Fill NEXT_PUBLIC_SUPABASE_ANON_KEY from Supabase project utasetfxiqcrnwyfforx
```

2. Install & run

```bash
npm install
npm run dev
```

App runs at http://localhost:3000

## Auth
- Supabase OAuth (Google)
- Add Site URL and Redirects in Supabase:
  - Site URL: http://localhost:3000
  - Redirect URL: http://localhost:3000/auth/callback

## Backend
- Uses `NEXT_PUBLIC_BACKEND_BASE` -> default `https://ever-reach-be.vercel.app`
- Requests include Bearer token from Supabase session

## Voice Notes
- Uploads to Supabase Storage bucket `media-assets`
- Creates a voice note via `POST /api/v1/me/persona-notes`
- Triggers transcription via `POST /api/v1/me/persona-notes/:id/transcribe`
- Requires profile.analytics_opt_in (else 403)

## Deploy
- Create a new Vercel project for `/web`
- Set environment variables:
  - NEXT_PUBLIC_BACKEND_BASE
  - NEXT_PUBLIC_SUPABASE_URL
  - NEXT_PUBLIC_SUPABASE_ANON_KEY
- Add your domain (e.g. https://everreach.app) to backend CORS allowlist via `CORS_ORIGINS`
