# Screenshot Capture Guide

Complete guide to capture all required screenshots for App Store and Google Play submission.

---

## Required Devices & Sizes

### Apple App Store
- **iPhone 6.7″**: 1290×2796 (iPhone 14/15/16 Pro Max)
- **iPhone 5.5″**: 1242×2208 (iPhone 6s/7/8 Plus)
- **Quantity**: 3–10 screenshots per device size

### Google Play
- **Phone**: 1080×1920 or 1440×3120
- **Quantity**: 2–8 screenshots

---

## Screenshot Shot List (8 Screens)

### 1. Home / Contacts List
**Caption**: "Remember everyone who matters—organized and searchable."

**How to reach**:
- Open app
- Ensure on Contacts tab (bottom nav)
- Show 5+ contacts with avatars, names visible

**Why**: Establish core value, show clean design, demonstrate contact organization

---

### 2. Contact Detail + Context Summary
**Caption**: "See interests, last topics, and relationship warmth at a glance."

**How to reach**:
- Tap any contact from home
- Scroll to show:
  - Contact name + avatar
  - Warmth score badge
  - Context summary card (interests, last topics)
  - Recent interactions

**Why**: Showcase AI context, warmth score (key differentiator), and rich detail view

---

### 3. Voice Note / Add Note
**Caption**: "Capture voice notes—EverReach transcribes and organizes them."

**How to reach**:
- On Contact Detail screen
- Scroll to "Add Note" section
- Show:
  - Text input with placeholder
  - Voice note button (microphone icon)
  - OR: Show an existing voice note with transcription

**Why**: Demonstrate speed/convenience, highlight voice-to-text feature

---

### 4. Search & Tags
**Caption**: "Find anything fast with tags, interests, and keywords."

**How to reach**:
- Tap Search tab (bottom nav)
- OR: Use search bar on Contacts screen
- Show search results for a tag or interest
- Display multiple contacts with matching tags highlighted

**Why**: Highlight productivity, show powerful search and organization features

---

### 5. Warmth Score & History
**Caption**: "Track relationship health to stay top-of-mind."

**How to reach**:
- Contact Detail → Tap warmth score badge
- OR: Navigate to Settings → Warmth Insights (if available)
- Show:
  - Warmth score (e.g., 85)
  - Visual indicator (color badge)
  - Trend or history if available

**Why**: Unique differentiator—relationship health tracking

---

### 6. Goal-Based Compose (Message with AI)
**Caption**: "Write better messages—networking, business, or personal goals."

**How to reach**:
- Contact Detail → Tap message/compose button
- OR: If compose screen exists with goal selector, show that
- Display:
  - Goal options (networking, business, personal)
  - AI-suggested message or compose interface

**Why**: Show AI assistance, smart composition, value for different relationship types

---

### 7. Subscription Plans (Paywall)
**Caption**: "Start a 7-day free trial. Upgrade anytime."

**How to reach**:
- Settings tab → Subscription → View Plans
- Show:
  - Monthly: $14.99/month
  - Annual: $152.99/year
  - "7-day free trial" badge
  - Feature list

**Why**: Monetization transparency, clear value proposition

---

### 8. Settings / Privacy (Optional)
**Caption**: "Privacy-first. Your data is yours."

**How to reach**:
- Settings tab
- Show:
  - Account section
  - Privacy/data settings
  - Support/help links

**Why**: Build trust, demonstrate commitment to user privacy

---

## Capture Methods

### Method 1: Simulator Screenshots (Quick)
1. Run app in Xcode Simulator
2. Navigate to each screen
3. Press **⌘S** or **Save Screen** from simulator menu
4. Screenshots saved to Desktop

**Pros**: Fast, consistent sizing  
**Cons**: May look less realistic than device screenshots

### Method 2: Physical Device (Best Quality)
1. Connect iPhone via USB
2. Build and run: `npx expo run:ios --device`
3. Navigate to each screen
4. Press **Volume Up + Side Button** to capture
5. AirDrop or sync screenshots to Mac

**Pros**: Most realistic, shows actual device  
**Cons**: Slower, requires physical device

### Method 3: Xcode Device Simulator
1. Open Xcode
2. Window → Devices and Simulators
3. Select device size (iPhone 16 Pro Max for 6.7″)
4. Run app, capture with **⌘S**

---

## Automated Capture Script

We can automate screenshot capture using:
- **Option A**: Manual navigation + ⌘S in simulator
- **Option B**: Detox/Appium (complex setup, overkill for 8 screens)
- **Option C**: Fastlane Snapshot (requires setup)

**Recommendation**: Use Simulator + manual navigation for now (fastest for 8 screens).

---

## Checklist Before Capture

- [ ] App builds and runs without errors
- [ ] Demo data populated (5+ contacts with rich data)
- [ ] Internet connection active (for AI features if needed)
- [ ] Test account logged in
- [ ] All features accessible (warmth, search, voice notes, paywall)

---

## Simulator Device Selection

### For 6.7″ (1290×2796)
```bash
xcrun simctl list devices | grep "iPhone.*Pro Max"
# Choose: iPhone 16 Pro Max, iPhone 15 Pro Max, or iPhone 14 Pro Max
```

### For 5.5″ (1242×2208)
```bash
xcrun simctl list devices | grep "iPhone.*Plus"
# Choose: iPhone 8 Plus
```

### Launch specific device
```bash
npx expo run:ios --device "iPhone 16 Pro Max"
```

---

## After Capture

1. **Rename files** for organization:
   - `01-contacts-list-6.7.png`
   - `02-contact-detail-6.7.png`
   - `03-voice-note-6.7.png`
   - etc.

2. **Verify dimensions**:
   ```bash
   sips -g pixelWidth -g pixelHeight screenshot.png
   ```

3. **Optimize file size** (if needed):
   ```bash
   pngcrush -ow screenshot.png
   ```

4. **Create 5.5″ versions**: Repeat capture on iPhone 8 Plus simulator

---

## Upload Locations

### App Store Connect
1. Go to your app → Screenshots
2. Select device size (6.7″ or 5.5″)
3. Drag and drop PNGs (order matters!)
4. Add captions from shot list above

### Google Play Console
1. Go to Store Presence → Main Store Listing → Screenshots
2. Upload Phone screenshots (1080×1920 or 1440×3120)
3. Reorder as needed

---

## Tips

- **Consistency**: Use same simulator/device for all screenshots
- **Clean status bar**: Use simulator to get consistent time/battery
- **Avoid clutter**: Hide keyboard when not needed, close unnecessary modals
- **Readable text**: Ensure font sizes are legible at screen resolution
- **Whitespace**: Leave some breathing room, don't overcrowd screens

---

## Next Steps

1. Boot simulator: `npx expo run:ios --device "iPhone 16 Pro Max"`
2. Navigate to each screen from shot list
3. Press **⌘S** to save screenshot
4. Repeat for iPhone 8 Plus simulator
5. Rename and organize files
6. Upload to stores

Ready to capture!
