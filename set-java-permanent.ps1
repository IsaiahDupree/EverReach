#!/usr/bin/env pwsh
# Set JAVA_HOME permanently for Android builds

$javaHome = 'C:\Program Files\Eclipse Adoptium\jdk-17.0.16.8-hotspot'
$javaBin = "$javaHome\bin"

Write-Host "[INFO] Setting JAVA_HOME permanently..." -ForegroundColor Cyan
Write-Host "   JAVA_HOME: $javaHome"
Write-Host "   Java Bin:  $javaBin"

# Set JAVA_HOME
[Environment]::SetEnvironmentVariable('JAVA_HOME', $javaHome, 'User')
Write-Host "[OK] JAVA_HOME set" -ForegroundColor Green

# Add to PATH
$currentPath = [Environment]::GetEnvironmentVariable('Path', 'User')
if ($currentPath -notlike "*$javaBin*") {
    $newPath = $javaBin + ';' + $currentPath
    [Environment]::SetEnvironmentVariable('Path', $newPath, 'User')
    Write-Host "[OK] Added to PATH" -ForegroundColor Green
} else {
    Write-Host "[OK] Already in PATH" -ForegroundColor Green
}

# Set for current session too
$env:JAVA_HOME = $javaHome
$env:Path = "$javaBin;$env:Path"

Write-Host ""
Write-Host "[SUCCESS] Java environment configured!" -ForegroundColor Green
Write-Host ""
Write-Host "Verifying..."
& java -version

Write-Host ""
Write-Host "Ready to build Android! Run:" -ForegroundColor Cyan
Write-Host "   npx expo run:android" -ForegroundColor White
