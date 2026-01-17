# Fix remaining 11 Public API files for CORS
# Each file needs:
# 1. Import { options } from "@/lib/cors"
# 2. Replace OPTIONS handler with: export function OPTIONS(req: Request) { return options(req); }

$files = @(
    "app/api/v1/contacts/[id]/channels/route.ts",
    "app/api/v1/contacts/[id]/channels/[channelId]/route.ts",
    "app/api/v1/contacts/[id]/context-bundle/route.ts",
    "app/api/v1/contacts/[id]/custom/route.ts",
    "app/api/v1/contacts/[id]/effective-channel/route.ts",
    "app/api/v1/contacts/[id]/preferences/route.ts",
    "app/api/v1/custom-fields/route.ts",
    "app/api/v1/feature-buckets/[id]/route.ts",
    "app/api/v1/feature-requests/[id]/process-embedding/route.ts",
    "app/api/v1/feature-requests/[id]/route.ts",
    "app/api/v1/feature-requests/[id]/vote/route.ts"
)

foreach ($file in $files) {
    Write-Host "Processing: $file"
    
    $content = Get-Content $file -Raw
    
    # Add import if not present
    if ($content -notmatch 'import.*options.*from.*@/lib/cors') {
        $content = $content -replace "(import\s+{[^}]+}\s+from\s+['""]next/server['""];)", "`$1`nimport { options } from '@/lib/cors';"
    }
    
    # Replace OPTIONS handler
    $oldPattern = 'export\s+async\s+function\s+OPTIONS\([^)]*\)\s*\{[^}]*return\s+new\s+NextResponse\([^)]*\)\s*;?\s*\}'
    $newHandler = "export function OPTIONS(req: Request) {`n  return options(req);`n}"
    
    if ($content -match $oldPattern) {
        $content = $content -replace $oldPattern, $newHandler
        Set-Content -Path $file -Value $content -NoNewline
        Write-Host "  ✅ Fixed: $file"
    } else {
        Write-Host "  ⚠️  No OPTIONS handler found in: $file"
    }
}

Write-Host "`n✅ Done! Run: node audit-cors.mjs"
