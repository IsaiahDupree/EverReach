# App Kit Branch Status

> **Branch:** `origin/app-kit` (local: `app-kit-backport`)
> **Last Updated:** Feb 17, 2026
> **Purpose:** Starter kit docs, templates, and PRDs for reusable EverReach platform

## Current State

- **3 PRDs:** iOS Starter Kit, Backend Starter Kit, Web Starter Kit
- **Developer Handoff Guide** linking all PRDs
- **14 documentation files** (architecture, database, auth, payments, deployment, etc.)
- **Backend Kit** — lib templates for common backend patterns
- **Templates** — app, components, constants, services, types
- **91 features** cataloged in `feature_list.json`
- **Warmth architecture** documented in Web Kit PRD

## Recent Changes (Feb 2026)

- `f2b29a8` — Add backend-kit lib templates + update subscription types
- `0922617` — Update architecture, database, payments, analytics docs
- `4483`... — Add v1.1.0 warmth EWMA unification to backport changelog
- PRD_WEB_STARTER_KIT.md updated with EWMA warmth system architecture

## Key Directories

```
docs/                  # 14 documentation files (getting started → scaling)
backend-kit/           # Backend starter templates
  └── lib/             # Reusable lib modules
web-kit/               # Web starter kit PRD
templates/             # App scaffolding templates
  ├── app/
  ├── components/
  ├── constants/
  ├── services/
  └── types/
examples/              # Example implementations (empty)
feature_list.json      # 91 features cataloged
```

## Remaining Work

- [ ] Extract and genericize iOS app code into reusable templates
- [ ] Extract and genericize backend routes into starter templates
- [ ] Create working example app that builds from templates
- [ ] README with one-command setup (`npx create-everreach-app`)

## How to Push

```bash
cd app-kit
git push origin app-kit-backport:app-kit
```
