# 🧪 Testing Infrastructure - Quick Start

This directory contains automated testing tools for subscription and purchase flow monitoring.

---

## 🚀 Quick Start Guide

### **1. Reset Test Purchases**

Before running tests, clean your simulator state:

```bash
# Full reset (clears purchases, cache, rebuilds app)
npm run test:reset-purchases

# Quick reset (skip rebuild)
npm run test:reset-purchases:quick
```

### **2. Start Monitoring Dashboard**

Open the monitoring dashboard to track test results:

```bash
npm run test:dashboard
```

Then open in browser: **http://localhost:3001**

### **3. Run Interactive Tests**

Run the guided subscription test flow:

```bash
npm run test:interactive
```

Results will automatically appear in the dashboard!

---

## 📊 Dashboard Features

### **Overview Cards**
- Total tests run
- Pass rate percentage
- Average test duration
- Current pass streak

### **Charts**
- Success rate over time (line chart)
- Backend sync latency (bar chart)

### **Test Breakdown**
- Individual test performance
- Pass rates for each step
- Visual progress bars

### **Recent Results**
- Filterable table of all test runs
- Search functionality
- Detailed view for each test

---

## 🔧 Available Scripts

### Testing
```bash
npm run test:interactive          # Guided manual test
npm run test:maestro:purchase    # Automated UI test
npm run test:subscription        # Unit tests
```

### Dashboard
```bash
npm run test:dashboard           # Start dashboard server
npm run test:dashboard:dev       # Dashboard with auto-reload
```

### Reset & Cleanup
```bash
npm run test:reset-purchases     # Full reset + rebuild
npm run test:reset-purchases:quick  # Quick reset (no rebuild)
```

---

## 📁 File Structure

```
mobileapp/
├── scripts/
│   ├── reset-storekit-purchases.sh    # Purchase reset automation
│   ├── interactive-test.sh            # Guided test flow
│   ├── test-result-collector.js       # Parse results for dashboard
│   └── run-maestro-tests.sh           # Maestro automation
├── test-dashboard/
│   ├── index.html                     # Dashboard UI
│   ├── styles.css                     # Dashboard styling
│   ├── dashboard.js                   # Dashboard logic
│   ├── server.js                      # Express API server
│   └── data/
│       └── test-results.json         # Historical test data
└── maestro/
    └── 05-complete-purchase-flow.yaml # Automated purchase test
```

---

## 🎯 Typical Workflow

### **Daily Testing**
1. `npm run test:reset-purchases:quick` - Clean state
2. `npm run test:dashboard` - Start monitoring (separate terminal)
3. `npm run test:interactive` - Run tests
4. Check dashboard for results

### **Pre-Release**
1. `npm run test:reset-purchases` - Full reset with rebuild
2. `npm run test:dashboard`
3. `npm run test:interactive`
4. `npm run test:maestro:purchase`
5. Review dashboard for any failures

### **Debugging Issues**
1. Check dashboard for failure patterns
2. Review screenshots in `test-screenshots-*` folders
3. Check logs in `test-logs-*` folders
4. Export dashboard report for analysis

---

## 🔍 What Gets Tested

### **Interactive Test Flow** (9 Steps)
1. ✅ Sign In
2. ✅ Check Current Subscription Status
3. ✅ Purchase Subscription (StoreKit)
4. ✅ Verify Auto-Sync (NEW!)
5. ✅ Verify Premium Features Unlocked
6. ✅ Manual Backend Sync (Fallback)
7. ✅ Restore Purchases
8. ⚠️ Cancel Subscription (Optional)
9. ✅ Sign Out / Sign In Persistence

### **Automated Data Collection**
- Pass/Fail counts
- Test duration
- Backend sync latency
- Screenshot evidence
- Console logs (backend + mobile)

---

## 💡 Pro Tips

### **Reset Script Options**
- `--quick` or `-q` - Skip rebuild (faster, for quick iterations)
- `--force` or `-f` - Skip confirmation prompts
- `--verbose` or `-v` - Show detailed output

### **Dashboard API**
The dashboard exposes a REST API:
- `GET /api/test-results` - All results
- `GET /api/test-results/:id` - Specific result
- `POST /api/test-results` - Add new result
- `GET /api/summary` - Statistics

### **Manual Data Collection**
You can manually add results to the dashboard:
```bash
node scripts/test-result-collector.js path/to/results.txt
```

---

## 🐛 Troubleshooting

### **Reset Script Issues**
- **"No booted simulator"**: Open Simulator app first
- **Build fails**: Run `npm run ios:clean` manually
- **Permission denied**: Run `chmod +x scripts/reset-storekit-purchases.sh`

### **Dashboard Issues**
- **Port 3001 in use**: Kill existing process or change PORT in server.js
- **No data showing**: Run a test first, data persists in `test-dashboard/data/`
- **Charts not updating**: Click "Refresh" button or wait 10s for auto-refresh

### **Interactive Test Issues**
- **No screenshots**: Simulator window must be visible
- **Logs empty**: Ensure backend and Metro are running
- **Export failed**: Dashboard server must be running

---

## 📈 Dashboard Data Format

Results are stored in JSON format:

```json
{
  "id": "test-1234567890",
  "timestamp": "2025-11-22T22:00:00.000Z",
  "passed": 7,
  "failed": 1,
  "skipped": 1,
  "duration": 245.3,
  "status": "failed",
  "tests": [
    {
      "name": "Sign In",
      "status": "passed"
    }
  ],
  "metrics": {
    "syncLatency": 1200
  }
}
```

---

## 🔗 Related Documentation

- [TESTING_STRATEGY_AND_AUTOMATION.md](../TESTING_STRATEGY_AND_AUTOMATION.md) - Complete testing overview
- [TEST_PURCHASE_FLOW.md](../TEST_PURCHASE_FLOW.md) - Purchase flow details
- [SCREENSHOT_AUTOMATION.md](../SCREENSHOT_AUTOMATION.md) - Screenshot guide

---

**Need help?** Check the main testing guide or review the script source code for detailed comments.
