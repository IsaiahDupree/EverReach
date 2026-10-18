# PRD: Developer Handoff Requirements

**Project:** EverReach  
**Date:** January 19, 2026  
**Status:** Documentation Gap Analysis Complete  
**Priority:** High

---

## Executive Summary

This PRD documents the requirements needed to make the EverReach repository ready for developer handoff. Currently, a new developer with no knowledge of the codebase **cannot** spin up the app and have it fully work on their first attempt.

---

## Current State Assessment

### Repository Structure

| Component | Path | Items | Status |
|-----------|------|-------|--------|
| Backend | `backend/` | 2825 | Partially organized |
| Web Frontend | `web-frontend/` | 1008 | Partially organized |
| iOS App | `ios-app/` | 1262 | Needs cleanup |
| Marketing | `marketing/` | 15 | Ready |

### Critical Gaps

| Gap | Impact | Priority |
|-----|--------|----------|
| Empty README.md files | New devs can't get started | **P0** |
| No database setup guide | App won't run without Supabase tables | **P0** |
| Non-standard dev commands | `rork` tool not publicly available | **P0** |
| Duplicate folders in ios-app | Confusion, bloat | **P1** |
| No architecture documentation | Hard to understand system | **P1** |
| No in-app help system | Users don't know features | **P2** |

---

## Requirements

### R1: README Files (P0)

**Objective:** Each folder must have a comprehensive README.md

**Required Sections:**
1. Project overview (what it is, what it does)
2. Prerequisites (Node version, Expo CLI, etc.)
3. Quick start (5 steps or less to run locally)
4. Environment setup (copy .env.example, fill values)
5. Available scripts (npm commands)
6. Architecture overview (link to detailed doc)
7. Deployment instructions
8. Troubleshooting common issues

**Deliverables:**
- [ ] `backend/README.md` - Full rewrite
- [ ] `web-frontend/README.md` - Full rewrite
- [ ] `ios-app/README.md` - Full rewrite
- [ ] Root-level `README.md` - Monorepo overview

---

### R2: Database Setup Documentation (P0)

**Objective:** New developer can set up Supabase from scratch

**Required Content:**
1. Create Supabase project instructions
2. Required tables and schema
3. Migration files location and how to run them
4. Seed data (if applicable)
5. RLS policies explanation
6. Edge functions setup

**Deliverables:**
- [ ] `backend/docs/DATABASE_SETUP.md`
- [ ] Verify `supabase/migrations/` are complete and documented
- [ ] Create `scripts/setup-database.sh` or equivalent

---

### R3: Standard Development Scripts (P0)

**Objective:** Replace proprietary `rork` commands with standard Expo/npm commands

**Current State:**
```json
"start": "bunx rork start -p bq055tswpn0bh02b6atft --tunnel"
```

**Required State:**
```json
"dev": "npx expo start",
"dev:web": "npx expo start --web",
"dev:ios": "npx expo start --ios",
"dev:android": "npx expo start --android",
"dev:tunnel": "npx expo start --tunnel"
```

**Deliverables:**
- [ ] Update `web-frontend/package.json` with standard scripts
- [ ] Update `ios-app/package.json` with standard scripts
- [ ] Update `backend/package.json` with backend-specific scripts
- [ ] Document what `rork` was doing (if needed for reference)

---

### R4: Cleanup Duplicate Folders (P1)

**Objective:** Remove duplicate backend code from frontend branches

**Files to Remove:**
```
ios-app/backend/
ios-app/backend-vercel/
ios-app/supabase/
```

**Verification:**
- [ ] Confirm ios-app doesn't import from these folders
- [ ] Remove folders
- [ ] Test that ios-app still builds

---

### R5: Architecture Documentation (P1)

**Objective:** Developer can understand system in 30 minutes

**Required Diagrams:**
1. High-level architecture (Frontend → Backend → Database)
2. Authentication flow
3. Data flow for key features (contacts, warmth scoring)
4. Deployment architecture (Vercel, Supabase, App Store)

**Deliverables:**
- [ ] `docs/ARCHITECTURE.md` at root level
- [ ] Mermaid or ASCII diagrams embedded
- [ ] Links to detailed component docs

---

### R6: Quick Start Guide (P1)

**Objective:** New developer running app in under 15 minutes

**Required Content:**
```markdown
# Quick Start

## Prerequisites
- Node.js 18+
- npm or bun
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Emulator

## Setup (5 minutes)

1. Clone the repository
2. Copy environment files
3. Install dependencies
4. Start the development server
5. Open in simulator/browser

## Verification
- [ ] Home screen loads
- [ ] Can create account
- [ ] Can add a contact
```

**Deliverables:**
- [ ] `QUICK_START.md` at root level
- [ ] Tested by someone unfamiliar with codebase

---

### R7: In-App Instructions/Help (P2)

**Objective:** Users understand what each feature does

**Current State:**
- Onboarding flow exists ✅
- Empty states have basic messages ✅
- No tooltips or help overlays ❌
- No feature discovery prompts ❌

**Required Additions:**
1. Tooltip component for first-time feature use
2. Help button on complex screens
3. "What's this?" explanations for warmth scores, bands, etc.
4. Settings page with feature explanations

**Deliverables:**
- [ ] `components/Tooltip.tsx` or `components/HelpOverlay.tsx`
- [ ] Help content for: Warmth Score, Contact Pipeline, Voice Notes, AI Chat
- [ ] Integration into main screens

---

## Acceptance Criteria

### For Developer Handoff to be "Complete":

1. **New developer can clone and run in < 15 minutes**
   - Clone repo
   - `npm install`
   - Copy `.env.example` to `.env`
   - `npm run dev`
   - App loads in browser/simulator

2. **All README files are actionable**
   - No placeholder text
   - All commands work as documented
   - Troubleshooting covers common issues

3. **Database can be set up from scratch**
   - Clear instructions exist
   - Migrations run without errors
   - App connects successfully

4. **No duplicate/confusing folders**
   - ios-app contains only iOS-relevant code
   - web-frontend contains only web-relevant code
   - Clear separation of concerns

5. **Architecture is documented**
   - New developer understands system in 30 minutes
   - Can find where to make changes for any feature

---

## Timeline Estimate

| Requirement | Effort | Owner |
|-------------|--------|-------|
| R1: README Files | 4-6 hours | TBD |
| R2: Database Setup | 2-3 hours | TBD |
| R3: Standard Scripts | 1-2 hours | TBD |
| R4: Cleanup Duplicates | 1 hour | TBD |
| R5: Architecture Doc | 3-4 hours | TBD |
| R6: Quick Start Guide | 2 hours | TBD |
| R7: In-App Help | 8-12 hours | TBD |

**Total Estimate:** 21-30 hours for P0+P1 items

---

## References

- `DEVELOPER_HANDOFF_GUIDE.md` - Migration overview (already exists)
- `CLEANUP_SUMMARY.md` - Cleanup status
- `FINAL_BRANCH_STRUCTURE.md` - Target structure

---

*Last Updated: January 19, 2026*
