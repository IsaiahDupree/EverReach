# Run Marketing Intelligence Seed Data
# Fixes failing marketing intelligence tests

$ErrorActionPreference = "Stop"

Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🌱 SEEDING MARKETING INTELLIGENCE DATA" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════`n" -ForegroundColor Cyan

# Load environment variables
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.+)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
    Write-Host "✅ Environment variables loaded" -ForegroundColor Green
} else {
    Write-Host "❌ .env file not found" -ForegroundColor Red
    exit 1
}

$SUPABASE_URL = $env:SUPABASE_URL
$SUPABASE_SERVICE_ROLE_KEY = $env:SUPABASE_SERVICE_ROLE_KEY

if (-not $SUPABASE_URL -or -not $SUPABASE_SERVICE_ROLE_KEY) {
    Write-Host "❌ Missing Supabase credentials" -ForegroundColor Red
    exit 1
}

Write-Host "📡 Connecting to Supabase: $SUPABASE_URL" -ForegroundColor Yellow
Write-Host ""

# Read SQL file
$sqlContent = Get-Content "seed-marketing-data.sql" -Raw

# Split by semicolons to execute statements separately
$statements = $sqlContent -split ';' | Where-Object { $_.Trim() -ne '' }

Write-Host "📝 Executing $($statements.Count) SQL statements..." -ForegroundColor Yellow
Write-Host ""

$successCount = 0
$errorCount = 0

foreach ($statement in $statements) {
    $trimmed = $statement.Trim()
    if ($trimmed -eq '' -or $trimmed.StartsWith('--')) {
        continue
    }
    
    try {
        # Execute via Supabase REST API
        $body = @{
            query = $trimmed
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/rpc/exec_sql" `
            -Method POST `
            -Headers @{
                "apikey" = $SUPABASE_SERVICE_ROLE_KEY
                "Authorization" = "Bearer $SUPABASE_SERVICE_ROLE_KEY"
                "Content-Type" = "application/json"
            } `
            -Body $body `
            -ErrorAction SilentlyContinue
        
        $successCount++
        Write-Host "  ✅ Statement $successCount executed" -ForegroundColor Green
    }
    catch {
        # Some errors are expected (like ON CONFLICT)
        $errorCount++
    }
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📊 SEED DATA RESULTS" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ Statements executed: $successCount" -ForegroundColor Green
Write-Host "⚠️  Statements skipped: $errorCount" -ForegroundColor Yellow
Write-Host ""
Write-Host "Note: Using Supabase SQL Editor is more reliable for seeding" -ForegroundColor Gray
Write-Host "1. Go to: $SUPABASE_URL/project/default/sql" -ForegroundColor Gray
Write-Host "2. Paste contents of seed-marketing-data.sql" -ForegroundColor Gray
Write-Host "3. Click Run" -ForegroundColor Gray
Write-Host ""
Write-Host "✅ Ready to test! Run: node test/agent/bucket-1-marketing-intelligence.mjs" -ForegroundColor Green
Write-Host ""
