#!/usr/bin/env pwsh
# Verify JDK installation

Write-Host "`n=== JDK Verification ===" -ForegroundColor Cyan

# Check JAVA_HOME
if ($env:JAVA_HOME) {
    Write-Host "✅ JAVA_HOME is set: $env:JAVA_HOME" -ForegroundColor Green
} else {
    Write-Host "❌ JAVA_HOME is NOT set (restart PowerShell if you just installed)" -ForegroundColor Red
    Write-Host "   Expected path: C:\Program Files\Eclipse Adoptium\jdk-17.*" -ForegroundColor Yellow
}

# Check java command
Write-Host "`nChecking java command..." -ForegroundColor Cyan
try {
    $javaOutput = java -version 2>&1
    Write-Host "✅ Java is working:" -ForegroundColor Green
    $javaOutput | ForEach-Object { Write-Host "   $_" -ForegroundColor White }
} catch {
    Write-Host "❌ Java command not found" -ForegroundColor Red
    Write-Host "   Try: Close PowerShell and open a NEW window" -ForegroundColor Yellow
}

# Check javac (compiler)
Write-Host "`nChecking javac (compiler)..." -ForegroundColor Cyan
try {
    $javacOutput = javac -version 2>&1
    Write-Host "✅ Java compiler is working: $javacOutput" -ForegroundColor Green
} catch {
    Write-Host "❌ Java compiler (javac) not found" -ForegroundColor Red
}

Write-Host "`n=== Next Steps ===" -ForegroundColor Cyan
if (-not $env:JAVA_HOME -or -not (Get-Command java -ErrorAction SilentlyContinue)) {
    Write-Host "1. Close this PowerShell window" -ForegroundColor Yellow
    Write-Host "2. Open a NEW PowerShell window" -ForegroundColor Yellow
    Write-Host "3. Run this script again: .\test\mobile\verify-jdk.ps1" -ForegroundColor Yellow
} else {
    Write-Host "✅ JDK is ready!" -ForegroundColor Green
    Write-Host "`nNext: Build Android app" -ForegroundColor Cyan
    Write-Host "   npx expo run:android" -ForegroundColor White
}

Write-Host ""
