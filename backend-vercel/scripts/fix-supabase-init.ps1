# Script to convert module-level Supabase initialization to lazy initialization
# This fixes build-time errors where environment variables aren't available

$routeFiles = @(
    "app\api\v1\screenshots\[id]\route.ts",
    "app\api\v1\screenshots\[id]\analyze\route.ts",
    "app\api\v1\screenshots\route.ts",
    "app\api\v1\billing\usage\route.ts",
    "app\api\v1\billing\subscription\route.ts",
    "app\api\v1\billing\portal\route.ts",
    "app\api\v1\analytics\summary\route.ts",
    "app\api\v1\analytics\activity\route.ts",
    "app\api\tracking\identify\route.ts",
    "app\api\tracking\events\route.ts",
    "app\api\cron\dev-activity-digest\route.ts",
    "app\api\cron\run-campaigns\route.ts",
    "app\api\cron\send-sms\route.ts",
    "app\api\cron\sync-posthog-events\route.ts",
    "app\api\cron\sync-email-metrics\route.ts",
    "app\api\cron\send-email\route.ts",
    "app\api\cron\refresh-dashboard-views\route.ts",
    "app\api\admin\feature-flags\route.ts",
    "app\api\admin\feature-flags\[key]\route.ts",
    "app\api\admin\ingest\email-campaign\route.ts",
    "app\api\admin\experiments\route.ts",
    "app\api\admin\experiments\[key]\route.ts",
    "app\api\admin\dev-notifications\route.ts",
    "app\api\admin\dashboard\overview\route.ts",
    "app\api\cron\refresh-monitoring-views\route.ts",
    "app\api\cron\process-embeddings\route.ts",
    "app\api\health\route.ts",
    "app\api\webhooks\stripe\route.ts"
)

Write-Host "Found $($routeFiles.Count) files to fix"
Write-Host "Files requiring module-level Supabase init -> lazy init conversion"
