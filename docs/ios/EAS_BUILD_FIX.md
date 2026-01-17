# EAS Build Fix Guide

## Problem
Build failed with error: "Unknown error. See logs of the Install dependencies build phase"

## Root Cause
EAS builds don't automatically use `.env` files. Environment variables must be set in EAS secrets/environment variables.

## Fixes Applied

### 1. Created `.easignore`
- Reduces build archive size from 282MB
- Excludes unnecessary files (node_modules, Pods, docs, etc.)

### 2. Created Setup Script
- `scripts/set-eas-env.sh` - Script to set EAS environment variables

## Required Actions

### Set Environment Variables in EAS

**Option 1: Web Interface (Recommended)**
1. Visit: https://expo.dev/accounts/isaiahdupree/projects/ai-enhanced-personal-crm/settings/environment-variables
2. Select "production" environment
3. Add these variables:

```
EXPO_PUBLIC_SUPABASE_URL=https://utasetfxiqcrnwyfforx.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
EXPO_PUBLIC_API_BASE_URL=https://ever-reach-be.vercel.app
EXPO_PUBLIC_API_URL=https://ever-reach-be.vercel.app
EXPO_PUBLIC_BACKEND_URL=https://ever-reach-be.vercel.app
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_vFMuKNRSMlJOSINeBHtjivpcZNs
EXPO_PUBLIC_SUPERWALL_IOS_KEY=pk_ACiUJ9wcjUecu-9D2eK3I
```

**Option 2: CLI Script**
```bash
./scripts/set-eas-env.sh
```

## Retry Build

After setting environment variables:
```bash
eas build --platform ios --profile production
```

## Verification

Check environment variables are set:
```bash
eas env:list --environment production
```
