# Marketing Branch - File Inventory

**Created:** January 17, 2026  
**Size:** 24 MB

---

## Files to Include in Marketing Branch

### Documentation (from web-frontend/marketing/)

| File | Size | Description |
|------|------|-------------|
| `README.md` | 10 KB | Marketing overview |
| `APP_STORE_SUBMISSION_GUIDE.md` | 15 KB | App Store submission process |
| `APP_STORE_QUICK_CHECKLIST.md` | 6 KB | Quick submission checklist |
| `BRAND_GUIDELINES.md` | 12 KB | Brand colors, fonts, style |
| `MARKETING_PLAN.md` | 15 KB | Marketing strategy |
| `LANDING_PAGE_COPY.md` | 11 KB | Website copy |
| `COPY_IMPROVEMENTS.md` | 6 KB | Copy suggestions |
| `SCREENSHOT_REQUIREMENTS.md` | 14 KB | App Store screenshot specs |
| `SCREENSHOT_SCRIPTS_COMPARISON.md` | 8 KB | Screenshot automation |
| `SUBSCRIPTION_IMAGE_GUIDE.md` | 12 KB | Paywall imagery |
| `VOICE_CONTEXT_FEATURE.md` | 9 KB | Feature marketing copy |
| `VOICE_CONTEXT_SAVE_BUTTON_FEATURE.md` | 10 KB | Feature marketing copy |
| `core_subscription_review_notes.md` | 4 KB | Subscription review notes |
| `free_vs_paid_features.md` | 4 KB | Feature comparison |

### Screenshots & Images

| Folder/File | Size | Description |
|-------------|------|-------------|
| `screenshots/` | 20 MB | App Store screenshot sets |
| `app-store-screenshots/` | 3.5 MB | Additional screenshots |
| `subscription-screenshot-iphone-17-pro-max.png` | 370 KB | Paywall screenshot |
| `subscription-screenshot-iphone-17-pro.png` | 368 KB | Paywall screenshot |

### Screenshot Sets (in screenshots/)

| Folder | Date | Device |
|--------|------|--------|
| `appstore-2025-11-22-1453/` | Nov 22, 2025 | iPhone |
| `appstore-2025-11-22-1504/` | Nov 22, 2025 | iPhone |
| `appstore-2025-11-22-1611/` | Nov 22, 2025 | iPhone |
| `appstore-2025-11-22-1709/` | Nov 22, 2025 | iPhone |
| `appstore-ipad-2025-12-04-0129/` | Dec 4, 2025 | iPad |

---

## Files to Move FROM Other Branches

### From web-frontend/

```bash
# Already copied to marketing/
rm -rf web-frontend/marketing/
```

### From ios-app/

```bash
# Same content - just delete
rm -rf ios-app/marketing/
```

### From backend/docs/marketing/ (if exists)

```bash
# Move any marketing docs
mv backend/docs/marketing/* marketing/docs/ 2>/dev/null
```

---

## Recommended Cleanup

Keep only the **latest screenshot set** for each device:
- iPhone: `appstore-2025-11-22-1709/` (most recent)
- iPad: `appstore-ipad-2025-12-04-0129/`

```bash
# Remove older screenshot sets (saves ~15 MB)
rm -rf marketing/screenshots/appstore-2025-11-22-1453/
rm -rf marketing/screenshots/appstore-2025-11-22-1504/
rm -rf marketing/screenshots/appstore-2025-11-22-1611/
```

---

## Final Marketing Branch Structure

```
marketing/ (24 MB → ~9 MB after cleanup)
├── README.md
├── MARKETING_BRANCH_FILES.md
│
├── docs/
│   ├── APP_STORE_SUBMISSION_GUIDE.md
│   ├── APP_STORE_QUICK_CHECKLIST.md
│   ├── BRAND_GUIDELINES.md
│   ├── MARKETING_PLAN.md
│   ├── LANDING_PAGE_COPY.md
│   ├── COPY_IMPROVEMENTS.md
│   ├── SCREENSHOT_REQUIREMENTS.md
│   └── SUBSCRIPTION_IMAGE_GUIDE.md
│
├── features/
│   ├── VOICE_CONTEXT_FEATURE.md
│   ├── VOICE_CONTEXT_SAVE_BUTTON_FEATURE.md
│   ├── core_subscription_review_notes.md
│   └── free_vs_paid_features.md
│
├── screenshots/
│   ├── iphone/
│   │   └── appstore-2025-11-22-1709/
│   └── ipad/
│       └── appstore-ipad-2025-12-04-0129/
│
├── app-store-screenshots/
│
└── images/
    ├── subscription-screenshot-iphone-17-pro-max.png
    └── subscription-screenshot-iphone-17-pro.png
```

---

## Commands to Execute

```bash
cd /Users/isaiahdupree/Documents/Software/EverReachOrganized

# 1. Marketing folder already created and populated

# 2. Remove marketing from web-frontend and ios-app
rm -rf web-frontend/marketing/
rm -rf ios-app/marketing/

# 3. Clean old screenshot sets (optional - saves 15 MB)
rm -rf marketing/screenshots/appstore-2025-11-22-1453/
rm -rf marketing/screenshots/appstore-2025-11-22-1504/
rm -rf marketing/screenshots/appstore-2025-11-22-1611/

# 4. Verify
du -sh marketing/
```
