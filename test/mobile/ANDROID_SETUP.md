# Android Development Setup for Windows

To build and run the Expo app on Android, you need JDK and Android Studio.

## 1. Install JDK 17+

### Option A: Eclipse Temurin (Recommended)
1. Download from https://adoptium.net/
2. Select:
   - **Version**: 17 (LTS)
   - **Operating System**: Windows
   - **Architecture**: x64
3. Run installer
4. **Important**: Check "Set JAVA_HOME variable" and "Add to PATH" during installation

### Option B: Manual Setup
If you already have JDK installed but JAVA_HOME not set:

1. Find your JDK install location, e.g.:
   - `C:\Program Files\Eclipse Adoptium\jdk-17.0.x`
   - `C:\Program Files\Java\jdk-17`

2. Set JAVA_HOME environment variable:
   - Open **Start** → Search "environment variables"
   - Click "Edit the system environment variables"
   - Click "Environment Variables"
   - Under "System variables" click "New"
   - Variable name: `JAVA_HOME`
   - Variable value: Your JDK path (e.g., `C:\Program Files\Eclipse Adoptium\jdk-17.0.9`)
   - Click OK

3. Add to PATH:
   - In "System variables" find "Path"
   - Click "Edit"
   - Click "New"
   - Add: `%JAVA_HOME%\bin`
   - Click OK on all dialogs

4. **Restart your terminal** (or PowerShell/CMD)

5. Verify installation:
```bash
java -version
# Should show: openjdk version "17.x.x" or similar
```

## 2. Install Android Studio

1. Download from https://developer.android.com/studio
2. Run installer
3. During setup, ensure these are installed:
   - Android SDK
   - Android SDK Platform
   - Android Virtual Device (AVD)
   - Performance (Intel HAXM or Hyper-V)

## 3. Set ANDROID_HOME (if not auto-set)

1. Find Android SDK location (typically `C:\Users\YourName\AppData\Local\Android\Sdk`)
2. Add environment variable:
   - Variable name: `ANDROID_HOME`
   - Variable value: SDK path
3. Add to PATH:
   - `%ANDROID_HOME%\platform-tools`
   - `%ANDROID_HOME%\emulator`
   - `%ANDROID_HOME%\tools`
   - `%ANDROID_HOME%\tools\bin`

## 4. Create or Start Emulator

### Option A: Use Android Studio AVD Manager
1. Open Android Studio
2. Tools → Device Manager
3. Create Virtual Device (if none exist)
4. Pick a device (e.g., Pixel 5)
5. Download system image (e.g., API 34 - Android 14)
6. Finish and launch emulator

### Option B: Command Line
```bash
# List available emulators
emulator -list-avds

# Start emulator
emulator -avd Pixel_5_API_34
```

## 5. Build and Run Expo App

With emulator running or device connected via USB:

```bash
npx expo run:android
```

This will:
- Build the debug APK
- Install on emulator/device
- Launch the app

## 6. Run Maestro Flows

After app is installed:

```bash
# Smoke test
maestro test test/mobile/flows/smoke.yaml -e APP_ID=com.everreach.crm

# Health check
maestro test test/mobile/flows/health.yaml -e APP_ID=com.everreach.crm
```

## Troubleshooting

### "JAVA_HOME is not set"
- Verify `JAVA_HOME` is set: `echo %JAVA_HOME%`
- Restart terminal after setting environment variables
- Ensure path has no trailing slash

### "Unable to locate adb"
- Verify `ANDROID_HOME` is set: `echo %ANDROID_HOME%`
- Check `adb` works: `adb devices`
- Add platform-tools to PATH

### "SDK location not found"
- Open Android Studio
- File → Settings → Appearance & Behavior → System Settings → Android SDK
- Note the path and set as `ANDROID_HOME`

### Emulator won't start
- Enable virtualization in BIOS (Intel VT-x / AMD-V)
- For Windows 11: Hyper-V or Windows Hypervisor Platform
- Check Task Manager → Performance → CPU → Virtualization: Enabled

### Build fails with Gradle errors
- Run with more info: `npx expo run:android --no-build-cache`
- Clear Gradle cache: `cd android && ./gradlew clean`
