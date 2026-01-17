$routes = Get-ChildItem -Path "backend-vercel\app\api" -Filter "route.ts" -Recurse

Write-Host "Total API Endpoints Found: $($routes.Count)" -ForegroundColor Cyan
Write-Host ""

$routes | ForEach-Object {
    $path = $_.DirectoryName.Replace("$PWD\backend-vercel\app\api\", "").Replace("\", "/")
    Write-Host "/api/$path"
} | Sort-Object
