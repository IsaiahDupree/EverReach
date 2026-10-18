#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Run subscription system tests

.DESCRIPTION
    Runs all subscription system tests with proper environment setup

.EXAMPLE
    .\test\backend\run-subscription-tests.ps1
#>

$ErrorActionPreference = "Stop"

# Colors
$Green = "`e[32m"
$Red = "`e[31m"
$Yellow = "`e[33m"
$Blue = "`e[34m"
$Reset = "`e[0m"

Write-Host "${Blue}════════════════════════════════════════════════════${Reset}"
Write-Host "${Blue}  Subscription System Tests${Reset}"
Write-Host "${Blue}════════════════════════════════════════════════════${Reset}`n"

# Check for required environment variables
if (-not $env:ADMIN_TEST_TOKEN) {
    Write-Host "${Yellow}⚠ ADMIN_TEST_TOKEN not set${Reset}"
    Write-Host "Set it with: ${Blue}`$env:ADMIN_TEST_TOKEN=`"your_token`"${Reset}`n"
    exit 1
}

# Check Node.js version
$nodeVersion = node --version
Write-Host "${Blue}Node version: ${nodeVersion}${Reset}`n"

# Run tests
Write-Host "${Blue}Running subscription tests...${Reset}`n"

try {
    node test/backend/subscription-test-all.mjs
    $exitCode = $LASTEXITCODE
    
    if ($exitCode -eq 0) {
        Write-Host "`n${Green}✓ All tests passed!${Reset}`n"
    } else {
        Write-Host "`n${Red}✗ Tests failed with exit code $exitCode${Reset}`n"
        exit $exitCode
    }
} catch {
    Write-Host "${Red}✗ Error running tests: $_${Reset}"
    exit 1
}
