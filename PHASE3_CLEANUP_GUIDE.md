# EverReach Migration - Phase 3 Cleanup Guide

**Generated:** January 17, 2026  
**Source Repo:** `IsaiahDupree/rork-ai-enhanced-personal-crm`  
**Target Repo:** `IsaiahDupree/EverReach`

---

## Current State Summary

| Folder | Size | Branch Origin | Purpose |
|--------|------|---------------|---------|
| `backend/` | 342 MB | `feat/event-tracking-hotfix` | Backend services |
| `web-frontend/` | 563 MB | `e2e-web` | Web frontend |
| `ios-app/` | 562 MB | `e2e-ios` | iOS application |

---

## 🚨 Critical Security Issues

### Committed .env Files (MUST REMOVE)

These files contain secrets and must be removed before pushing to new repo:

```
./backend/.env                          # 4.5 KB - SECRETS
./backend/.env.test                     # 6.7 KB - TEST SECRETS
./backend/fifth_pull/.env               # SECRETS
./backend/dashboard-app/.env.local      # SECRETS
./backend/test/frontend/.env            # SECRETS
./web-frontend/.env                     # 7.3 KB - SECRETS
./ios-app/.env                          # 7.3 KB - SECRETS
```

**Action:** Remove all `.env` files (keep `.env.example` files as templates)

```bash
# Run in each folder
find . -name ".env" -type f -delete
find . -name ".env.local" -type f -delete
find . -name ".env.test" -type f ! -name "*.example" -delete
```

---

## 📦 Large Files to Remove

### Build Logs (~17 MB total)

| File | Size | Location |
|------|------|----------|
| `xcode-build-jsc.log` | 4.3 MB | ios-app/, web-frontend/ |
| `xcode-build.log` | 2.1 MB | ios-app/, web-frontend/ |
| `build-test-20251203-200142.log` | 1.8 MB | ios-app/, web-frontend/ |
| `final-rebuild.log` | 126 KB | ios-app/, web-frontend/ |
| `full-build-clean.log` | 125 KB | ios-app/, web-frontend/ |
| Other build logs | ~500 KB | ios-app/, web-frontend/ |

**Action:** Remove all `.log` files

```bash
find . -name "*.log" -type f -delete
```

### Committed node_modules

```
./backend/backend-vercel/tests/node_modules/
```

**Action:** Remove and add to .gitignore

```bash
rm -rf backend/backend-vercel/tests/node_modules
```

---

## 🗂️ Documentation Organization

### Problem: 998 .md Files at Root Level

Most planning/status docs are dumped at the root of each folder. Examples:
- `ACCURATE_WARMTH_SCORES_PLAN.md`
- `AI_COMPOSE_IMPLEMENTATION.md`
- `85_PERCENT_COVERAGE_ACHIEVED.md`
- `SESSION_COMPLETE_2025-10-19.md`

### Proposed Structure

```
docs/
├── architecture/          # System design docs
├── api/                   # API references
├── planning/              # Feature plans, roadmaps
├── sessions/              # Session summaries (SESSION_*.md)
├── testing/               # Test strategies, coverage reports
├── deployment/            # Deploy guides, auth setup
└── archive/               # Historical status files (*_COMPLETE.md, *_ACHIEVED.md)
```

### Categorization Rules

| Pattern | Destination |
|---------|-------------|
| `*_PLAN.md`, `*_ROADMAP.md` | `docs/planning/` |
| `SESSION_*.md` | `docs/sessions/` |
| `*_COMPLETE.md`, `*_ACHIEVED.md`, `*_STATUS.md` | `docs/archive/` |
| `*_TEST*.md`, `*COVERAGE*.md` | `docs/testing/` |
| `*API*.md`, `*REFERENCE*.md` | `docs/api/` |
| `DEPLOY*.md`, `AUTH*.md`, `*SETUP*.md` | `docs/deployment/` |
| `ARCHITECTURE*.md`, `*SYSTEM*.md` | `docs/architecture/` |
| `README.md` | Keep at root |

---

## 🔄 Duplicate/Messy Folders in Backend

The `backend/` folder has accumulated merge artifacts:

| Folder | Issue | Action |
|--------|-------|--------|
| `fifth_pull/` | Old pull state | Review & delete |
| `sixth_pull/` | Old pull state | Review & delete |
| `fourth pull/` | Old pull state (space in name!) | Review & delete |
| `second_pull/` | Old pull state | Review & delete |
| `merge_/` | Merge artifacts | Delete |
| `recover-work-temp/` | Temp recovery folder | Review & delete |
| `rork-ai-enhanced-personal-crm/` | Nested clone of same repo | Delete |
| `repos/` | Unknown nested repos | Review |

**Action:** Audit each folder, extract any unique code, then delete

---

## 🔍 Overlap Analysis: web-frontend vs ios-app

These two folders are **nearly identical** (562-563 MB each) with shared:
- `app/`, `components/`, `hooks/`, `services/`, `utils/`
- `backend/`, `backend-vercel/`
- `supabase/`

**Key Differences:**
- `ios-app/ios/` - iOS native code (Xcode project)
- Both have `ios/` folder (web-frontend shouldn't need this)

**Recommendation:** 
- ios-app should be the **source of truth** for mobile
- web-frontend should remove `ios/` folder and mobile-specific code
- Consider if these should share a common `packages/shared/` for types, utils, API clients

---

## ✅ Cleanup Checklist

### Per-Folder Tasks

#### backend/
- [ ] Remove `.env`, `.env.test` (keep `.env.example`)
- [ ] Remove `node_modules` in `backend-vercel/tests/`
- [ ] Audit and remove: `fifth_pull/`, `sixth_pull/`, `fourth pull/`, `second_pull/`
- [ ] Remove `merge_/`, `recover-work-temp/`
- [ ] Remove nested `rork-ai-enhanced-personal-crm/`
- [ ] Move `.md` docs to `docs/` subfolders
- [ ] Update `.gitignore`

#### web-frontend/
- [ ] Remove `.env` (keep `.env.example`)
- [ ] Remove all `*.log` files (~8.5 MB)
- [ ] Remove `ios/` folder (not needed for web)
- [ ] Move `.md` docs to `docs/` subfolders
- [ ] Update `.gitignore`

#### ios-app/
- [ ] Remove `.env` (keep `.env.example`)
- [ ] Remove all `*.log` files (~8.5 MB)
- [ ] Move `.md` docs to `docs/` subfolders
- [ ] Update `.gitignore`

---

## 📝 Updated .gitignore Template

Add to each folder's `.gitignore`:

```gitignore
# Environment files
.env
.env.local
.env.test
.env.*.local

# Build logs
*.log
build-*.log
xcode-*.log

# Dependencies
node_modules/

# Build outputs
dist/
build/
.expo/
ios/Pods/
ios/build/

# IDE
.vscode/
.idea/

# Test artifacts
coverage/
test-results/
test-reports/
.playwright/

# OS files
.DS_Store
Thumbs.db
```

---

## 🚀 Push Strategy

After cleanup, push to EverReach as **orphan branches** (clean history):

```bash
# Example for backend
cd backend
rm -rf .git
git init
git checkout -b backend
git add .
git commit -m "Initial commit: Backend services (migrated from rork-ai-enhanced-personal-crm)"
git remote add origin https://github.com/IsaiahDupree/EverReach.git
git push -u origin backend
```

Repeat for:
- `web-frontend/` → branch `web-frontend`
- `ios-app/` → branch `ios-app`

---

## Estimated Size After Cleanup

| Folder | Current | After Cleanup | Savings |
|--------|---------|---------------|---------|
| backend/ | 342 MB | ~100 MB | ~70% |
| web-frontend/ | 563 MB | ~200 MB | ~65% |
| ios-app/ | 562 MB | ~250 MB | ~55% |

---

## Next Steps

1. **Review this document** - confirm cleanup actions
2. **Execute cleanup** - run commands per folder
3. **Verify** - ensure apps still build/run
4. **Push to EverReach** - create orphan branches
5. **Archive old repo** - mark rork-ai-enhanced-personal-crm as deprecated
