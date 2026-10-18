# Screenshot Capture Checklist

Quick reference while capturing screenshots. Check off each as you complete.

---

## Device: iPhone 17 Pro Max (6.7″ - 1290×2796)

### Setup
- [ ] App is built and running on iPhone 17 Pro Max simulator
- [ ] Test account is logged in
- [ ] Demo contacts are populated (5+)
- [ ] Status bar shows clean time (9:41 AM is Apple's standard)

---

## Screenshots to Capture (Press ⌘S in Simulator)

### Screen 1: Contacts List
- [ ] Navigate to: Contacts tab (bottom nav)
- [ ] Ensure: 5+ contacts visible with avatars
- [ ] Press: **⌘S** to capture
- [ ] Caption: "Remember everyone who matters—organized and searchable."

### Screen 2: Contact Detail + Context
- [ ] Navigate to: Tap any contact
- [ ] Ensure visible:
  - [ ] Contact name + avatar
  - [ ] Warmth score badge
  - [ ] Context summary (interests, last topics)
  - [ ] Recent interactions
- [ ] Press: **⌘S** to capture
- [ ] Caption: "See interests, last topics, and relationship warmth at a glance."

### Screen 3: Voice Note
- [ ] Navigate to: Contact Detail → scroll to "Add Note"
- [ ] Ensure visible:
  - [ ] Note input area
  - [ ] Microphone button for voice notes
- [ ] Press: **⌘S** to capture
- [ ] Caption: "Capture voice notes—EverReach transcribes and organizes them."

### Screen 4: Search & Tags
- [ ] Navigate to: Search tab OR use search bar
- [ ] Type: Any tag or interest (e.g., "coffee" or "hiking")
- [ ] Ensure visible:
  - [ ] Search results
  - [ ] Multiple contacts with tags
- [ ] Press: **⌘S** to capture
- [ ] Caption: "Find anything fast with tags, interests, and keywords."

### Screen 5: Warmth Score
- [ ] Navigate to: Contact Detail
- [ ] Ensure visible:
  - [ ] Warmth score (large, prominent)
  - [ ] Color indicator
  - [ ] Any warmth history/trend if available
- [ ] Press: **⌘S** to capture
- [ ] Caption: "Track relationship health to stay top-of-mind."

### Screen 6: Goal-Based Compose (if available)
- [ ] Navigate to: Contact → message/compose button
- [ ] Ensure visible:
  - [ ] Goal selector (networking, business, personal)
  - [ ] AI compose interface
- [ ] Press: **⌘S** to capture
- [ ] Caption: "Write better messages—networking, business, or personal goals."
- [ ] **Note**: If this screen doesn't exist, skip and use 7 screenshots total

### Screen 7: Subscription Plans
- [ ] Navigate to: Settings → Subscription → View Plans
- [ ] Ensure visible:
  - [ ] Monthly plan: $14.99
  - [ ] Annual plan: $152.99
  - [ ] "7-day free trial" badge
  - [ ] Feature list
- [ ] Press: **⌘S** to capture
- [ ] Caption: "Start a 7-day free trial. Upgrade anytime."

### Screen 8: Settings/Privacy (optional)
- [ ] Navigate to: Settings tab
- [ ] Ensure visible:
  - [ ] Account info
  - [ ] Privacy settings
  - [ ] Support links
- [ ] Press: **⌘S** to capture
- [ ] Caption: "Privacy-first. Your data is yours."

---

## After Capture (6.7″)

- [ ] Find screenshots on Desktop
- [ ] Count: Should have 7–8 PNG files
- [ ] Verify size: `sips -g pixelWidth screenshot.png` should show 1290
- [ ] Rename files:
  ```
  01-contacts-list.png
  02-contact-detail.png
  03-voice-note.png
  04-search-tags.png
  05-warmth-score.png
  06-compose.png (if exists)
  07-subscription-plans.png
  08-settings.png (if exists)
  ```

---

## Device: iPhone 8 Plus (5.5″ - 1242×2208)

- [ ] Quit current simulator
- [ ] Boot iPhone 8 Plus: `npx expo run:ios --device "iPhone 8 Plus"`
- [ ] Repeat all 8 screens above
- [ ] Rename with `-5.5` suffix: `01-contacts-list-5.5.png`

---

## Final Organization

Create folder structure:
```
assets/store-screenshots/
├── ios-6.7/
│   ├── 01-contacts-list.png
│   ├── 02-contact-detail.png
│   └── ...
└── ios-5.5/
    ├── 01-contacts-list.png
    ├── 02-contact-detail.png
    └── ...
```

---

## Upload to App Store Connect

1. Go to App Store Connect → Your App
2. Select version → App Store tab
3. Scroll to Screenshots section
4. Select **iPhone 6.7″ Display**
5. Drag and drop screenshots from `ios-6.7/` folder (in order)
6. Add captions from above
7. Repeat for **iPhone 5.5″ Display** with `ios-5.5/` folder
8. Save

---

## Quick Commands

```bash
# Check screenshot size
sips -g pixelWidth -g pixelHeight ~/Desktop/Screenshot*.png

# Launch specific simulator
npx expo run:ios --device "iPhone 17 Pro Max"
npx expo run:ios --device "iPhone 8 Plus"

# Find screenshots
open ~/Desktop

# Move screenshots to organized folder
mkdir -p assets/store-screenshots/ios-6.7
mv ~/Desktop/Screenshot*.png assets/store-screenshots/ios-6.7/
```

---

**Ready? Boot the app and start capturing! Press ⌘S in simulator for each screen.**
