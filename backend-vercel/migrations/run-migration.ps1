# Marketing Intelligence Schema Migration Runner
# Applies the marketing intelligence database schema to Supabase

[CmdletBinding()]
param(
    [switch]$DryRun
)

Write-Host ""
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "    MARKETING INTELLIGENCE SCHEMA MIGRATION" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""

# Load environment variables
$rootDir = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$envFile = Join-Path $rootDir ".env"

if (Test-Path $envFile) {
    Write-Host "[1/4] Loading environment variables..." -ForegroundColor Yellow
    Get-Content $envFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith('#')) {
            if ($line -match '^([^=]+)=(.*)$') {
                $key = $matches[1].Trim()
                $value = $matches[2].Trim()
                if ($value -match '^"(.*)"$') { $value = $matches[1] }
                if ($value -match "^'(.*)'$") { $value = $matches[1] }
                [Environment]::SetEnvironmentVariable($key, $value, 'Process')
            }
        }
    }
    Write-Host "  [OK] Environment loaded" -ForegroundColor Green
} else {
    Write-Host "  [ERROR] .env file not found" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Extract database connection details from Supabase URL
$supabaseUrl = $env:SUPABASE_URL
if (-not $supabaseUrl) {
    Write-Host "[ERROR] SUPABASE_URL not found in environment" -ForegroundColor Red
    exit 1
}

Write-Host "[2/4] Database Connection Details" -ForegroundColor Yellow
Write-Host "  Supabase URL: $supabaseUrl" -ForegroundColor Cyan

# Parse the Supabase URL to get project reference
if ($supabaseUrl -match 'https://([^.]+)\.supabase\.co') {
    $projectRef = $matches[1]
    Write-Host "  Project Ref:  $projectRef" -ForegroundColor Cyan
} else {
    Write-Host "  [ERROR] Could not parse Supabase URL" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Check for migration file
$migrationFile = Join-Path $PSScriptRoot "marketing-intelligence-schema.sql"
if (-not (Test-Path $migrationFile)) {
    Write-Host "[ERROR] Migration file not found: $migrationFile" -ForegroundColor Red
    exit 1
}

Write-Host "[3/4] Migration File Status" -ForegroundColor Yellow
$fileSize = (Get-Item $migrationFile).Length
Write-Host "  File: marketing-intelligence-schema.sql" -ForegroundColor Cyan
Write-Host "  Size: $([math]::Round($fileSize / 1KB, 2)) KB" -ForegroundColor Cyan
Write-Host ""

# Read migration SQL
$migrationSql = Get-Content $migrationFile -Raw

# Count objects being created
$tableCount = ([regex]::Matches($migrationSql, 'CREATE TABLE')).Count
$viewCount = ([regex]::Matches($migrationSql, 'CREATE (?:OR REPLACE )?(?:MATERIALIZED )?VIEW')).Count
$functionCount = ([regex]::Matches($migrationSql, 'CREATE (?:OR REPLACE )?FUNCTION')).Count

Write-Host "  Migration will create:" -ForegroundColor Yellow
Write-Host "    - $tableCount tables" -ForegroundColor White
Write-Host "    - $viewCount views" -ForegroundColor White
Write-Host "    - $functionCount functions" -ForegroundColor White
Write-Host ""

if ($DryRun) {
    Write-Host "[DRY RUN] Would execute migration but -DryRun flag is set" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To run for real, execute without -DryRun flag:" -ForegroundColor Gray
    Write-Host "  .\backend-vercel\migrations\run-migration.ps1" -ForegroundColor White
    Write-Host ""
    exit 0
}

Write-Host "[4/4] Running Migration" -ForegroundColor Yellow
Write-Host ""
Write-Host "  IMPORTANT: This will be run via Supabase SQL Editor" -ForegroundColor Yellow
Write-Host "  Opening Supabase Dashboard..." -ForegroundColor Cyan
Write-Host ""

# Construct Supabase SQL Editor URL
$sqlEditorUrl = "https://supabase.com/dashboard/project/$projectRef/sql/new"

Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "    MANUAL MIGRATION STEPS" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Your browser will open to the Supabase SQL Editor" -ForegroundColor Yellow
Write-Host "2. Copy the entire contents of:" -ForegroundColor Yellow
Write-Host "   $migrationFile" -ForegroundColor White
Write-Host "3. Paste into the SQL Editor" -ForegroundColor Yellow
Write-Host "4. Click 'RUN' to execute the migration" -ForegroundColor Yellow
Write-Host "5. Verify success (should see '$tableCount tables created')" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press any key to open Supabase SQL Editor..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')

# Open browser
Start-Process $sqlEditorUrl

Write-Host ""
Write-Host "  [OK] Browser opened to SQL Editor" -ForegroundColor Green
Write-Host ""
Write-Host "Alternative: Use psql command line" -ForegroundColor Gray
Write-Host "  psql 'postgresql://postgres:[password]@db.$projectRef.supabase.co:5432/postgres' -f $migrationFile" -ForegroundColor Gray
Write-Host ""
Write-Host "After migration completes, re-run tests:" -ForegroundColor Yellow
Write-Host "  .\test\agent\run-comprehensive-tests.ps1" -ForegroundColor White
Write-Host ""
