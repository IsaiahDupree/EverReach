# 🎯 NEXT SESSION: iOS Foundation

**Session Number:** 5
**Priority:** P0 (Critical)
**Estimated Time:** 6-8 hours
**Features:** IOS-FOUND-001 to IOS-FOUND-005

---

## Quick Context

You are starting the **first implementation session** for the EverReach App Kit. Session 4 (Initialization) has been completed. All planning and documentation is ready.

---

## Your Mission

Set up the iOS project structure with Expo and React Native. Get a working project that compiles and runs.

---

## Features to Implement

### IOS-FOUND-001: iOS Monorepo Structure
**Description:** Set up Expo project structure with all directories
**Files:** `app/`, `components/`, `hooks/`, `lib/`, `types/`, `providers/`
**Acceptance:** All directories created and accessible

### IOS-FOUND-002: Expo Configuration
**Description:** Configure app.json with placeholder values
**Files:** `app.json`, `eas.json`
**Acceptance:** Placeholders set, EAS build config ready

### IOS-FOUND-003: Environment Template
**Description:** Create .env.example with all required variables
**Files:** `.env.example`
**Acceptance:** All vars documented, DEV_MODE flag included

### IOS-FOUND-004: Package Dependencies
**Description:** Configure package.json with all dependencies
**Files:** `package.json`
**Acceptance:** npm install works, no version conflicts

### IOS-FOUND-005: TypeScript Configuration
**Description:** Set up tsconfig.json with path aliases and strict mode
**Files:** `tsconfig.json`
**Acceptance:** Path aliases work, type checking passes

---

## Step-by-Step Plan

### Step 1: Create iOS Directory (5 min)
```bash
mkdir ios-kit
cd ios-kit
```

### Step 2: Initialize Expo Project (10 min)
```bash
npx create-expo-app@latest . --template blank-typescript
```

### Step 3: Create Directory Structure (5 min)
```bash
mkdir -p app components hooks lib types providers constants
```

### Step 4: Configure package.json (30 min)
Add these dependencies:
- expo-router
- @supabase/supabase-js
- @tanstack/react-query
- expo-secure-store
- react-native-purchases (RevenueCat)

### Step 5: Configure TypeScript (20 min)
Set up `tsconfig.json` with:
- Path aliases (@/, @components/, @hooks/, etc.)
- Strict mode enabled
- Proper includes/excludes

### Step 6: Configure Expo (30 min)
Set up `app.json` with:
- App name: "YOUR_APP_NAME"
- Bundle ID: "com.yourcompany.yourapp"
- Splash screen, icon placeholders
- Plugins: expo-router

### Step 7: Configure EAS (20 min)
Create `eas.json` with:
- Development builds
- Preview builds
- Production builds

### Step 8: Create Environment Template (20 min)
Create `.env.example` with:
```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_API_URL=
DEV_MODE=true
```

### Step 9: Test Everything (30 min)
```bash
npm install
npx expo start
```

Verify:
- No errors during install
- App launches
- TypeScript compiles
- Can navigate to blank screen

---

## Success Criteria Checklist

- [ ] ios-kit/ directory created
- [ ] Expo project initialized
- [ ] All directories exist (app/, components/, etc.)
- [ ] package.json has all required dependencies
- [ ] npm install runs without errors
- [ ] tsconfig.json configured with path aliases
- [ ] app.json configured with placeholders
- [ ] eas.json configured
- [ ] .env.example created with all variables
- [ ] npx expo start launches successfully
- [ ] TypeScript compilation works
- [ ] No console errors

---

## Key Files to Create

1. `ios-kit/package.json` - Dependencies and scripts
2. `ios-kit/tsconfig.json` - TypeScript configuration
3. `ios-kit/app.json` - Expo configuration
4. `ios-kit/eas.json` - EAS Build configuration
5. `ios-kit/.env.example` - Environment variables template
6. `ios-kit/README.md` - iOS kit specific readme

---

## After Completion

### Update Feature List
Mark these as passing in `../feature_list.json`:
- IOS-FOUND-001: passes = true
- IOS-FOUND-002: passes = true
- IOS-FOUND-003: passes = true
- IOS-FOUND-004: passes = true
- IOS-FOUND-005: passes = true

### Update Progress Log
Append to `../claude-progress.txt`:
```
==============================================
SESSION 5 - iOS FOUNDATION & PROJECT SETUP
==============================================
Date: [DATE]
Agent: [YOUR NAME]
Duration: [HOURS]

FEATURES COMPLETED:
✅ IOS-FOUND-001: iOS Monorepo Structure
✅ IOS-FOUND-002: Expo Configuration
✅ IOS-FOUND-003: Environment Template
✅ IOS-FOUND-004: Package Dependencies
✅ IOS-FOUND-005: TypeScript Configuration

PROGRESS: 5/147 features (3.4%)

NEXT SESSION: Should implement Authentication (Session 6)
```

### Create Session Report
Create `../SESSION_05_REPORT.md` with details of your work.

---

## Important Reminders

- ⚠️ Use placeholders for app name, bundle ID (users will customize)
- ⚠️ Don't commit .env file (only .env.example)
- ⚠️ Ensure strict TypeScript mode
- ⚠️ Test that npm install works before proceeding
- ⚠️ Verify expo start launches without errors

---

## Reference Files

- **IMPLEMENTATION_ROADMAP.md** - Full session details
- **CODING_AGENT_QUICKREF.md** - Quick reference guide
- **PRD_IOS_STARTER_KIT.md** - iOS specifications
- **feature_list.json** - Feature definitions
- **templates/** - Reference code

---

## Need Help?

Check these resources in order:
1. IMPLEMENTATION_ROADMAP.md > Phase 1 > Session 5
2. PRD_IOS_STARTER_KIT.md > Foundation section
3. CODING_AGENT_QUICKREF.md > iOS section
4. Expo docs: https://docs.expo.dev

---

**You've got this! Start building!** 🚀
