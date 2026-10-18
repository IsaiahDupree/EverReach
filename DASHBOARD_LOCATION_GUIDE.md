# Dashboard Location Guide

## 🎯 Studio Admin Dashboard (Currently Running)

**Location:** `C:\Users\Isaia\Documents\Coding\rork-ai-enhanced-personal-crm\dashboard-app`

**Running at:** http://localhost:3000

**Custom Sidebar Sections:**
- 📈 Growth & Acquisition
  - Acquisition & ASO
  - Acquisition Funnel
  - Activation
  - Paywall
- 💰 Monetization
  - Revenue & Entitlements
  - Finance
  - Retention & Cohorts
- 📊 Product Analytics
  - Events
  - Feature Usage & AI
  - Analytics
  - CRM
  - Contacts
- 📧 Marketing Communications
  - Email Marketing HQ
  - SMS / Comms HQ
- 🌱 Organic Marketing
  - Command Center
  - Calendar & Queue
  - Content Composer
  - Channel Hubs
  - Inbox
  - Asset Library

**Tech Stack:**
- Next.js 16 (Turbopack)
- Shadcn UI
- TailwindCSS v4
- TypeScript

**Status:** ✅ Custom-built analytics dashboard

**Branch:** feat/evidence-reports

---

## 📁 Dashboard Copies in Workspace

### 1. Copy in PersonalCRM Backend Workspace

**Location:** `C:\Users\Isaia\Documents\Coding\PersonalCRM Backend\dashboard-app`

**Status:** ⚠️ Has merge conflicts in layout.tsx

**Issues:**
- Git merge conflict markers in `src/app/layout.tsx`
- Needs conflict resolution before use

---

## 🚀 To Add Feature Requests Page

Since the running dashboard is in `rork-ai-enhanced-personal-crm/dashboard-app` (outside current workspace), you have two options:

### Option 1: Add to Running Dashboard (Recommended)
1. Open workspace: `C:\Users\Isaia\Documents\Coding\rork-ai-enhanced-personal-crm`
2. Navigate to: `dashboard-app/src/app/(main)/dashboard`
3. Create folder: `feature-requests`
4. Add file: `page.tsx`
5. The page will be accessible at `/dashboard/feature-requests`

### Option 2: Fix PersonalCRM Backend Copy
1. Resolve merge conflicts in `dashboard-app/src/app/layout.tsx`
2. Run `npm install` in that folder
3. Start with `npm run dev`
4. Then add feature requests page

---

## 📝 Current Situation

**What's Running:** The dashboard from `rork-ai-enhanced-personal-crm/dashboard-app`

**What's in Current Workspace:** A copy with merge conflicts

**Recommendation:** 
- Either open the `rork-ai-enhanced-personal-crm` folder as your workspace
- OR copy the working dashboard into `PersonalCRM Backend` workspace
- OR resolve the merge conflicts in the current workspace copy

---

## 🔗 Quick Commands

### To run the working dashboard:
```bash
cd C:\Users\Isaia\Documents\Coding\rork-ai-enhanced-personal-crm\dashboard-app
npm run dev
```

### To fix the workspace copy:
```bash
cd "C:\Users\Isaia\Documents\Coding\PersonalCRM Backend\dashboard-app"
# Manually resolve merge conflicts in src/app/layout.tsx
npm install
npm run dev
```

---

**Last Updated:** November 11, 2025
**Dashboard Running:** localhost:3000
**Process ID:** 4640
