# Screenshot Automation Scripts Comparison

## 📋 **Overview**

Three screenshot automation scripts are available for App Store submission. This document compares them and recommends the best approach.

---

## 🔍 **Scripts Comparison**

### **1. appstore-screenshots-all-devices.sh** ⭐ **RECOMMENDED**

**Location:** `/mobileapp/appstore-screenshots-all-devices.sh`

**Purpose:** Complete App Store screenshot automation for all required device sizes

#### ✅ **Pros:**
- ✅ **All 5 required App Store device sizes:**
  - iPhone 17 Pro Max (6.9" - 1320x2868)
  - iPhone 15 Plus (6.7" - 1290x2796)
  - iPhone 8 Plus (5.5" - 1242x2208)
  - iPad Pro 12.9" 6th gen (2048x2732)
  - iPad Pro 12.9" 2nd gen (2048x2732)
- ✅ **Perfect for App Store submission** - covers all requirements
- ✅ **Bash script** - no additional dependencies
- ✅ **Automated device management** - creates, boots, configures simulators
- ✅ **Perfect status bar** - 9:41 AM, 100% battery, full signal
- ✅ **Auto permission grants** - photos, camera, contacts, mic, location
- ✅ **Interactive mode** - navigate manually, capture when ready
- ✅ **Organized output** - separate folders per device
- ✅ **8 key screenshots** per device
- ✅ **Dimension verification** - confirms correct sizes
- ✅ **Saves to marketing directory** - `marketing/screenshots/appstore-[DATE]/`

#### ❌ **Cons:**
- Requires manual navigation (not fully automated)
- Takes 20-40 minutes for all devices

#### **Usage:**
```bash
./appstore-screenshots-all-devices.sh
```

#### **Output Structure:**
```
marketing/screenshots/appstore-2025-11-22-1151/
├── iPhone-17-Pro-Max/
│   ├── 01-contacts-list.png
│   ├── 02-contact-detail.png
│   └── ...
├── iPhone-15-Plus/
│   └── ...
└── iPad-Pro-12-9-inch-6th-generation/
    └── ...
```

---

### **2. automate-screenshots.js**

**Location:** `/mobileapp/scripts/automate-screenshots.js`

**Purpose:** Node.js-based screenshot automation with Supabase data setup

#### ✅ **Pros:**
- ✅ **Automatic data setup** - runs insert-apple-snapshot.js for Pro subscription
- ✅ **Supabase integration** - ensures proper test data
- ✅ **9 screenshots** per device (one more than bash script)
- ✅ **4 devices:**
  - iPhone 17 Pro Max
  - iPhone 17 Pro
  - iPad Pro 13-inch (M4)
  - iPad Pro 11-inch (M4)
- ✅ **Node.js** - uses familiar JavaScript tooling
- ✅ **Saves to marketing directory** - `marketing/screenshots/node-[DATE]/`

#### ❌ **Cons:**
- ❌ **Missing required App Store sizes:**
  - No iPhone 15 Plus (6.7")
  - No iPhone 8 Plus (5.5")
  - No iPad Pro 12.9" 2nd gen
- ❌ **Requires Node.js dependencies** - @supabase/supabase-js, dotenv
- ❌ **Requires .env configuration** - Supabase credentials
- ❌ **Not complete for App Store** - missing 2 of 5 required sizes

#### **Usage:**
```bash
node scripts/automate-screenshots.js
```

#### **Output Structure:**
```
marketing/screenshots/node-2025-11-22/
├── iPhone_17_Pro_Max/
│   ├── 01_Home.png
│   ├── 02_Contacts.png
│   └── ...
└── iPad_Pro_13-inch_M4/
    └── ...
```

---

### **3. prepare-ios-appstore.sh**

**Location:** `/mobileapp/prepare-ios-appstore.sh`

**Purpose:** Single device setup and preparation (not for bulk screenshots)

#### ✅ **Pros:**
- ✅ **Builds custom iOS app** - not Expo Go
- ✅ **Perfect status bar** - 9:41, full battery
- ✅ **Permission grants** - all permissions
- ✅ **App launch** - automatic
- ✅ **Good for testing** - quick device setup
- ✅ **Manual sign-in prompt** - guides through login

#### ❌ **Cons:**
- ❌ **Single device only** - iPhone 17 Pro Max hardcoded
- ❌ **Not for bulk screenshots** - manual capture required
- ❌ **No multi-device support**
- ❌ **Not App Store ready** - missing other required sizes

#### **Usage:**
```bash
./prepare-ios-appstore.sh
```

---

## 🏆 **Recommendation: Use Script #1**

**Use `appstore-screenshots-all-devices.sh` for App Store submission.**

### **Why:**
1. ✅ **Covers ALL App Store requirements** (5 device sizes)
2. ✅ **Complete automation** (device setup, permissions, status bar)
3. ✅ **Organized output** (ready to upload)
4. ✅ **No dependencies** (pure bash)
5. ✅ **Best for publishing** (exactly what App Store needs)

---

## 📊 **Feature Comparison Matrix**

| Feature | Script #1 (bash) | Script #2 (node) | Script #3 (bash) |
|---------|------------------|------------------|------------------|
| **Device Count** | 5 devices ✅ | 4 devices ⚠️ | 1 device ❌ |
| **iPhone 17 Pro Max** | ✅ | ✅ | ✅ |
| **iPhone 15 Plus (6.7")** | ✅ | ❌ | ❌ |
| **iPhone 8 Plus (5.5")** | ✅ | ❌ | ❌ |
| **iPad Pro 12.9" 6th** | ✅ | ❌ | ❌ |
| **iPad Pro 12.9" 2nd** | ✅ | ❌ | ❌ |
| **Status Bar Setup** | ✅ | ✅ | ✅ |
| **Permission Grants** | ✅ | ✅ | ✅ |
| **Auto Data Setup** | ❌ | ✅ | ❌ |
| **Multi-Screenshot** | 8 per device | 9 per device | Single |
| **App Store Ready** | ✅ YES | ⚠️ Partial | ❌ NO |
| **Dependencies** | None | Node + Supabase | None |
| **Output Location** | `marketing/screenshots/` | `marketing/screenshots/` | Desktop |
| **Best For** | **App Store Publishing** | Development Testing | Quick Setup |

---

## 🚀 **Quick Start Guide**

### **For App Store Submission:**
```bash
# Use Script #1 (RECOMMENDED)
./appstore-screenshots-all-devices.sh
```

### **For Development Testing:**
```bash
# Use Script #2 (with data setup)
node scripts/automate-screenshots.js
```

### **For Quick Device Setup:**
```bash
# Use Script #3 (single device)
./prepare-ios-appstore.sh
```

---

## 📸 **Screenshot Checklist**

### **Required for App Store:**
- [ ] iPhone 6.9" (iPhone 17 Pro Max) - **1320x2868**
- [ ] iPhone 6.7" (iPhone 15 Plus) - **1290x2796**
- [ ] iPhone 5.5" (iPhone 8 Plus) - **1242x2208**
- [ ] iPad 12.9" 6th gen - **2048x2732**
- [ ] iPad 12.9" 2nd gen - **2048x2732**

✅ **Script #1 covers ALL of these!**

### **Screenshot Content (8 per device):**
1. Home/Contacts List
2. Contact Detail + Context
3. Voice Note Recording
4. Search + Tags
5. Warmth Score
6. Goal-Based Compose
7. Subscription Plans
8. Settings/Privacy

---

## 🎯 **Recommendation Summary**

| Use Case | Recommended Script | Why |
|----------|-------------------|-----|
| **App Store Publishing** | #1 (bash) | ✅ All required sizes, organized output |
| **Development Testing** | #2 (node) | ✅ Auto data setup, Supabase integration |
| **Quick Device Setup** | #3 (bash) | ✅ Fast single device configuration |

---

## 📂 **Output Locations**

All scripts now save to the marketing directory:

```
mobileapp/marketing/screenshots/
├── appstore-2025-11-22-1151/          # Script #1 output
│   ├── iPhone-17-Pro-Max/
│   ├── iPhone-15-Plus/
│   └── ...
├── node-2025-11-22/                    # Script #2 output
│   ├── iPhone_17_Pro_Max/
│   └── ...
└── README.md                           # This file
```

---

## ✅ **Final Answer**

**For App Store Publishing:** Use `./appstore-screenshots-all-devices.sh`

It's the **only script that captures all required device sizes** for App Store submission and saves them in an organized, upload-ready format to the marketing directory.

---

## 🎉 **Next Steps**

1. ✅ Run `./appstore-screenshots-all-devices.sh`
2. ✅ Follow prompts for each screen
3. ✅ Review screenshots in `marketing/screenshots/appstore-[DATE]/`
4. ✅ Upload to App Store Connect
5. ✅ Publish! 🚀
