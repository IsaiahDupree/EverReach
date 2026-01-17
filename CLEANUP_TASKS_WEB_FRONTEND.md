# Web Frontend Cleanup Tasks
**Folder:** `web-frontend/` (563 MB → target ~200 MB)  
**Source Branch:** `e2e-web`

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
rm -f xcode-build*.log
rm -f build-*.log
rm -f *-rebuild*.log
```

**Savings: ~8.5 MB**

---

## 3. Remove iOS-Specific Content (Not needed for web)

The `web-frontend` branch shouldn't contain iOS native code:

| Folder/File | Size | Action |
|-------------|------|--------|
| `ios/` | 1.0 MB | **DELETE** - not needed for web |
| `.detoxrc.json` | - | **DELETE** - iOS testing config |
| `appium-tests/` | 5.9 MB | **REVIEW** - may be web tests too |

### Command:
```bash
rm -rf ios/
rm -f .detoxrc.json
```

**Savings: ~1 MB** (more if appium-tests removed)

---

## 4. Review Large Folders

| Folder | Size | Notes |
|--------|------|-------|
| `web/` | 350 MB | **INVESTIGATE** - why so large? |
| `marketing/` | 24 MB | Marketing assets - review |
| `appium-tests/` | 5.9 MB | E2E tests |
| `assets/` | 5.5 MB | App assets |
| `screenshots/` | 2.7 MB | Test screenshots - consider removing |

### web/ folder investigation:
```bash
du -sh web/*/ 2>/dev/null | sort -hr | head -10
```
- Contains `.next/` build folder (should be gitignored)
- Only has `index.html` and `.next/` - likely build artifacts

### Command to clean web/:
```bash
rm -rf web/.next/
```

**Potential savings: 300+ MB**

---

## 5. Organize Root-Level Scripts

### 37 scripts at root - move to `scripts/`:

**Test Scripts (move to `scripts/test/`):**
```
test-interactions-api.sh
test-google-contacts-import.mjs
test-identify-only.mjs
test-frontend-emails.mjs
```

**Deployment Scripts (move to `scripts/deploy/`):**
```
deploy-fixes.ps1
deploy-expo-web.ps1
deploy-web.ps1
test-and-deploy.ps1
test-deployed-app.ps1
```

**Database Scripts (move to `scripts/db/`):**
```
run-supabase-migrations.ps1
create-views-from-migration.ps1
create-segment-views.ps1
run-migrations-now.ps1
run-migrations-direct.ps1
run-migrations-simple.ps1
final-migration-check.ps1
insert-campaigns.ps1
run-cleanup-populate.ps1
check-schema-simple.ps1
check-schema.ps1
fix-templates-schema.ps1
check-message-goals.ps1
check-contacts-schema.ps1
check-db.ps1
check-remaining-contacts.ps1
```

**Utility Scripts (move to `scripts/utils/`):**
```
run-tests.ps1
do-commit.bat
start-expo-suite.ps1
commit-backend-only.ps1
get-google-oauth-token.ps1
add-domain.ps1
quick-commit.ps1
verify-campaigns.ps1
commit-and-push.ps1
commit-e2e-tests.ps1
fix-packages.ps1
quick-fix-stuck-loading.ps1
```

### Command:
```bash
mkdir -p scripts/test scripts/deploy scripts/db scripts/utils

mv test-*.mjs scripts/test/
mv test-*.sh scripts/test/
mv deploy*.ps1 scripts/deploy/
mv *migration*.ps1 scripts/db/
mv check-*.ps1 scripts/db/
mv *.ps1 scripts/utils/
mv *.bat scripts/utils/
```

---

## 6. Organize Documentation (359 .md files at root)

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
```

### Move by pattern (same as backend):
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
mv *SETUP*.md docs/deployment/ 2>/dev/null

# Archive
mv *_COMPLETE*.md docs/archive/ 2>/dev/null
mv *_ACHIEVED*.md docs/archive/ 2>/dev/null
mv *_STATUS*.md docs/archive/ 2>/dev/null
mv *_SUCCESS*.md docs/archive/ 2>/dev/null
mv *_FIX*.md docs/archive/ 2>/dev/null

# Features (specific feature docs)
mv *PAYWALL*.md docs/features/ 2>/dev/null
mv *SUBSCRIPTION*.md docs/features/ 2>/dev/null
mv *WARMTH*.md docs/features/ 2>/dev/null
mv *ANALYTICS*.md docs/features/ 2>/dev/null
```

---

## 7. Clean Test Artifacts

| Folder | Action |
|--------|--------|
| `test-reports/` | **CLEAN** - remove old reports |
| `screenshots/` | **REVIEW** - 2.7 MB of test screenshots |
| `.playwright/` | **DELETE** if exists - cache |

### Command:
```bash
rm -rf test-reports/*
rm -rf .playwright/
# Review screenshots before deleting
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
.next/
.expo/
web/.next/

# iOS (not needed for web)
ios/
*.xcworkspace
*.xcodeproj
Pods/

# Logs
*.log
xcode-*.log
build-*.log

# Test artifacts
coverage/
test-results/
test-reports/
.playwright/
screenshots/

# OS
.DS_Store
```

---

## Summary Checklist

- [ ] Remove `.env` (keep `.env.example`)
- [ ] Remove all `*.log` files (~8.5 MB)
- [ ] Remove `ios/` folder (not needed for web frontend)
- [ ] Remove `.detoxrc.json`
- [ ] Clean `web/.next/` build folder (~300+ MB potential)
- [ ] Move scripts to `scripts/` subfolders
- [ ] Organize 359 .md files into `docs/` subfolders
- [ ] Clean `test-reports/`
- [ ] Review `screenshots/` folder (2.7 MB)
- [ ] Review `marketing/` folder (24 MB) - needed?
- [ ] Update `.gitignore`

**Estimated final size: ~200 MB (65% reduction)**
