# Master Execution Checklist - EverReach Migration

**Date:** January 17, 2026  
**Total Current Size:** 1.47 GB → Target: ~550 MB (63% reduction)

---

## Pre-Flight Checks

- [ ] Verify all three folders exist and are cloned correctly
- [ ] Confirm you have write access to EverReach repo
- [ ] Backup any critical files before deletion (optional)

---

# PHASE 3A: Critical Security & Size Fixes

## Task 3A.1: Remove .env Files (SECURITY CRITICAL)

### Files to DELETE:

**backend/**
```
.env                              ← DELETE (contains secrets)
.env.test                         ← DELETE (contains secrets)
fifth_pull/.env                   ← DELETE (contains secrets)
dashboard-app/.env.local          ← DELETE (contains secrets)
test/frontend/.env                ← DELETE (contains secrets)
```

**web-frontend/**
```
.env                              ← DELETE (contains secrets)
```

**ios-app/**
```
.env                              ← DELETE (contains secrets)
```

### Files to KEEP (.example templates):
```
backend/.env.example
backend/backend-vercel/.env.example
backend/backend-vercel/.env.e2e.example
backend/backend-vercel/.env.social-integrations.example
backend/backend-vercel/.env.marketing-intelligence.example
backend/web/.env.example
backend/everreach-integration/.env.example
backend/Email2Social/.env.example
backend/sixth_pull/backend-vercel/.env.example
backend/fifth_pull/.env.example
backend/test/comprehensive/.env.test.example
backend/backend-vercel/ocr-bakeoff/.env.example
web-frontend/.env.example
ios-app/.env.example
```

### Commands:
```bash
# Backend
cd /Users/isaiahdupree/Documents/Software/EverReachOrganized/backend
rm -f .env .env.test
rm -f fifth_pull/.env
rm -f dashboard-app/.env.local
rm -f test/frontend/.env

# Web Frontend
cd /Users/isaiahdupree/Documents/Software/EverReachOrganized/web-frontend
rm -f .env

# iOS App
cd /Users/isaiahdupree/Documents/Software/EverReachOrganized/ios-app
rm -f .env
```

- [ ] backend/.env removed
- [ ] backend/.env.test removed
- [ ] backend/fifth_pull/.env removed
- [ ] backend/dashboard-app/.env.local removed
- [ ] backend/test/frontend/.env removed
- [ ] web-frontend/.env removed
- [ ] ios-app/.env removed

---

## Task 3A.2: Remove Build Artifacts (700 MB!)

### web/.next/ folders (Next.js build output):

| Location | Size |
|----------|------|
| `web-frontend/web/.next/` | 350 MB |
| `ios-app/web/.next/` | 350 MB |

### Commands:
```bash
rm -rf /Users/isaiahdupree/Documents/Software/EverReachOrganized/web-frontend/web/.next/
rm -rf /Users/isaiahdupree/Documents/Software/EverReachOrganized/ios-app/web/.next/
```

- [ ] web-frontend/web/.next/ removed (350 MB)
- [ ] ios-app/web/.next/ removed (350 MB)

---

## Task 3A.3: Remove Log Files (~17 MB)

### Files in web-frontend/:
```
xcode-build-jsc.log               (4.3 MB)
xcode-build.log                   (2.1 MB)
build-test-20251203-200142.log    (1.8 MB)
build-test-20251203-200054.log    (292 KB)
final-rebuild.log                 (126 KB)
full-build-clean.log              (125 KB)
rebuild-with-fixes.log            (204 KB)
final-build-superwall-0.6.11.log  (177 KB)
```

### Files in ios-app/ (same files):
```
xcode-build-jsc.log               (4.3 MB)
xcode-build.log                   (2.1 MB)
build-test-20251203-200142.log    (1.8 MB)
build-test-20251203-200054.log    (292 KB)
final-rebuild.log                 (126 KB)
full-build-clean.log              (125 KB)
rebuild-with-fixes.log            (204 KB)
final-build-superwall-0.6.11.log  (177 KB)
```

### Commands:
```bash
cd /Users/isaiahdupree/Documents/Software/EverReachOrganized/web-frontend
rm -f *.log

cd /Users/isaiahdupree/Documents/Software/EverReachOrganized/ios-app
rm -f *.log
```

- [ ] web-frontend/*.log removed
- [ ] ios-app/*.log removed

---

## Task 3A.4: Remove node_modules

### Location:
```
backend/backend-vercel/tests/node_modules/
```

### Command:
```bash
rm -rf /Users/isaiahdupree/Documents/Software/EverReachOrganized/backend/backend-vercel/tests/node_modules/
```

- [ ] backend/backend-vercel/tests/node_modules/ removed

---

# PHASE 3B: Remove Duplicate/Messy Folders

## Task 3B.1: Remove Messy Folders in Backend

### Folders to DELETE:

| Folder | Size | Contents |
|--------|------|----------|
| `fifth_pull/` | 3.5 MB | Old app snapshot - duplicates main code |
| `sixth_pull/` | ~0 | Only contains backend-vercel subfolder |
| `fourth pull/` | 0 | Empty folder (has space in name) |
| `second_pull/` | ~0 | Empty nested folder |
| `merge_/` | 0 | Empty |
| `recover-work-temp/` | 3.6 MB | Old recovery attempt |
| `rork-ai-enhanced-personal-crm/` | 0 | Empty nested repo clone |
| `third pull` | 0 | Empty file (not folder) |

### Command:
```bash
cd /Users/isaiahdupree/Documents/Software/EverReachOrganized/backend
rm -rf fifth_pull/
rm -rf sixth_pull/
rm -rf "fourth pull/"
rm -rf second_pull/
rm -rf merge_/
rm -rf recover-work-temp/
rm -rf rork-ai-enhanced-personal-crm/
rm -f "third pull"
```

- [ ] fifth_pull/ removed
- [ ] sixth_pull/ removed
- [ ] "fourth pull/" removed
- [ ] second_pull/ removed
- [ ] merge_/ removed
- [ ] recover-work-temp/ removed
- [ ] rork-ai-enhanced-personal-crm/ removed
- [ ] "third pull" file removed

---

## Task 3B.2: Remove iOS Folder from Web Frontend

The web-frontend branch shouldn't contain iOS native code.

### Command:
```bash
cd /Users/isaiahdupree/Documents/Software/EverReachOrganized/web-frontend
rm -rf ios/
rm -f .detoxrc.json
```

- [ ] web-frontend/ios/ removed
- [ ] web-frontend/.detoxrc.json removed

---

# PHASE 3C: Organize Scripts and Documentation

## Task 3C.1: Organize Backend Scripts (67 files)

### Create directory structure:
```bash
cd /Users/isaiahdupree/Documents/Software/EverReachOrganized/backend
mkdir -p scripts/test scripts/db scripts/seed scripts/deploy scripts/utils
```

### Move test scripts → scripts/test/:
```
test-all-marketing-endpoints.mjs
test-attribution-direct.mjs
test-cors.mjs
test-db-data.mjs
test-email-setup.mjs
test-event-tracking.mjs
test-funnel-debug.mjs
test-google-import.mjs
test-production-deploy.mjs
test-warmth-continuity-improved.mjs
test-warmth-continuity.mjs
test-warmth-decay.mjs
test-warmth-interactions.mjs
test-warmth-message-sent.mjs
verify-email-system.mjs
```

### Move SQL files → scripts/db/:
```
COMPLETE_DATABASE_SETUP.sql
check-enum.sql
create-marketing-schema.sql
diagnose-db.sql
fix-voice-note-status.sql
seed-marketing-data.sql
seed-sample-data-fixed.sql
seed-working.sql
supabase-contact-import-jobs-table.sql
supabase-future-schema.sql
supabase-setup.sql
verify-database-setup.sql
```

### Move seed scripts → scripts/seed/:
```
seed-marketing-data.mjs
seed-personal-notes.mjs
seed-via-postgres.mjs
```

### Move utility scripts → scripts/utils/:
```
check-actual-enums.mjs
check-event-types.mjs
check-funnel-view.mjs
check-marketing-schema.mjs
check-schema.mjs
check-view-structure.mjs
get-auth-token.mjs
get-fresh-token.mjs
get-user-id.mjs
get-user-org.mjs
```

### Move Windows scripts → scripts/windows/ (or delete):
```
add-env-to-vercel.ps1
check-enums.ps1
commit-backend-milestone7-FINAL.bat
commit-backend-milestone7-part1.bat
commit-backend-milestone7-part2.bat
commit-backend-milestone7-part3.bat
commit-milestone5-web.bat
list-endpoints.ps1
run-all-warmth-tests.ps1
run-continuity-test.ps1
run-diagnose.ps1
run-interaction-test.ps1
run-marketing-schema.ps1
run-marketing-tests.ps1
run-migration.ps1
run-screenshot-tests.ps1
run-seed-fixed.ps1
run-seed-marketing-data.ps1
run-seed.ps1
run-tests.bat
run-warmth-test.ps1
run-working-seed.ps1
seed-via-cli.ps1
set-java-permanent.ps1
setup-marketing-complete.ps1
temp-link.ps1
test-social-platforms.bat
```

### Commands:
```bash
cd /Users/isaiahdupree/Documents/Software/EverReachOrganized/backend

# Create directories
mkdir -p scripts/test scripts/db scripts/seed scripts/utils scripts/windows

# Move test scripts
mv test-*.mjs scripts/test/ 2>/dev/null
mv verify-*.mjs scripts/test/ 2>/dev/null

# Move SQL files
mv *.sql scripts/db/ 2>/dev/null

# Move seed scripts
mv seed-*.mjs scripts/seed/ 2>/dev/null

# Move utility scripts
mv check-*.mjs scripts/utils/ 2>/dev/null
mv get-*.mjs scripts/utils/ 2>/dev/null

# Move Windows scripts
mv *.ps1 scripts/windows/ 2>/dev/null
mv *.bat scripts/windows/ 2>/dev/null
```

- [ ] scripts/test/ created and populated
- [ ] scripts/db/ created and populated
- [ ] scripts/seed/ created and populated
- [ ] scripts/utils/ created and populated
- [ ] scripts/windows/ created and populated

---

## Task 3C.2: Organize Web-Frontend Scripts (45 files)

### Commands:
```bash
cd /Users/isaiahdupree/Documents/Software/EverReachOrganized/web-frontend

mkdir -p scripts/test scripts/deploy scripts/db scripts/utils

# Test scripts
mv test-*.mjs scripts/test/ 2>/dev/null
mv test-*.sh scripts/test/ 2>/dev/null

# Deploy scripts
mv deploy*.ps1 scripts/deploy/ 2>/dev/null

# DB scripts
mv *migration*.ps1 scripts/db/ 2>/dev/null
mv check-*.ps1 scripts/db/ 2>/dev/null
mv create-*.ps1 scripts/db/ 2>/dev/null
mv insert-*.ps1 scripts/db/ 2>/dev/null
mv fix-templates-schema.ps1 scripts/db/ 2>/dev/null

# Utils
mv *.ps1 scripts/utils/ 2>/dev/null
mv *.bat scripts/utils/ 2>/dev/null
mv *.sh scripts/utils/ 2>/dev/null
```

- [ ] web-frontend scripts organized

---

## Task 3C.3: Organize iOS-App Scripts (45 files)

### Commands:
```bash
cd /Users/isaiahdupree/Documents/Software/EverReachOrganized/ios-app

mkdir -p scripts/test scripts/deploy scripts/db scripts/utils scripts/ios

# Test scripts
mv test-*.mjs scripts/test/ 2>/dev/null
mv test-*.sh scripts/test/ 2>/dev/null

# iOS-specific scripts
mv *ios*.sh scripts/ios/ 2>/dev/null
mv appstore-*.sh scripts/ios/ 2>/dev/null
mv prepare-ios*.sh scripts/ios/ 2>/dev/null

# Deploy scripts
mv deploy*.ps1 scripts/deploy/ 2>/dev/null

# DB scripts
mv *migration*.ps1 scripts/db/ 2>/dev/null
mv check-*.ps1 scripts/db/ 2>/dev/null
mv create-*.ps1 scripts/db/ 2>/dev/null

# Utils
mv *.ps1 scripts/utils/ 2>/dev/null
mv *.bat scripts/utils/ 2>/dev/null
mv *.sh scripts/utils/ 2>/dev/null
```

- [ ] ios-app scripts organized

---

## Task 3C.4: Organize Backend Documentation (277 .md files)

### Create docs structure:
```bash
cd /Users/isaiahdupree/Documents/Software/EverReachOrganized/backend
mkdir -p docs/architecture docs/api docs/planning docs/sessions docs/testing docs/deployment docs/archive docs/features docs/dashboard docs/marketing
```

### Move by category:

```bash
# Architecture & System docs
mv ARCHITECTURE*.md docs/architecture/ 2>/dev/null
mv *_SYSTEM*.md docs/architecture/ 2>/dev/null
mv AGENT_*.md docs/architecture/ 2>/dev/null
mv THEME_*.md docs/architecture/ 2>/dev/null
mv MEDIA_*.md docs/architecture/ 2>/dev/null

# API docs
mv *API*.md docs/api/ 2>/dev/null
mv *ENDPOINT*.md docs/api/ 2>/dev/null
mv CORS_*.md docs/api/ 2>/dev/null
mv WEBHOOK*.md docs/api/ 2>/dev/null

# Planning docs
mv *_PLAN.md docs/planning/ 2>/dev/null
mv *_ROADMAP.md docs/planning/ 2>/dev/null
mv *IMPLEMENTATION*.md docs/planning/ 2>/dev/null
mv INTERFACE_*.md docs/planning/ 2>/dev/null

# Session docs
mv SESSION_*.md docs/sessions/ 2>/dev/null
mv *_SESSION*.md docs/sessions/ 2>/dev/null
mv CODEBASE_UNDERSTANDING*.md docs/sessions/ 2>/dev/null

# Testing docs
mv *TEST*.md docs/testing/ 2>/dev/null
mv *COVERAGE*.md docs/testing/ 2>/dev/null
mv COMPREHENSIVE_*.md docs/testing/ 2>/dev/null

# Deployment docs
mv DEPLOY*.md docs/deployment/ 2>/dev/null
mv DEPLOYMENT_*.md docs/deployment/ 2>/dev/null
mv AUTH*.md docs/deployment/ 2>/dev/null
mv *SETUP*.md docs/deployment/ 2>/dev/null
mv VERCEL_*.md docs/deployment/ 2>/dev/null
mv CREDENTIALS_*.md docs/deployment/ 2>/dev/null

# Dashboard docs
mv DASHBOARD_*.md docs/dashboard/ 2>/dev/null
mv DEVELOPER_DASHBOARD*.md docs/dashboard/ 2>/dev/null
mv GROWTH_DASHBOARD*.md docs/dashboard/ 2>/dev/null

# Marketing docs
mv MARKETING_*.md docs/marketing/ 2>/dev/null
mv META_*.md docs/marketing/ 2>/dev/null
mv ORGANIC_*.md docs/marketing/ 2>/dev/null

# Feature docs
mv WARMTH_*.md docs/features/ 2>/dev/null
mv PAYWALL_*.md docs/features/ 2>/dev/null
mv SUBSCRIPTION_*.md docs/features/ 2>/dev/null
mv REVENUECAT_*.md docs/features/ 2>/dev/null
mv SUPERWALL_*.md docs/features/ 2>/dev/null
mv ANALYTICS_*.md docs/features/ 2>/dev/null
mv CONTACT_*.md docs/features/ 2>/dev/null
mv VOICE_*.md docs/features/ 2>/dev/null
mv EMAIL_*.md docs/features/ 2>/dev/null
mv GOOGLE_*.md docs/features/ 2>/dev/null
mv SCREENSHOT_*.md docs/features/ 2>/dev/null
mv LEAD_*.md docs/features/ 2>/dev/null

# Archive (status/complete docs)
mv *_COMPLETE*.md docs/archive/ 2>/dev/null
mv *_ACHIEVED*.md docs/archive/ 2>/dev/null
mv *_STATUS*.md docs/archive/ 2>/dev/null
mv *_SUCCESS*.md docs/archive/ 2>/dev/null
mv *_FIX*.md docs/archive/ 2>/dev/null
mv *_FIXED*.md docs/archive/ 2>/dev/null
mv *_SUMMARY*.md docs/archive/ 2>/dev/null
mv FIXES_*.md docs/archive/ 2>/dev/null
mv QUICK_*.md docs/archive/ 2>/dev/null

# Keep at root
# README.md, PRIVACY.md, TERMS.md
```

- [ ] docs/architecture/ populated
- [ ] docs/api/ populated
- [ ] docs/planning/ populated
- [ ] docs/sessions/ populated
- [ ] docs/testing/ populated
- [ ] docs/deployment/ populated
- [ ] docs/dashboard/ populated
- [ ] docs/marketing/ populated
- [ ] docs/features/ populated
- [ ] docs/archive/ populated

---

## Task 3C.5: Organize Web-Frontend Documentation (359 .md files)

### Commands (similar to backend):
```bash
cd /Users/isaiahdupree/Documents/Software/EverReachOrganized/web-frontend
mkdir -p docs/architecture docs/api docs/planning docs/sessions docs/testing docs/deployment docs/archive docs/features docs/build

# Run same move commands as backend...
# (Copy the mv commands from Task 3C.4)

# Additional for web-frontend:
mv BUILD_*.md docs/build/ 2>/dev/null
mv *COVERAGE*.md docs/testing/ 2>/dev/null
```

- [ ] web-frontend docs organized

---

## Task 3C.6: Organize iOS-App Documentation (362 .md files)

### Commands (similar to backend):
```bash
cd /Users/isaiahdupree/Documents/Software/EverReachOrganized/ios-app
mkdir -p docs/architecture docs/api docs/planning docs/sessions docs/testing docs/deployment docs/archive docs/features docs/build docs/ios

# iOS-specific docs
mv EAS_*.md docs/ios/ 2>/dev/null
mv XCODE_*.md docs/ios/ 2>/dev/null
mv IOS_*.md docs/ios/ 2>/dev/null
mv *_IOS_*.md docs/ios/ 2>/dev/null
mv BUILD_README.md docs/ios/ 2>/dev/null
mv SUPERWALL*.md docs/ios/ 2>/dev/null

# Run same move commands as backend for other categories...
```

- [ ] ios-app docs organized

---

# PHASE 3D: Final Cleanup

## Task 3D.1: Update .gitignore Files

### Add to each folder's .gitignore:

```gitignore
# Environment
.env
.env.local
.env.test
.env.*.local

# Dependencies
node_modules/

# Build outputs
dist/
build/
.next/
web/.next/
.expo/

# iOS (for web-frontend, remove ios/ entirely; for ios-app, ignore build artifacts)
ios/Pods/
ios/build/
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
.playwright/

# EAS
.eas/

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
```

- [ ] backend/.gitignore updated
- [ ] web-frontend/.gitignore updated
- [ ] ios-app/.gitignore updated

---

## Task 3D.2: Clean Test Artifacts

```bash
# All folders
rm -rf test-results/ 2>/dev/null
rm -rf test-reports/* 2>/dev/null
rm -rf .playwright/ 2>/dev/null
rm -rf coverage/ 2>/dev/null
```

- [ ] test-results cleaned
- [ ] test-reports cleaned
- [ ] .playwright removed
- [ ] coverage removed

---

## Task 3D.3: Remove Empty Directories

```bash
# In each folder
find . -type d -empty -delete
```

- [ ] Empty directories removed

---

## Task 3D.4: Verify Sizes After Cleanup

```bash
cd /Users/isaiahdupree/Documents/Software/EverReachOrganized
du -sh backend/ web-frontend/ ios-app/
```

### Expected Results:
| Folder | Before | After | Reduction |
|--------|--------|-------|-----------|
| backend/ | 342 MB | ~100 MB | 70% |
| web-frontend/ | 563 MB | ~200 MB | 65% |
| ios-app/ | 562 MB | ~250 MB | 55% |

- [ ] backend/ size verified
- [ ] web-frontend/ size verified
- [ ] ios-app/ size verified

---

# PHASE 4: Push to EverReach

## Task 4.1: Prepare Backend for Push

```bash
cd /Users/isaiahdupree/Documents/Software/EverReachOrganized/backend
rm -rf .git
git init
git checkout -b backend
git add .
git commit -m "Initial commit: Backend services (migrated from rork-ai-enhanced-personal-crm feat/event-tracking-hotfix)"
git remote add origin https://github.com/IsaiahDupree/EverReach.git
git push -u origin backend
```

- [ ] backend pushed to EverReach:backend

---

## Task 4.2: Prepare Web-Frontend for Push

```bash
cd /Users/isaiahdupree/Documents/Software/EverReachOrganized/web-frontend
rm -rf .git
git init
git checkout -b web-frontend
git add .
git commit -m "Initial commit: Web frontend (migrated from rork-ai-enhanced-personal-crm e2e-web)"
git remote add origin https://github.com/IsaiahDupree/EverReach.git
git push -u origin web-frontend
```

- [ ] web-frontend pushed to EverReach:web-frontend

---

## Task 4.3: Prepare iOS-App for Push

```bash
cd /Users/isaiahdupree/Documents/Software/EverReachOrganized/ios-app
rm -rf .git
git init
git checkout -b ios-app
git add .
git commit -m "Initial commit: iOS app (migrated from rork-ai-enhanced-personal-crm e2e-ios)"
git remote add origin https://github.com/IsaiahDupree/EverReach.git
git push -u origin ios-app
```

- [ ] ios-app pushed to EverReach:ios-app

---

# Final Verification

- [ ] EverReach repo has 3 branches: backend, web-frontend, ios-app
- [ ] No .env files in any branch
- [ ] No large log files
- [ ] No node_modules
- [ ] Documentation organized in docs/ folders
- [ ] Scripts organized in scripts/ folders
- [ ] .gitignore prevents future issues

---

## Quick Reference: All Cleanup Commands

```bash
# === PHASE 3A ===
# Remove secrets
rm -f backend/.env backend/.env.test backend/fifth_pull/.env backend/dashboard-app/.env.local backend/test/frontend/.env
rm -f web-frontend/.env
rm -f ios-app/.env

# Remove build artifacts
rm -rf web-frontend/web/.next/
rm -rf ios-app/web/.next/

# Remove logs
rm -f web-frontend/*.log
rm -f ios-app/*.log

# Remove node_modules
rm -rf backend/backend-vercel/tests/node_modules/

# === PHASE 3B ===
# Remove messy folders
rm -rf backend/fifth_pull/ backend/sixth_pull/ backend/"fourth pull/" backend/second_pull/
rm -rf backend/merge_/ backend/recover-work-temp/ backend/rork-ai-enhanced-personal-crm/
rm -f backend/"third pull"

# Remove ios from web-frontend
rm -rf web-frontend/ios/
rm -f web-frontend/.detoxrc.json
```
