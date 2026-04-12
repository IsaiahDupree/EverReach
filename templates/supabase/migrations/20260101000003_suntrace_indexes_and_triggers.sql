-- Migration: SunTrace performance indexes + automatic profile creation trigger
-- F2115: index on sun_sessions(user_id, started_at DESC) for fast logbook queries
-- F2120: automatic profile creation via trigger on auth.users insert

-- ── Indexes ────────────────────────────────────────────────────────────────────

-- Primary lookup pattern: fetch sessions for a user ordered by most recent
CREATE INDEX IF NOT EXISTS idx_sun_sessions_user_started_at
  ON public.sun_sessions (user_id, started_at DESC);

-- For daily stats aggregation: filter sessions by date range per user
CREATE INDEX IF NOT EXISTS idx_sun_sessions_user_date
  ON public.sun_sessions (user_id, started_at);

-- For badge evaluation: find all user_badges for a user
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id
  ON public.user_badges (user_id);

-- For coach message history: chronological conversation per user
CREATE INDEX IF NOT EXISTS idx_coach_messages_user_id_created
  ON public.coach_messages (user_id, created_at);

-- For daily stats lookup: exact date match per user
CREATE INDEX IF NOT EXISTS idx_daily_stats_user_date
  ON public.daily_stats (user_id, date);

-- For sun spots: geospatial queries (requires PostGIS — create separately if needed)
-- CREATE INDEX IF NOT EXISTS idx_sun_spots_location
--   ON public.sun_spots USING gist (ST_Point(longitude, latitude));

-- ── Automatic profile creation trigger ────────────────────────────────────────
-- Creates a sun_profiles row whenever a new user signs up via Supabase Auth.
-- This ensures every user has a profile immediately after sign-in.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.sun_profiles (
    user_id,
    skin_type,
    daily_d_target_iu,
    streak_count,
    notifications_enabled,
    healthkit_enabled,
    location_enabled,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    2,          -- Default: Fitzpatrick Type II (Fair) — updated during onboarding
    1200,       -- Default daily IU target for Type II
    0,          -- No streak yet
    false,
    false,
    false,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;  -- Idempotent — safe to re-run

  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists (idempotent migration)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Attach trigger to auth.users insert
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── Comments ───────────────────────────────────────────────────────────────────

COMMENT ON FUNCTION public.handle_new_user() IS
  'Automatically creates a sun_profiles row for every new Supabase auth user. '
  'Skin type defaults to 2 (Fair) and is updated during onboarding flow.';
