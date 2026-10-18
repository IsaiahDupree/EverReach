# Mobile App Tests (Maestro)

These flows run against a built Expo app on a device/emulator.

## Prereqs
- Install Maestro: https://maestro.mobile.dev
- Android Studio (Windows) / Xcode (macOS) with emulator/simulator

## Build & install (debug)
- Android: `npx expo run:android`
- iOS (macOS): `npx expo run:ios`

## Run flows
```bash
# Smoke: launch app and assert plan screen visible
maestro test test/mobile/flows/smoke.yaml -e APP_ID=com.everreach.crm

# Health: deep link to /health and assert cards
maestro test test/mobile/flows/health.yaml -e APP_ID=com.everreach.crm
```

## Included flows
- `flows/smoke.yaml` – Launches app, asserts "Choose Your Plan".
- `flows/health.yaml` – Opens `everreach://health`, asserts connectivity cards.

Notes:
- Ensure backend CORS allows device origins (for webviews) and `ALLOW_EXP_DIRECT=true` for Expo tunnels if needed.
