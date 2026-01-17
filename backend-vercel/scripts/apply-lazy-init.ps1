# PowerShell script to convert module-level Supabase init to lazy init
# Applies the transformation pattern to all specified files

$baseDir = "C:\Users\Isaia\Documents\Coding\PersonalCRM\backend-vercel"

# Pattern 1: Standard pattern with exclamation marks
$pattern1Old = 'const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);'

$pattern1New = 'function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}'

# Pattern 2: With || '' fallback
$pattern2Old = 'const supabase = createClient(
  process.env.SUPABASE_URL || '''',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''''
);'

$pattern2New = 'function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL || '''',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''''
  );
}'

$filesToFix = @(
    "app\api\v1\billing\usage\route.ts",
    "app\api\v1\billing\subscription\route.ts",
    "app\api\v1\billing\portal\route.ts",
    "app\api\v1\screenshots\route.ts",
    "app\api\v1\screenshots\[id]\route.ts",
    "app\api\v1\screenshots\[id]\analyze\route.ts",
    "app\api\cron\dev-activity-digest\route.ts",
    "app\api\cron\refresh-dashboard-views\route.ts",
    "app\api\cron\run-campaigns\route.ts",
    "app\api\cron\send-email\route.ts",
    "app\api\cron\sync-email-metrics\route.ts",
    "app\api\cron\send-sms\route.ts",
    "app\api\cron\sync-posthog-events\route.ts",
    "app\api\admin\dev-notifications\route.ts",
    "app\api\admin\feature-flags\route.ts",
    "app\api\admin\feature-flags\[key]\route.ts",
    "app\api\admin\ingest\email-campaign\route.ts",
    "app\api\admin\dashboard\overview\route.ts",
    "app\api\admin\experiments\route.ts",
    "app\api\admin\experiments\[key]\route.ts"
)

$fixed = 0
$errors = 0

foreach ($file in $filesToFix) {
    $fullPath = Join-Path $baseDir $file
    
    if (-not (Test-Path $fullPath)) {
        Write-Host "❌ File not found: $file" -ForegroundColor Red
        $errors++
        continue
    }
    
    try {
        $content = Get-Content $fullPath -Raw
        
        # Try pattern 1 first
        if ($content -match [regex]::Escape($pattern1Old)) {
            $content = $content -replace [regex]::Escape($pattern1Old), $pattern1New
            Set-Content $fullPath $content -NoNewline
            Write-Host "✅ Fixed (pattern 1): $file" -ForegroundColor Green
            $fixed++
        }
        # Try pattern 2
        elseif ($content -match [regex]::Escape($pattern2Old)) {
            $content = $content -replace [regex]::Escape($pattern2Old), $pattern2New
            Set-Content $fullPath $content -NoNewline
            Write-Host "✅ Fixed (pattern 2): $file" -ForegroundColor Green
            $fixed++
        }
        else {
            Write-Host "⚠️  Pattern not found: $file" -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "❌ Error processing $file : $_" -ForegroundColor Red
        $errors++
    }
}

Write-Host "`n📊 Summary:" -ForegroundColor Cyan
Write-Host "   Fixed: $fixed files" -ForegroundColor Green
Write-Host "   Errors: $errors files" -ForegroundColor $(if ($errors -gt 0) { "Red" } else { "Green" })
