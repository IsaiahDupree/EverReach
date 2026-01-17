# 🎭 Maestro Test Suite

Automated UI tests for EverReach mobile app.

## 🚀 Quick Run

```bash
# Run all tests
npm run test:automated

# Run individual tests
npm run test:maestro:launch        # App launch (10s)
npm run test:maestro:nav           # Navigation (20s)
npm run test:maestro:subscription  # Subscription UI (30s)
npm run test:maestro:full          # Full flow (manual purchase step)
```

## 📁 Test Files

| File | Purpose | Duration |
|------|---------|----------|
| `01-app-launch.yaml` | Verify app starts | ~10s |
| `02-navigation.yaml` | Test screen navigation | ~20s |
| `03-subscription-ui.yaml` | Test subscription screens | ~30s |
| `subscription-automated.yaml` | Full subscription flow | Manual |
| `test-suite.yaml` | Run all tests | ~60s |

## 📸 Screenshots

All tests save screenshots to `screenshots/` folder:
- `01-launch.png` - App launch
- `02-home.png` - Home screen
- `02-settings.png` - Settings screen
- `02-plans.png` - Subscription plans
- `03-plans-view.png` - Plan details
- ... and more

## ✏️ Writing Tests

### Basic Template:
```yaml
appId: com.everreach.app
---
- launchApp
- tapOn: "Button Text"
- assertVisible: "Expected Text"
- takeScreenshot: screenshots/result.png
```

### Common Commands:
- `launchApp` - Start the app
- `tapOn: "text"` - Tap button/element
- `assertVisible: "text"` - Verify text appears
- `takeScreenshot: path` - Save screenshot
- `back` - Navigate back
- `scrollUntilVisible` - Scroll to find element

## 🔧 Troubleshooting

**Simulator not running?**
```bash
open -a Simulator
```

**Metro not running?**
```bash
npm run ios
```

**Element not found?**
- Check element text in app
- Update YAML file
- Take screenshot to debug

## 📚 Documentation

- **Full Guide:** `../AUTOMATED_TESTING_GUIDE.md`
- **Setup:** `../AUTOMATION_SETUP.md`
- **Commands:** `../TEST_COMMANDS.md`

## 🎯 Next Steps

1. Run existing tests to verify setup
2. Review screenshots to understand flow
3. Add new tests as you build features
4. Integrate into CI/CD pipeline

Happy testing! 🎉
