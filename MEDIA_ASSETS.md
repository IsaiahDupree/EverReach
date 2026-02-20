# EverReach — Media Asset Directory
## All Asset Locations for Ad Creation Reference

> **Last Updated:** Feb 20, 2026
> **Purpose:** Single reference for every media asset available for ad creation — logos, screenshots, app icons, branding. Use this when building creatives in Canva, CapCut, Adobe, or any design tool.

---

## Quick Reference: Most-Used Assets for Ads

| Asset | Best For | Path |
|-------|---------|------|
| **App icon (1024px)** | Ad overlays, end cards, thumbnails | `ios-app/assets/branding/icons/appstore-icon-1024.png` |
| **App icon flat (1024px)** | Clean backgrounds, carousels | `ios-app/assets/branding/icons/appstore-icon-1024-flat.png` |
| **Logo no background** | Overlays on video, dark/light bg | `ios-app/assets/branding/logo-no-bg.png` |
| **Warmth score screenshot** | Warmth angle ads (Angle 2) | `marketing/app-store-screenshots/05-warmth-score.png` |
| **Contact list screenshot** | Any contact/network angle | `marketing/app-store-screenshots/01-contacts-list.png` |
| **AI compose screenshot** | AI message angle (Angle 4) | `marketing/app-store-screenshots/06-goal-compose.png` |
| **Voice note screenshot** | Voice notes angle (Angle 9) | `marketing/app-store-screenshots/03-voice-note.png` |
| **Latest iPhone 17 Pro Max shots** | Highest quality for paid ads | `marketing/screenshots/appstore-2025-11-22-1709/iPhone-17-Pro-Max/` |
| **Subscription screenshot** | Paywall / pricing creatives | `marketing/subscription-screenshot-iphone-17-pro-max.png` |

---

## Full Asset Map

### 1. Logos & Branding
**Location:** `ios-app/assets/branding/`

```
ios-app/assets/branding/
├── icons/
│   ├── appstore-icon-1024.png          ← App Store icon (rounded corners, shadow)
│   ├── appstore-icon-1024-flat.png     ← Flat version (no shadow, clean bg)
│   └── play-icon-512.png               ← Google Play icon (512px)
├── feature-graphic-1024x500.svg        ← Google Play feature graphic (SVG)
├── logo-ai-enhanced-1024.png           ← Full logo with "AI Enhanced" text
├── logo-auth-page.png                  ← Auth page logo variant
├── logo-comparison.png                 ← Side-by-side comparison logo
├── logo-cropped-1024.png               ← Cropped tight version
├── logo-enhanced-1024.png              ← Enhanced/polished version
├── logo-final-1024.png                 ← Final production logo ← USE THIS
├── logo-no-bg.png                      ← Transparent background ← USE FOR VIDEO OVERLAYS
├── logo-optimized-1024.png             ← Web-optimized version
├── logo-source-1024.png                ← Source/master version
├── logo-tight.png                      ← Tight crop, no padding
└── logo-with-container.png             ← Logo inside rounded container
```

**App icons (in-app):**
```
ios-app/assets/images/
├── icon.png                            ← App icon (Expo)
├── adaptive-icon.png                   ← Android adaptive icon
├── splash-icon.png                     ← Splash screen logo
└── favicon.png                         ← Web favicon
```

---

### 2. App Store Screenshots (Canonical Set)
**Location:** `marketing/app-store-screenshots/`
**Device:** iPhone 17 Pro Max | **Use for:** Ad mockups, carousels, static images

```
marketing/app-store-screenshots/
├── 01-contacts-list.png    ← Contact list with warmth color coding
├── 02-contact-detail.png   ← Single contact detail view
├── 03-voice-note.png       ← Voice note recording screen
├── 04-search-tags.png      ← Search and tags view
├── 05-warmth-score.png     ← Warmth score / relationship health view ← KEY ASSET
├── 06-goal-compose.png     ← AI message composer / goal picker ← KEY ASSET
├── 07-subscription.png     ← Subscription / paywall screen
└── 08-settings.png         ← Settings screen
```

---

### 3. Screenshot Sessions (Dated Versions)
Multiple capture sessions — use the **1709 session** (latest, highest quality) for paid ads.

#### Latest — iPhone 17 Pro Max + Pro (Nov 22, 2025 @ 17:09)
**Location:** `marketing/screenshots/appstore-2025-11-22-1709/`

```
appstore-2025-11-22-1709/
├── iPhone-17-Pro-Max/
│   ├── 01-contacts-list.png
│   ├── 02-contact-detail.png
│   ├── 03-voice-note.png
│   ├── 04-search-tags.png
│   ├── 05-warmth-score.png
│   ├── 06-goal-compose.png
│   ├── 07-subscription.png
│   └── 08-settings.png
└── iPhone-17-Pro/
    ├── 01-contacts-list.png
    ├── 02-contact-detail.png
    ├── 03-voice-note.png
    ├── 04-search-tags.png
    ├── 05-warmth-score.png
    ├── 06-goal-compose.png
    └── 07-subscription.png
```

#### iPad Screenshots (Dec 4, 2025)
**Location:** `marketing/screenshots/appstore-ipad-2025-12-04-0129/`

```
appstore-ipad-2025-12-04-0129/
├── 01-contacts-list.png
├── 02-contact-detail.png
├── 03-voice-note.png
├── 04-search-tags.png
├── 05-warmth-score.png
├── 06-goal-compose.png
├── 07-subscription.png
└── 08-settings.png
```

#### Earlier Sessions (Lower Priority)
```
screenshots/appstore-2025-11-22-1453/iPhone-17-Pro-Max/   ← 2 screens only
screenshots/appstore-2025-11-22-1504/iPhone-17-Pro-Max/   ← 8 screens
screenshots/appstore-2025-11-22-1611/iPhone-17-Pro-Max/   ← 4 screens
```

---

### 4. Subscription / Paywall Screenshots
**Location:** `marketing/`

```
marketing/
├── subscription-screenshot-iphone-17-pro-max.png   ← Paywall on Pro Max
└── subscription-screenshot-iphone-17-pro.png       ← Paywall on Pro
```
**Use for:** Most-aware ads (Stage 5), "cancel anytime" objection killer shots.

---

## Asset-to-Ad Angle Mapping

Use this to quickly find the right screenshot for each ad angle.

| Ad Angle | Key Screenshot(s) | Supporting Asset |
|----------|------------------|-----------------|
| **Angle 1: Forgotten Follow-Up** | `01-contacts-list.png` (show cold contacts) | `05-warmth-score.png` |
| **Angle 2: Warmth Score** | `05-warmth-score.png` ← primary | `01-contacts-list.png` |
| **Angle 3: 3-Minute Routine** | `01-contacts-list.png` + `06-goal-compose.png` | `02-contact-detail.png` |
| **Angle 4: AI That Sounds Like You** | `06-goal-compose.png` ← primary | `02-contact-detail.png` |
| **Angle 5: Card Scan** | Live screen recording (no static) | `02-contact-detail.png` (result) |
| **Angle 6: Network = Net Worth** | `01-contacts-list.png` + `05-warmth-score.png` | App icon |
| **Angle 7: Before / After** | `01-contacts-list.png` (after) | Warmth grid |
| **Angle 8: Switcher** | `05-warmth-score.png` + `06-goal-compose.png` | App icon |
| **Angle 9: Voice Notes** | `03-voice-note.png` ← primary | `02-contact-detail.png` |
| **Stage 5: Objection Killer** | `subscription-screenshot-iphone-17-pro-max.png` | Settings screen |

---

## Screen Recording Guidance

For video ads (most important creative type), you need **live screen recordings** from the app — not static screenshots. These are not stored in the repo; they need to be captured fresh.

### What to Record (by Ad Beat)

| Beat | What to Record | Duration |
|------|---------------|----------|
| Contact list warmth grid | Scroll through contacts, warmth colors visible | 3–5s |
| Warmth score detail | Tap a contact, warmth score animates | 2–3s |
| Reminder ping | Notification banner appearing | 1–2s |
| AI compose | Tap compose → goal picker → message generates | 4–6s |
| Message starter select | Tap a starter → message populates | 2–3s |
| Card scan | Camera opens → card fills frame → contact created | 4–5s |
| Voice note record | Tap record → speak → transcription appears | 4–6s |
| Settings / cadence | Scroll through warmth settings | 2–3s |

### Recording Tips
- Use iPhone 17 Pro Max for highest quality (matches App Store screenshots)
- Record at native resolution, export at 1080×1920 (9:16) for Reels/TikTok
- Light mode preferred for marketing (higher contrast, matches App Store screenshots)
- Record 2–3 takes of each beat — you'll want options in editing

---

## Brand Colors (For Design Tools)

From `BRAND_GUIDELINES.md` — use these when building ad graphics:

| Color | Hex | Use |
|-------|-----|-----|
| **Primary Black** | `#000000` | Buttons, text, overlays |
| **White** | `#FFFFFF` | Backgrounds, cards |
| **Light Background** | `#F8F9FA` | App background |
| **Hot (Red)** | `#FF6B6B` | Hot warmth indicator |
| **Warm (Orange)** | `#FFB366` | Warm warmth indicator |
| **Cool (Teal)** | `#4ECDC4` | Cool warmth indicator |
| **Cold (Gray)** | `#95A5A6` | Cold warmth indicator |
| **Success Green** | `#10B981` | Positive actions |

---

## Ad Spec Reference (Platform Sizes)

| Platform | Format | Size | Notes |
|----------|--------|------|-------|
| Meta Feed | Square | 1080×1080 | Static images, carousels |
| Meta Feed | Portrait | 1080×1350 (4:5) | Best feed real estate |
| Meta Reels / Stories | Vertical | 1080×1920 (9:16) | Video + static |
| TikTok | Vertical | 1080×1920 (9:16) | Video |
| YouTube Shorts | Vertical | 1080×1920 (9:16) | Video |
| App Store Preview | Vertical | 886×1920 (iPhone) | Video preview |
| App Store Screenshot | Vertical | 1290×2796 (iPhone 17 Pro Max) | Static |

---

## Where to Find More Assets

| Need | Location |
|------|---------|
| App icon variants | `ios-app/assets/branding/icons/` |
| Logo variants (14 versions) | `ios-app/assets/branding/` |
| Latest App Store screenshots | `marketing/screenshots/appstore-2025-11-22-1709/` |
| Canonical 8-screenshot set | `marketing/app-store-screenshots/` |
| Paywall screenshots | `marketing/subscription-screenshot-iphone-17-pro-max.png` |
| Brand colors + typography | `marketing/BRAND_GUIDELINES.md` |
| Ad copy library | `marketing/META_ADS_PLAYBOOK.md` |
| Script library | `marketing/AD_UNGHOSTING_SCRIPTS.md` |
| Creative framework | `marketing/AD_CREATIVE_FRAMEWORK.md` |

---

## Absolute Paths (Copy-Paste Ready)

```
# Logos
/Users/isaiahdupree/Documents/Software/EverReachOrganized/ios-app/assets/branding/logo-final-1024.png
/Users/isaiahdupree/Documents/Software/EverReachOrganized/ios-app/assets/branding/logo-no-bg.png
/Users/isaiahdupree/Documents/Software/EverReachOrganized/ios-app/assets/branding/icons/appstore-icon-1024.png
/Users/isaiahdupree/Documents/Software/EverReachOrganized/ios-app/assets/branding/icons/appstore-icon-1024-flat.png

# Key Screenshots (canonical set)
/Users/isaiahdupree/Documents/Software/EverReachOrganized/marketing/app-store-screenshots/01-contacts-list.png
/Users/isaiahdupree/Documents/Software/EverReachOrganized/marketing/app-store-screenshots/02-contact-detail.png
/Users/isaiahdupree/Documents/Software/EverReachOrganized/marketing/app-store-screenshots/03-voice-note.png
/Users/isaiahdupree/Documents/Software/EverReachOrganized/marketing/app-store-screenshots/04-search-tags.png
/Users/isaiahdupree/Documents/Software/EverReachOrganized/marketing/app-store-screenshots/05-warmth-score.png
/Users/isaiahdupree/Documents/Software/EverReachOrganized/marketing/app-store-screenshots/06-goal-compose.png
/Users/isaiahdupree/Documents/Software/EverReachOrganized/marketing/app-store-screenshots/07-subscription.png
/Users/isaiahdupree/Documents/Software/EverReachOrganized/marketing/app-store-screenshots/08-settings.png

# Latest high-res session (iPhone 17 Pro Max)
/Users/isaiahdupree/Documents/Software/EverReachOrganized/marketing/screenshots/appstore-2025-11-22-1709/iPhone-17-Pro-Max/01-contacts-list.png
/Users/isaiahdupree/Documents/Software/EverReachOrganized/marketing/screenshots/appstore-2025-11-22-1709/iPhone-17-Pro-Max/02-contact-detail.png
/Users/isaiahdupree/Documents/Software/EverReachOrganized/marketing/screenshots/appstore-2025-11-22-1709/iPhone-17-Pro-Max/03-voice-note.png
/Users/isaiahdupree/Documents/Software/EverReachOrganized/marketing/screenshots/appstore-2025-11-22-1709/iPhone-17-Pro-Max/04-search-tags.png
/Users/isaiahdupree/Documents/Software/EverReachOrganized/marketing/screenshots/appstore-2025-11-22-1709/iPhone-17-Pro-Max/05-warmth-score.png
/Users/isaiahdupree/Documents/Software/EverReachOrganized/marketing/screenshots/appstore-2025-11-22-1709/iPhone-17-Pro-Max/06-goal-compose.png
/Users/isaiahdupree/Documents/Software/EverReachOrganized/marketing/screenshots/appstore-2025-11-22-1709/iPhone-17-Pro-Max/07-subscription.png
/Users/isaiahdupree/Documents/Software/EverReachOrganized/marketing/screenshots/appstore-2025-11-22-1709/iPhone-17-Pro-Max/08-settings.png

# Paywall
/Users/isaiahdupree/Documents/Software/EverReachOrganized/marketing/subscription-screenshot-iphone-17-pro-max.png
/Users/isaiahdupree/Documents/Software/EverReachOrganized/marketing/subscription-screenshot-iphone-17-pro.png

# iPad
/Users/isaiahdupree/Documents/Software/EverReachOrganized/marketing/screenshots/appstore-ipad-2025-12-04-0129/05-warmth-score.png
/Users/isaiahdupree/Documents/Software/EverReachOrganized/marketing/screenshots/appstore-ipad-2025-12-04-0129/06-goal-compose.png
```
