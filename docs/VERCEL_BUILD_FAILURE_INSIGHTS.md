# Vercel Build Failure Insights - Mobile vs Web Build Configuration

## 🔴 Build Failure Summary

**Error:** `Command "npx expo export --platform web" exited with 1`  
**Commit:** `db9ecc2` - "Switch app to use production backend URL (ever-reach-be.vercel.app)"  
**Branch:** `e2e`  
**Project:** `backend-vercel` on Vercel

---

## 🎯 Key Insight: Wrong Build Command for Backend Project

### The Problem

Vercel attempted to run `npx expo export --platform web` on the **backend-vercel** project, which is a **Next.js** project, not an Expo project.

### Root Cause

1. **Vercel Auto-Detection Issue:**
   - Vercel may have detected the root `package.json` (which has Expo dependencies) instead of `backend-vercel/package.json`
   - Or the Root Directory setting was incorrect/empty

2. **Wrong Build Command:**
   - `expo export --platform web` is for **Expo web builds**
   - `backend-vercel` should use `next build` (Next.js build)

---

## ✅ Working Mobile Build Configuration

### Why Mobile Builds Work

The **mobile iOS build** works because:

1. **Correct Build Command:**
   ```bash
   npx expo run:ios --device "iPad Pro 13-inch (M4)"
   ```
   - This is the correct command for iOS builds
   - Doesn't try to export for web
   - Uses Expo's native build system

2. **Local Build Process:**
   - Mobile builds run **locally** (not on Vercel)
   - Uses Xcode and CocoaPods directly
   - No web export needed

3. **Correct Project Structure:**
   ```
   mobileapp/
   ├── package.json          # Expo app (React Native)
   ├── app.json              # Expo config
   ├── ios/                  # Native iOS project
   └── android/              # Native Android project
   ```

---

## 🔧 Correct Vercel Configuration for Backend

### Current Configuration (Correct)

**File:** `mobileapp/backend-vercel/vercel.json`

```json
{
  "framework": "nextjs",
  "regions": ["iad1"],
  "crons": [...]
}
```

**File:** `mobileapp/backend-vercel/package.json`

```json
{
  "scripts": {
    "build": "next build",
    "vercel-build": "npm install --no-save --os=linux --cpu=x64 sharp && next build"
  }
}
```

### Vercel Project Settings Should Be:

```
Framework Preset: Next.js
Root Directory: backend-vercel
Build Command: npm run build (or npm run vercel-build)
Output Directory: .next
Install Command: npm install
```

---

## 📊 Configuration Comparison

### Mobile Build (Working ✅)

| Aspect | Configuration |
|--------|--------------|
| **Build Command** | `npx expo run:ios` |
| **Platform** | iOS Native |
| **Build Location** | Local (Xcode) |
| **Output** | `.app` bundle |
| **Dependencies** | CocoaPods (iOS) |
| **Framework** | React Native + Expo |

### Web Build (Failed ❌)

| Aspect | What Happened | What Should Be |
|--------|--------------|----------------|
| **Build Command** | `npx expo export --platform web` ❌ | `next build` ✅ |
| **Platform** | Web (Expo) | Web (Next.js) |
| **Build Location** | Vercel | Vercel |
| **Output** | Expo web export | Next.js `.next` |
| **Dependencies** | Expo web | Next.js |
| **Framework** | Expo (wrong) | Next.js (correct) |

### Backend API Build (Should Work ✅)

| Aspect | Configuration |
|--------|--------------|
| **Build Command** | `npm run build` or `npm run vercel-build` |
| **Platform** | Serverless (Vercel) |
| **Build Location** | Vercel |
| **Output** | `.next` directory |
| **Dependencies** | npm |
| **Framework** | Next.js |

---

## 🔍 Why the Error Occurred

### Possible Scenarios

1. **Root Directory Not Set:**
   - Vercel was building from repository root
   - Found `mobileapp/package.json` (Expo) instead of `mobileapp/backend-vercel/package.json` (Next.js)
   - Auto-detected as Expo project

2. **Build Command Override:**
   - Someone may have manually set build command to `expo export --platform web`
   - Or Vercel auto-detected based on root `package.json`

3. **Project Structure Confusion:**
   ```
   Repository Root/
   ├── package.json          # Expo (React Native) ← Vercel saw this!
   └── backend-vercel/
       └── package.json      # Next.js ← Should use this!
   ```

---

## ✅ Solution: Fix Vercel Settings

### Step 1: Verify Root Directory

1. Go to: https://vercel.com/isaiahduprees-projects/backend-vercel/settings
2. Check **Root Directory** field
3. **Should be:** `backend-vercel` (not empty, not `/`)

### Step 2: Verify Build Command

1. In Vercel settings, check **Build Command**
2. **Should be:** `npm run build` or `npm run vercel-build`
3. **Should NOT be:** `npx expo export --platform web`

### Step 3: Verify Framework

1. Check **Framework Preset**
2. **Should be:** `Next.js`
3. **Should NOT be:** `Expo` or `Other`

---

## 📝 Key Takeaways

### ✅ What Works (Mobile)

1. **Local iOS builds** using `expo run:ios` ✅
2. **Native dependencies** via CocoaPods ✅
3. **Production backend URL** configuration ✅
4. **Xcode project** generation ✅

### ❌ What Failed (Web/Backend)

1. **Vercel tried to build Expo web** instead of Next.js ❌
2. **Wrong build command** detected/configured ❌
3. **Root directory** may have been incorrect ❌

### 🎯 Correct Configuration

1. **Backend on Vercel:** Next.js build (`next build`)
2. **Mobile iOS:** Expo build (`expo run:ios`)
3. **Mobile Android:** Expo build (`expo run:android`)
4. **Web (if needed):** Expo web (`expo export --platform web`) - but this should be a separate project

---

## 🔗 Related Files

- **Vercel Config:** `mobileapp/backend-vercel/vercel.json`
- **Backend Package:** `mobileapp/backend-vercel/package.json`
- **Mobile Package:** `mobileapp/package.json`
- **API Config:** `mobileapp/lib/api.ts` (uses production URL: `ever-reach-be.vercel.app`)

---

## 📅 Timeline

- **Commit:** `db9ecc2` - "Switch app to use production backend URL"
- **Build Failed:** Vercel tried `expo export --platform web`
- **Issue:** Wrong build command for Next.js backend project
- **Solution:** Ensure Root Directory = `backend-vercel` and Build Command = `next build`

---

## 💡 Recommendations

1. **Separate Projects:**
   - Keep `backend-vercel` as a separate Vercel project
   - Don't try to build Expo web from backend project

2. **Clear Root Directory:**
   - Always set Root Directory explicitly in Vercel
   - Don't rely on auto-detection

3. **Verify Build Commands:**
   - Check Vercel settings after each deployment
   - Ensure build command matches project type

4. **Mobile Builds:**
   - Continue using local builds (`expo run:ios`)
   - Don't try to build mobile apps on Vercel

