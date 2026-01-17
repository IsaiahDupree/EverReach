# 🧭 Automated Navigation Testing Guide

Comprehensive guide to the automated navigation tests for the EverReach app.

---

## 📋 Test Coverage Overview

### **1. Smoke Test** (`smoke-test.yaml`)
**Purpose:** Quick verification that critical features work  
**Duration:** ~30 seconds  
**Coverage:**
- ✅ App launches successfully
- ✅ All main tabs load (Home, People, Chat, Settings)
- ✅ Quick actions work (Voice Note, Add Contact)
- ✅ Subscription page accessible

**Run:**
```bash
npm run test:nav:smoke
```

**When to use:** Before every release, after any major change, in CI/CD pipeline

---

### **2. Complete Navigation Test** (`navigation-complete.yaml`)
**Purpose:** Exhaustive navigation coverage  
**Duration:** ~3 minutes  
**Coverage:**
- ✅ Home tab: Quick actions, health cards, profile navigation
- ✅ People tab: Contact list, detail pages, context, notes, history
- ✅ Chat tab: Assistant interaction
- ✅ Settings tab: All sub-pages (Profile, Privacy, Notifications, Subscription)
- ✅ Cross-tab navigation
- ✅ Deep link navigation
- ✅ 22 screenshots for visual regression

**Run:**
```bash
npm run test:nav:complete
```

**When to use:** Weekly regression tests, before major releases

---

### **3. Regression Test Suite** (`regression-suite.yaml`)
**Purpose:** Test historically problematic areas  
**Duration:** ~2 minutes  
**Coverage:**
- ✅ Tab state preservation when switching
- ✅ Back button navigation from deep pages
- ✅ Settings navigation stack integrity
- ✅ Home quick action returns
- ✅ Contact creation and list updates

**Run:**
```bash
npm run test:nav:regression
```

**When to use:** After navigation-related bug fixes, before releases

---

### **4. New User Journey** (`journey-new-user.yaml`)
**Purpose:** Simulate first-time user experience  
**Duration:** ~1 minute  
**Coverage:**
- ✅ First contact creation
- ✅ Adding notes to contacts
- ✅ Navigating to people list
- ✅ Viewing contact details
- ✅ Exploring chat feature
- ✅ Checking subscription plans

**Run:**
```bash
npm run test:journey:new-user
```

**When to use:** Onboarding flow changes, UX improvements

---

### **5. Daily Workflow Journey** (`journey-daily-workflow.yaml`)
**Purpose:** Test power user's typical routine  
**Duration:** ~1 minute  
**Coverage:**
- ✅ Checking relationship health
- ✅ Reviewing cold contacts
- ✅ Recording voice notes
- ✅ Viewing contact context
- ✅ Composing messages
- ✅ Managing notifications

**Run:**
```bash
npm run test:journey:daily
```

**When to use:** Feature changes affecting core workflows

---

## 🚀 Quick Start

### **Run All Navigation Tests**
```bash
npm run test:nav:all
```

This runs: Smoke → Complete → Regression in sequence

### **Run Individual Tests**
```bash
# Quick smoke test (30s)
npm run test:nav:smoke

# Full navigation coverage (3min)
npm run test:nav:complete

# Historical bug areas (2min)
npm run test:nav:regression

# User journeys
npm run test:journey:new-user   # First-time user
npm run test:journey:daily      # Power user routine
```

---

## 📊 Test Results & Screenshots

### **Screenshot Locations**
All tests save screenshots to:
```
mobileapp/maestro/screenshots/
```

### **Naming Convention**
- `smoke-XX-description.png` - Smoke test screenshots
- `nav-full-XX-description.png` - Complete navigation screenshots
- `regression-XX-description.png` - Regression test screenshots
- `journey-new-user-XX-description.png` - New user journey
- `journey-daily-XX-description.png` - Daily workflow journey

### **Viewing Results**
After running tests:
```bash
# View screenshots
open maestro/screenshots/

# Check latest results
ls -lt maestro/screenshots/ | head -20
```

---

## 🔄 Integration with CI/CD

### **Recommended Pipeline**
```yaml
# .github/workflows/navigation-tests.yml
name: Navigation Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: macos-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3
      
      - name: Setup Maestro
        run: brew install maestro
      
      - name: Build App
        run: |
          cd mobileapp
          npx expo run:ios --configuration Debug
      
      - name: Run Smoke Test
        run: npm run test:nav:smoke
      
      - name: Run Full Navigation Tests
        run: npm run test:nav:complete
        if: github.ref == 'refs/heads/main'
      
      - name: Upload Screenshots
        uses: actions/upload-artifact@v3
        with:
          name: test-screenshots
          path: mobileapp/maestro/screenshots/
```

---

## 🎯 Best Practices

### **Before Writing Tests**
1. Ensure app is built and running on simulator
2. Sign in with test account
3. Seed database with sample data if needed

### **While Writing Tests**
1. Use descriptive screenshot names
2. Add `assertVisible` for critical elements
3. Group related actions with comments
4. Use `back` instead of hardcoded navigation when possible

### **After Running Tests**
1. Review all screenshots for visual regressions
2. Check for flaky tests (run 3 times)
3. Update test if app UI changes
4. Add new tests for new features

---

## 🐛 Troubleshooting

### **Test Fails: Element Not Found**
**Cause:** Element doesn't exist or has different text  
**Fix:** 
```yaml
# Instead of exact text match
- tapOn: "Submit Button"

# Use index for dynamic content
- tapOn:
    index: 0
```

### **Test Fails: Navigation Timeout**
**Cause:** Page takes too long to load  
**Fix:**
```yaml
# Add wait after navigation
- tapOn: "People"
- waitForAnimationToEnd
- assertVisible: "All Contacts"
```

### **Screenshots Are Blank**
**Cause:** Simulator window not visible  
**Fix:** 
1. Open Simulator app
2. Ensure simulator window is on top
3. Don't minimize during test run

### **Back Button Doesn't Work**
**Cause:** Custom navigation implementation  
**Fix:**
```yaml
# Instead of generic back
- back

# Use specific navigation
- tapOn: "< Back"
```

---

## 📈 Test Metrics

### **Coverage Breakdown**
| Test Suite | Screens Covered | Screenshots | Duration |
|------------|----------------|-------------|----------|
| Smoke | 6 | 7 | 30s |
| Complete Navigation | 18+ | 22 | 3min |
| Regression | 12 | 12 | 2min |
| New User Journey | 8 | 8 | 1min |
| Daily Workflow | 8 | 8 | 1min |
| **TOTAL** | **35+** | **57** | **~7.5min** |

### **Feature Coverage**
- ✅ Tab navigation (100%)
- ✅ Quick actions (100%)
- ✅ Contact management (90%)
- ✅ Settings pages (80%)
- ✅ Chat interface (60%)
- ✅ Voice notes (UI only, recording not testable)
- ❌ In-app purchases (requires manual StoreKit)

---

## 🔧 Customization

### **Add New Navigation Test**
1. Create YAML file in `mobileapp/maestro/`
2. Follow existing patterns
3. Add npm script to `package.json`
4. Document in this guide

### **Extend Existing Test**
```yaml
# Navigate to new page
- tapOn: "New Feature"
- assertVisible: "Feature Title"
- takeScreenshot: screenshots/feature.png

# Perform actions
- tapOn: "Action Button"
- assertVisible: "Success"
- back
```

### **Data-Driven Tests**
```yaml
# Run same flow for multiple contacts
- runFlow:
    when:
      visible: "Contact Name"
    commands:
      - tapOn: ${contactName}
      - assertVisible: "Contact Details"
      - back
```

---

## 📝 Maintenance

### **Monthly Tasks**
- [ ] Review and update test coverage
- [ ] Remove obsolete tests for deprecated features
- [ ] Add tests for new features
- [ ] Check screenshot baseline accuracy

### **After UI Changes**
- [ ] Update `assertVisible` text if labels changed
- [ ] Re-record baseline screenshots
- [ ] Verify all tests still pass
- [ ] Update test documentation

### **Performance Monitoring**
Track test duration over time:
```bash
# Run with timing
time npm run test:nav:complete

# Expected: < 3 minutes
# Alert if: > 5 minutes
```

---

## 🎓 Learning Resources

### **Maestro Documentation**
- [Official Docs](https://maestro.mobile.dev/)
- [Best Practices](https://maestro.mobile.dev/best-practices)
- [Advanced Features](https://maestro.mobile.dev/advanced)

### **Related Internal Docs**
- [TESTING_STRATEGY_AND_AUTOMATION.md](../../TESTING_STRATEGY_AND_AUTOMATION.md) - Overall testing strategy
- [TEST_PURCHASE_FLOW.md](../../TEST_PURCHASE_FLOW.md) - Purchase testing
- [test-dashboard/README.md](../test-dashboard/README.md) - Monitoring dashboard

---

## 📞 Support

**Issues with navigation tests?**
1. Check this guide first
2. Review Maestro docs
3. Check existing test examples
4. Run in verbose mode: `maestro test --debug`

**Need to add new tests?**
Follow the patterns in existing test files and ensure you:
- Name tests descriptively
- Include assertions after navigation
- Take screenshots at key points
- Update this documentation

---

**Last Updated:** November 22, 2025  
**Test Suite Version:** 1.0  
**Maestro Version:** Latest
