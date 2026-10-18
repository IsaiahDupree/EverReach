#!/usr/bin/env pwsh
# Run backend integration tests with authentication

$env:TEST_EMAIL = "isaiahdupree33@gmail.com"
$env:TEST_PASSWORD = "frogger12"
$env:SUPABASE_URL = "https://utasetfxiqcrnwyfforx.supabase.co"
$env:BACKEND_BASE_URL = "https://ever-reach-be.vercel.app"

# Get SUPABASE_ANON_KEY from environment or .env file
if (-not $env:SUPABASE_ANON_KEY) {
    Write-Host "[Backend Tests] Looking for SUPABASE_ANON_KEY..." -ForegroundColor Yellow
    if (Test-Path ".env") {
        $envContent = Get-Content .env
        $anonKeyLine = $envContent | Select-String -Pattern "EXPO_PUBLIC_SUPABASE_KEY=(.+)" | Select-Object -First 1
        if ($anonKeyLine) {
            $env:SUPABASE_ANON_KEY = $anonKeyLine.Matches.Groups[1].Value
            Write-Host "[Backend Tests] Found SUPABASE_ANON_KEY in .env" -ForegroundColor Green
        } else {
            Write-Host "[Backend Tests] ERROR: SUPABASE_ANON_KEY not found in .env" -ForegroundColor Red
            Write-Host "[Backend Tests] Please set EXPO_PUBLIC_SUPABASE_KEY in .env or SUPABASE_ANON_KEY env var" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "[Backend Tests] ERROR: .env file not found and SUPABASE_ANON_KEY not set" -ForegroundColor Red
        exit 1
    }
}

Write-Host "[Backend Tests] Email: $env:TEST_EMAIL" -ForegroundColor Cyan
Write-Host "[Backend Tests] Backend: $env:BACKEND_BASE_URL" -ForegroundColor Cyan
Write-Host "[Backend Tests] Starting integration tests..." -ForegroundColor Green

npm test -- test/backend/__tests__
