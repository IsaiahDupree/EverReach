# EverReach Deployment History

## Previous Frontend (feat/e2e-test-infra branch)

### Branch Information
- **Repository**: https://github.com/IsaiahDupree/rork-ai-enhanced-personal-crm
- **Branch**: `feat/e2e-test-infra`
- **Branch URL**: https://github.com/IsaiahDupree/rork-ai-enhanced-personal-crm/tree/feat/e2e-test-infra

### Overview
This branch contained the **previous frontend implementation** before migration to the unified Expo app.

### Architecture
- Separate web frontend (likely Next.js or standalone React)
- Different codebase from mobile app
- Deployed independently to Vercel

### Migration Notes
The frontend has been **consolidated into this Expo monorepo** to:
- Share code between web and mobile
- Unified development experience
- Single codebase for all platforms
- Easier maintenance and feature parity

---

## Current Frontend (Unified Expo App)

### Repository
- **Repository**: Same repo, main branch
- **Framework**: Expo (React Native + Web)
- **Platforms**: iOS, Android, **Web**

### Deployment Targets

#### Web
- **Vercel Project**: https://vercel.com/isaiahduprees-projects/web
- **Custom Domain**: www.everreach.app
- **Build Command**: `npx expo export:web`
- **Output Directory**: `web-build`

#### Mobile
- **iOS**: App Store (via EAS Build)
- **Android**: Play Store (via EAS Build)

### Environment Configuration
- **Backend API**: https://ever-reach-be.vercel.app
- **Supabase**: Production instance
- **Analytics**: PostHog
- **Subscriptions**: RevenueCat + Superwall

---

## Deployment Date
- **Migration Date**: November 2, 2025
- **Previous Branch Archived**: feat/e2e-test-infra
- **New Unified App Deployed**: Current main branch
