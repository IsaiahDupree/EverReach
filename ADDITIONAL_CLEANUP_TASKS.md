# Additional Cleanup Tasks Discovered

**Generated:** January 17, 2026  
**Phase:** Deep Analysis (Updated)

---

## Summary of All Findings

| Item | Size | Location | Action |
|------|------|----------|--------|
| dashboard-app/.next/ | **211 MB** | backend/ | DELETE |
| .map source files | **109 MB** | backend/ | DELETE |
| marketing/screenshots/ | 20 MB | web-frontend/, ios-app/ | REVIEW |
| appium-tests/screenshots/ | ~500 KB | web-frontend/, ios-app/ | CLEAN |
| test-results/ folders | ~500 KB | multiple | DELETE |
| android/ folder | 680 KB | backend/ | REVIEW |
| screenshots/ folder | 2.8 MB | web-frontend/ | DELETE |
| recovery zip file | ~5 MB | backend/ | DELETE |
| PDF files | ~2 MB | web-frontend/ | DELETE |
| .bak files | ~50 KB | backend/test/ | DELETE |
| Duplicate backend-vercel/ | 1.5 MB | web-frontend/, ios-app/ | REVIEW |
| Duplicate supabase/ | 16 KB | web-frontend/, ios-app/ | REVIEW |
| Empty directories | multiple | all branches | DELETE |
| test/test/ nested folder | 1.2 MB | backend/ | REVIEW |

---

# NEW FINDINGS: Duplicate Code Across Branches

## Critical: Shared Backend Code

The `backend-vercel/` folder exists in ALL THREE branches with 693 file differences:

| Branch | backend-vercel/ size |
|--------|---------------------|
| backend/ | 9.8 MB |
| web-frontend/ | 1.5 MB |
| ios-app/ | 1.5 MB |

**Recommendation:** 
- Keep `backend-vercel/` only in the **backend** branch
- Remove from web-frontend and ios-app (they should reference backend)

## Duplicate backend/ folder

| Branch | backend/ size |
|--------|--------------|
| backend/ | 240 KB (this is nested backend/backend/) |
| web-frontend/ | 240 KB |
| ios-app/ | 240 KB |

## Duplicate supabase/ folder

| Branch | supabase/ size |
|--------|---------------|
| backend/ | 68 KB |
| web-frontend/ | 16 KB |
| ios-app/ | 16 KB |

---

# NEW FINDINGS: Misc Files to Clean

**Potential additional savings: ~345 MB**

---

# BACKEND Additional Tasks

## 1. CRITICAL: Remove dashboard-app/.next/ (211 MB)

Another Next.js build folder that was missed:

```bash
rm -rf dashboard-app/.next/
```

**Savings: 211 MB**

---

## 2. Remove Source Map Files (109 MB)

345 `.map` files found (source maps for debugging):

```bash
find . -name "*.map" -type f -delete
```

**Savings: 109 MB**

---

## 3. Clean Test Results Folders

Multiple test-results directories with old artifacts:

```
test-results/                           (88 KB)
test/frontend/test-results/
web/test-results/
backend-vercel/app/api/v1/dashboard/test-results/
```

```bash
rm -rf test-results/
rm -rf test/frontend/test-results/
rm -rf web/test-results/
rm -rf backend-vercel/app/api/v1/dashboard/test-results/
```

---

## 4. Review android/ Folder (680 KB)

Backend has an Android folder - should this be here?

```
android/
├── app/
├── gradle/
├── build.gradle
├── gradlew
└── gradlew.bat
```

**Decision needed:** Is this Android code meant to be in the backend branch?

---

## 5. Review Email2Social/ Folder (296 KB)

```
Email2Social/
```

**Decision needed:** Is this a separate integration project? Should it be its own branch?

---

## 6. Review everreach-integration/ Folder (48 KB)

```
everreach-integration/
```

**Decision needed:** Is this needed or an old integration attempt?

---

# WEB-FRONTEND Additional Tasks

## 1. Marketing Screenshots (20 MB)

Large folder with App Store screenshots:

```
marketing/screenshots/
├── appstore-ipad-2025-12-04-0129/     (multiple PNGs)
├── appstore-2025-11-22-1611/          (multiple PNGs)
├── appstore-2025-11-22-1709/          (multiple PNGs)
└── ...
```

**Options:**
- Keep only latest screenshot set
- Move to separate marketing repo
- Compress images

```bash
# Keep only most recent, delete old:
ls -d marketing/screenshots/appstore-* | head -n -1 | xargs rm -rf
```

---

## 2. Root Screenshots Folder (2.8 MB)

Single file with duplicate extension:

```
screenshots/00-quick-check.png.png    (2.8 MB)
```

```bash
rm -rf screenshots/
```

---

## 3. Appium Test Screenshots (~500 KB)

Test screenshots that should be regenerated:

```
appium-tests/screenshots/
├── 00-app-launched.png
├── 01-home-screen.png
├── 02-button-clicked.png
└── ...
```

```bash
rm -rf appium-tests/screenshots/
```

---

## 4. Clean Test Reports

```
test-reports/
```

```bash
rm -rf test-reports/*
```

---

# IOS-APP Additional Tasks

## 1. Marketing Screenshots (20 MB)

Same as web-frontend - large App Store screenshots:

```bash
# Keep only most recent set
ls -d marketing/screenshots/appstore-* | head -n -1 | xargs rm -rf
```

---

## 2. Appium Test Screenshots (~500 KB)

```bash
rm -rf appium-tests/screenshots/
```

---

## 3. Clean Test Reports

```bash
rm -rf test-reports/*
```

---

# Questions for User Decision

Before executing these additional cleanups, please confirm:

1. **dashboard-app in backend:** Is this the main dashboard or should it be separate?
2. **android/ in backend:** Should Android code be in the backend branch?
3. **Email2Social/:** Keep, delete, or make separate branch?
4. **everreach-integration/:** Keep or delete?
5. **marketing/screenshots/:** Keep all versions or only latest?

---

# Cleanup Commands Summary

## Safe to Run (No Decision Needed)

```bash
# Backend
rm -rf backend/dashboard-app/.next/           # 211 MB
find backend/ -name "*.map" -type f -delete   # 109 MB
rm -rf backend/test-results/
rm -rf backend/test/frontend/test-results/
rm -rf backend/web/test-results/
rm -rf backend/backend-vercel/app/api/v1/dashboard/test-results/

# Web-frontend
rm -rf web-frontend/screenshots/              # 2.8 MB
rm -rf web-frontend/appium-tests/screenshots/
rm -rf web-frontend/test-reports/*

# iOS-app
rm -rf ios-app/appium-tests/screenshots/
rm -rf ios-app/test-reports/*
```

## Requires Decision

```bash
# Marketing screenshots (20 MB each in web-frontend and ios-app)
# Option A: Delete all
rm -rf web-frontend/marketing/screenshots/
rm -rf ios-app/marketing/screenshots/

# Option B: Keep only latest set
# (manual review needed)

# Backend folders requiring decision
rm -rf backend/android/           # 680 KB - if not needed
rm -rf backend/Email2Social/      # 296 KB - if not needed
rm -rf backend/everreach-integration/  # 48 KB - if not needed
```

---

# Updated Size Projections

After additional cleanup:

| Folder | Current | After Additional | Total Reduction |
|--------|---------|------------------|-----------------|
| backend/ | 289 MB | ~60 MB | **82%** from original |
| web-frontend/ | 202 MB | ~175 MB | **69%** from original |
| ios-app/ | 203 MB | ~175 MB | **69%** from original |
| **TOTAL** | **694 MB** | **~410 MB** | **72%** from 1.47 GB |
