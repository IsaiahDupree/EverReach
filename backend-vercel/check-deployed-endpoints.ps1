# Check which endpoints are deployed vs exist in codebase
$baseUrl = "https://ever-reach-be.vercel.app"
$token = if (Test-Path "test-token.txt") { Get-Content "test-token.txt" } else { "" }

Write-Host "🔍 Checking deployed endpoints..." -ForegroundColor Cyan
Write-Host "Base URL: $baseUrl" -ForegroundColor Gray

# Get all route files
$routeFiles = Get-ChildItem -Path "app/api" -Recurse -Filter "route.ts"

$results = @()

foreach ($file in $routeFiles) {
    $relativePath = $file.FullName.Replace((Get-Location).Path + '\app\api\', '').Replace('\route.ts', '').Replace('\', '/')
    $endpoint = "/api/$relativePath"
    
    # Skip dynamic routes for now
    if ($endpoint -match '\[') {
        continue
    }
    
    try {
        $headers = @{}
        if ($token) {
            $headers["Authorization"] = "Bearer $token"
        }
        
        $response = Invoke-WebRequest -Uri "$baseUrl$endpoint" -Method GET -Headers $headers -TimeoutSec 5 -ErrorAction Stop
        $status = $response.StatusCode
        $deployed = $true
    } catch {
        $status = $_.Exception.Response.StatusCode.value__
        $deployed = ($status -ne 404)
    }
    
    $results += [PSCustomObject]@{
        Endpoint = $endpoint
        Status = $status
        Deployed = $deployed
    }
}

# Display results
Write-Host "`n📊 Results:" -ForegroundColor Cyan
$deployed = $results | Where-Object { $_.Deployed }
$notDeployed = $results | Where-Object { -not $_.Deployed }

Write-Host "`n✅ Deployed ($($deployed.Count)):" -ForegroundColor Green
$deployed | ForEach-Object { Write-Host "  $($_.Endpoint) ($($_.Status))" -ForegroundColor Gray }

Write-Host "`n❌ Not Deployed ($($notDeployed.Count)):" -ForegroundColor Red
$notDeployed | ForEach-Object { Write-Host "  $($_.Endpoint)" -ForegroundColor Gray }

# Export to JSON
$results | ConvertTo-Json | Out-File "endpoint-deployment-status.json"
Write-Host "`n📄 Full results saved to endpoint-deployment-status.json" -ForegroundColor Gray
