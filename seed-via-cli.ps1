# Seed Marketing Data via Supabase CLI
# Direct SQL execution

$ErrorActionPreference = "Stop"

Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🌱 SEEDING VIA SUPABASE CLI" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════`n" -ForegroundColor Cyan

# Load environment
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.+)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
}

$SUPABASE_URL = $env:SUPABASE_URL
$SUPABASE_DB_PASSWORD = "everreach123!@#"
$PROJECT_ID = "utasetfxiqcrnwyfforx"

# Extract host from URL
$DB_HOST = "db.$PROJECT_ID.supabase.co"
$DB_PORT = "5432"
$DB_NAME = "postgres"
$DB_USER = "postgres"

Write-Host "📡 Database: $DB_HOST" -ForegroundColor Yellow
Write-Host ""

# Read SQL file
if (-not (Test-Path "seed-marketing-data.sql")) {
    Write-Host "❌ seed-marketing-data.sql not found!" -ForegroundColor Red
    exit 1
}

$sqlContent = Get-Content "seed-marketing-data.sql" -Raw

Write-Host "📝 SQL file loaded: $((Get-Item 'seed-marketing-data.sql').Length) bytes" -ForegroundColor Green
Write-Host ""

# Try psql if available
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue

if ($psqlPath) {
    Write-Host "🔧 Using psql..." -ForegroundColor Yellow
    
    # Set password as environment variable for psql
    $env:PGPASSWORD = $DB_PASSWORD
    
    # Execute SQL
    $sqlContent | & psql `
        -h $DB_HOST `
        -p $DB_PORT `
        -U $DB_USER `
        -d $DB_NAME `
        -v ON_ERROR_STOP=1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ SQL executed successfully via psql!" -ForegroundColor Green
    } else {
        Write-Host "`n❌ psql execution failed" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "⚠️  psql not found. Using Supabase REST API..." -ForegroundColor Yellow
    Write-Host ""
    
    # Fall back to direct SQL execution via Supabase Management API
    Write-Host "📡 Executing via Supabase Management API..." -ForegroundColor Yellow
    
    $ACCESS_TOKEN = $env:A_C_C_E_S_S__T_O_K_E_N
    
    try {
        $response = Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/$PROJECT_ID/database/query" `
            -Method POST `
            -Headers @{
                "Authorization" = "Bearer $ACCESS_TOKEN"
                "Content-Type" = "application/json"
            } `
            -Body (@{
                query = $sqlContent
            } | ConvertTo-Json) `
            -ErrorAction Stop
        
        Write-Host "`n✅ SQL executed successfully via API!" -ForegroundColor Green
        Write-Host "Response: $($response | ConvertTo-Json -Depth 2)" -ForegroundColor Gray
    }
    catch {
        Write-Host "`n❌ API execution failed: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
        Write-Host "💡 Alternative: Use Supabase SQL Editor" -ForegroundColor Yellow
        Write-Host "   https://supabase.com/dashboard/project/$PROJECT_ID/sql" -ForegroundColor Gray
        exit 1
    }
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ SEEDING COMPLETE" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "🧪 Run tests:" -ForegroundColor Yellow
Write-Host "   node test/agent/bucket-1-marketing-intelligence.mjs" -ForegroundColor Gray
Write-Host ""
