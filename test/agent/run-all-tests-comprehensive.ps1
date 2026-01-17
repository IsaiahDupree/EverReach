# Comprehensive Test Suite Runner
# Runs ALL recent development tests with proper environment variables
# Usage: .\test\agent\run-all-tests-comprehensive.ps1

param(
    [switch]$SkipEnvCheck,
    [string]$DeploymentUrl = ""
)

Write-Host ""
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "🚀 COMPREHENSIVE TEST SUITE - ALL RECENT DEVELOPMENTS" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""

# Function to load .env file
function Import-EnvFile {
    param (
        [string]$EnvFilePath
    )
    
    if (Test-Path $EnvFilePath) {
        Write-Host "📁 Loading environment from: $EnvFilePath" -ForegroundColor Green
        $loadedCount = 0
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
                    if ($value.StartsWith("'") -and $value.EndsWith("'")) {
                        $value = $value.Substring(1, $value.Length - 2)
                    }
                    [Environment]::SetEnvironmentVariable($key, $value, 'Process')
                    $loadedCount++
                }
            }
        }
        Write-Host "   ✓ Loaded $loadedCount environment variables" -ForegroundColor Gray
        Write-Host ""
        return $true
    }
    return $false
}

# Determine root directory
$rootDir = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $rootDir

Write-Host "📂 Working Directory: $rootDir" -ForegroundColor Cyan
Write-Host ""

# Try to load .env from various locations
$envLocations = @(
    ".env",
    ".env.local",
    ".env.test",
    "backend-vercel\.env",
    "backend-vercel\.env.local"
)

$envLoaded = $false
foreach ($envPath in $envLocations) {
    $fullPath = Join-Path $rootDir $envPath
    if (Import-EnvFile -EnvFilePath $fullPath) {
        $envLoaded = $true
        break
    }
}

if (-not $envLoaded) {
    Write-Host "⚠️  No .env file found. Using system environment variables..." -ForegroundColor Yellow
    Write-Host ""
}

# Override with deployment URL if provided
if ($DeploymentUrl) {
    Write-Host "🌐 Using deployment URL: $DeploymentUrl" -ForegroundColor Cyan
    [Environment]::SetEnvironmentVariable('NEXT_PUBLIC_API_URL', $DeploymentUrl, 'Process')
    [Environment]::SetEnvironmentVariable('TEST_BASE_URL', $DeploymentUrl, 'Process')
    Write-Host ""
} else {
    # Check if we have the latest Vercel deployment URL
    $latestDeployment = 'https://backend-vercel-9m8imclhq-isaiahduprees-projects.vercel.app'
    Write-Host "💡 Tip: Testing against latest deployment: $latestDeployment" -ForegroundColor Yellow
    [Environment]::SetEnvironmentVariable('NEXT_PUBLIC_API_URL', $latestDeployment, 'Process')
    [Environment]::SetEnvironmentVariable('TEST_BASE_URL', $latestDeployment, 'Process')
    Write-Host ""
}

# Verify critical environment variables
Write-Host "🔍 Verifying Environment Variables..." -ForegroundColor Cyan
Write-Host "──────────────────────────────────────────────────────────────────────────" -ForegroundColor Gray

$criticalVars = @{
    'NEXT_PUBLIC_SUPABASE_URL' = 'Supabase Project URL'
    'NEXT_PUBLIC_SUPABASE_ANON_KEY' = 'Supabase Anonymous Key'
    'SUPABASE_SERVICE_ROLE_KEY' = 'Supabase Service Role Key'
    'NEXT_PUBLIC_API_URL' = 'Backend API URL'
}

$optionalVars = @{
    'TEST_USER_EMAIL' = 'Test User Email'
    'TEST_USER_PASSWORD' = 'Test User Password'
    'OPENAI_API_KEY' = 'OpenAI API Key'
    'RESEND_API_KEY' = 'Resend API Key'
}

$missingCritical = @()
$missingOptional = @()

Write-Host ""
Write-Host "✅ Critical Variables:" -ForegroundColor Green
foreach ($var in $criticalVars.Keys) {
    $value = [Environment]::GetEnvironmentVariable($var, 'Process')
    if ([string]::IsNullOrWhiteSpace($value)) {
        $missingCritical += $var
        Write-Host "   ✗ Missing: $var ($($criticalVars[$var]))" -ForegroundColor Red
    } else {
        $maskedValue = $value.Substring(0, [Math]::Min(15, $value.Length)) + "..."
        Write-Host "   ✓ $($criticalVars[$var]): $maskedValue" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "📋 Optional Variables:" -ForegroundColor Yellow
foreach ($var in $optionalVars.Keys) {
    $value = [Environment]::GetEnvironmentVariable($var, 'Process')
    if ([string]::IsNullOrWhiteSpace($value)) {
        $missingOptional += $var
        Write-Host "   ○ Not set: $var ($($optionalVars[$var]))" -ForegroundColor Gray
    } else {
        $maskedValue = $value.Substring(0, [Math]::Min(15, $value.Length)) + "..."
        Write-Host "   ✓ $($optionalVars[$var]): $maskedValue" -ForegroundColor Gray
    }
}

Write-Host ""

if ($missingCritical.Count -gt 0 -and -not $SkipEnvCheck) {
    Write-Host "❌ CRITICAL: Missing required environment variables!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please ensure these variables are set in your .env file:" -ForegroundColor Yellow
    foreach ($var in $missingCritical) {
        Write-Host "   - $var" -ForegroundColor White
    }
    Write-Host ""
    Write-Host "Use -SkipEnvCheck to bypass this check" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

if ($missingCritical.Count -gt 0) {
    Write-Host "⚠️  WARNING: Missing critical variables, but continuing with -SkipEnvCheck" -ForegroundColor Yellow
    Write-Host ""
}

# Show test configuration
Write-Host ""
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "📋 TEST CONFIGURATION" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "Backend URL:  $([Environment]::GetEnvironmentVariable('NEXT_PUBLIC_API_URL', 'Process'))" -ForegroundColor White
Write-Host "Supabase URL: $([Environment]::GetEnvironmentVariable('NEXT_PUBLIC_SUPABASE_URL', 'Process'))" -ForegroundColor White
Write-Host "Node Version: $(node --version)" -ForegroundColor White
Write-Host ""

# Ask for confirmation
Write-Host "Press any key to start tests, or Ctrl+C to cancel..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
Write-Host ""

# Run the comprehensive test suite
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "🧪 STARTING COMPREHENSIVE TEST SUITE" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""

$testScripts = @(
    @{
        Name = "Recent Developments Test Suite"
        Script = "test/agent/run-recent-developments.mjs"
        Description = "Marketing Intelligence, Campaigns, SMS, Backend Infrastructure"
    }
)

$totalPassed = 0
$totalFailed = 0
$testRunResults = @()

foreach ($testScript in $testScripts) {
    Write-Host ""
    Write-Host "──────────────────────────────────────────────────────────────────────────" -ForegroundColor Gray
    Write-Host "📦 Running: $($testScript.Name)" -ForegroundColor Cyan
    Write-Host "   $($testScript.Description)" -ForegroundColor Gray
    Write-Host "──────────────────────────────────────────────────────────────────────────" -ForegroundColor Gray
    Write-Host ""
    
    $startTime = Get-Date
    
    try {
        node $testScript.Script
        $exitCode = $LASTEXITCODE
        
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalSeconds
        
        if ($exitCode -eq 0) {
            Write-Host ""
            Write-Host "   [PASS] Test suite passed! (${duration}s)" -ForegroundColor Green
            $totalPassed++
            $testRunResults += @{
                Name = $testScript.Name
                Passed = $true
                Duration = $duration
            }
        } else {
            Write-Host ""
            Write-Host "   [FAIL] Test suite failed! Exit Code: $exitCode (${duration}s)" -ForegroundColor Red
            $totalFailed++
            $testRunResults += @{
                Name = $testScript.Name
                Passed = $false
                Duration = $duration
                ExitCode = $exitCode
            }
        }
    } catch {
        Write-Host ""
        Write-Host "   [ERROR] Error running test: $_" -ForegroundColor Red
        $totalFailed++
        $testRunResults += @{
            Name = $testScript.Name
            Passed = $false
            Error = $_.ToString()
        }
    }
}

# Final Summary
Write-Host ""
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "📊 FINAL TEST SUMMARY" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""

$totalSuites = $totalPassed + $totalFailed
$successRate = if ($totalSuites -gt 0) { ($totalPassed / $totalSuites * 100).ToString("F1") } else { "0.0" }

Write-Host "Total Test Suites: $totalSuites" -ForegroundColor White
Write-Host "✅ Passed:         $totalPassed" -ForegroundColor Green
Write-Host "❌ Failed:         $totalFailed" -ForegroundColor Red
Write-Host "Success Rate:      ${successRate}%" -ForegroundColor $(if ($totalFailed -eq 0) { "Green" } else { "Yellow" })
Write-Host ""

if ($testRunResults.Count -gt 0) {
    Write-Host "Detailed Results:" -ForegroundColor Cyan
    foreach ($result in $testRunResults) {
        $status = if ($result.Passed) { "✅" } else { "❌" }
        $duration = if ($result.Duration) { " ($(($result.Duration).ToString('F2'))s)" } else { "" }
        Write-Host "  $status $($result.Name)$duration" -ForegroundColor $(if ($result.Passed) { "Green" } else { "Red" })
    }
    Write-Host ""
}

Write-Host "============================================================================" -ForegroundColor Cyan

if ($totalFailed -gt 0) {
    Write-Host ""
    Write-Host "⚠️  Some tests failed. Check the detailed reports in:" -ForegroundColor Yellow
    Write-Host "   test/agent/reports/" -ForegroundColor White
    Write-Host ""
    exit 1
} else {
    Write-Host ""
    Write-Host "🎉 All tests passed! System is ready for production!" -ForegroundColor Green
    Write-Host ""
    exit 0
}
