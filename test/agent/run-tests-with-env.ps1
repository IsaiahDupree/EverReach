# Run Recent Developments Tests with Environment Variables
# This script loads environment variables and runs the comprehensive test suite

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "Recent Developments Test Suite" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Function to load .env file
function Import-EnvFile {
    param (
        [string]$EnvFilePath
    )
    
    if (Test-Path $EnvFilePath) {
        Write-Host "Loading environment from: $EnvFilePath" -ForegroundColor Green
        Get-Content $EnvFilePath | ForEach-Object {
            $line = $_.Trim()
            if ($line -and -not $line.StartsWith('#')) {
                $parts = $line -split '=', 2
                if ($parts.Count -eq 2) {
                    $key = $parts[0].Trim()
                    $value = $parts[1].Trim()
                    # Remove quotes if present
                    if ($value.StartsWith('"') -and $value.EndsWith('"')) {
                        $value = $value.Substring(1, $value.Length - 2)
                    }
                    [Environment]::SetEnvironmentVariable($key, $value, 'Process')
                    Write-Host "  Set: $key" -ForegroundColor Gray
                }
            }
        }
        Write-Host ""
        return $true
    }
    return $false
}

# Try to load .env from various locations
$rootDir = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$envLocations = @(
    "$rootDir\.env",
    "$rootDir\.env.local",
    "$rootDir\.env.test",
    "$rootDir\backend-vercel\.env",
    "$rootDir\backend-vercel\.env.local"
)

$envLoaded = $false
foreach ($envPath in $envLocations) {
    if (Import-EnvFile -EnvFilePath $envPath) {
        $envLoaded = $true
        break
    }
}

if (-not $envLoaded) {
    Write-Host "No .env file found. Continuing with system environment variables..." -ForegroundColor Yellow
    Write-Host ""
}

# Verify critical environment variables
Write-Host "Verifying environment variables..." -ForegroundColor Cyan
$criticalVars = @('SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY')
$missingVars = @()

foreach ($var in $criticalVars) {
    $value = [Environment]::GetEnvironmentVariable($var, 'Process')
    if ([string]::IsNullOrWhiteSpace($value)) {
        $missingVars += $var
        Write-Host "  ✗ Missing: $var" -ForegroundColor Red
    } else {
        $maskedValue = $value.Substring(0, [Math]::Min(10, $value.Length)) + "..."
        Write-Host "  ✓ Set: $var = $maskedValue" -ForegroundColor Green
    }
}

if ($missingVars.Count -gt 0) {
    Write-Host ""
    Write-Host "Warning: Critical environment variables are missing" -ForegroundColor Yellow
    Write-Host "The following tests may fail:" -ForegroundColor Yellow
    foreach ($var in $missingVars) {
        Write-Host "  - Tests requiring $var" -ForegroundColor Gray
    }
    Write-Host ""
    Write-Host "Continuing anyway..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "Starting Test Suite" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Change to root directory
Set-Location $rootDir

# Run the test suite
Write-Host "Running: node test/agent/run-recent-developments.mjs" -ForegroundColor Cyan
Write-Host ""

try {
    # Run the tests and capture exit code
    node test/agent/run-recent-developments.mjs
    $exitCode = $LASTEXITCODE
    
    Write-Host ""
    Write-Host "=============================================" -ForegroundColor Cyan
    Write-Host "Test Suite Complete" -ForegroundColor Cyan
    Write-Host "=============================================" -ForegroundColor Cyan
    Write-Host ""
    
    if ($exitCode -eq 0) {
        Write-Host "✓ All tests passed!" -ForegroundColor Green
    } else {
        Write-Host "✗ Some tests failed (Exit Code: $exitCode)" -ForegroundColor Red
        Write-Host ""
        Write-Host "Check the detailed report in:" -ForegroundColor Yellow
        Write-Host "  test/agent/reports/recent_developments_*.md" -ForegroundColor White
    }
    
    Write-Host ""
    exit $exitCode
    
} catch {
    Write-Host ""
    Write-Host "✗ Error running tests: $_" -ForegroundColor Red
    Write-Host ""
    exit 1
}
