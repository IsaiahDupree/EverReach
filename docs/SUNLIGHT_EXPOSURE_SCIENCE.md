# Sunlight Exposure: Science, Measurement, and Tracking

## How to Measure Sunlight Exposure

### What Are We Actually Measuring?

Sunlight exposure means different things depending on the goal:

| Goal | What to Measure | Units |
|------|----------------|-------|
| Skin health / burn risk / vitamin D | UV Index × time × skin area | SED (Standard Erythemal Dose) or arbitrary score |
| Circadian rhythm / mood | Bright light (lux) × time | Lux-minutes |
| Solar energy (engineering) | Solar irradiance | W/m² |

For a consumer wellness app, **UV Index + time + body coverage** is the right core model.

---

## The Core Formula

```
Session Dose = UV Index × Minutes × Exposure Factor × Sun Factor × Cloud Factor × Protection Factor
Daily Dose   = Σ(Session Doses)
```

### Factor Tables

**Exposure Factor** — how much skin is exposed:
| Coverage | Factor |
|----------|--------|
| Face + hands only | 0.25 |
| Face + forearms | 0.40 |
| Arms + lower legs | 0.60 |
| Shorts + t-shirt | 0.75 |
| Swimwear / shirtless | 1.00 |

**Sun Factor** — direct vs. indirect:
| Condition | Factor |
|-----------|--------|
| Indoors by window | 0.05–0.15 |
| Deep shade | 0.20 |
| Open shade outdoors | 0.35 |
| Partial direct sun | 0.65 |
| Full direct sun | 1.00 |

**Cloud Factor** — sky conditions:
| Condition | Factor |
|-----------|--------|
| Clear | 1.00 |
| Partly cloudy | 0.85 |
| Mostly cloudy | 0.65 |
| Overcast | 0.40 |

**Protection Factor** — sunscreen/clothing:
| Protection | Factor |
|------------|--------|
| None | 1.00 |
| SPF 15 | 0.70 |
| SPF 30 | 0.45 |
| SPF 50+ | 0.25 |
| Heavy clothing | 0.10–0.30 |

### Example Calculation

UV Index = 8, 20 minutes outside, arms + legs exposed (0.60), full direct sun (1.00), partly cloudy (0.85), SPF 30 (0.45):

```
Dose = 8 × 20 × 0.60 × 1.00 × 0.85 × 0.45 = 36.72 points
```

---

## Why Count Sessions, Not Just Total Minutes

Time of day matters enormously. Noon sun UV is 2–3× stronger than morning or late afternoon.
Splitting the day into sessions lets you apply the correct UV Index for each window.

**Example day:**
- 8:10 AM walk (12 min, UV 2) → low dose
- 12:45 PM lunch outside (18 min, UV 9) → high dose
- 5:30 PM park (25 min, UV 3) → medium dose

Total "55 minutes outside" hides the fact that 18 of those minutes did most of the work.

---

## Two Separate Scores

### 1. UV Dose Score
- Used for: skin exposure, tanning, burn risk, vitamin D support
- Built from: UV Index, time, exposed skin, protection, sun/shade
- High at noon; low early morning/evening

### 2. Bright Light Score (Circadian)
- Used for: circadian rhythm, mood, wakefulness
- Built from: lux/brightness, time outdoors, time of day
- Someone can get great morning light for circadian health with minimal UV skin dose

---

## What an iPhone Can Actually Provide

### Device Signals (no API needed)
| Signal | Source | What it tells us |
|--------|--------|------------------|
| Location (lat/lon) | Core Location | Where user is |
| GPS speed | `coords.speed` | Whether in vehicle |
| Motion type | Core Motion | Walking/running/cycling/automotive/stationary |
| Visit events | CLVisit | Arrived/left a place |
| Significant location changes | CLLocationManager | Low-power outdoor detection |
| Daylight state | Calculated from sunrise/sunset | Is it daytime? |

### What's NOT directly measurable from iPhone
- Exact UV hitting your skin
- Whether you're in shade vs. direct sun
- What clothing you're wearing
- What sunscreen you applied
- Whether windows are open in a car

These require user input or inference.

---

## Weather API Stack

### Primary: WeatherKit (Apple)
- Bundled with Apple Developer Program
- Provides: UV Index, cloud cover, condition codes, sunrise/sunset
- Available as framework (iOS) and REST API (backend)
- Monthly call limits apply

### Fallback + Historical: Open-Meteo
- Free for non-commercial use; commercial pricing available
- Provides: hourly UV Index, UV Index clear sky, cloud cover, historical weather, air quality, geocoding
- No API key required for basic usage
- Excellent for backfilling missed sessions

### Optional Additions
| API | Use case |
|-----|----------|
| Open-Meteo Air Quality | Pollen, pollution, outdoor quality recommendations |
| NWS (National Weather Service) | U.S. weather alerts and safety overlays |
| Reverse Geocoding (Apple Maps / Open-Meteo) | Named places in session log |

---

## Vehicle Detection

Car windows filter ~95% of UV-B radiation. A user driving with the sun on their face is NOT accumulating meaningful UV skin dose.

**SunTrace detection rule:**
```
GPS speed >= 8 m/s (~18 mph) → activityType = 'in_vehicle' → skip UV accumulation
```

This is why `useSunTracker` reads `coords.speed` on every poll and checks against `VEHICLE_SPEED_MS = 8`.

---

## Battery-Aware Architecture

Running full GPS all day kills battery. The right design is a staged state machine:

```
IDLE → CANDIDATE → ACTIVE_SESSION → COOLDOWN → IDLE
```

| State | Monitoring | Trigger |
|-------|-----------|---------|
| Idle | Significant location changes + visits | Daylight starts + motion detected |
| Candidate | Increased sampling | Outdoor evidence accumulating |
| Active Session | Periodic UV + speed poll | Session plausible |
| Cooldown | Step down | Session ended |

---

## The "Confidence" Layer

The system should never claim to *directly measure* UV dose. Instead it *estimates* outdoor exposure with a confidence score (0–1):

**Confidence rises when:**
- Motion = walking, running, cycling in daylight
- Location is fresh
- User moved meaningfully (not stationary at home for hours)
- Speed is below vehicle threshold

**Confidence falls when:**
- Motion = automotive
- Prolonged stationary at known indoor anchor
- Daylight = false
- No fresh location fix

```
sessionDose = minutes × uvIndex × outdoorConfidence × cloudFactor × shadeFactor × exposureFactor × protectionFactor
```

---

## Current SunTrace Implementation

### Simulation Mode (built in `useSunTracker.ts`)
Allows testing all conditions without real GPS/weather:

| Mode | UV | Speed | Result |
|------|-----|-------|--------|
| `'outside'` | 4.5 | 0.8 m/s (walking) | Green dot, tracking active |
| `'in_vehicle'` | 2.5 | 15 m/s (~34 mph) | Amber dot, not tracking |
| `'indoors'` | 0 | 0 | Grey dot, no UV |

### Activity Types
- `'outside'` — UV ≥ 1.0 AND speed < 8 m/s
- `'in_vehicle'` — speed ≥ 8 m/s
- `'indoors'` — UV = 0, stationary
- `'unknown'` — UV > 0 but below threshold

### Status Values
- `'tracking'` — actively accumulating UV minutes
- `'in_vehicle'` — vehicle detected, paused
- `'idle'` — UV below threshold but > 0
- `'no_uv'` — UV = 0 (night or fully inside)
- `'saving'` — writing session to database

---

## References

- Apple WeatherKit: https://developer.apple.com/weatherkit/
- Open-Meteo API: https://open-meteo.com/
- HealthKit `timeInDaylight`: HKQuantityTypeIdentifier.timeInDaylight
- NWS API: https://www.weather.gov/documentation/services-web-api
- UV Index scale: WHO / EPA standard (0–11+)
- SED (Standard Erythemal Dose): the scientific unit for UV skin dose; 1 SED = erythema threshold reference
