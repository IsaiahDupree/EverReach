# Run Recommended Migrations in Correct Order
# This script runs Phase 2 and Phase 3 migrations

$ErrorActionPreference = "Stop"
$env:PGPASSWORD = "everreach123!@#"
$dbHost = "db.utasetfxiqcrnwyfforx.supabase.co"
$dbPort = "5432"
$dbUser = "postgres"
$dbName = "postgres"

Write-Host "🚀 Running Recommended Supabase Migrations" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Function to run a migration
function Run-Migration {
    param(
        [string]$FilePath,
        [string]$Description,
        [string]$Phase
    )
    
    Write-Host "📋 $Phase - $Description" -ForegroundColor Yellow
    Write-Host "   File: $FilePath" -ForegroundColor Gray
    
    if (-not (Test-Path $FilePath)) {
        Write-Host "   ❌ File not found!" -ForegroundColor Red
        return $false
    }
    
    try {
        $output = psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -f $FilePath 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✅ Success!" -ForegroundColor Green
            Write-Host ""
            return $true
        } else {
            Write-Host "   ❌ Failed!" -ForegroundColor Red
            Write-Host "   Error: $output" -ForegroundColor Red
            Write-Host ""
            return $false
        }
    } catch {
        Write-Host "   ❌ Error: $_" -ForegroundColor Red
        Write-Host ""
        return $false
    }
}

# Track results
$results = @()

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "PHASE 2: Production Hardening" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Phase 2: Production Hardening
$results += @{
    Name = "Public API Improvements"
    Success = Run-Migration -FilePath "migrations/public-api-improvements.sql" `
                           -Description "Best practices (soft deletes, audit trail, constraints)" `
                           -Phase "Phase 2.1"
}

$results += @{
    Name = "E2E Test Policies"
    Success = Run-Migration -FilePath "migrations/enable-e2e-test-data.sql" `
                           -Description "Enable E2E testing support" `
                           -Phase "Phase 2.2"
}

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "PHASE 3: Core Features" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Phase 3: Core Features
$results += @{
    Name = "Agent System"
    Success = Run-Migration -FilePath "db/agent-schema.sql" `
                           -Description "AI agent conversations and analysis" `
                           -Phase "Phase 3.1"
}

$results += @{
    Name = "Custom Fields"
    Success = Run-Migration -FilePath "migrations/custom-fields-system.sql" `
                           -Description "Dynamic custom fields system" `
                           -Phase "Phase 3.2"
}

$results += @{
    Name = "Warmth Alerts"
    Success = Run-Migration -FilePath "migrations/warmth-alerts.sql" `
                           -Description "Proactive relationship alerts" `
                           -Phase "Phase 3.3"
}

$results += @{
    Name = "Analytics Schema"
    Success = Run-Migration -FilePath "migrations/analytics-schema.sql" `
                           -Description "Product analytics and metrics" `
                           -Phase "Phase 3.4"
}

# Summary
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "📊 Migration Summary" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$successCount = ($results | Where-Object { $_.Success }).Count
$totalCount = $results.Count

foreach ($result in $results) {
    $status = if ($result.Success) { "✅" } else { "❌" }
    $color = if ($result.Success) { "Green" } else { "Red" }
    Write-Host "$status $($result.Name)" -ForegroundColor $color
}

Write-Host ""
Write-Host "Total: $successCount / $totalCount migrations successful" -ForegroundColor $(if ($successCount -eq $totalCount) { "Green" } else { "Yellow" })
Write-Host ""

# Verify installation
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "🔍 Verifying Installation" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

node test-supabase-connection.js

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "🎉 Migration Process Complete!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

if ($successCount -eq $totalCount) {
    Write-Host "✅ All migrations installed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Update .env: TEST_SKIP_E2E=false" -ForegroundColor Cyan
    Write-Host "2. Run E2E tests: npm run test:e2e:public-api" -ForegroundColor Cyan
    Write-Host "3. Test AI endpoints: /api/v1/agent/chat" -ForegroundColor Cyan
    Write-Host "4. Test custom fields: /api/v1/custom-fields" -ForegroundColor Cyan
} else {
    Write-Host "⚠️  Some migrations failed. Check errors above." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "You can:" -ForegroundColor Yellow
    Write-Host "1. Fix errors and re-run this script" -ForegroundColor Cyan
    Write-Host "2. Run individual migrations manually" -ForegroundColor Cyan
    Write-Host "3. Use Supabase SQL Editor for debugging" -ForegroundColor Cyan
}

Write-Host ""
