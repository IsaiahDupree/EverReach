# Test Suite Overview

This repository includes three layers of tests:

- **Frontend (Web)**: Playwright E2E/page tests that run against the Expo web dev server.
- **Mobile (Expo)**: Maestro device-level flows (Android/iOS) that validate UX on real/simulated devices.
- **Backend API (Integration)**: Jest tests that call the deployed backend (`https://ever-reach-be.vercel.app`).

All tests avoid fake data or stubbing in dev/prod paths. Integration tests are read-only and safe.

## Structure

- `test/frontend/` – Playwright config and specs
- `test/mobile/` – Maestro flows and instructions
- `test/backend/` – API integration tests (Jest)

See each sub-README for usage.
