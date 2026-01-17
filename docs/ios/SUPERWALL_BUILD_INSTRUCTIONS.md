# Expo Superwall Build Instructions

Comprehensive build documentation for the Expo Superwall SDK and example applications.

## Table of Contents
- [Project Overview](#project-overview)
- [System Requirements](#system-requirements)
- [Development Environment Setup](#development-environment-setup)
- [Installing Dependencies](#installing-dependencies)
- [Building the Native Module](#building-the-native-module)
- [Running the Example App](#running-the-example-app)
- [Building for iOS](#building-for-ios)
- [Building for Android](#building-for-android)
- [EAS Build](#eas-build)
- [Troubleshooting](#troubleshooting)

---

## Project Overview

**Expo Superwall** is an official Expo integration for Superwall, providing in-app paywall functionality for React Native applications built with Expo.

### Project Structure
- **Native Module**: TypeScript/Swift/Kotlin bridge connecting React Native with native Superwall SDKs
- **Example App**: Demonstration app showcasing SDK features
- **Hooks-based SDK**: Modern React hooks interface (recommended)
- **Compat SDK**: Legacy compatibility layer

### Critical Requirements
- **Expo SDK 53+** is **mandatory**
- For older versions, use [legacy React Native Superwall SDK](https://github.com/superwall/react-native-superwall)

### Native Dependencies
- **iOS**: SuperwallKit 4.10.1 (CocoaPods)
- **Android**: Superwall Android SDK 2.6.3, Google Play Billing 8.0.0, Kotlinx Serialization 1.7.2

---

## System Requirements

### macOS (Required for iOS Development)
- **OS**: macOS 12.0 (Monterey) or later
- **Xcode**: 15.0+ with Command Line Tools
- **Processor**: Apple Silicon (M1/M2/M3) or Intel

### For All Platforms

#### Node.js and Package Managers
- **Node.js**: 18.x or later (LTS recommended)
- **npm**: 9.x or later
- **Yarn**: 4.7.0 (project uses Yarn Berry)

#### Expo Tooling
- **Expo CLI**: Latest version
- **EAS CLI**: 16.6.2 or later

#### iOS Development (macOS Only)
- **Xcode**: 15.0+
- **CocoaPods**: 1.12.0+
- **iOS Deployment Target**: 15.1+
- **Swift**: 5.4+

#### Android Development
- **JDK**: 17 (recommended) or 11
- **Android Studio**: Latest stable (Hedgehog 2023.1.1+)
- **Android SDK**:
  - Min SDK: 21
  - Compile SDK: 34
  - Target SDK: 34
- **Android Build Tools**: 34.x.x
- **Gradle**: 8.0+ (auto-managed)

#### Additional Tools
- **Git**: Latest version
- **Watchman**: Recommended for file watching
  ```bash
  brew install watchman
  ```

---

## Development Environment Setup

### 1. Install Node.js

**Using nvm (Recommended):**
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install --lts
nvm use --lts
```

**Using Homebrew:**
```bash
brew install node
```

**Verify:**
```bash
node --version  # v18.x or later
npm --version   # v9.x or later
```

### 2. Install Yarn 4.7.0

```bash
# Enable Corepack (comes with Node 16.10+)
corepack enable

# Yarn will auto-install when running yarn commands
# The project specifies yarn@4.7.0 in package.json
```

### 3. Install Expo CLI

```bash
npm install -g expo-cli
expo --version
```

### 4. Install EAS CLI

```bash
npm install -g eas-cli
eas login
eas --version  # Should be 16.6.2+
```

### 5. iOS Development Setup (macOS Only)

#### Install Xcode
1. Download from Mac App Store
2. Accept license agreement
3. Install Command Line Tools:
   ```bash
   xcode-select --install
   sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
   ```

#### Install CocoaPods
```bash
brew install cocoapods
pod --version  # 1.12.0+
```

### 6. Android Development Setup

#### Install JDK
```bash
# macOS with Homebrew
brew install openjdk@17
echo 'export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
java -version
```

#### Install Android Studio
1. Download from [developer.android.com](https://developer.android.com/studio)
2. Complete Setup Wizard
3. Install:
   - Android SDK Platform 34
   - Android SDK Build-Tools 34.x.x
   - Android SDK Command-line Tools
   - Android Emulator
   - Android SDK Platform-Tools

#### Set Environment Variables

Add to `~/.zshrc` or `~/.bashrc`:

```bash
# Android SDK
export ANDROID_HOME=$HOME/Library/Android/sdk  # macOS
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin
export PATH=$PATH:$ANDROID_HOME/build-tools/34.0.0

# Java
export JAVA_HOME=/opt/homebrew/opt/openjdk@17
```

Apply changes:
```bash
source ~/.zshrc
```

Verify:
```bash
echo $ANDROID_HOME
adb --version
```

---

## Installing Dependencies

### 1. Clone Repository

```bash
git clone https://github.com/superwall/expo-superwall.git
cd expo-superwall
```

### 2. Install Root Dependencies

```bash
yarn install
```

**Installs:**
- `expo-module-scripts` (5.0.7): Build tooling
- `@biomejs/biome` (2.2.4): Formatter/linter
- `@changesets/cli` (2.29.7): Version management
- `zustand` (5.0.8): State management

### 3. Install Example App Dependencies

```bash
cd example
yarn install
```

**Key dependencies:**
- expo 53.0.12
- react 19.0.0
- react-native 0.79.4
- expo-router 5.1.0
- react-native-purchases 9.6.3

### 4. Install iOS Dependencies (macOS)

```bash
cd ios  # Generate first with: npx expo prebuild --platform ios
pod install
cd ..
```

If issues occur:
```bash
pod repo update
pod install --repo-update
```

### 5. Verify Installation

```bash
npx expo-doctor
```

---

## Building the Native Module

Build the TypeScript package that gets published to npm.

### Build Commands

```bash
# From root directory
yarn build          # Compile TypeScript
yarn clean          # Remove build artifacts
yarn lint           # Run linting
yarn format         # Run Biome formatter
yarn test           # Run tests
yarn prepare        # Prepare for publishing
```

### Build Output

```
build/
├── src/
│   ├── index.js
│   ├── index.d.ts
│   ├── SuperwallExpoModule.types.d.ts
│   └── ...
└── package.json
```

---

## Running the Example App

### Prerequisites

1. **Configure API Keys**

Edit `example/app/index.tsx`:

```tsx
<SuperwallProvider apiKeys={{ 
  ios: "YOUR_SUPERWALL_API_KEY",
  android: "YOUR_ANDROID_API_KEY"  // Optional
}}>
```

Get keys from [Superwall dashboard](https://superwall.com/dashboard).

### Start Development Server

```bash
cd example
npx expo start
```

**Options:**
- Press `i` - iOS simulator
- Press `a` - Android emulator
- Press `w` - Web browser
- Press `r` - Reload
- Press `m` - Toggle menu

### Run on iOS Simulator

```bash
cd example
npx expo run:ios

# Specific simulator
npx expo run:ios --simulator="iPhone 15 Pro"

# Debug configuration
npx expo run:ios --configuration Debug
```

**First run:**
- Generates `ios/` directory
- Runs `pod install`
- Builds native app
- Launches simulator

### Run on Android

#### Start Emulator
```bash
emulator -list-avds
emulator -avd Pixel_5_API_34 &
```

#### Build and Run
```bash
cd example
npx expo run:android

# On specific device
npx expo run:android --device

# Debug variant
npx expo run:android --variant debug
```

**First run:**
- Generates `android/` directory
- Downloads Gradle dependencies
- Builds APK
- Installs and launches

---

## Building for iOS

### Generate iOS Project

```bash
cd example
npx expo prebuild --platform ios
```

Creates `ios/` with Xcode project and Podfile.

### Install CocoaPods

```bash
cd ios
pod install
cd ..
```

**Installs:**
- ExpoModulesCore
- SuperwallKit 4.10.1
- All Expo modules

### Open in Xcode

```bash
xed ios/superwallexample.xcworkspace
# Or: yarn open:ios
```

### Configure Signing

1. Select project in Xcode navigator
2. Select target
3. Go to **Signing & Capabilities**
4. Select your Team
5. Xcode manages signing automatically

### Build and Run

**In Xcode:** Select device/simulator, press Cmd+R

**Command line:**
```bash
# Debug build
npx expo run:ios --configuration Debug

# Release build
npx expo run:ios --configuration Release

# Specific device
npx expo run:ios --device
```

### iOS Build Settings
- Deployment Target: iOS 15.1+
- Swift: 5.4
- Architecture: arm64, x86_64

### Troubleshooting iOS

**CocoaPods issues:**
```bash
pod cache clean --all
pod deintegrate
pod install
```

**Xcode build issues:**
```bash
cd ios
xcodebuild clean
rm -rf ~/Library/Developer/Xcode/DerivedData/*
npx expo run:ios
```

---

## Building for Android

### Generate Android Project

```bash
cd example
npx expo prebuild --platform android
```

Creates `android/` with Gradle files and manifests.

### Sync Gradle

```bash
cd android
./gradlew clean
./gradlew build
cd ..
```

**Downloads:**
- Superwall Android SDK 2.6.3
- Billing Client 8.0.0
- Kotlinx Serialization 1.7.2
- All dependencies

### Open in Android Studio

```bash
open -a "Android Studio" android/
# Or: yarn open:android
```

### Build and Run

**In Android Studio:** Select device, press Run

**Command line:**
```bash
# Debug build
npx expo run:android

# Release build
npx expo run:android --variant release

# Specific device
npx expo run:android --device
```

### Android Build Configuration

From `android/build.gradle`:
```groovy
compileSdkVersion 34
minSdkVersion 21
targetSdkVersion 34

dependencies {
  implementation "com.superwall.sdk:superwall-android:2.6.3"
  implementation 'com.android.billingclient:billing:8.0.0'
  implementation 'org.jetbrains.kotlinx:kotlinx-serialization-json:1.7.2'
}
```

### Generate APK/AAB

```bash
cd android

# Debug APK
./gradlew assembleDebug
# Output: app/build/outputs/apk/debug/app-debug.apk

# Release APK (requires signing)
./gradlew assembleRelease
# Output: app/build/outputs/apk/release/app-release.apk

# Release Bundle (for Play Store)
./gradlew bundleRelease
# Output: app/build/outputs/bundle/release/app-release.aab
```

### Signing Android Releases

#### Generate Key
```bash
keytool -genkeypair -v -storetype PKCS12 \
  -keystore my-release-key.keystore \
  -alias my-key-alias \
  -keyalg RSA -keysize 2048 -validity 10000
```

#### Configure Gradle

Edit `android/app/build.gradle`:
```groovy
android {
  signingConfigs {
    release {
      storeFile file('my-release-key.keystore')
      storePassword 'YOUR_PASSWORD'
      keyAlias 'my-key-alias'
      keyPassword 'YOUR_KEY_PASSWORD'
    }
  }
  buildTypes {
    release {
      signingConfig signingConfigs.release
    }
  }
}
```

**Never commit keys/passwords to git!**

### Troubleshooting Android

**Gradle issues:**
```bash
cd android
./gradlew clean
rm -rf .gradle/ build/
./gradlew --refresh-dependencies
```

**Clear caches:**
```bash
rm -rf ~/.gradle/caches/
npx expo start --clear
```

---

## EAS Build

EAS (Expo Application Services) provides cloud-based builds without local Xcode/Android Studio.

### Prerequisites
- EAS CLI 16.6.2+
- Expo account
- EAS configuration exists in `example/eas.json`

### Build Profiles

From `example/eas.json`:

#### Development
- Development client builds
- iOS: Simulator only
- Android: APK
- Distribution: Internal

#### Preview  
- Internal testing builds
- iOS: Simulator + TestFlight
- Android: APK
- Distribution: Internal

#### Production
- App Store/Play Store builds
- Auto-incremented versions
- Full optimization

### Setup EAS

```bash
cd example
eas login
eas build:configure
```

### Build Commands

**Development:**
```bash
eas build --profile development --platform ios
eas build --profile development --platform android
eas build --profile development --platform all
```

**Preview:**
```bash
eas build --profile preview --platform ios
eas build --profile preview --platform android
```

**Production:**
```bash
eas build --profile production --platform ios
eas build --profile production --platform android
```

### Monitor Builds

```bash
# List builds
eas build:list

# View specific build
eas build:view [BUILD_ID]

# Download build
eas build:download [BUILD_ID]
```

### Submit to App Stores

**iOS (App Store):**
```bash
eas submit --platform ios
```

**Android (Play Store):**
```bash
eas submit --platform android
```

---

## Troubleshooting

### Common Issues

#### Expo Version Check Fails
The project requires Expo SDK 53+. Script at `scripts/check-expo-version.js` validates this.

**Solution:**
```bash
npx expo install expo@latest
```

#### Module Not Found
**iOS:**
```bash
cd example
npx expo prebuild --clean --platform ios
cd ios && pod install
```

**Android:**
```bash
cd example
npx expo prebuild --clean --platform android
cd android && ./gradlew clean
```

#### Metro Bundler Cache Issues
```bash
npx expo start --clear
rm -rf node_modules/.cache
```

#### Yarn Workspace Issues
```bash
yarn cache clean
rm -rf node_modules
yarn install
```

#### iOS Build Fails
```bash
# Clean derived data
rm -rf ~/Library/Developer/Xcode/DerivedData/*

# Reinstall pods
cd example/ios
rm -rf Pods Podfile.lock
pod install

# Reset simulator
xcrun simctl erase all
```

#### Android Build Fails
```bash
# Clean Gradle
cd example/android
./gradlew clean
rm -rf .gradle build

# Invalidate caches in Android Studio:
# File → Invalidate Caches / Restart
```

#### Native Module Linking Issues
```bash
# Ensure autolinking is configured
# In example/package.json:
"expo": {
  "autolinking": {
    "nativeModulesDir": ".."
  }
}
```

### Getting Help

- 📖 [Expo Documentation](https://docs.expo.dev)
- 📖 [Superwall Documentation](https://superwall.com/docs/home)
- 💬 [Superwall Discord](https://discord.gg/superwall)
- 🐛 [GitHub Issues](https://github.com/superwall/expo-superwall/issues)
- 📧 [Support Email](mailto:jake@superwall.com)

---

## Publishing and Distribution

### Publishing to npm

```bash
# Version bump with changesets
yarn changeset version

# Build and publish
yarn build && changeset publish
```

### Version Management

The project uses `@changesets/cli` for semantic versioning:

```bash
# Add a changeset
npx changeset

# Version packages
npx changeset version

# Publish to npm
npx changeset publish
```

### Files Included in npm Package

From `package.json`:
```json
"files": [
  "build",
  "README.md",
  "LICENSE",
  "CHANGELOG.md",
  "ios",
  "android",
  "expo-module.config.json",
  "scripts"
]
```

---

## Additional Resources

### Project Documentation
- `README.md` - SDK usage and API reference
- `CLAUDE.md` - Development guidance
- `COMPAT_SDK_GETTING_STARTED.md` - Legacy SDK migration guide
- `CHANGELOG.md` - Version history

### Key Configuration Files
- `package.json` - Package metadata and scripts
- `expo-module.config.json` - Native module configuration
- `tsconfig.json` - TypeScript configuration
- `biome.json` - Linter/formatter configuration
- `.yarnrc.yml` - Yarn Berry configuration
- `example/app.json` - Expo app configuration
- `example/eas.json` - EAS Build profiles
- `ios/SuperwallExpo.podspec` - iOS CocoaPods spec
- `android/build.gradle` - Android build configuration

### Native Module Architecture
- **iOS Bridge**: `ios/SuperwallExpoModule.swift`
- **Android Bridge**: `android/src/main/java/expo/modules/superwallexpo/SuperwallExpoModule.kt`
- **Type Definitions**: `src/SuperwallExpoModule.types.ts`
- **Hooks SDK**: `src/` directory
- **Compat SDK**: `src/compat/` directory

---

**Last Updated:** November 2024  
**Project Version:** 0.6.7  
**Expo SDK:** 53.0.12  
**React Native:** 0.79.4
