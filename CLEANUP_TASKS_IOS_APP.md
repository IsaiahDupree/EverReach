# iOS App Cleanup Tasks
**Folder:** `ios-app/` (562 MB → target ~250 MB)  
**Source Branch:** `e2e-ios`

---

## 1. CRITICAL: Remove Secret Files

### Files to DELETE:
```
.env                    (7.3 KB) - CONTAINS SECRETS
```

### Files to KEEP:
```
.env.example            (template only)
```

### Command:
```bash
rm -f .env
```

---

## 2. Remove Large Log Files (~8.5 MB)

| File | Size |
|------|------|
| `xcode-build-jsc.log` | 4.3 MB |
| `xcode-build.log` | 2.1 MB |
| `build-test-20251203-200142.log` | 1.8 MB |
| `final-rebuild.log` | 126 KB |
| `full-build-clean.log` | 125 KB |
| `rebuild-with-fixes.log` | 204 KB |
| `build-test-20251203-200054.log` | 292 KB |
| `final-build-superwall-0.6.11.log` | 177 KB |

### Command:
```bash
rm -f *.log
```

**Savings: ~8.5 MB**

---

## 3. Review Large Folders

| Folder | Size | Notes |
|--------|------|-------|
| `web/` | 350 MB | **INVESTIGATE** - same issue as web-frontend |
| `marketing/` | 24 MB | Marketing assets |
| `appium-tests/` | 5.9 MB | E2E tests for iOS |
| `assets/` | 5.5 MB | App assets - keep |
| `screenshots/` | 2.7 MB | Test screenshots |
| `ios/` | 1.0 MB | **KEEP** - iOS native code |

### web/ folder - likely contains build artifacts:
```bash
rm -rf web/.next/
```

**Potential savings: 300+ MB**

---

## 4. Organize Root-Level Scripts

### Same 37 scripts as web-frontend (branches are nearly identical)

**Move to `scripts/` subfolders:**
```bash
mkdir -p scripts/test scripts/deploy scripts/db scripts/utils

# Test scripts
mv test-*.mjs scripts/test/
mv test-*.sh scripts/test/

# Deploy scripts
mv deploy*.ps1 scripts/deploy/

# DB scripts
mv *migration*.ps1 scripts/db/
mv check-*.ps1 scripts/db/

# Utils
mv *.ps1 scripts/utils/
mv *.bat scripts/utils/
```

---

## 5. Organize Documentation (362 .md files at root)

### Create docs structure:
```bash
mkdir -p docs/architecture
mkdir -p docs/api
mkdir -p docs/planning
mkdir -p docs/sessions
mkdir -p docs/testing
mkdir -p docs/deployment
mkdir -p docs/archive
mkdir -p docs/features
mkdir -p docs/ios  # iOS-specific docs
```

### Move iOS-specific docs:
```bash
mv BUILD_README.md docs/ios/
mv EAS_*.md docs/ios/
mv XCODE_*.md docs/ios/
mv IOS_*.md docs/ios/
mv *_IOS_*.md docs/ios/
mv SUPERWALL*.md docs/ios/
mv REVENUECAT*.md docs/ios/
```

### Move general docs (same patterns as other folders):
```bash
# Architecture
mv ARCHITECTURE*.md docs/architecture/ 2>/dev/null
mv *_SYSTEM*.md docs/architecture/ 2>/dev/null

# API
mv *API*.md docs/api/ 2>/dev/null
mv *ENDPOINT*.md docs/api/ 2>/dev/null

# Planning
mv *_PLAN.md docs/planning/ 2>/dev/null
mv *_ROADMAP.md docs/planning/ 2>/dev/null

# Sessions
mv SESSION_*.md docs/sessions/ 2>/dev/null

# Testing  
mv *TEST*.md docs/testing/ 2>/dev/null
mv *COVERAGE*.md docs/testing/ 2>/dev/null

# Deployment
mv DEPLOY*.md docs/deployment/ 2>/dev/null
mv AUTH*.md docs/deployment/ 2>/dev/null

# Archive
mv *_COMPLETE*.md docs/archive/ 2>/dev/null
mv *_ACHIEVED*.md docs/archive/ 2>/dev/null
mv *_STATUS*.md docs/archive/ 2>/dev/null
mv *_FIX*.md docs/archive/ 2>/dev/null

# Features
mv *PAYWALL*.md docs/features/ 2>/dev/null
mv *SUBSCRIPTION*.md docs/features/ 2>/dev/null
mv *WARMTH*.md docs/features/ 2>/dev/null
```

---

## 6. iOS-Specific Cleanup

### Keep these iOS essentials:
```
ios/                    # Native iOS project
.detoxrc.json          # iOS E2E testing config (keep for iOS)
.easignore             # EAS Build ignore file
app.json               # Expo config
eas.json               # EAS Build config
```

### Review Pods (if present):
```bash
# Check if Pods are committed (shouldn't be)
ls -la ios/Pods 2>/dev/null
# If exists, should be in .gitignore
```

---

## 7. Clean Test Artifacts

| Folder | Action |
|--------|--------|
| `test-reports/` | **CLEAN** - remove old reports |
| `screenshots/` | **REVIEW** - 2.7 MB test screenshots |
| `appium-tests/` | **KEEP** - iOS E2E tests |

### Command:
```bash
rm -rf test-reports/*
```

---

## 8. Update .gitignore

Add to `.gitignore`:
```gitignore
# Environment
.env
.env.local
.env.*.local

# Dependencies
node_modules/

# Build outputs
dist/
build/
.expo/
web/.next/

# iOS Build
ios/Pods/
ios/build/
ios/*.xcworkspace/xcuserdata/
ios/*.xcodeproj/xcuserdata/
*.ipa
*.dSYM.zip

# Logs
*.log
xcode-*.log
build-*.log

# Test artifacts
coverage/
test-results/
test-reports/

# EAS
.eas/

# OS
.DS_Store
```

---

## 9. Differences from web-frontend

The ios-app branch should focus on:
- **Keep**: `ios/` folder, `.detoxrc.json`, `appium-tests/`, EAS configs
- **Keep**: iOS-specific documentation
- **Keep**: Superwall/RevenueCat integration docs

The web-frontend branch should:
- **Remove**: `ios/` folder, `.detoxrc.json`
- Focus on web deployment

---

## Summary Checklist

- [ ] Remove `.env` (keep `.env.example`)
- [ ] Remove all `*.log` files (~8.5 MB)
- [ ] Clean `web/.next/` build folder (~300+ MB potential)
- [ ] Move scripts to `scripts/` subfolders
- [ ] Organize 362 .md files into `docs/` subfolders
- [ ] Create `docs/ios/` for iOS-specific docs
- [ ] Clean `test-reports/`
- [ ] Review `screenshots/` folder (2.7 MB)
- [ ] Review `marketing/` folder (24 MB)
- [ ] Ensure `ios/Pods/` is not committed
- [ ] Update `.gitignore`

**Estimated final size: ~250 MB (55% reduction)**
