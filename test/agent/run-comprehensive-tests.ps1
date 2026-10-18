#Requires -Version 5.1

<#
.SYNOPSIS
    Comprehensive Test Suite - All-in-One Runner with Markdown Report
.DESCRIPTION
    Loads environment variables, runs all recent development tests, and generates a detailed markdown report
.EXAMPLE
    .\test\agent\run-comprehensive-tests.ps1
#>

[CmdletBinding()]
param()

$ErrorActionPreference = "Continue"
$ProgressPreference = "SilentlyContinue"

# Configuration
$rootDir = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$reportsDir = Join-Path $PSScriptRoot "reports"
$testRunId = -join ((65..90) + (97..122) | Get-Random -Count 8 | ForEach-Object {[char]$_})
$timestamp = Get-Date -Format "yyyy-MM-ddTHH-mm-ss"

# Ensure reports directory exists
if (-not (Test-Path $reportsDir)) {
    New-Item -ItemType Directory -Path $reportsDir -Force | Out-Null
}

# Banner
Write-Host ""
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "    COMPREHENSIVE TEST SUITE - ALL RECENT DEVELOPMENTS" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Test Run ID: $testRunId" -ForegroundColor Gray
Write-Host "Timestamp:   $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host ""

# Change to root directory
Set-Location $rootDir

# Load environment variables from .env file
Write-Host "[1/4] Loading Environment Variables..." -ForegroundColor Yellow
Write-Host "----------------------------------------------------------------------" -ForegroundColor Gray

$envFile = Join-Path $rootDir ".env"
$envLoaded = $false
$envCount = 0

if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith('#')) {
            if ($line -match '^([^=]+)=(.*)$') {
                $key = $matches[1].Trim()
                $value = $matches[2].Trim()
                
                # Remove surrounding quotes
                if ($value -match '^"(.*)"$') { $value = $matches[1] }
                if ($value -match "^'(.*)'$") { $value = $matches[1] }
                
                [Environment]::SetEnvironmentVariable($key, $value, 'Process')
                $envCount++
            }
        }
    }
    Write-Host "  [OK] Loaded $envCount variables from .env" -ForegroundColor Green
    $envLoaded = $true
} else {
    Write-Host "  [WARN] No .env file found, using system variables" -ForegroundColor Yellow
}

# Set test-specific environment variables
$env:NEXT_PUBLIC_API_URL = "https://backend-vercel-c5yhv6zup-isaiahduprees-projects.vercel.app"
$env:TEST_BASE_URL = $env:NEXT_PUBLIC_API_URL
$env:NEXT_PUBLIC_SUPABASE_URL = $env:SUPABASE_URL
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY = $env:SUPABASE_ANON_KEY
$env:TEST_USER_EMAIL = if ($env:TEST_EMAIL) { $env:TEST_EMAIL } else { "isaiahdupree33@gmail.com" }
$env:TEST_USER_PASSWORD = if ($env:TEST_PASSWORD) { $env:TEST_PASSWORD } else { "frogger12" }

Write-Host ""
Write-Host "  Backend URL:  $($env:NEXT_PUBLIC_API_URL)" -ForegroundColor Cyan
Write-Host "  Supabase URL: $($env:NEXT_PUBLIC_SUPABASE_URL)" -ForegroundColor Cyan
Write-Host ""

# Verify backend is accessible
Write-Host "[2/4] Verifying Backend Access..." -ForegroundColor Yellow
Write-Host "----------------------------------------------------------------------" -ForegroundColor Gray

try {
    $healthCheck = Invoke-RestMethod -Uri "$($env:NEXT_PUBLIC_API_URL)/api/health" -Method Get -ErrorAction Stop
    Write-Host "  [OK] Backend is healthy: $($healthCheck.status)" -ForegroundColor Green
    Write-Host "  [OK] Database latency: $($healthCheck.services.database_latency_ms)ms" -ForegroundColor Green
} catch {
    Write-Host "  [ERROR] Backend health check failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "  [WARN] Continuing anyway..." -ForegroundColor Yellow
}

Write-Host ""

# Run comprehensive test suite
Write-Host "[3/4] Running Comprehensive Test Suite..." -ForegroundColor Yellow
Write-Host "----------------------------------------------------------------------" -ForegroundColor Gray
Write-Host ""

$testStartTime = Get-Date

# Run the test suite and capture all output
$testOutput = & node "test/agent/run-recent-developments.mjs" 2>&1
$testExitCode = $LASTEXITCODE

$testEndTime = Get-Date
$testDuration = ($testEndTime - $testStartTime).TotalSeconds

Write-Host ""
Write-Host "----------------------------------------------------------------------" -ForegroundColor Gray
Write-Host "Test suite completed in $([math]::Round($testDuration, 2)) seconds" -ForegroundColor Gray
Write-Host ""

# Parse the test output for summary
$testOutput | Out-String | Write-Host

# Generate enhanced markdown report
Write-Host "[4/4] Generating Comprehensive Markdown Report..." -ForegroundColor Yellow
Write-Host "----------------------------------------------------------------------" -ForegroundColor Gray

$reportFile = Join-Path $reportsDir "comprehensive_test_report_${testRunId}_${timestamp}.md"

# Read the generated report from run-recent-developments.mjs
$latestReport = Get-ChildItem -Path $reportsDir -Filter "recent_developments_*.md" | 
    Sort-Object LastWriteTime -Descending | 
    Select-Object -First 1

$reportContent = @"
# Comprehensive Test Report - All Recent Developments

**Test Run ID**: ``$testRunId``  
**Generated**: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  
**Duration**: $([math]::Round($testDuration, 2)) seconds  
**Exit Code**: $testExitCode  

---

## Executive Summary

This report covers comprehensive testing of all recently developed features including:

- ✨ **Marketing Intelligence & Analytics** (Attribution, Magnetism, Personas, Enrichment, Funnel)
- 🚀 **Campaign Automation & Lifecycle** (Email/SMS workers, Campaign management)
- 📱 **Communication Integration** (Multi-channel campaigns, Real SMS delivery)
- 🛠️ **Backend Infrastructure** (Cron jobs, Billing, Performance, Warmth tracking)

---

## Environment Configuration

| Variable | Value |
|----------|-------|
| Backend URL | ``$($env:NEXT_PUBLIC_API_URL)`` |
| Supabase URL | ``$($env:NEXT_PUBLIC_SUPABASE_URL)`` |
| Test User | ``$($env:TEST_USER_EMAIL)`` |
| Node Version | ``$(node --version)`` |
| PowerShell Version | ``$($PSVersionTable.PSVersion)`` |

---

## Test Execution Details

**Start Time**: $($testStartTime.ToString('yyyy-MM-dd HH:mm:ss'))  
**End Time**: $($testEndTime.ToString('yyyy-MM-dd HH:mm:ss'))  
**Total Duration**: $([math]::Round($testDuration, 2)) seconds  

---

## Detailed Test Results

"@

# Append the detailed test results from the generated report
if ($latestReport) {
    $detailedResults = Get-Content $latestReport.FullName -Raw
    
    # Extract just the test results (skip the header)
    if ($detailedResults -match '(?s)---(.*)') {
        $reportContent += "`n$($matches[1])"
    }
}

# Add backend health information
$reportContent += @"

---

## Backend Health Status

Last checked: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

"@

try {
    $health = Invoke-RestMethod -Uri "$($env:NEXT_PUBLIC_API_URL)/api/health" -Method Get
    $reportContent += @"
- **Status**: $($health.status) ✅
- **Version**: $($health.version)
- **Database**: $($health.services.database) (Latency: $($health.services.database_latency_ms)ms)
- **Stripe**: $($health.services.stripe)
- **OpenAI**: $($health.services.openai)

"@
} catch {
    $reportContent += "- **Status**: Unable to reach backend ❌`n`n"
}

# Add recommendations based on test results
$reportContent += @"

---

## Recommendations

"@

if ($testExitCode -eq 0) {
    $reportContent += @"
### ✅ All Tests Passed!

The backend is functioning correctly and all features are working as expected. The system is ready for:
- Production deployment
- User acceptance testing
- Further feature development

"@
} else {
    $reportContent += @"
### ⚠️ Action Required

Some tests have failed. Please review the detailed results above and:

1. **Check the error logs** for each failed test
2. **Verify environment variables** are correctly set
3. **Ensure backend is fully deployed** with all recent changes
4. **Review API endpoint availability** for failing services
5. **Check database connectivity** and schema migrations

Common issues:
- Missing API routes (404 errors)
- Authentication failures (401 errors)  
- Database connection issues
- Missing environment variables
- Rate limiting on external services

"@
}

# Add test coverage summary
$reportContent += @"

---

## Test Coverage Summary

### Marketing Intelligence APIs
- Attribution Analytics (Last-touch, Multi-touch)
- Magnetism Index (Engagement tracking)
- Persona Analysis (ICP segmentation)
- Contact Enrichment (Social + Company data)
- Funnel Analytics (Conversion tracking)
- Analytics Dashboard (Summary statistics)

### Campaign Automation
- Campaign creation and management
- Email delivery worker (Resend integration)
- SMS delivery worker (Twilio integration)
- End-to-end lifecycle automation

### Backend Infrastructure  
- Cron job execution
- Event tracking (PostHog)
- User identification
- Billing system
- Performance benchmarks
- Warmth tracking

### Communication Integration
- Real SMS delivery
- Multi-channel campaign orchestration

---

## Report Metadata

- **Report File**: ``$reportFile``
- **Generated By**: PowerShell Comprehensive Test Runner
- **Script Version**: 1.0.0
- **Report Format**: Markdown

---

## Next Steps

1. Review failed tests and error messages
2. Update code to address failures
3. Re-run comprehensive test suite
4. Deploy fixes to production
5. Monitor production metrics

For detailed logs, see: ``test/agent/reports/recent_developments_*.md``

---

*Generated automatically by Comprehensive Test Suite v1.0.0*

"@

# Write the report to file
$reportContent | Out-File -FilePath $reportFile -Encoding UTF8 -Force

Write-Host "  [OK] Report generated: $reportFile" -ForegroundColor Green
Write-Host ""

# Final summary
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "    TEST RUN COMPLETE" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Test Run ID:     $testRunId" -ForegroundColor White
Write-Host "Duration:        $([math]::Round($testDuration, 2)) seconds" -ForegroundColor White
Write-Host "Exit Code:       $testExitCode" -ForegroundColor $(if ($testExitCode -eq 0) { "Green" } else { "Red" })
Write-Host "Report:          $reportFile" -ForegroundColor Cyan
Write-Host ""

if ($testExitCode -eq 0) {
    Write-Host "[SUCCESS] All tests passed! System is ready for deployment." -ForegroundColor Green
} else {
    Write-Host "[WARNING] Some tests failed. Review the report for details." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "To view the report:" -ForegroundColor Gray
Write-Host "  code `"$reportFile`"" -ForegroundColor White
Write-Host ""

# Return exit code
exit $testExitCode
