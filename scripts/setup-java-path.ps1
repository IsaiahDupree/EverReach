#!/usr/bin/env pwsh
# Setup Java PATH for Android development

Write-Host "[SETUP] Searching for JDK installation..." -ForegroundColor Cyan

# Common JDK installation locations
$jdkPaths = @(
    "C:\Program Files\Eclipse Adoptium",
    "C:\Program Files\Java",
    "C:\Program Files\OpenJDK",
    "C:\Program Files\AdoptOpenJDK"
)

$javaHome = $null
$javaBin = $null

foreach ($basePath in $jdkPaths) {
    if (Test-Path $basePath) {
        Write-Host "   Checking: $basePath" -ForegroundColor Yellow
        
        # Find java.exe recursively
        $javaExe = Get-ChildItem -Path $basePath -Recurse -Filter "java.exe" -ErrorAction SilentlyContinue | 
                   Where-Object { $_.FullName -match "bin\\java.exe" } | 
                   Select-Object -First 1
        
        if ($javaExe) {
            $javaBin = Split-Path $javaExe.FullName -Parent
            $javaHome = Split-Path $javaBin -Parent
            Write-Host "   [OK] Found Java: $javaHome" -ForegroundColor Green
            break
        }
    }
}

if (-not $javaHome) {
    Write-Host "[ERROR] Could not find JDK installation" -ForegroundColor Red
    Write-Host "   Please verify Temurin17 is installed: choco list --local-only | Select-String temurin" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "[INFO] Java Details:" -ForegroundColor Cyan
Write-Host "   JAVA_HOME: $javaHome"
Write-Host "   Java Bin:  $javaBin"

# Test java version
$javaVersion = & "$javaBin\java.exe" -version 2>&1 | Select-Object -First 1
Write-Host "   Version:   $javaVersion" -ForegroundColor Green

Write-Host ""
Write-Host "[SETUP] Adding to PATH..." -ForegroundColor Cyan

# Get current user PATH
$currentPath = [Environment]::GetEnvironmentVariable('Path', 'User')

# Check if already in PATH
if ($currentPath -like "*$javaBin*") {
    Write-Host "   [OK] Java bin is already in User PATH" -ForegroundColor Green
} else {
    # Add to user PATH
    $newPath = $javaBin + ';' + $currentPath
    [Environment]::SetEnvironmentVariable('Path', $newPath, 'User')
    Write-Host "   [OK] Added $javaBin to User PATH" -ForegroundColor Green
}

# Set JAVA_HOME
$currentJavaHome = [Environment]::GetEnvironmentVariable('JAVA_HOME', 'User')
if ($currentJavaHome -ne $javaHome) {
    [Environment]::SetEnvironmentVariable('JAVA_HOME', $javaHome, 'User')
    Write-Host "   [OK] Set JAVA_HOME=$javaHome" -ForegroundColor Green
} else {
    Write-Host "   [OK] JAVA_HOME already set correctly" -ForegroundColor Green
}

Write-Host ""
Write-Host "[SUCCESS] Java PATH setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "[IMPORTANT] Close and reopen PowerShell for changes to take effect" -ForegroundColor Yellow
Write-Host "   Then verify with: java -version" -ForegroundColor Cyan
Write-Host ""
Write-Host "[TIP] To use in THIS session, run these commands:" -ForegroundColor Cyan
$sessionCmd1 = '$env:Path = "' + $javaBin + ';$env:Path"'
$sessionCmd2 = '$env:JAVA_HOME = "' + $javaHome + '"'
Write-Host "   $sessionCmd1" -ForegroundColor White
Write-Host "   $sessionCmd2" -ForegroundColor White
Write-Host "   java -version" -ForegroundColor White
