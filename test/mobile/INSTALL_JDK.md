# JDK Installation Guide for Windows

## Quick Install (Recommended)

### Option 1: Using Chocolatey (Fastest)

If you have Chocolatey installed:
```powershell
# Install JDK 17 (LTS)
choco install temurin17 -y

# Restart PowerShell after install
```

### Option 2: Manual Download (5 minutes)

1. **Download JDK 17**
   - Go to: https://adoptium.net/temurin/releases/
   - Select:
     - Version: **17 - LTS**
     - Operating System: **Windows**
     - Architecture: **x64**
     - Package Type: **JDK**
   - Click the `.msi` download button

2. **Run the installer**
   - Double-click the downloaded `.msi` file
   - **IMPORTANT**: Check these boxes during installation:
     - ✅ Set JAVA_HOME variable
     - ✅ JavaSoft (Oracle) registry keys
     - ✅ Add to PATH
   - Click "Next" → "Install"

3. **Verify installation**
   ```powershell
   # Open NEW PowerShell window
   java -version
   # Should show: openjdk version "17.x.x"
   ```

## Manual Setup (If installer didn't set JAVA_HOME)

1. **Find JDK installation path**
   - Usually: `C:\Program Files\Eclipse Adoptium\jdk-17.x.x`
   - Or: `C:\Program Files\Java\jdk-17`

2. **Set JAVA_HOME**
   ```powershell
   # Replace with your actual JDK path
   [System.Environment]::SetEnvironmentVariable('JAVA_HOME', 'C:\Program Files\Eclipse Adoptium\jdk-17.0.13', 'Machine')
   ```

3. **Add to PATH**
   ```powershell
   # Get current PATH
   $path = [System.Environment]::GetEnvironmentVariable('PATH', 'Machine')
   
   # Add JAVA_HOME\bin
   $newPath = "$path;%JAVA_HOME%\bin"
   [System.Environment]::SetEnvironmentVariable('PATH', $newPath, 'Machine')
   ```

4. **Restart PowerShell** (required to load new env vars)

5. **Verify**
   ```powershell
   echo $env:JAVA_HOME
   # Should show: C:\Program Files\Eclipse Adoptium\jdk-17.x.x
   
   java -version
   # Should show: openjdk version "17.x.x"
   ```

## Quick Verification Commands

Run these in PowerShell to check your setup:

```powershell
# Check JAVA_HOME is set
if ($env:JAVA_HOME) {
    Write-Host "✅ JAVA_HOME is set: $env:JAVA_HOME" -ForegroundColor Green
} else {
    Write-Host "❌ JAVA_HOME is NOT set" -ForegroundColor Red
}

# Check java command works
try {
    $javaVersion = java -version 2>&1 | Select-Object -First 1
    Write-Host "✅ Java installed: $javaVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Java command not found" -ForegroundColor Red
}

# Check javac (compiler) works
try {
    javac -version 2>&1 | Out-Null
    Write-Host "✅ Java compiler (javac) found" -ForegroundColor Green
} catch {
    Write-Host "❌ Java compiler (javac) not found" -ForegroundColor Red
}
```

## Troubleshooting

### "java not recognized"
- **Cause**: PATH not updated or PowerShell not restarted
- **Fix**: 
  1. Close ALL PowerShell windows
  2. Open a NEW PowerShell window
  3. Try again

### "JAVA_HOME is not set"
- **Cause**: Environment variable not created
- **Fix**: Run manual setup commands above, then restart PowerShell

### "Wrong JDK version"
- **Cause**: Multiple JDKs installed
- **Fix**: 
  1. Uninstall old JDKs via Control Panel → Programs
  2. Reinstall JDK 17
  3. Verify JAVA_HOME points to correct version

## Next Steps After JDK Install

Once JDK is installed:
```powershell
# 1. Verify JDK
java -version

# 2. Build Android app (5-15 minutes first time)
cd C:\Users\Isaia\Documents\Coding\PersonalCRM
npx expo run:android

# 3. Run Maestro smoke test
maestro test test/mobile/flows/smoke.yaml -e APP_ID=com.everreach.crm
```
