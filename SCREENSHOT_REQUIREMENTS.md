# Screenshot Requirements — App Store & Marketing

Production Ready | 2025-11-04

---

## Overview

This document specifies all screenshots needed for:
- App Store Custom Product Pages (CPPs)
- Video ads (B-roll)
- Image ads
- Landing pages
- Social media posts

---

## Device Specifications

### Primary Capture Device

**iPhone** (Highest resolution):
- **Device**: iPhone 15 Pro Max or iPhone 14 Pro Max
- **Screen Size**: 6.7" display
- **Resolution**: 1290×2796 pixels (458 PPI)
- **Format**: PNG (lossless)
- **Color Mode**: Light mode preferred (higher contrast for ads)

**Alternative**:
- iPhone 14 Pro: 1179×2556
- iPhone 13 Pro Max: 1284×2778

### Secondary (if needed)

**Android** (for Google Play):
- Pixel 7 Pro or Samsung S23 Ultra
- Resolution: Minimum 1080×2400

---

## Screenshot Capture Settings

### App Preparation

**Before capturing**:
- Use light mode (Settings → Display → Light)
- Disable notifications during capture
- Use clean test data (realistic but polished)
- Fully charge device (no low battery indicator)
- Set time to 9:41 AM (Apple standard)
- Full signal bars, WiFi on
- Remove any test/debug UI elements

### Capture Method

**iOS Native**:
1. Press Volume Up + Side Button simultaneously
2. Screenshots save to Photos app
3. Transfer via AirDrop or iCloud Photos

**Alternative (for high volume)**:
- Use Simulator (Xcode)
- Simulator → File → New Screenshot
- Or: `xcrun simctl io booted screenshot filename.png`

### Quality Standards

- **No blur**: Screenshots must be crystal clear
- **No UI glitches**: Reload screen if any visual bugs
- **Consistent branding**: Same test user name/avatar across shots
- **Real-looking data**: No "lorem ipsum" or obvious test data
- **Complete screens**: Capture full screen, crop later if needed

---

## Required Screenshots by Category

### Category 1: Warmth Score Dashboard

**Purpose**: Show core value prop — relationship health at a glance

**Shots Needed** (5 variations):

1. **Full Dashboard — Overview**
   - All contacts visible with Warmth Scores
   - Mix of hot (🔴 red), warm (🟠 orange), cool (🔵 teal), cold (⚪ gray)
   - At least 15-20 contacts visible
   - File: `dashboard-warmth-overview.png`

2. **Filtered — Hot Contacts**
   - Filter applied: "Hot" only
   - Shows 5-8 contacts with scores 70-100
   - File: `dashboard-hot-contacts.png`

3. **Filtered — Cool/Cold (Priority)**
   - Filter: "Cooling" or "Cold"
   - Shows contacts that need attention
   - Scores 20-40 range
   - File: `dashboard-priority-contacts.png`

4. **Contact Card Detail — High Score**
   - Single contact with Warmth Score 85
   - Shows score, last contact date, tags
   - File: `contact-card-hot.png`

5. **Contact Card Detail — Low Score**
   - Single contact with Warmth Score 28
   - Shows warning indicator
   - File: `contact-card-cold.png`

**Data Requirements**:
- Use realistic names (not "Test User 1")
- Varied scores: 10-95 range
- Realistic "last contact" dates (3 days ago, 2 weeks ago, etc.)
- Mix of email/phone contact types

---

### Category 2: AI Message Composer

**Purpose**: Demonstrate AI writing personalized messages

**Shots Needed** (6 variations):

1. **Blank Composer**
   - Contact selected: "Sarah Chen"
   - Empty message field
   - "AI Compose" button visible
   - File: `composer-blank.png`

2. **AI Generating (Loading State)**
   - Spinner/loading indicator
   - "Generating personalized message..."
   - File: `composer-generating.png`

3. **AI Generated Message — Professional**
   - For contact: "Sarah Chen, VP Sales"
   - Message: "Hi Sarah, saw your team hit Q3 goals—congrats! Coffee next week to discuss pipeline strategies?"
   - Edit and Send buttons visible
   - File: `composer-professional-generated.png`

4. **AI Generated Message — Casual/Personal**
   - For contact: "Alex" (friend)
   - Message: "Hey! How's the new house going? Did Charlie the puppy settle in yet?"
   - File: `composer-personal-generated.png`

5. **Message Sent Confirmation**
   - Success indicator
   - Warmth Score increasing animation (optional)
   - File: `composer-sent-success.png`

6. **Context Panel**
   - Show AI context used:
     - Last conversation notes
     - Contact details
     - Suggested tone
   - File: `composer-context-panel.png`

**Data Requirements**:
- Use different contact types (professional vs personal)
- Show AI referencing specific details
- Realistic message tone matching contact type

---

### Category 3: Contact Detail / Timeline

**Purpose**: Show full relationship context

**Shots Needed** (4 variations):

1. **Contact Profile — Full View**
   - Name, photo (avatar), Warmth Score
   - Email, phone, social links
   - Tags visible
   - Recent interactions summary
   - File: `contact-profile-full.png`

2. **Interaction Timeline**
   - Chronological list of interactions:
     - Email sent (3 days ago)
     - Meeting (1 week ago)
     - Voice note (2 weeks ago)
   - File: `contact-timeline.png`

3. **Notes Section**
   - Personal notes visible:
     - "Loves gardening"
     - "Kids: Emma (7), Jake (5)"
     - "New puppy: Charlie"
   - File: `contact-notes.png`

4. **Life Events / Reminders**
   - Birthday reminder
   - Anniversary
   - Custom reminder ("Check in every 3 weeks")
   - File: `contact-reminders.png`

**Data Requirements**:
- Mix of interaction types
- Realistic personal details
- Varied reminder types

---

### Category 4: Notifications / Reminders

**Purpose**: Show proactive system reminders

**Shots Needed** (3 variations):

1. **Birthday Reminder Notification**
   - Lock screen or notification center
   - "Dad's Birthday Tomorrow! 🎂"
   - File: `notification-birthday.png`

2. **Check-In Reminder**
   - "It's been 3 weeks since you talked to Alex"
   - Tap to compose action
   - File: `notification-checkin.png`

3. **Warmth Alert**
   - "Sarah Chen's Warmth Score dropped to 32"
   - Priority indicator
   - File: `notification-warmth-alert.png`

**Capture Method**: 
- Use iOS Notification simulator
- Or create mockups with realistic notification UI

---

### Category 5: Onboarding / First Use

**Purpose**: Show ease of setup

**Shots Needed** (3 variations):

1. **Welcome Screen**
   - App logo, tagline
   - "Get Started" button
   - File: `onboarding-welcome.png`

2. **Import Contacts**
   - "Connect Google Contacts"
   - Import progress indicator
   - File: `onboarding-import.png`

3. **First Contact Added**
   - Success confirmation
   - Warmth Score calculated
   - File: `onboarding-first-contact.png`

---

### Category 6: Mobile-First Features

**Purpose**: Emphasize mobile usability

**Shots Needed** (3 variations):

1. **Quick Actions (Home Widget or Shortcuts)**
   - iOS widget showing priorities
   - File: `mobile-widget.png`

2. **Voice Note Recording**
   - Recording interface
   - Waveform visible
   - File: `mobile-voice-recording.png`

3. **Business Card Scanner**
   - Camera view with card overlay
   - OCR extraction visible
   - File: `mobile-card-scanner.png`

---

## App Store Screenshot Sequences

### CPP 1: Sales — Keep Pipeline Warm

**7 Screenshots** (in order):

1. **Hero**: "Keep Your Pipeline Warm Automatically"
   - Use: `dashboard-warmth-overview.png`
   - Add text overlay in App Store Connect

2. **Priorities**: "See who needs attention first"
   - Use: `dashboard-priority-contacts.png`

3. **AI Composer**: "Personalized follow-ups in seconds"
   - Use: `composer-professional-generated.png`

4. **Context**: "Full history at a glance"
   - Use: `contact-profile-full.png`

5. **Cadence**: "Smart reminders, never miss timing"
   - Use: `contact-reminders.png`

6. **Mobile**: "3-minute daily routine on the go"
   - Use: `mobile-widget.png` or dashboard on phone mockup

7. **Integrations**: "Works with your existing CRM"
   - Use: Settings/integrations screen (if available)

---

### CPP 2: Personal Relationships — Stay Connected

**7 Screenshots** (in order):

1. **Hero**: "Never Let Friendships Fade"
   - Use: `dashboard-warmth-overview.png` (personal contacts)

2. **Reminders**: "Remember birthdays, anniversaries, check-ins"
   - Use: `notification-birthday.png`

3. **AI Personal**: "Messages that sound like you, with context"
   - Use: `composer-personal-generated.png`

4. **Timeline**: "See when you last connected"
   - Use: `contact-timeline.png`

5. **Notes**: "Remember inside jokes and important details"
   - Use: `contact-notes.png`

6. **Life Events**: "Track moves, jobs, milestones"
   - Use: `contact-reminders.png`

7. **Simple**: "3 minutes a day for lifelong friendships"
   - Use: Summary/stats screen or mobile usage

---

## Screenshot Post-Processing

### Editing Guidelines

**DO**:
- Add text overlays (headlines) in design tool
- Adjust brightness/contrast if needed (keep realistic)
- Crop to remove status bar if needed
- Add subtle drop shadows for depth

**DON'T**:
- Over-saturate colors
- Apply heavy filters
- Blur or pixelate UI elements
- Add fake data that doesn't match app

### Tools

**Recommended**:
- **Figma**: Free, collaborative, design frames
- **Canva**: Template-based, quick
- **Apple Keynote**: Simple overlays
- **Photoshop**: Advanced editing

### Text Overlay Specs

**Font**: Arial Bold (matches brand)
**Size**: 64-72pt for main headline
**Color**: White text with black shadow/stroke
**Position**: Top third of screen (safe zone)
**Max Length**: 30-45 characters

---

## Capture Checklist

### Pre-Capture Setup

- [ ] App updated to latest build
- [ ] Test data prepared (realistic names, scores, messages)
- [ ] Device set to light mode
- [ ] Time set to 9:41 AM
- [ ] Battery full, signals strong
- [ ] Notifications disabled
- [ ] Clean device screen (no smudges)

### During Capture

- [ ] Capture at native resolution (don't screenshot from simulator if possible)
- [ ] Multiple angles of same screen (choose best later)
- [ ] Capture both portrait and landscape (if applicable)
- [ ] Check for UI glitches before each shot
- [ ] Use consistent test user across all screenshots

### Post-Capture

- [ ] Transfer screenshots to computer
- [ ] Organize into folders by category
- [ ] Rename files systematically
- [ ] Back up originals before editing
- [ ] Create edited versions with text overlays

---

## File Naming Convention

**Format**: `{category}-{description}-{variant}.png`

**Examples**:
- `dashboard-warmth-overview-v1.png`
- `composer-professional-generated-v2.png`
- `notification-birthday-mockup.png`

**Folder Structure**:
```
screenshots/
├── originals/
│   ├── dashboard/
│   ├── composer/
│   ├── contacts/
│   └── notifications/
└── edited/
    ├── app-store-cpp1/
    ├── app-store-cpp2/
    ├── ads/
    └── landing-pages/
```

---

## Export Specifications

### App Store Uploads

**Resolution**: 1290×2796 (6.7" iPhone)
**Format**: PNG or JPG
**Color Space**: sRGB
**Max File Size**: 8MB per screenshot
**Quantity**: 6-10 screenshots per CPP

### Ad Creatives

**Video Ads** (B-roll):
- Export as PNG frames
- 1920×1080 for horizontal videos
- 1080×1920 for vertical videos

**Image Ads**:
- Multiple sizes needed (see image-ads-cpp1-cpp2.md)
- Keep original high-res for resizing

### Landing Pages

- **Hero images**: 1920×1080 minimum
- **Feature screenshots**: 1200×800 or 800×600
- Compress for web (<200KB ideal)

---

## Test Data Guidelines

### Realistic Contact Names

**Sales Contacts** (CPP 1):
- Sarah Chen, VP Sales at TechCorp
- Michael Torres, Director of Partnerships
- Emma Rodriguez, Account Manager
- David Kim, Enterprise Lead
- Lisa Martinez, Growth Manager

**Personal Contacts** (CPP 2):
- Mom, Dad (family)
- Alex, Jordan, Taylor (friends)
- Sarah, Mike (college friends)
- Emma, David (work friends turned personal)

### Realistic Warmth Scores

**Distribution**:
- Hot (70-100): 20-30% of contacts
- Warm (50-69): 30-40%
- Cool (30-49): 20-30%
- Cold (0-29): 10-20%

### Realistic Messages

**Professional**:
- "Hi Sarah, saw your team hit Q3 goals—congrats! Coffee next week?"
- "Michael, following up on our automation discussion. Ready to see the ROI model?"

**Personal**:
- "Hey Alex! How's the new house going?"
- "Happy birthday Dad! How's Charlie settling in?"

---

## Production Schedule

**Day 1**: Setup & Dashboard Captures
- [ ] Prepare test data
- [ ] Capture all dashboard variations
- [ ] Capture contact cards

**Day 2**: AI Composer & Interactions
- [ ] Capture composer screens (blank → generating → sent)
- [ ] Capture interaction timeline
- [ ] Capture notes/reminders

**Day 3**: Notifications & Special Features
- [ ] Create notification mockups
- [ ] Capture scanner/voice features
- [ ] Capture onboarding flow

**Day 4**: Review & Editing
- [ ] Review all captures
- [ ] Select best versions
- [ ] Add text overlays
- [ ] Organize and name files

**Day 5**: Export & Upload
- [ ] Export for App Store
- [ ] Export for ads (multiple sizes)
- [ ] Export for landing pages
- [ ] Upload to asset library

---

## Quality Control Checklist

### Before Finalizing

- [ ] All screenshots are sharp and clear
- [ ] No typos in on-screen text
- [ ] Consistent test data across all shots
- [ ] Brand colors accurate (`#FF6B6B`, `#FFB366`, `#4ECDC4`, etc.)
- [ ] No debug UI or test flags visible
- [ ] Device chrome (if shown) is clean and professional
- [ ] Text overlays are readable on all screen sizes
- [ ] File sizes optimized for platform requirements

### Platform-Specific Checks

**App Store**:
- [ ] 1290×2796 resolution
- [ ] All 7 screenshots per CPP prepared
- [ ] Text overlays under 45 characters
- [ ] Preview on actual iPhone before uploading

**Ads**:
- [ ] Screenshots work at multiple aspect ratios
- [ ] Text is readable when scaled down
- [ ] High contrast for small thumbnails

**Landing Pages**:
- [ ] Images compressed for web
- [ ] Alt text prepared for accessibility
- [ ] Retina versions available (2x resolution)

---

## Next Steps

1. ⏳ Prepare app build with clean test data
2. ⏳ Capture all required screenshots following this guide
3. ⏳ Organize and rename files
4. ⏳ Edit and add text overlays
5. ⏳ Export for each platform
6. ⏳ Upload to App Store Connect and ad platforms
7. ⏳ Integrate into landing pages

---

**Ready for screenshot capture. Follow checklist and naming conventions for organized asset library.**
