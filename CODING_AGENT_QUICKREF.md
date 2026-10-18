# Quick Reference for Autonomous Coding Agents

**Last Updated:** 2026-01-18 (Session 4)

---

## 🚀 Getting Started

You are a coding agent working on the **EverReach App Kit** - a production-ready full-stack starter kit with iOS, Backend, and Web implementations.

### Your First Steps

1. **Read the Implementation Roadmap**
   ```
   File: IMPLEMENTATION_ROADMAP.md
   Purpose: Complete guide with 24 sessions planned
   ```

2. **Check Current Progress**
   ```
   File: claude-progress.txt
   Purpose: Session log showing what's been done
   ```

3. **Review Your Session Assignment**
   ```
   Look for "Session X" in IMPLEMENTATION_ROADMAP.md
   Each session has clear goals, tasks, and acceptance criteria
   ```

4. **Check Feature Definitions**
   ```
   File: feature_list.json
   Contains: 147 features with descriptions and acceptance criteria
   ```

---

## 📊 Project Status at a Glance

| Metric | Value |
|--------|-------|
| **Total Features** | 147 |
| **Completed** | 0 (0%) |
| **P0 (Critical)** | 104 |
| **P1 (Important)** | 43 |
| **Current Phase** | Planning → Implementation |
| **Next Session** | 5 (iOS Foundation) |

---

## 🗂️ File Structure

### Key Documentation Files
```
/
├── README.md                              # Main project documentation
├── IMPLEMENTATION_ROADMAP.md              # ⭐ Your main guide
├── claude-progress.txt                    # ⭐ Session log
├── CODING_AGENT_QUICKREF.md              # ⭐ This file
├── feature_list.json                      # ⭐ Feature tracking
├── QUICKSTART.md                          # User setup guide
├── DEVELOPER_HANDOFF.md                   # Developer handoff
├── PRD_IOS_STARTER_KIT.md                # iOS specifications
├── backend-kit/PRD_BACKEND_STARTER_KIT.md # Backend specifications
├── web-kit/PRD_WEB_STARTER_KIT.md        # Web specifications
└── SESSION_04_INITIALIZATION_REPORT.md    # Initialization summary
```

### Template Files (Reference Only)
```
templates/
├── app/
│   ├── (tabs)/
│   ├── _layout.tsx
│   └── paywall.tsx
├── components/dev/
├── constants/config.ts
├── services/api.ts
└── types/models.ts
```

---

## 🎯 Quick Commands

### Check Feature Status
```bash
# Count total features
jq '.totalFeatures' feature_list.json

# Count completed features
jq '[.features[] | select(.passes == true)] | length' feature_list.json

# List P0 features
jq '[.features[] | select(.priority == "P0")]' feature_list.json

# Check specific feature
jq '.features[] | select(.id == "IOS-FOUND-001")' feature_list.json
```

### Update Feature Status
When you complete a feature, update feature_list.json:
```json
{
  "id": "IOS-FOUND-001",
  "passes": true  // Change from false to true
}
```

---

## 📝 Session Workflow

### 1. Start of Session
```
□ Read IMPLEMENTATION_ROADMAP.md for your session
□ Read claude-progress.txt for context
□ Review feature definitions in feature_list.json
□ Check relevant PRD for detailed specs
```

### 2. During Session
```
□ Follow the task list in your session plan
□ Test each feature as you implement it
□ Mark features as passing in feature_list.json when complete
□ Document any issues or blockers
```

### 3. End of Session
```
□ Verify all targeted features are passing
□ Update feature_list.json with passes: true
□ Append session log to claude-progress.txt
□ Create SESSION_XX_REPORT.md (optional but recommended)
```

---

## 📋 Session Log Template

Append this to `claude-progress.txt` at end of each session:

```
==============================================
SESSION X - [TITLE]
==============================================
Date: YYYY-MM-DD
Agent: [Your Name]
Duration: [Hours]

GOALS:
- [ ] Goal 1
- [ ] Goal 2

FEATURES TARGETED:
- FEAT-XXX-YYY: Description

WORK COMPLETED:
- Task 1
- Task 2

FEATURES PASSING:
- FEAT-XXX-YYY ✅
- FEAT-XXX-YYZ ✅

ISSUES ENCOUNTERED:
- Issue 1 and resolution
- Issue 2 and resolution

BLOCKERS:
- None / [Describe blockers]

METRICS:
- Features completed this session: X
- Total features passing: Y/147
- Time spent: Z hours

NEXT SESSION:
- Should focus on [area]
- Dependencies: [what needs to be done first]

==============================================
```

---

## 🎨 Platform-Specific Quick Reference

### iOS (Sessions 5-10)
```
Directory: ios-kit/
Technology: React Native + Expo SDK 52
Router: Expo Router (file-based)
State: React Query
Auth: Supabase
Payments: RevenueCat
```

**Key Files to Create:**
- `package.json` (dependencies)
- `app.json` (Expo config)
- `tsconfig.json` (TypeScript)
- `eas.json` (EAS Build)
- `.env.example` (environment vars)

**Common Commands:**
```bash
npx create-expo-app@latest ios-kit --template blank-typescript
cd ios-kit
npm install
npx expo start
```

### Backend (Sessions 11-15)
```
Directory: backend-kit/
Technology: Next.js 14 App Router
Hosting: Vercel Serverless
Database: Supabase (server-side)
Validation: Zod
Payments: Stripe, RevenueCat (webhooks)
```

**Key Files to Create:**
- `package.json` (dependencies)
- `next.config.js` (Next.js config)
- `vercel.json` (Vercel config)
- `tsconfig.json` (TypeScript)
- `.env.example` (environment vars)

**Common Commands:**
```bash
npx create-next-app@latest backend-kit
cd backend-kit
npm install
npm run dev
```

### Web (Sessions 16-20)
```
Directory: web-kit/
Technology: Next.js 14 App Router
Styling: Tailwind CSS
Components: shadcn/ui
State: React Query
Auth: Supabase
Payments: Stripe
```

**Key Files to Create:**
- `package.json` (dependencies)
- `next.config.js` (Next.js config)
- `tailwind.config.ts` (Tailwind)
- `tsconfig.json` (TypeScript)
- `.env.example` (environment vars)

**Common Commands:**
```bash
npx create-next-app@latest web-kit
cd web-kit
npx shadcn-ui@latest init
npm install
npm run dev
```

---

## 🧪 Testing Checklist

### For Each Feature
```
□ Code compiles without TypeScript errors
□ Feature works as described in acceptance criteria
□ Error handling is implemented
□ Loading states are implemented
□ No console errors or warnings
□ Code follows existing patterns
□ Comments added where needed
□ No hardcoded credentials or secrets
```

### Before Marking Feature as Passing
```
□ Manual testing completed
□ Edge cases considered
□ Error messages are user-friendly
□ Mobile responsiveness checked (for UI)
□ Dark mode works (for UI)
□ Accessibility considered
```

---

## 🚨 Common Pitfalls to Avoid

### ❌ Don't Do This
- Skip foundation setup (package.json, tsconfig, etc.)
- Implement P1 features before P0
- Hardcode API keys or credentials
- Ignore TypeScript errors
- Skip testing
- Mark features as passing without testing
- Implement features out of order (respect dependencies)
- Copy code without understanding it
- Forget to update feature_list.json
- Skip documentation

### ✅ Do This Instead
- Follow the session plan in order
- Set up foundation files first
- Use environment variables for secrets
- Fix all TypeScript errors
- Test each feature thoroughly
- Only mark features passing when they truly work
- Check feature dependencies
- Understand and adapt code
- Update feature_list.json as you go
- Document as you build

---

## 📚 External Resources

### Official Documentation
- **Expo:** https://docs.expo.dev
- **React Native:** https://reactnative.dev
- **Next.js:** https://nextjs.org/docs
- **Supabase:** https://supabase.com/docs
- **Stripe:** https://stripe.com/docs
- **RevenueCat:** https://docs.revenuecat.com
- **Tailwind CSS:** https://tailwindcss.com/docs
- **shadcn/ui:** https://ui.shadcn.com
- **React Query:** https://tanstack.com/query/latest

### Key Concepts
- **Expo Router:** File-based routing for React Native
- **App Router:** Next.js 13+ routing system
- **Row Level Security (RLS):** Supabase database security
- **Webhooks:** Stripe and RevenueCat event notifications
- **Server Actions:** Next.js server-side functions
- **React Query:** Data fetching and caching library

---

## 🎯 Feature ID Format

Features use this naming convention:
```
[PLATFORM]-[CATEGORY]-[NUMBER]

Examples:
- IOS-FOUND-001     (iOS Foundation feature #1)
- IOS-AUTH-005      (iOS Authentication feature #5)
- BACK-API-012      (Backend API feature #12)
- WEB-PAGE-003      (Web Page feature #3)
```

### Category Codes
- **FOUND:** Foundation (project setup)
- **AUTH:** Authentication
- **NAV:** Navigation
- **DATA:** Data layer
- **COMP:** Components
- **PAY:** Payments
- **THEME:** Theming
- **DEV:** Developer tools
- **DB:** Database
- **DOC:** Documentation
- **USER:** User management
- **ITEM:** Items CRUD
- **SUB:** Subscriptions
- **HOOK:** Webhooks
- **UTIL:** Utilities
- **HEALTH:** Health checks
- **UPLOAD:** File uploads
- **LAYOUT:** Layouts
- **PAGE:** Pages
- **SEO:** SEO optimization

---

## 🔢 Priority Levels

### P0 (Critical) - 104 features
**Definition:** Must have for MVP. Without these, the kit doesn't work.

**Examples:**
- Project setup and configuration
- Authentication system
- Core navigation
- Data fetching
- Basic CRUD operations
- Payment integration (basic)

**Rule:** Implement ALL P0 features before ANY P1 features.

### P1 (Important) - 43 features
**Definition:** Should have for complete product. Enhances UX but not critical.

**Examples:**
- Forgot password flow
- Search functionality
- File uploads
- Theme toggles
- Advanced SEO
- Footer components

**Rule:** Only implement after all P0 features are passing.

---

## 📊 Progress Tracking

### Manual Checks
```bash
# Total progress
echo "Total: $(jq '[.features[] | select(.passes == true)] | length' feature_list.json)/147"

# Platform progress
echo "iOS: $(jq '[.features[] | select(.kit == "ios" and .passes == true)] | length' feature_list.json)/50"
echo "Backend: $(jq '[.features[] | select(.kit == "backend" and .passes == true)] | length' feature_list.json)/50"
echo "Web: $(jq '[.features[] | select(.kit == "web" and .passes == true)] | length' feature_list.json)/47"

# Priority progress
echo "P0: $(jq '[.features[] | select(.priority == "P0" and .passes == true)] | length' feature_list.json)/104"
echo "P1: $(jq '[.features[] | select(.priority == "P1" and .passes == true)] | length' feature_list.json)/43"
```

---

## 🔧 Troubleshooting

### If You're Stuck
1. Review the feature definition in `feature_list.json`
2. Check acceptance criteria for the feature
3. Review relevant PRD section
4. Look at template files for reference
5. Check official documentation
6. Review similar features that are already passing

### If You Find Bugs in Planning
If you discover errors in:
- PRDs
- feature_list.json
- IMPLEMENTATION_ROADMAP.md
- Other documentation

**Action:** Note it in your session log, fix if critical, otherwise continue.

### If Sessions Take Longer Than Expected
**Action:** It's okay! Estimate are guidelines. Quality > speed.

---

## ✅ Definition of Done

A feature is "done" when:

1. **Code is written** and compiles without errors
2. **Feature works** according to acceptance criteria
3. **Tested manually** and edge cases considered
4. **Error handling** implemented
5. **Loading states** implemented (where applicable)
6. **TypeScript types** are correct
7. **No console errors** or warnings
8. **Code is clean** and commented where needed
9. **Follows patterns** established in the project
10. **feature_list.json updated** with `passes: true`

---

## 🎓 Learning as You Go

### First Time with Expo?
- Read: https://docs.expo.dev/get-started/introduction/
- Focus on: Expo Router, EAS Build

### First Time with Next.js App Router?
- Read: https://nextjs.org/docs/app
- Focus on: Server Components, Route Handlers, Metadata

### First Time with Supabase?
- Read: https://supabase.com/docs/guides/getting-started
- Focus on: Authentication, Row Level Security, Client Libraries

### First Time with React Query?
- Read: https://tanstack.com/query/latest/docs/react/overview
- Focus on: useQuery, useMutation, Query Keys

---

## 📞 When in Doubt

1. **Check the PRD** - Detailed specifications
2. **Check feature_list.json** - Acceptance criteria
3. **Check templates/** - Reference implementations
4. **Check official docs** - Authoritative source
5. **Follow the plan** - IMPLEMENTATION_ROADMAP.md
6. **Document uncertainty** - Note it in your session log

---

## 🚀 Ready to Code?

**Your first session should be:**
- **Session 5:** iOS Foundation & Project Setup
- **Location:** IMPLEMENTATION_ROADMAP.md > Phase 1 > Session 5
- **Features:** IOS-FOUND-001 to IOS-FOUND-005
- **Goal:** Get iOS project structure set up and running

**Good luck! You've got this!** 💪

---

*Created during Session 4 (Initialization) on 2026-01-18*
*This is your companion guide - keep it handy!*
