# iOS Build Scripts Documentation

## 📱 Overview

Two scripts for iOS app development and App Store preparation:

1. **`prepare-ios-appstore.sh`** - Full setup for App Store screenshots/testing
2. **`quick-ios-dev.sh`** - Fast build for daily development

---

## 🚀 Script 1: App Store Preparation

### **File:** `prepare-ios-appstore.sh`

### **Purpose:**
Prepares the app for App Store screenshots, demos, and final testing.

### **What It Does:**
1. ✅ Builds custom iOS app (not Expo Go)
2. ✅ Launches iPhone 17 Pro Max simulator
3. ✅ Sets perfect status bar: 9:41, 100% battery, full signal
4. ✅ Grants ALL permissions (photos, camera, contacts, mic, location)
5. ✅ Launches the app
6. ✅ Prompts for sign-in
7. ✅ Waits for you to reach HOME screen
8. ✅ Optional: Takes screenshot

### **Usage:**

```bash
cd /Users/isaiahdupree/Documents/Software/everreach_dev/mobileapp
./prepare-ios-appstore.sh
```

### **Expected Output:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  iOS App Store Build Preparation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

▶  Checking for existing Expo dev server...
✅ Metro bundler started

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Building Custom iOS App
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

▶  Running: npx expo run:ios
ℹ️  This will build the native iOS app (not Expo Go)
ℹ️  Please wait, this may take a few minutes...

✅ iOS app built and installed successfully

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Preparing Simulator
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Simulator booted

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Setting Up Perfect Status Bar
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Status bar configured (9:41, full battery, good signal)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Granting Permissions
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Photos access granted
✅ Camera access granted
✅ Contacts access granted
✅ Microphone access granted
✅ Location access granted
✅ Notifications access granted

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Launching App
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ App launched

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Manual Sign-In Required
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌─────────────────────────────────────────────────────────┐
│  📋 MANUAL STEP: Sign in to the app                    │
│                                                         │
│  Email:    isaiahdupree33@gmail.com                    │
│  Password: frogger12                                   │
└─────────────────────────────────────────────────────────┘

   Press ENTER once you are signed in and on the HOME screen...
```

### **When to Use:**

- 📸 Taking App Store screenshots
- 🎬 Recording demo videos
- 🧪 Final QA testing
- 📱 Showing to stakeholders
- 🚀 Pre-release validation

---

## ⚡ Script 2: Quick Development Build

### **File:** `quick-ios-dev.sh`

### **Purpose:**
Fast rebuild for daily development work.

### **What It Does:**
1. ✅ Kills existing Metro bundler
2. ✅ Clears build cache
3. ✅ Builds iOS app
4. ✅ Launches simulator
5. ⏩ SKIPS manual sign-in wait (faster iteration)

### **Usage:**

```bash
cd /Users/isaiahdupree/Documents/Software/everreach_dev/mobileapp
./quick-ios-dev.sh
```

### **When to Use:**

- 💻 Daily development
- 🐛 Testing bug fixes
- 🔄 Quick iteration
- 🧪 Feature development

---

## 📋 Configuration

Both scripts use these settings:

| Setting | Value | How to Change |
|---------|-------|---------------|
| Device | iPhone 17 Pro Max | Edit `DEVICE_NAME` in script |
| Bundle ID | `com.everreach.app` | Edit `BUNDLE_ID` in script |
| Test Email | `isaiahdupree33@gmail.com` | Edit `TEST_EMAIL` in script |
| Test Password | `frogger12` | Edit `TEST_PASSWORD` in script |
| UDID | `FFC309CC-6308-43F3-98E1-CB92260953A9` | Get from simulator list |

### **Find Your Device UDID:**

```bash
xcrun simctl list devices
```

Look for your device in the output and copy the UUID.

---

## 🎨 Status Bar Settings

The App Store script sets:

- ⏰ Time: **9:41** (Apple's iconic time)
- 🔋 Battery: **100%** (charged)
- 📶 Cellular: **4 bars** (full signal)
- 📡 WiFi: **3 bars** (active)
- 🔌 Battery icon: **Charging bolt**

This matches Apple's official screenshot guidelines.

---

## 🔐 Permissions Granted

Both scripts grant these permissions:

| Permission | Purpose |
|------------|---------|
| 📷 Photos | View and upload contact photos, screenshots |
| 📸 Camera | Take photos for contacts |
| 👥 Contacts | Import phone contacts |
| 🎤 Microphone | Voice notes recording |
| 📍 Location | Location-based features |
| 🔔 Notifications | Push notifications |

---

## 🛠️ Troubleshooting

### **Problem:** Script says "command not found"

**Solution:**
```bash
chmod +x prepare-ios-appstore.sh
chmod +x quick-ios-dev.sh
```

### **Problem:** "No devices found"

**Solution:**
Check if simulator is installed:
```bash
xcrun simctl list devices
```

### **Problem:** Build fails with Xcode errors

**Solution:**
1. Open Xcode
2. Go to Preferences → Locations
3. Ensure Command Line Tools is set
4. Clean build folder: `Cmd+Shift+K`

### **Problem:** Metro bundler already running

**Solution:**
```bash
lsof -ti:8081 | xargs kill -9
```

Then run the script again.

### **Problem:** App crashes on launch

**Solution:**
1. Check logs: `xcrun simctl spawn booted log stream --predicate 'processImagePath contains "everreach"'`
2. Rebuild: `npx expo prebuild --clean`
3. Try: `./prepare-ios-appstore.sh`

---

## 📸 Taking Screenshots

### **Method 1: Using the Script**

The `prepare-ios-appstore.sh` script will ask at the end:

```
Take a screenshot of current screen? (y/n)
```

Type `y` and press Enter. Screenshot saves to Desktop.

### **Method 2: Manual**

```bash
xcrun simctl io booted screenshot ~/Desktop/screenshot.png
```

### **Method 3: Simulator Menu**

Press `Cmd+S` in the simulator window.

---

## 🎬 Recording Videos

### **Method 1: Simulator Built-in**

1. Open simulator
2. File → Record Screen
3. Or press `Cmd+R`

### **Method 2: Command Line**

```bash
# Start recording
xcrun simctl io booted recordVideo ~/Desktop/demo.mp4

# Stop with Ctrl+C when done
```

---

## 🔄 Workflow Examples

### **App Store Screenshot Workflow:**

```bash
# 1. Run preparation script
./prepare-ios-appstore.sh

# 2. Sign in when prompted
# Enter email: isaiahdupree33@gmail.com
# Enter password: frogger12

# 3. Navigate to each screen you want to capture

# 4. Take screenshots
# Press Cmd+S in simulator for each screen

# 5. Screenshots saved to Desktop
```

### **Daily Development Workflow:**

```bash
# 1. Make code changes
# 2. Run quick build
./quick-ios-dev.sh

# 3. Test in simulator
# 4. Make more changes
# 5. Repeat!
```

---

## 📱 Multiple Device Sizes

To test on different devices, edit the script:

```bash
# iPhone SE (Small)
DEVICE_NAME="iPhone SE (3rd generation)"

# iPhone 15 Pro (Medium)
DEVICE_NAME="iPhone 15 Pro"

# iPhone 17 Pro Max (Large)
DEVICE_NAME="iPhone 17 Pro Max"

# iPad Pro
DEVICE_NAME="iPad Pro (12.9-inch) (6th generation)"
```

Get device names:
```bash
xcrun simctl list devicetypes
```

---

## 🚀 Production Build (Not Covered)

These scripts are for **development/testing only**.

For **actual App Store submission**, use:

```bash
# 1. Update version in app.json
# 2. Build for TestFlight
eas build --platform ios --profile production

# 3. Submit to App Store Connect
eas submit --platform ios
```

---

## 📚 Related Files

- `.env` - Environment variables
- `app.json` - App configuration
- `ios/` - Native iOS code
- `package.json` - Dependencies

---

## ✅ Checklist: Before App Store Submission

- [ ] Status bar looks perfect (9:41, full battery)
- [ ] All permissions granted
- [ ] Signed in with real account
- [ ] All features working
- [ ] Screenshots taken for all required sizes
- [ ] Demo video recorded (optional)
- [ ] App tested on multiple devices
- [ ] No debug/test data visible
- [ ] Privacy policy displayed correctly
- [ ] Terms of service accessible

---

## 🆘 Support

**Issues with the script?**
1. Check Xcode is installed and up to date
2. Ensure Expo CLI is working: `npx expo --version`
3. Verify iOS simulator is available
4. Check `.env` file has correct values

**Need help?**
Check the console output for error messages and search for solutions.

---

## 📄 Script Maintenance

**Update device UDID:**
```bash
# Get new UDID
xcrun simctl list devices | grep "iPhone 17 Pro Max"

# Update in script
DEVICE_UDID="YOUR-NEW-UDID-HERE"
```

**Update credentials:**
```bash
TEST_EMAIL="newemail@example.com"
TEST_PASSWORD="newpassword"
```

---

## 🎉 Summary

| Task | Script | Time |
|------|--------|------|
| App Store screenshots | `prepare-ios-appstore.sh` | 3-5 min |
| Daily development | `quick-ios-dev.sh` | 1-2 min |
| Production build | EAS Build | 15-20 min |

**Choose the right tool for the job!** 🛠️
