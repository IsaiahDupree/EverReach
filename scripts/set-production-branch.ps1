param(
    [string]$ProjectName = "everreach-dashboard",
    [string]$Token = "xqYZOodCZ74DdEQbU8N0fayL",
    [string]$Branch = "feat/evidence-reports"
)

$headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

Write-Host "`n=== Setting Production Branch ===" -ForegroundColor Cyan

try {
    # Update just the productionBranch field
    $body = @{
        productionBranch = $Branch
    } | ConvertTo-Json
    
    Write-Host "Setting production branch to: $Branch" -ForegroundColor Yellow
    
    $result = Invoke-RestMethod `
        -Uri "https://api.vercel.com/v9/projects/$ProjectName" `
        -Headers $headers `
        -Method Patch `
        -Body $body
    
    Write-Host "`n✅ Production branch updated to: $Branch" -ForegroundColor Green
    
    # Now create a deploy hook to trigger deployment
    Write-Host "`nCreating deploy hook..." -ForegroundColor Yellow
    
    $hookBody = @{
        name = "evidence-deploy"
    } | ConvertTo-Json
    
    $hook = Invoke-RestMethod `
        -Uri "https://api.vercel.com/v1/integrations/deploy/$ProjectName/$Branch" `
        -Headers $headers `
        -Method Post `
        -Body $hookBody
    
    Write-Host "Deploy Hook URL: $($hook.url)" -ForegroundColor Cyan
    
    # Trigger deployment via hook
    Write-Host "`nTriggering deployment..." -ForegroundColor Yellow
    Invoke-RestMethod -Uri $hook.url -Method Post | Out-Null
    
    Write-Host "`n✅ Deployment triggered successfully!" -ForegroundColor Green
    Write-Host "`nMonitor deployment at:" -ForegroundColor Cyan
    Write-Host "https://vercel.com/isaiahduprees-projects/everreach-dashboard/deployments`n" -ForegroundColor White
    
} catch {
    $errorMsg = $_.ErrorDetails.Message
    if ($errorMsg) {
        $errorData = $errorMsg | ConvertFrom-Json
        Write-Host "`n❌ Error: $($errorData.error.message)" -ForegroundColor Red
    } else {
        Write-Host "`n❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}
