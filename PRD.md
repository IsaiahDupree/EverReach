# Product Requirements Document
# SunTrace — Personalized Outdoor Sunlight Coach
**Version:** 1.0
**Date:** 2026-04-12
**Status:** Draft — Ready for ACD Build

---

## Executive Summary

SunTrace is a personalized outdoor sunlight coaching app that helps health-conscious individuals understand how much sunlight they need daily, track how much they're actually getting, find the best outdoor spots for quality sun exposure, and build consistent outdoor habits — all backed by real-time weather APIs, UV data, location intelligence, and AI-powered health personalization.

**One-liner:** Your daily sunlight coach — personalized targets, smart forecasts, and the maps to get you outside.

---

## Problem Statement

Modern humans spend 90%+ of their time indoors. The result is a widespread Vitamin D deficiency crisis, disrupted circadian rhythms, poor sleep, low mood, and reduced energy — yet most people don't realize how easy the fix is: consistent, quality outdoor sunlight. There is no app that makes this easy, personalized, and genuinely motivating.

---

## Target User

### Primary ICP
- Age 22–45
- Health-conscious, follows wellness trends
- Uses fitness trackers, health apps, sleep tracking
- Has noticed low energy, mood dips, or sleep issues
- Wants to optimize their body without expensive supplements
- Lives in a city or suburb — has access to parks, trails, open spaces

### Secondary ICP
- Skin health and tanning enthusiasts
- Biohackers and longevity-focused individuals
- Athletes who train outdoors
- Travel planners who want sun-aware itineraries

---

## Product Vision

SunTrace is the definitive outdoor light intelligence platform. Every feature exists to answer one question: **"Did I get enough sunlight today, and what should I do about it?"**

In Year 1, SunTrace wins as a personal daily coach.
In Year 2, SunTrace becomes the map layer for outdoor sun quality.
In Year 3, SunTrace becomes the platform for evidence-based light therapy.

---

## Tech Stack (Built on App-Kit)

| Layer | Technology |
|-------|-----------|
| Mobile Framework | Expo / React Native (Expo Router) |
| Auth | Supabase Auth — email, Apple, Google |
| Database | Supabase (PostgreSQL + RLS) |
| Backend API | tRPC + Vercel Serverless |
| State Management | React Query + Zustand |
| Payments | RevenueCat (iOS + Android) |
| Location | expo-location |
| Notifications | expo-notifications |
| Health Sync | Apple HealthKit / Google Health (expo-health) |
| Weather API | Open-Meteo API (free, no key needed) / Tomorrow.io |
| UV Index API | OpenUV API / Open-Meteo solar radiation |
| Maps | Mapbox or Google Maps SDK |
| AI | Claude API (skin analysis, personalization coaching) |
| Camera | expo-image-picker (skin tone estimate) |
| Analytics | Mixpanel / PostHog |
| Push | Expo Push Notifications |

---

## Core Data Model

### Users / Profiles
```
id, email, created_at, subscription_tier
skin_type (fitzpatrick_1–6)
age, height_cm, weight_kg
location_lat, location_lng, timezone
health_sync_enabled (bool)
vitamin_d_supplements (bool)
daily_target_minutes (calculated)
```

### Sun Sessions (Logbook)
```
id, user_id, started_at, ended_at
duration_minutes
location_lat, location_lng, location_name
uv_index_at_time, cloud_cover_pct
skin_areas_exposed (array)
sunscreen_applied (bool)
estimated_vitamin_d_iu (calculated)
notes (text)
```

### Daily Stats
```
id, user_id, date
total_outdoor_minutes
sessions_count
target_minutes
completion_pct
peak_uv_window_start, peak_uv_window_end
mood_rating (1–5, optional)
energy_rating (1–5, optional)
sleep_hours (synced or manual)
```

### Sun Spots (Map POIs)
```
id, location_lat, location_lng, name
type (park, beach, rooftop, trail, field, plaza)
shade_pct (estimated)
avg_uv_score
city, country
submitted_by_user_id (crowdsource)
```

### Trip Plans
```
id, user_id, trip_name
start_date, end_date
destinations (array of lat/lng + name)
forecast_data (cached JSON)
notes
```

---

## Feature Tiers

### Free Tier
- Daily sunlight target (skin type + location only)
- Today's UV index + current conditions
- Basic session logging (manual)
- 7-day history
- UV warning alerts
- Peak sunlight time today
- Tip of the day

### Pro Tier ($3.99/month or $29.99/year)
- Full AI personalization (health data, skin analysis, supplements)
- Apple Health + Google Health sync
- Smart maps (best nearby spots right now)
- 7-day hourly forecast + sun opportunity score
- Trip Sun Planner
- Advanced logbook (skin areas, sunscreen, notes)
- Weekly and monthly analytics
- Mood + energy correlation
- Outdoor streak tracking + badges
- Smart widgets
- Friend challenges
- Cloud break predictions
- Plan disruption alerts (weather changed your outdoor plans)
- Circadian mode (morning light optimization)

### Pro+ / Family ($6.99/month or $59.99/year)
- Up to 5 family profiles
- Child-safe UV alert thresholds
- Family leaderboard
- Shared trip plans

---

## Core Screens

### 1. Home (Today)
- Sunlight ring (like activity ring) showing today's progress vs target
- Current UV index badge
- Best time window to go outside today (e.g. "10am–12pm: optimal")
- Quick-start session button
- Today's tip
- Indoor nudge if user hasn't logged a session by midday
- Weather summary card
- Streak display

### 2. Map (Sun Spots)
- Mapbox layer showing nearby open areas
- Sun quality score overlay (green/yellow/red by area)
- Filters: park, beach, trail, rooftop, plaza
- Real-time cloud cover overlay
- Tap a spot → UV now, forecast for next 3 hours, best time to visit
- "Crowdsource" button to add a spot
- Route to spot button

### 3. Forecast (7-Day Sun Planner)
- Hourly sun opportunity score for today and next 7 days
- Cloud cover %, UV index, temperature
- "Best day this week" recommendation
- Trip mode: input a destination and dates → get sun forecast for that trip
- Calendar integration option

### 4. Logbook (Sessions)
- List of all past outdoor sessions
- Quick-add session (tap + → set duration, location, notes)
- Auto-detect: GPS-based session detection when outdoors
- Session detail: UV at that time, estimated Vitamin D produced
- Export to CSV or PDF

### 5. Trends (Analytics)
- Weekly sunlight ring (total minutes vs target)
- Monthly bar chart
- Streak tracker (days hit target in a row)
- Mood vs sunlight correlation chart
- Sleep quality vs sunlight correlation
- Best and worst week comparisons
- City ranking: how you compare to others in your city

### 6. Profile + Settings
- Skin type selector (Fitzpatrick 1–6 with visual guide)
- Health profile (age, weight, height)
- Health app sync toggle
- Vitamin D supplements toggle
- Notification preferences
- Subscription management
- Privacy settings

### 7. Onboarding
- Welcome screen with solar branding
- Why sunlight matters (3-screen edu flow)
- Skin type selection
- Location permission
- Health data permission (optional)
- Notification permission
- Calculate first daily target
- Paywall (soft gate after onboarding)

---

## AI Features (Claude API)

### 1. Skin Tone Estimation
- User optionally takes a photo of inner arm
- Claude vision estimates Fitzpatrick type
- Confirms with user before saving

### 2. Daily Sunlight Coach
- Chat interface: "How much sunlight do I need today?"
- Context-aware: knows your profile, today's weather, recent sessions
- Can answer: "Is this sunscreen safe to use?", "What time should I go outside today?", "How do I build a morning light routine?"

### 3. Smart Insights
- Weekly AI-generated insight: "You got the most sun on Wednesdays — try to replicate that habit"
- Anomaly detection: "You haven't logged any sessions in 5 days — here's a plan to get back on track"
- Seasonal coaching: "Winter is coming — here's how to maintain your vitamin D levels"

### 4. Personalization Engine
- Adjusts daily target based on: skin type + location + time of year + cloud cover forecast + supplement use + health sync data
- Formula: base UV dose × skin factor × latitude adjustment × seasonal factor × supplement offset

---

## Notifications Strategy

| Trigger | Message |
|---------|---------|
| Morning (8am) | "Today's best sun window: 10am–12pm. UV: 6. Get outside." |
| Midday nudge | "You haven't logged sun yet today. 20 mins could hit your target." |
| Plan disruption | "Weather changed for Saturday. Your planned outdoor time may be cloudy." |
| UV warning | "UV index is 9+ in your area. Limit direct exposure or use SPF." |
| Streak alert | "Don't break your 7-day streak. 15 mins left in today's window." |
| Weekly recap | "You hit 68% of your sunlight goal this week. Here's your plan for next week." |

---

## Personalization Formula

```
Daily Target (minutes) =
  base_minutes(skin_type)
  × latitude_factor(location)
  × seasonal_factor(month)
  × cloud_factor(forecast_avg)
  × supplement_offset(vitamin_d_pills)
  × age_factor(age)
  × uv_efficiency_factor(uv_index_avg)
```

**Skin Type Bases (Fitzpatrick Scale):**
| Type | Description | Base Minutes (summer midday) |
|------|-------------|------|
| I | Very fair, burns easily | 5–10 min |
| II | Fair, burns easily | 10–15 min |
| III | Medium, sometimes burns | 15–20 min |
| IV | Olive, rarely burns | 20–30 min |
| V | Brown, very rarely burns | 30–40 min |
| VI | Dark, almost never burns | 40–60 min |

---

## Weather + UV API Integration

### Primary: Open-Meteo (Free)
- `latitude`, `longitude`
- `current_weather.weathercode`
- `hourly.uv_index`
- `hourly.cloud_cover`
- `hourly.shortwave_radiation`
- `hourly.direct_radiation`
- `hourly.diffuse_radiation`

### Secondary: Tomorrow.io (Paid — Pro tier)
- UV index realtime
- Cloud cover
- Solar GHI
- Pollen (future feature)
- Air quality

---

## Monetization Details

| Plan | Price | Billing | Features |
|------|-------|---------|---------|
| Free | $0 | — | Basic tracking, UV, today's target |
| Pro Monthly | $3.99 | Monthly | Full feature set |
| Pro Annual | $29.99 | Annual (save 37%) | Full feature set |
| Family | $6.99 | Monthly | 5 profiles, family board |
| Family Annual | $59.99 | Annual | 5 profiles |

**RevenueCat entitlements:**
- `pro` — unlocks all Pro features
- `family` — unlocks Pro + family profiles

---

## KPIs

| Metric | 30-Day Target | 90-Day Target |
|--------|--------------|--------------|
| Downloads | 1,000 | 10,000 |
| D1 Retention | 40% | 45% |
| D7 Retention | 20% | 25% |
| Trial Start Rate | 30% | 35% |
| Trial→Paid Conversion | 15% | 20% |
| Monthly Active Users | 500 | 5,000 |
| Avg Sessions Logged/User/Week | 3 | 5 |
| Revenue MRR | $200 | $2,000 |

---

## App Store Metadata

**Name:** SunTrace
**Subtitle:** Your Daily Sunlight Coach
**Category:** Health & Fitness
**Keywords:** sunlight, vitamin d, sun tracker, UV index, outdoor timer, skin health, circadian rhythm, sun map, wellness, sun exposure
**Description (short):** Track how much sunlight you need and get each day. Personalized goals, smart maps, and real-time UV intelligence to help you get outside more.

---

## MVP Scope (ACD Build Target)

### Phase 1 — Core (Weeks 1–3)
- [x] App-kit base (auth, paywall, navigation, Supabase)
- [ ] Onboarding with skin type + location + health sync
- [ ] Home screen with daily target ring + UV + best time
- [ ] Manual session logging
- [ ] Open-Meteo API integration
- [ ] Basic notifications (morning + UV warning)
- [ ] RevenueCat paywall (Free vs Pro)

### Phase 2 — Maps + Forecast (Weeks 4–6)
- [ ] Mapbox sun spot map
- [ ] 7-day hourly sun forecast
- [ ] Plan disruption alerts
- [ ] Logbook with analytics
- [ ] Weekly recap screen

### Phase 3 — AI + Social (Weeks 7–10)
- [ ] Claude API chat coach
- [ ] Skin tone camera estimate
- [ ] Mood + sleep correlation
- [ ] Friend challenges
- [ ] Trip planner
- [ ] Apple Health / Google Health sync

---

## App Store Submission Checklist
- [ ] App icon (1024x1024)
- [ ] Screenshots (6.7", 6.1", iPad)
- [ ] Privacy policy URL
- [ ] App description
- [ ] Keywords
- [ ] Age rating
- [ ] HealthKit usage description
- [ ] Location usage description
- [ ] Camera usage description (skin analysis)
- [ ] Push notification entitlement
