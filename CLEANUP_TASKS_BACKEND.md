# Backend Cleanup Tasks
**Folder:** `backend/` (342 MB → target ~100 MB)  
**Source Branch:** `feat/event-tracking-hotfix`

---

## 1. CRITICAL: Remove Secret Files

### Files to DELETE (contain secrets):
```
.env                    (4.5 KB)
.env.test               (6.7 KB)
fifth_pull/.env         (1.6 KB)
dashboard-app/.env.local
test/frontend/.env
test/comprehensive/.env.test.example
```

### Files to KEEP (templates only):
```
.env.example
backend-vercel/.env.example
backend-vercel/.env.e2e.example
backend-vercel/.env.social-integrations.example
backend-vercel/.env.marketing-intelligence.example
web/.env.example
everreach-integration/.env.example
```

### Command:
```bash
rm -f .env .env.test
rm -f fifth_pull/.env
rm -f dashboard-app/.env.local
rm -f test/frontend/.env
```

---

## 2. Remove Messy/Duplicate Folders

These folders are merge artifacts or old pull states:

| Folder | Size | Contents | Action |
|--------|------|----------|--------|
| `fifth_pull/` | 3.5 MB | Old app state with .env, has some docs | **DELETE** - duplicates main code |
| `sixth_pull/` | ~0 | Only `backend-vercel/` subfolder | **DELETE** |
| `fourth pull/` | 0 | Empty (has space in name) | **DELETE** |
| `second_pull/` | ~0 | Empty nested folder | **DELETE** |
| `merge_/` | 0 | Empty | **DELETE** |
| `recover-work-temp/` | 3.6 MB | Old recovery attempt | **DELETE** |
| `rork-ai-enhanced-personal-crm/` | 0 | Empty nested repo | **DELETE** |
| `third pull` | - | File (not folder) | **DELETE** |

### Command:
```bash
rm -rf "fifth_pull/"
rm -rf "sixth_pull/"
rm -rf "fourth pull/"
rm -rf "second_pull/"
rm -rf "merge_/"
rm -rf "recover-work-temp/"
rm -rf "rork-ai-enhanced-personal-crm/"
rm -f "third pull"
```

**Estimated savings: ~7 MB**

---

## 3. Remove node_modules

```
backend-vercel/tests/node_modules/
```

### Command:
```bash
rm -rf backend-vercel/tests/node_modules
```

---

## 4. Organize Root-Level Scripts

### 41 scripts at root level - move to `scripts/`:

**Test Scripts (move to `scripts/test/`):**
```
test-production-deploy.mjs
test-warmth-interactions.mjs
test-warmth-message-sent.mjs
test-db-data.mjs
test-warmth-decay.mjs
test-cors.mjs
test-attribution-direct.mjs
test-warmth-continuity.mjs
test-warmth-continuity-improved.mjs
test-google-import.mjs
test-email-setup.mjs
test-event-tracking.mjs
test-all-marketing-endpoints.mjs
test-funnel-debug.mjs
verify-email-system.mjs
```

**PowerShell/Batch Scripts (move to `scripts/windows/` or DELETE):**
```
run-screenshot-tests.ps1
run-tests.bat
run-marketing-schema.ps1
run-migration.ps1
add-env-to-vercel.ps1
run-interaction-test.ps1
list-endpoints.ps1
run-seed.ps1
test-social-platforms.bat
run-all-warmth-tests.ps1
commit-backend-milestone7-part2.bat
temp-link.ps1
setup-marketing-complete.ps1
commit-backend-milestone7-part3.bat
commit-backend-milestone7-part1.bat
run-diagnose.ps1
set-java-permanent.ps1
run-warmth-test.ps1
check-enums.ps1
seed-via-cli.ps1
run-continuity-test.ps1
run-working-seed.ps1
run-seed-marketing-data.ps1
run-seed-fixed.ps1
commit-backend-milestone7-FINAL.bat
commit-milestone5-web.bat
run-marketing-tests.ps1
```

### Command:
```bash
mkdir -p scripts/test scripts/windows scripts/sql

# Move test scripts
mv test-*.mjs scripts/test/
mv verify-*.mjs scripts/test/

# Move Windows scripts (or delete if not needed)
mv *.ps1 scripts/windows/
mv *.bat scripts/windows/
```

---

## 5. Organize SQL Files

### 12 SQL files at root - move to `scripts/sql/` or `supabase/migrations/`:

```
supabase-contact-import-jobs-table.sql
verify-database-setup.sql
seed-marketing-data.sql
check-enum.sql
COMPLETE_DATABASE_SETUP.sql
create-marketing-schema.sql
diagnose-db.sql
fix-voice-note-status.sql
seed-sample-data-fixed.sql
supabase-setup.sql
supabase-future-schema.sql
seed-working.sql
```

### Command:
```bash
mkdir -p scripts/sql
mv *.sql scripts/sql/
```

---

## 6. Organize Documentation (277 .md files at root)

### Create docs structure:
```bash
mkdir -p docs/architecture
mkdir -p docs/api
mkdir -p docs/planning
mkdir -p docs/sessions
mkdir -p docs/testing
mkdir -p docs/deployment
mkdir -p docs/archive
```

### Move by pattern:

**Architecture docs → `docs/architecture/`:**
```bash
mv ARCHITECTURE*.md docs/architecture/
mv *_SYSTEM*.md docs/architecture/
mv AGENT_*.md docs/architecture/
```

**API docs → `docs/api/`:**
```bash
mv *API*.md docs/api/
mv *REFERENCE*.md docs/api/
mv *ENDPOINT*.md docs/api/
```

**Planning docs → `docs/planning/`:**
```bash
mv *_PLAN.md docs/planning/
mv *_ROADMAP.md docs/planning/
mv *IMPLEMENTATION*.md docs/planning/
```

**Session summaries → `docs/sessions/`:**
```bash
mv SESSION_*.md docs/sessions/
mv *_SESSION*.md docs/sessions/
```

**Testing docs → `docs/testing/`:**
```bash
mv *TEST*.md docs/testing/
mv *COVERAGE*.md docs/testing/
```

**Deployment docs → `docs/deployment/`:**
```bash
mv DEPLOY*.md docs/deployment/
mv AUTH*.md docs/deployment/
mv *SETUP*.md docs/deployment/
mv *MIGRATION*.md docs/deployment/
```

**Archive (status/complete docs) → `docs/archive/`:**
```bash
mv *_COMPLETE*.md docs/archive/
mv *_ACHIEVED*.md docs/archive/
mv *_STATUS*.md docs/archive/
mv *_SUCCESS*.md docs/archive/
mv *_FIX*.md docs/archive/
mv *_FIXED*.md docs/archive/
```

---

## 7. Review Large Folders

| Folder | Size | Notes |
|--------|------|-------|
| `dashboard-app/` | 211 MB | **REVIEW** - seems like separate Next.js app |
| `backend-vercel/` | 56 MB | Core backend - keep |
| `test/` | 4.6 MB | Keep but clean test artifacts |
| `web/` | 2.2 MB | Web dashboard - keep |

### dashboard-app decision needed:
- Is this the main dashboard or a duplicate?
- Should it be in this branch or separate?

---

## 8. Update .gitignore

Add to `.gitignore`:
```gitignore
# Environment
.env
.env.local
.env.test
.env.*.local

# Dependencies
node_modules/

# Build
dist/
build/
.next/
.expo/

# Test artifacts
coverage/
test-results/
test-reports/

# Logs
*.log

# OS
.DS_Store

# IDE
.vscode/
.idea/
```

---

## Summary Checklist

- [ ] Remove `.env`, `.env.test`, other secret files
- [ ] Delete `fifth_pull/`, `sixth_pull/`, `fourth pull/`, `second_pull/`
- [ ] Delete `merge_/`, `recover-work-temp/`, `rork-ai-enhanced-personal-crm/`
- [ ] Delete `third pull` file
- [ ] Remove `backend-vercel/tests/node_modules/`
- [ ] Move test scripts to `scripts/test/`
- [ ] Move Windows scripts to `scripts/windows/` (or delete)
- [ ] Move SQL files to `scripts/sql/`
- [ ] Organize 277 .md files into `docs/` subfolders
- [ ] Review `dashboard-app/` (211 MB) - keep or remove?
- [ ] Update `.gitignore`
- [ ] Final cleanup: remove empty directories

**Estimated final size: ~100 MB (70% reduction)**
