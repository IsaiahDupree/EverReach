# Deep Cleanup Analysis - All Branches

**Generated:** January 17, 2026  
**Analysis Type:** Comprehensive file-by-file discovery

---

## Executive Summary

| Category | Total Size | Action |
|----------|-----------|--------|
| Build artifacts (.next/) | **211 MB** | DELETE |
| Source maps (.map) | **109 MB** | DELETE |
| Marketing screenshots | 40 MB | REVIEW |
| Recovery/temp files | 4 MB | DELETE |
| Duplicate backend code | 3 MB | REMOVE from web/ios |
| Test artifacts | 2 MB | CLEAN |
| Misc (PDFs, zips, bak) | 4 MB | DELETE |
| **TOTAL ADDITIONAL** | **~373 MB** | |

---

# BACKEND BRANCH - Cleanup Tasks

## High Priority (Size Impact)

### 1. dashboard-app/.next/ (211 MB)
```bash
rm -rf dashboard-app/.next/
```

### 2. Source Map Files (109 MB, 345 files)
```bash
find . -name "*.map" -type f -delete
```

### 3. Recovery ZIP File (1.3 MB)
```bash
rm -f "rork-ai-enhanced-personal-crm-recover-work (1).zip"
```

## Medium Priority (Organization)

### 4. Backup Files (.bak)
```
test/agent/agent-analyze-contact.mjs.bak
test/agent/agent-message-goals.mjs.bak
test/agent/agent-interactions-summary.mjs.bak
test/agent/agent-contact-details.mjs.bak
```
```bash
find . -name "*.bak" -type f -delete
```

### 5. Test Artifacts
```
test-results/                    (88 KB)
test/frontend/test-results/
web/test-results/
backend-vercel/app/api/v1/dashboard/test-results/
```
```bash
find . -name "test-results" -type d -exec rm -rf {} +
```

### 6. Nested test/test/ Folder (1.2 MB)
```bash
# Review if needed, then:
rm -rf test/test/
```

## Decision Required

### 7. android/ Folder (680 KB)
- Contains Gradle build files for Android
- **Question:** Should Android code be in the backend branch?

### 8. Email2Social/ Folder (296 KB)
- Separate integration project
- **Question:** Keep, delete, or separate branch?

### 9. everreach-integration/ Folder (48 KB)
- Integration code
- **Question:** Keep or delete?

### 10. repos/ Folder (88 KB)
- Contains repository pattern TypeScript files
- Likely needed - KEEP

### 11. maestro/ Folder (4 KB)
- Mobile testing framework
- **Question:** Keep in backend?

---

# WEB-FRONTEND BRANCH - Cleanup Tasks

## High Priority

### 1. PDF Files (2 MB)
```
"make sure this page has a bottom nav bar (1).pdf"
"make sure this page has a bottom nav bar.pdf"
```
```bash
rm -f "make sure this page has a bottom nav bar"*.pdf
```

### 2. Screenshots Folder (2.8 MB)
```
screenshots/00-quick-check.png.png   (duplicate .png extension)
```
```bash
rm -rf screenshots/
```

### 3. Marketing Screenshots (20 MB)
```
marketing/screenshots/
├── appstore-ipad-2025-12-04-0129/
├── appstore-2025-11-22-1611/
├── appstore-2025-11-22-1709/
└── ...
```
**Options:**
- Delete all older versions, keep only latest
- Move to separate marketing repo

### 4. Appium Test Screenshots (~500 KB)
```bash
rm -rf appium-tests/screenshots/
```

### 5. Test Reports
```bash
rm -rf test-reports/*
```

## Decision Required

### 6. backend-vercel/ Folder (1.5 MB)
- Duplicate of backend branch's backend-vercel
- 693 file differences from backend version
- **Recommendation:** Remove if web-frontend should only have frontend code

### 7. backend/ Folder (240 KB)
- Backend code in frontend branch
- **Recommendation:** Remove

### 8. supabase/ Folder (16 KB)
- Duplicate migrations
- **Recommendation:** Keep only in backend branch

### 9. repos/ Folder (152 KB)
- Repository pattern files
- **Question:** Needed for frontend?

### 10. maestro/ Folder (84 KB)
- Mobile testing - not needed for web
- **Recommendation:** Remove from web-frontend

---

# IOS-APP BRANCH - Cleanup Tasks

## High Priority

### 1. Marketing Screenshots (20 MB)
Same as web-frontend - review and clean old versions

### 2. Appium Test Screenshots (~500 KB)
```bash
rm -rf appium-tests/screenshots/
```

### 3. Test Reports
```bash
rm -rf test-reports/*
```

## Decision Required

### 4. backend-vercel/ Folder (1.5 MB)
- Duplicate of backend branch
- **Recommendation:** Remove, should only have mobile code

### 5. backend/ Folder (240 KB)
- **Recommendation:** Remove

### 6. supabase/ Folder (16 KB)
- **Recommendation:** Keep only in backend branch

### 7. repos/ Folder (152 KB)
- **Question:** Needed for iOS app?

### 8. maestro/ Folder (84 KB)
- Mobile testing framework
- **KEEP** - needed for iOS testing

---

# Empty Directories Found

All branches have empty docs subdirectories from earlier cleanup:
```
ios-app/web/                    (empty)
ios-app/docs/features/
ios-app/docs/planning/
ios-app/docs/testing/
ios-app/docs/architecture/
ios-app/docs/sessions/
ios-app/docs/deployment/
backend/docs/features/
backend/docs/dashboard/
backend/docs/marketing/
web-frontend/docs/features/
web-frontend/docs/planning/
web-frontend/docs/testing/
web-frontend/docs/architecture/
web-frontend/docs/sessions/
web-frontend/docs/deployment/
```

```bash
# Remove all empty directories
find . -type d -empty -delete
```

---

# Recommended Branch Structure

## Backend Branch Should Contain:
- ✅ backend-vercel/ (API code)
- ✅ supabase/ (migrations)
- ✅ dashboard-app/ (without .next/)
- ✅ test/ (backend tests)
- ✅ docs/
- ❌ android/ (move to ios-app or separate)
- ❌ .map files
- ❌ recovery zip

## Web-Frontend Branch Should Contain:
- ✅ app/ (React/Expo web code)
- ✅ components/
- ✅ hooks/
- ✅ lib/
- ✅ services/
- ✅ docs/
- ❌ backend-vercel/ (duplicate)
- ❌ backend/ (duplicate)
- ❌ supabase/ (duplicate)
- ❌ ios/ (removed earlier)
- ❌ marketing/ (optional - move to marketing repo)

## iOS-App Branch Should Contain:
- ✅ app/ (React Native code)
- ✅ ios/ (native iOS code)
- ✅ components/
- ✅ hooks/
- ✅ lib/
- ✅ services/
- ✅ maestro/ (mobile testing)
- ✅ appium-tests/ (without screenshots)
- ✅ docs/
- ❌ backend-vercel/ (duplicate)
- ❌ backend/ (duplicate)
- ❌ supabase/ (duplicate)
- ❌ marketing/ (optional)

---

# Cleanup Commands - Safe to Execute

```bash
# ============ BACKEND ============
cd /Users/isaiahdupree/Documents/Software/EverReachOrganized/backend

# Build artifacts (211 MB)
rm -rf dashboard-app/.next/

# Source maps (109 MB)
find . -name "*.map" -type f -delete

# Recovery file (1.3 MB)
rm -f "rork-ai-enhanced-personal-crm-recover-work (1).zip"

# Backup files
find . -name "*.bak" -type f -delete

# Test artifacts
find . -name "test-results" -type d -exec rm -rf {} + 2>/dev/null

# ============ WEB-FRONTEND ============
cd /Users/isaiahdupree/Documents/Software/EverReachOrganized/web-frontend

# PDFs (2 MB)
rm -f "make sure this page has a bottom nav bar"*.pdf

# Screenshots (2.8 MB)
rm -rf screenshots/

# Appium screenshots
rm -rf appium-tests/screenshots/

# Test reports
rm -rf test-reports/*

# ============ IOS-APP ============
cd /Users/isaiahdupree/Documents/Software/EverReachOrganized/ios-app

# Appium screenshots
rm -rf appium-tests/screenshots/

# Test reports
rm -rf test-reports/*

# ============ ALL BRANCHES ============
cd /Users/isaiahdupree/Documents/Software/EverReachOrganized

# Empty directories
find . -type d -empty -delete 2>/dev/null
```

---

# Commands Requiring Decision

```bash
# If removing duplicate backend code from web-frontend:
rm -rf web-frontend/backend-vercel/
rm -rf web-frontend/backend/
rm -rf web-frontend/supabase/

# If removing duplicate backend code from ios-app:
rm -rf ios-app/backend-vercel/
rm -rf ios-app/backend/
rm -rf ios-app/supabase/

# If removing marketing folders:
rm -rf web-frontend/marketing/
rm -rf ios-app/marketing/

# If removing android from backend:
rm -rf backend/android/

# If removing misc integrations from backend:
rm -rf backend/Email2Social/
rm -rf backend/everreach-integration/
```

---

# Final Size Projections

After ALL cleanup (including duplicate removal):

| Folder | Current | After Full Cleanup | Reduction |
|--------|---------|-------------------|-----------|
| backend/ | 289 MB | **~60 MB** | **79%** |
| web-frontend/ | 202 MB | **~150 MB** | **26%** |
| ios-app/ | 203 MB | **~150 MB** | **26%** |
| **TOTAL** | **694 MB** | **~360 MB** | **48%** |

**From original 1.47 GB → 360 MB = 75% total reduction**

---

# Additional Discovered Items (Final Pass)

## Hidden/Config Files

| Item | Size | Location | Action |
|------|------|----------|--------|
| `.vscode/` folders | 24 KB | all branches | OPTIONAL - keep for dev settings |
| `.github/` folders | 16 KB | backend | KEEP - CI/CD workflows |
| `.temp/` supabase folders | ~1 KB | all branches | DELETE - temp cache |
| `.auth/` test folder | ~1 KB | backend/test | DELETE - test auth state |
| `debug.keystore` | ~2 KB | backend/android | REVIEW - Android debug key |

## Large JSON Files

| File | Size | Location |
|------|------|----------|
| `package-lock.json` | 552 KB | backend |
| `package-lock.json` | 860 KB | ios-app |
| `package-lock.json` | 900 KB | web-frontend |

**Note:** package-lock.json files should be KEPT for reproducible builds.

## Audio Files

| File | Location | Action |
|------|----------|--------|
| `notification_sound.wav` | ios-app/local/assets/ | KEEP |
| `notification_sound.wav` | web-frontend/local/assets/ | KEEP |

## Font Files (in .next build - will be removed)

7 `.woff2` font files in `backend/dashboard-app/.next/` - will be deleted with .next folder.

---

# FINAL CLEANUP SUMMARY

## All Discovered Cleanup Tasks

### Definite Deletes (Safe)
| Task | Size | Command |
|------|------|---------|
| dashboard-app/.next/ | 211 MB | `rm -rf backend/dashboard-app/.next/` |
| .map source files | 109 MB | `find backend/ -name "*.map" -delete` |
| Recovery ZIP | 1.3 MB | `rm -f backend/"rork-ai...zip"` |
| PDF files | 2 MB | `rm -f web-frontend/*.pdf` |
| screenshots/ | 2.8 MB | `rm -rf web-frontend/screenshots/` |
| appium screenshots | 1 MB | `rm -rf */appium-tests/screenshots/` |
| test-results/ | 500 KB | `find . -name "test-results" -type d -exec rm -rf {} +` |
| .bak files | 50 KB | `find . -name "*.bak" -delete` |
| .temp folders | 1 KB | `find . -name ".temp" -type d -exec rm -rf {} +` |
| Empty directories | - | `find . -type d -empty -delete` |
| **SUBTOTAL** | **~328 MB** | |

### Decision Required
| Task | Size | Options |
|------|------|---------|
| marketing/screenshots/ | 40 MB | Keep latest only OR move to marketing repo |
| backend-vercel/ duplicates | 3 MB | Remove from web-frontend & ios-app |
| backend/ duplicates | 480 KB | Remove from web-frontend & ios-app |
| supabase/ duplicates | 32 KB | Remove from web-frontend & ios-app |
| android/ folder | 680 KB | Keep in backend OR move to ios-app |
| Email2Social/ | 296 KB | Keep OR remove |
| test/test/ nested | 1.2 MB | Review OR remove |
| **SUBTOTAL** | **~46 MB** | |

### Grand Total Potential Cleanup: ~374 MB additional

---

# Discovery Complete

All cleanup tasks have been identified across all three branches:
- **8 documentation files** created
- **328 MB** safe to delete immediately  
- **46 MB** requires user decision
- **Total potential reduction:** 75% from original 1.47 GB
