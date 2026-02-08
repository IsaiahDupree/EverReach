# Branch Strategy & Execution Order

## Current Branches

| Branch | Purpose | Status |
|--------|---------|--------|
| `master` | Production baseline | Stable |
| `ios-app` | Active development (Meta Pixel, security fixes, all current work) | Active |

---

## Proposed Branch Plan

```
master
 └── ios-app (current — Meta Pixel, Supabase security/perf fixes)
      ├── hardening/backend-v1    (PRD 02 — Backend/API Hardening)
      ├── feature/completion-v1   (PRD 03 — Feature Completion)
      ├── qa/test-coverage-v1     (PRD 04 — Testing & QA)
      └── release/app-store-v1   (PRD 01 — App Store Submission)
```

All branches fork from `ios-app` and merge back into `ios-app`. Once all PRDs are complete, `ios-app` merges into `master` for release.

---

## Execution Order

### Phase 1: Foundation (Parallel)
| PRD | Branch | Why First |
|-----|--------|-----------|
| **PRD 02** — Backend Hardening | `hardening/backend-v1` | Unblocks PRD 03 (usage endpoint) and PRD 04 (backend tests). No frontend dependencies. |

### Phase 2: Features + Tests (Parallel, after Phase 1)
| PRD | Branch | Why Now |
|-----|--------|---------|
| **PRD 03** — Feature Completion | `feature/completion-v1` | Depends on PRD 02 for usage endpoint. Can start social channels work immediately. |
| **PRD 04** — Testing & QA | `qa/test-coverage-v1` | Write tests against hardened backend. Auth/contact tests can start immediately. |

### Phase 3: Ship (After Phase 2 merges)
| PRD | Branch | Why Last |
|-----|--------|----------|
| **PRD 01** — App Store Submission | `release/app-store-v1` | Needs all features complete and tested. Final polish, env config, metadata. |

---

## Merge Sequence

```
1. hardening/backend-v1    → ios-app   (Phase 1 complete)
2. feature/completion-v1   → ios-app   (Phase 2a complete)
3. qa/test-coverage-v1     → ios-app   (Phase 2b complete)
4. release/app-store-v1    → ios-app   (Phase 3 complete)
5. ios-app                 → master    (v1.0.0 release)
```

---

## Quick Reference

| PRD | Priority | Effort | Branch | Blocks |
|-----|----------|--------|--------|--------|
| 01 — App Store | P0 | 2-3 days | `release/app-store-v1` | Release |
| 02 — Backend | P0 | 3-4 days | `hardening/backend-v1` | PRD 03, PRD 04 |
| 03 — Features | P1 | 4-5 days | `feature/completion-v1` | Launch quality |
| 04 — Testing | P1 | 3-4 days | `qa/test-coverage-v1` | Confidence |

**Total estimated effort: 12-16 days**
