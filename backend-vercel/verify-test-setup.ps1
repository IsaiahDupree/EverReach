# Quick verification that tests have all required resources

Write-Host "🔍 Verifying Test Setup..." -ForegroundColor Cyan

$allGood = $true

# Check .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "❌ .env file missing!" -ForegroundColor Red
    $allGood = $false
} else {
    Write-Host "✅ .env file found" -ForegroundColor Green
    
    # Check required variables
    $envContent = Get-Content .env -Raw
    $required = @(
        "NEXT_PUBLIC_SUPABASE_URL",
        "SUPABASE_SERVICE_ROLE_KEY",
        "SUPABASE_ANON_KEY",
        "OPENAI_API_KEY",
        "TEST_EMAIL",
        "TEST_PASSWORD",
        "NEXT_PUBLIC_API_URL"
    )
    
    foreach ($var in $required) {
        if ($envContent -match "$var=(.+)") {
            Write-Host "  ✅ $var" -ForegroundColor Green
        } else {
            Write-Host "  ❌ $var MISSING" -ForegroundColor Red
            $allGood = $false
        }
    }
}

# Check setup files
$setupFiles = @(
    "__tests__/setup-env.ts",
    "__tests__/setup.ts",
    "jest.config.js"
)

Write-Host "`n📁 Checking setup files..." -ForegroundColor Cyan
foreach ($file in $setupFiles) {
    if (Test-Path $file) {
        Write-Host "  ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $file MISSING" -ForegroundColor Red
        $allGood = $false
    }
}

# Check test files follow pattern
Write-Host "`n🧪 Checking test files..." -ForegroundColor Cyan
$testFiles = Get-ChildItem -Path "__tests__/api" -Filter "*.test.ts" -ErrorAction SilentlyContinue

if ($testFiles) {
    Write-Host "  ✅ Found $($testFiles.Count) test files" -ForegroundColor Green
    foreach ($file in $testFiles) {
        $content = Get-Content $file.FullName -Raw
        
        # Check for required patterns
        $hasBeforeAll = $content -match "beforeAll"
        $hasAfterAll = $content -match "afterAll"
        $hasDescribe = $content -match "describe"
        
        if ($hasBeforeAll -and $hasAfterAll -and $hasDescribe) {
            Write-Host "    ✅ $($file.Name)" -ForegroundColor Green
        } else {
            Write-Host "    ⚠️  $($file.Name) - missing setup/cleanup" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "  ⚠️  No test files found" -ForegroundColor Yellow
}

# Summary
Write-Host "`n═══════════════════════════════════════" -ForegroundColor Cyan
if ($allGood) {
    Write-Host "✅ All test resources verified!" -ForegroundColor Green
    Write-Host "`n🚀 Ready to run tests:" -ForegroundColor Cyan
    Write-Host "   npm run test:public-api" -ForegroundColor Gray
} else {
    Write-Host "❌ Some resources missing!" -ForegroundColor Red
    Write-Host "`n📖 See TEST_ARCHITECTURE_GUIDE.md for setup instructions" -ForegroundColor Yellow
}
