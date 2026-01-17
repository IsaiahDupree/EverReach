# Fix remaining 9 routes with lazy Supabase initialization

$routes = @(
    "app\api\admin\dashboard\overview\route.ts",
    "app\api\admin\experiments\route.ts",
    "app\api\admin\experiments\[key]\route.ts",
    "app\api\admin\feature-flags\route.ts",
    "app\api\admin\feature-flags\[key]\route.ts",
    "app\api\admin\ingest\email-campaign\route.ts",
    "app\api\v1\screenshots\route.ts",
    "app\api\v1\screenshots\[id]\route.ts",
    "app\api\v1\screenshots\[id]\analyze\route.ts"
)

Write-Host "Remaining routes to fix: $($routes.Count)" -ForegroundColor Cyan
$routes | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
