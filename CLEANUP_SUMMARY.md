# EverReach Migration - Cleanup Summary

**Date:** January 17, 2026  
**Workspace:** `/Users/isaiahdupree/Documents/Software/EverReachOrganized/`

---

## Quick Stats

| Folder | Current Size | Target Size | Reduction |
|--------|-------------|-------------|-----------|
| `backend/` | 342 MB | ~100 MB | **70%** |
| `web-frontend/` | 563 MB | ~200 MB | **65%** |
| `ios-app/` | 562 MB | ~250 MB | **55%** |
| **TOTAL** | **1.47 GB** | **~550 MB** | **63%** |

---

## Biggest Wins (Quick Fixes)

### 1. Remove `web/.next/` Build Folders (700 MB total!)
Both `web-frontend` and `ios-app` have committed Next.js build outputs:
```bash
# In web-frontend/
rm -rf web/.next/    # 350 MB

# In ios-app/
rm -rf web/.next/    # 350 MB
```

### 2. Remove Log Files (~17 MB)
```bash
# In all folders
find . -name "*.log" -type f -delete
```

### 3. Remove .env Files (Security!)
```bash
# In all folders
rm -f .env .env.test .env.local
```

### 4. Remove Messy Folders in Backend (~7 MB)
```bash
# In backend/
rm -rf fifth_pull/ sixth_pull/ "fourth pull/" second_pull/
rm -rf merge_/ recover-work-temp/ rork-ai-enhanced-personal-crm/
rm -f "third pull"
```

---

## Documentation Files

Created detailed task lists:

| File | Description |
|------|-------------|
| `PHASE3_CLEANUP_GUIDE.md` | Overall cleanup strategy |
| `CLEANUP_TASKS_BACKEND.md` | Backend-specific tasks (277 .md files, 41 scripts) |
| `CLEANUP_TASKS_WEB_FRONTEND.md` | Web frontend tasks (359 .md files, 37 scripts) |
| `CLEANUP_TASKS_IOS_APP.md` | iOS app tasks (362 .md files, 37 scripts) |

---

## Files to Remove by Category

### Security (MUST DO)
| Type | Count | Locations |
|------|-------|-----------|
| `.env` files | 20+ | All folders, nested in fifth_pull/, dashboard-app/, test/ |

### Build Artifacts
| Type | Size | Locations |
|------|------|-----------|
| `web/.next/` | 700 MB | web-frontend/, ios-app/ |
| `node_modules` | varies | backend/backend-vercel/tests/ |
| `*.log` | 17 MB | ios-app/, web-frontend/ |

### Messy/Duplicate Folders (backend only)
| Folder | Size |
|--------|------|
| `fifth_pull/` | 3.5 MB |
| `recover-work-temp/` | 3.6 MB |
| `sixth_pull/`, `fourth pull/`, `second_pull/`, `merge_/` | ~0 |

### Documentation to Organize
| Folder | Root .md files | Action |
|--------|---------------|--------|
| backend/ | 277 | Move to `docs/` subfolders |
| web-frontend/ | 359 | Move to `docs/` subfolders |
| ios-app/ | 362 | Move to `docs/` subfolders |

### Scripts to Organize
| Folder | Root scripts | Action |
|--------|-------------|--------|
| backend/ | 41 (.mjs, .ps1, .bat) | Move to `scripts/` subfolders |
| web-frontend/ | 37 (.mjs, .ps1, .bat) | Move to `scripts/` subfolders |
| ios-app/ | 37 (.mjs, .ps1, .bat) | Move to `scripts/` subfolders |

---

## Execution Order

### Phase 3A: Critical Security & Size Fixes
1. Remove all `.env` files (keep `.env.example`)
2. Remove `web/.next/` in web-frontend and ios-app (700 MB!)
3. Remove all `*.log` files
4. Remove `node_modules` in backend

### Phase 3B: Remove Duplicate/Messy Content
5. Delete messy folders in backend (fifth_pull, etc.)
6. Remove `ios/` from web-frontend (not needed for web)

### Phase 3C: Organize Structure
7. Move scripts to `scripts/` subfolders
8. Move SQL files to `scripts/sql/`
9. Organize .md files into `docs/` structure

### Phase 3D: Final Cleanup
10. Update `.gitignore` in all folders
11. Remove empty directories
12. Verify builds still work

### Phase 4: Push to EverReach
13. Remove old `.git` folders
14. Initialize fresh repos
15. Push to EverReach branches

---

## Target Repository Structure

After cleanup, each branch should look like:

```
├── app/                    # Main application code
├── components/             # Shared components
├── hooks/                  # React hooks
├── lib/                    # Libraries/utilities
├── services/               # API services
├── types/                  # TypeScript types
├── utils/                  # Utility functions
├── docs/                   # Organized documentation
│   ├── architecture/
│   ├── api/
│   ├── planning/
│   ├── deployment/
│   ├── testing/
│   └── archive/
├── scripts/                # Organized scripts
│   ├── test/
│   ├── deploy/
│   ├── db/
│   └── utils/
├── .env.example            # Environment template
├── .gitignore              # Updated ignore rules
├── package.json
├── README.md
└── tsconfig.json
```

**Backend additionally has:**
- `backend-vercel/` - Vercel serverless functions
- `supabase/` - Database migrations

**iOS app additionally has:**
- `ios/` - Native iOS project
- `eas.json` - EAS Build config

---

## Ready to Execute?

Run the cleanup commands in order from each `CLEANUP_TASKS_*.md` file, or let me execute them for you.
