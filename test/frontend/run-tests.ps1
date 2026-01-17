#!/usr/bin/env pwsh
# Run Playwright tests with authentication

$env:TEST_EMAIL = "isaiahdupree33@gmail.com"
$env:TEST_PASSWORD = "frogger12"

Write-Host "[Test Runner] Email: $env:TEST_EMAIL" -ForegroundColor Cyan
Write-Host "[Test Runner] Password: ***" -ForegroundColor Cyan
Write-Host "[Test Runner] Starting Playwright tests..." -ForegroundColor Green

npx playwright test -c test/frontend/playwright.config.ts
