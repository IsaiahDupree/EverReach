# PRD: SunTrace Sunlight Dose Engine
**Version:** 1.0
**Date:** 2026-04-12
**Status:** Ready for ACD dispatch
**Branch:** ios-app → suntrace-dose-engine

---

## 1. Product Overview

SunTrace currently tracks UV index and accumulates outdoor minutes using GPS + UV polling. This PRD upgrades it from a simple "UV timer" to a **full sunlight dose estimation engine** that computes a scientifically-grounded daily exposure score using:

- iPhone GPS speed (vehicle detection — already shipped)
- Core Motion activity type (walking/running/cycling/automotive)
- Weather enrichment (cloud cover, UV forecast, historical backfill)
- User-configured modifiers (sunscreen, skin exposure, shade)
- Outdoor confidence scoring
- Session-level dose calculation with day totals

The dose engine produces two separate scores per day:
1. **UV Dose Score** — for skin exposure, vitamin D support, burn risk
2. **Daylight Minutes Score** — for circadian rhythm, mood, outdoor habit tracking

---

## 2. Problem Statement

Current SunTrace limitation: it counts minutes where UV ≥ 1.0 AND speed < 8 m/s. This treats a minute under UV=1 (hazy morning) the same as a minute under UV=10 (noon summer sun). That's a 10× error.

Additionally:
- No cloud factor applied
- No distinction between direct sun and shade
- No sunscreen/skin coverage modifiers
- No outdoor confidence weighting
- No circadian (morning light) tracking
- No vehicle detection in the score (only prevents accumulation)

The upgraded engine fixes all of this.

---

## 3. Goals

### Must Have (v1 of dose engine)
- [ ] UV-weighted session dose formula
- [ ] Cloud factor from weather API
- [ ] Vehicle detection already shipping — integrate into dose math
- [ ] User-configurable sunscreen + skin exposure modifiers
- [ ] Shade selector per session
- [ ] Outdoor confidence score per session
- [ ] Daily totals: UV Dose Score + Daylight Minutes + Morning Light Minutes
- [ ] Session history screen with per-session breakdown
- [ ] Recalculate day when modifiers change

### Should Have (v1.5)
- [ ] Open-Meteo historical backfill for missed sessions
- [ ] Morning light window detection (sunrise to +3 hours)
- [ ] Overexposure risk estimate
- [ ] Remaining suggested exposure today

### Nice to Have (v2)
- [ ] Place names (reverse geocoding)
- [ ] Weekly trends + streak
- [ ] Notification: "Best UV window in 20 min"
- [ ] HealthKit `timeInDaylight` as secondary validation

---

## 4. Scoring Model

### 4.1 Session UV Dose

```typescript
sessionUVDose =
  durationMinutes
  × uvIndex
  × outdoorConfidence     // 0.0–1.0
  × cloudFactor           // from weather API
  × shadeFactor           // user input
  × exposureFactor        // user input: skin area
  × protectionFactor      // user input: sunscreen
```

### 4.2 Factor Lookup Tables

**Cloud Factor** (derived from weather `cloudCover` 0–100%):
```typescript
cloudCover 0–15%   → 1.00
cloudCover 16–40%  → 0.85
cloudCover 41–65%  → 0.65
cloudCover 66–100% → 0.40
```

**Shade Factor** (user-entered per session):
```typescript
'full_sun'        → 1.00
'partial_sun'     → 0.65
'open_shade'      → 0.35
'deep_shade'      → 0.15
```

**Exposure Factor** (user profile default, overridable per session):
```typescript
'face_hands'      → 0.25
'face_forearms'   → 0.40
'arms_legs'       → 0.60
'shorts_tshirt'   → 0.75
'swimwear'        → 1.00
```

**Protection Factor** (user profile default, overridable per session):
```typescript
'none'            → 1.00
'spf_15'          → 0.70
'spf_30'          → 0.45
'spf_50'          → 0.25
'covered'         → 0.10
```

### 4.3 Outdoor Confidence Score

```typescript
function calcOutdoorConfidence(session: RawSession): number {
  let score = 0.5; // baseline

  if (session.motionType === 'walking')    score += 0.25;
  if (session.motionType === 'running')    score += 0.30;
  if (session.motionType === 'cycling')    score += 0.20;
  if (session.motionType === 'automotive') score  = 0.05; // strong override
  if (session.motionType === 'stationary') score -= 0.10;

  if (session.isDaylight)                  score += 0.15;
  if (session.locationFreshSeconds < 300)  score += 0.10;
  if (session.distanceMovedMeters > 50)    score += 0.10;
  if (session.speed > 0 && session.speed < 2.5) score += 0.05; // walking pace

  return Math.min(1.0, Math.max(0.0, score));
}
```

### 4.4 Daily Totals

```typescript
dailyUVDose      = Σ(sessionUVDose)
dailyDaylightMin = Σ(session.durationMinutes × session.outdoorConfidence)
morningLightMin  = Σ(session.daylightMinutes where session.startTime < sunrise + 3h)
```

---

## 5. Data Model Changes

### New: `session_modifiers` table
```sql
CREATE TABLE session_modifiers (
  session_id        UUID REFERENCES sun_sessions(id) ON DELETE CASCADE,
  shade_factor      DECIMAL(4,2) DEFAULT 1.0,
  exposure_factor   DECIMAL(4,2) DEFAULT 0.75,
  protection_factor DECIMAL(4,2) DEFAULT 1.0,
  source            TEXT CHECK (source IN ('default', 'manual', 'inferred')),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (session_id)
);
```

### New: `session_weather` table
```sql
CREATE TABLE session_weather (
  session_id    UUID REFERENCES sun_sessions(id) ON DELETE CASCADE,
  uv_index      DECIMAL(4,1),
  cloud_cover   INTEGER,        -- 0–100%
  cloud_factor  DECIMAL(4,2),  -- derived
  condition     TEXT,
  sunrise_time  TIMESTAMPTZ,
  sunset_time   TIMESTAMPTZ,
  temperature_c DECIMAL(5,1),
  provider      TEXT DEFAULT 'open-meteo',
  fetched_at    TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (session_id)
);
```

### Modify: `sun_sessions` table — add columns
```sql
ALTER TABLE sun_sessions ADD COLUMN IF NOT EXISTS
  outdoor_confidence DECIMAL(4,2) DEFAULT 0.8;

ALTER TABLE sun_sessions ADD COLUMN IF NOT EXISTS
  uv_dose_score DECIMAL(8,2);

ALTER TABLE sun_sessions ADD COLUMN IF NOT EXISTS
  daylight_minutes_effective DECIMAL(8,2);

ALTER TABLE sun_sessions ADD COLUMN IF NOT EXISTS
  motion_type TEXT CHECK (motion_type IN ('walking','running','cycling','automotive','stationary','unknown'));

ALTER TABLE sun_sessions ADD COLUMN IF NOT EXISTS
  calc_version INTEGER DEFAULT 1;
```

### New: `daily_summaries` table
```sql
CREATE TABLE daily_summaries (
  user_id                    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date_local                 DATE,
  uv_dose_score              DECIMAL(10,2) DEFAULT 0,
  daylight_minutes           DECIMAL(8,2)  DEFAULT 0,
  morning_light_minutes      DECIMAL(8,2)  DEFAULT 0,
  overexposure_risk          TEXT CHECK (overexposure_risk IN ('low','moderate','high','very_high')) DEFAULT 'low',
  remaining_suggested_min    DECIMAL(8,2),
  session_count              INTEGER DEFAULT 0,
  calc_version               INTEGER DEFAULT 1,
  recalculated_at            TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, date_local)
);
```

### New: `user_sun_profile` table
```sql
CREATE TABLE user_sun_profile (
  user_id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_mode             TEXT CHECK (goal_mode IN ('balanced','circadian','vitamin_d','tanning_aware')) DEFAULT 'balanced',
  skin_sensitivity      TEXT CHECK (skin_sensitivity IN ('very_fair','fair','medium','olive','dark')) DEFAULT 'medium',
  default_shade         TEXT DEFAULT 'full_sun',
  default_exposure      TEXT DEFAULT 'shorts_tshirt',
  default_protection    TEXT DEFAULT 'none',
  morning_window_hours  INTEGER DEFAULT 3,
  daily_target_dose     DECIMAL(8,2) DEFAULT 100,
  notifications_enabled BOOLEAN DEFAULT true,
  updated_at            TIMESTAMPTZ DEFAULT now()
);
```

### New: `weather_cache` table
```sql
CREATE TABLE weather_cache (
  geohash5      TEXT,             -- 5-char geohash (~5km cell)
  hour_bucket   TIMESTAMPTZ,      -- truncated to hour
  uv_index      DECIMAL(4,1),
  cloud_cover   INTEGER,
  cloud_factor  DECIMAL(4,2),
  sunrise_time  TIMESTAMPTZ,
  sunset_time   TIMESTAMPTZ,
  provider      TEXT DEFAULT 'open-meteo',
  fetched_at    TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (geohash5, hour_bucket, provider)
);
```

---

## 6. Weather Integration

### 6.1 Open-Meteo Endpoint
```
GET https://api.open-meteo.com/v1/forecast
  ?latitude={lat}
  &longitude={lon}
  &hourly=uv_index,cloudcover,is_day
  &daily=sunrise,sunset
  &timezone=auto
  &forecast_days=1
```

Historical backfill:
```
GET https://archive-api.open-meteo.com/v1/archive
  ?latitude={lat}&longitude={lon}
  &start_date={YYYY-MM-DD}&end_date={YYYY-MM-DD}
  &hourly=uv_index,cloudcover,is_day
  &timezone=auto
```

### 6.2 Caching Strategy
- Cache by `(geohash5, hourBucket)` — 5-char geohash covers ~5km, hourly buckets
- TTL: 2 hours for forecast; permanent for historical
- On miss: fetch fresh, store, return
- On fetch error: use nearest cached bucket within 2 hours and same geohash

### 6.3 Cloud Factor Derivation
```typescript
function cloudFactor(cloudCoverPct: number): number {
  if (cloudCoverPct <= 15)  return 1.00;
  if (cloudCoverPct <= 40)  return 0.85;
  if (cloudCoverPct <= 65)  return 0.65;
  return 0.40;
}
```

---

## 7. New Services to Build

### 7.1 `services/sunDoseCalculator.ts`
Pure TypeScript — no side effects. Input a session + modifiers + weather, output dose score.

```typescript
export interface DoseInputs {
  durationMinutes: number;
  uvIndex: number;
  outdoorConfidence: number;
  cloudFactor: number;
  shadeFactor: number;
  exposureFactor: number;
  protectionFactor: number;
}

export function calcSessionUVDose(inputs: DoseInputs): number {
  const {
    durationMinutes, uvIndex, outdoorConfidence,
    cloudFactor, shadeFactor, exposureFactor, protectionFactor
  } = inputs;
  return (
    durationMinutes * uvIndex * outdoorConfidence *
    cloudFactor * shadeFactor * exposureFactor * protectionFactor
  );
}

export function calcDailyTotals(sessions: ScoredSession[]): DailyTotals {
  return {
    uvDoseScore:          sessions.reduce((s, x) => s + x.uvDoseScore, 0),
    daylightMinutes:      sessions.reduce((s, x) => s + x.daylightMinutesEffective, 0),
    morningLightMinutes:  sessions.filter(isMorningSession).reduce((s, x) => s + x.daylightMinutesEffective, 0),
    overexposureRisk:     deriveOverexposureRisk(sessions),
  };
}
```

### 7.2 `services/weatherEnrichment.ts`
Fetches + caches Open-Meteo data. Returns `WeatherSnapshot` for a given lat/lon + timestamp.

```typescript
export interface WeatherSnapshot {
  uvIndex: number;
  cloudCover: number;   // 0–100
  cloudFactor: number;  // derived
  sunriseTime: string;
  sunsetTime: string;
  isDaylight: boolean;
  provider: string;
  fetchedAt: string;
}

export async function getWeatherForSession(
  lat: number, lon: number, timestamp: Date
): Promise<WeatherSnapshot>
```

### 7.3 `services/outdoorConfidence.ts`
Calculates confidence 0–1 from session signals.

```typescript
export interface SessionSignals {
  motionType: MotionType;
  isDaylight: boolean;
  locationFreshSeconds: number;
  distanceMovedMeters: number;
  speed: number;
  durationMinutes: number;
}

export function calcOutdoorConfidence(signals: SessionSignals): number
```

### 7.4 `hooks/useDailyDose.ts`
New hook — reads `daily_summaries` for today, updates when sessions change.

```typescript
export interface DailyDose {
  uvDoseScore: number;
  daylightMinutes: number;
  morningLightMinutes: number;
  overexposureRisk: 'low' | 'moderate' | 'high' | 'very_high';
  remainingSuggestedMin: number | null;
  sessionCount: number;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

export function useDailyDose(date?: string): DailyDose
```

---

## 8. UI Changes

### 8.1 Sun Home Screen — Dose Display
Replace raw "minutes today" ring with a two-metric display:
- **UV Dose Score** (large, colored by risk band)
- **Daylight Minutes** (secondary, smaller)

UV Dose color bands:
```
0–30     → #64748B (gray)   — low
30–80    → #F97316 (orange) — building
80–150   → #FCD34D (amber)  — good
150–250  → #EF4444 (red)    — caution
250+     → #7C3AED (purple) — overexposure
```

### 8.2 Session Card — Modifier Quick-Log
After each detected session, show a bottom sheet:
- Shade: [Full Sun] [Partial] [Shade]
- Skin: [Covered] [Shorts+Tee] [Swimwear]
- Protection: [None] [SPF 15] [SPF 30] [SPF 50+]
- Confidence bar: "We're X% confident you were outside"

### 8.3 Session History Screen
- Per-session: time, duration, UV index, dose score, modifiers
- Day total bar at top
- Edit button on each session

### 8.4 Dose Breakdown Modal
Tap the dose score → show math:
```
Session at 12:34 PM
  Duration:    18 min
  UV Index:    8.2
  Cloud:       0.85 (partly cloudy)
  Confidence:  0.82 (walking in daylight)
  Shade:       1.00 (full sun)
  Skin:        0.75 (shorts + tee)
  Sunscreen:   0.45 (SPF 30)
  ─────────────────────────
  Dose Score:  32.1 pts
```

### 8.5 User Profile — Sun Preferences
- Goal mode: Balanced / Circadian / Vitamin D / Tanning-Aware
- Skin sensitivity: Very Fair → Dark
- Default shade/skin/sunscreen
- Daily target dose band

---

## 9. Backend Endpoints (Vercel/Next.js)

### `POST /api/sessions/[id]/score`
Re-calculates and stores dose for a single session.
- Fetches weather for session time + location
- Applies modifiers (from DB or request body override)
- Saves to `session_weather`, `session_modifiers`, updates `sun_sessions.uv_dose_score`
- Updates `daily_summaries` for that date

### `POST /api/daily/recalculate`
```json
{ "date": "2026-04-12", "userId": "..." }
```
Re-scores all sessions for a day, rebuilds `daily_summaries`.

### `GET /api/daily/[date]`
Returns `daily_summaries` row + session list for that day.

### `PATCH /api/sessions/[id]/modifiers`
```json
{
  "shadeFactor": 0.35,
  "exposureFactor": 0.75,
  "protectionFactor": 0.45
}
```
Updates modifiers, triggers re-score.

### `GET /api/weather/snapshot?lat=&lon=&ts=`
Returns cached or fresh `WeatherSnapshot`. Used client-side for live UV display.

---

## 10. Supabase Migrations Required

1. `add_session_dose_columns.sql` — add `uv_dose_score`, `outdoor_confidence`, `motion_type`, `calc_version` to `sun_sessions`
2. `create_session_modifiers.sql`
3. `create_session_weather.sql`
4. `create_daily_summaries.sql`
5. `create_user_sun_profile.sql`
6. `create_weather_cache.sql`
7. `add_rls_policies.sql` — RLS for all new tables

---

## 11. Feature List (for ACD)

See `features-dose-engine.json` in project root.

---

## 12. Non-Goals for This Sprint

- HealthKit timeInDaylight integration
- Apple Watch companion
- Social/sharing features
- Wearable UV sensor support
- Clinical vitamin D diagnosis language
- Direct sunscreen detection

---

## 13. Acceptance Criteria

- [ ] A session with UV=8, 20min, SPF30, full sun, partly cloudy, outdoorConfidence=0.8 scores within ±2% of expected value (36.72 × 0.8 = 29.4)
- [ ] Vehicle sessions (speed ≥ 8 m/s) contribute 0 to UV dose
- [ ] Simulated sessions (Outside/In Car/Indoors) produce correct dose values in dev
- [ ] Daily summary updates within 5 seconds of session save
- [ ] Weather cache hit rate ≥ 80% in normal usage
- [ ] Modifier changes trigger recalculation without requiring app restart
- [ ] All new Supabase tables have RLS policies

---

## 14. Technical Stack

| Layer | Technology |
|-------|-----------|
| Mobile | Expo / React Native (existing) |
| Weather | Open-Meteo API (free tier) |
| Backend | Vercel Next.js serverless functions |
| Database | Supabase (existing project) |
| Cache | Supabase table `weather_cache` |
| Score engine | Pure TypeScript, client + server |
| State | Zustand (existing `userStore`) |
