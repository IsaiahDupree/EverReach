# 🚀 iOS Build Scripts - Quick Start

## 📱 Two Ways to Build

### **1. App Store Preparation** (for screenshots, demos, testing)
```bash
./prepare-ios-appstore.sh
```

**Does:**
- ✅ Builds custom iOS app
- ✅ Perfect status bar (9:41, 100% battery, full signal)
- ✅ All permissions granted
- ✅ Prompts for sign-in
- ✅ Ready for screenshots

**Use for:**
- App Store screenshots
- Demo videos
- Final testing
- Showing stakeholders

---

### **2. Quick Development** (for daily coding)
```bash
./quick-ios-dev.sh
```

**Does:**
- ⚡ Fast rebuild
- ⚡ Clears cache
- ⚡ Launches immediately

**Use for:**
- Daily development
- Bug fixes
- Feature work
- Quick iteration

---

## 🎯 Which One Should I Use?

| Task | Script |
|------|--------|
| "I need perfect screenshots" | `prepare-ios-appstore.sh` |
| "I just changed some code" | `quick-ios-dev.sh` |
| "I'm demoing to the team" | `prepare-ios-appstore.sh` |
| "I'm fixing a bug" | `quick-ios-dev.sh` |
| "Recording a promo video" | `prepare-ios-appstore.sh` |
| "Testing a new feature" | `quick-ios-dev.sh` |

---

## 📚 Full Documentation

See **[IOS_BUILD_SCRIPTS.md](./IOS_BUILD_SCRIPTS.md)** for:
- Detailed usage instructions
- Troubleshooting guide
- Screenshot workflow
- Video recording
- Multiple device sizes
- Configuration options

---

## ⚡ Quick Commands

```bash
# App Store build
./prepare-ios-appstore.sh

# Dev build
./quick-ios-dev.sh

# Manual build
npx expo run:ios

# Kill Metro bundler
lsof -ti:8081 | xargs kill -9

# List available devices
xcrun simctl list devices

# Take screenshot
xcrun simctl io booted screenshot ~/Desktop/screenshot.png
```

---

## 🔐 Test Credentials

**Email:** `isaiahdupree33@gmail.com`  
**Password:** `frogger12`

(Used by `prepare-ios-appstore.sh` for sign-in prompt)

---

## 🆘 Common Issues

**"Permission denied"**
```bash
chmod +x prepare-ios-appstore.sh quick-ios-dev.sh
```

**"Port 8081 already in use"**
```bash
lsof -ti:8081 | xargs kill -9
```

**"Xcode errors"**
```bash
npx expo prebuild --clean
```

---

## ✅ First Time Setup

```bash
# 1. Make scripts executable
chmod +x prepare-ios-appstore.sh quick-ios-dev.sh

# 2. Test quick build
./quick-ios-dev.sh

# 3. If it works, you're ready!
```

---

Happy building! 🎉
