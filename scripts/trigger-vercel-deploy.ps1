param(
    [string]$ProjectName = "everreach-dashboard",
    [string]$Token = "xqYZOodCZ74DdEQbU8N0fayL"
)

$headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

Write-Host "`n=== Checking Latest Deployment Status ===" -ForegroundColor Cyan

try {
    # Get latest deployments
    $deployments = Invoke-RestMethod `
        -Uri "https://api.vercel.com/v6/deployments?projectId=$ProjectName&limit=5" `
        -Headers $headers `
        -Method Get
    
    Write-Host "`nLatest Deployments:" -ForegroundColor Yellow
    foreach ($dep in $deployments.deployments) {
        $createdAt = [DateTimeOffset]::FromUnixTimeMilliseconds($dep.createdAt).DateTime
        Write-Host "`n  State: $($dep.state)" -ForegroundColor $(if ($dep.state -eq "READY") { "Green" } elseif ($dep.state -eq "ERROR") { "Red" } else { "Yellow" })
        Write-Host "  Branch: $($dep.meta.githubCommitRef)"
        Write-Host "  Commit: $($dep.meta.githubCommitSha.Substring(0,7))"
        Write-Host "  Created: $createdAt"
        Write-Host "  URL: https://$($dep.url)"
    }
    
    # Check if latest deployment is for our branch
    $latestDep = $deployments.deployments[0]
    if ($latestDep.meta.githubCommitRef -eq "feat/evidence-reports") {
        Write-Host "`n✅ Latest deployment is from feat/evidence-reports branch" -ForegroundColor Green
        if ($latestDep.state -eq "READY") {
            Write-Host "✅ Deployment is READY!" -ForegroundColor Green
            Write-Host "`nVisit: https://reports.everreach.app" -ForegroundColor Cyan
        } elseif ($latestDep.state -eq "BUILDING") {
            Write-Host "⏳ Deployment is still BUILDING..." -ForegroundColor Yellow
        } elseif ($latestDep.state -eq "ERROR") {
            Write-Host "❌ Deployment failed!" -ForegroundColor Red
        }
    } else {
        Write-Host "`n⚠️  Latest deployment is NOT from feat/evidence-reports" -ForegroundColor Yellow
        Write-Host "Triggering new deployment..." -ForegroundColor Yellow
        
        # Trigger new deployment
        $body = @{
            name = $ProjectName
            gitSource = @{
                type = "github"
                ref = "feat/evidence-reports"
            }
        } | ConvertTo-Json
        
        $newDep = Invoke-RestMethod `
            -Uri "https://api.vercel.com/v13/deployments" `
            -Headers $headers `
            -Method Post `
            -Body $body
        
        Write-Host "`n✅ New deployment triggered!" -ForegroundColor Green
        Write-Host "Deployment ID: $($newDep.id)" -ForegroundColor Cyan
        Write-Host "URL: https://$($newDep.url)" -ForegroundColor Cyan
    }
    
} catch {
    Write-Host "`n❌ Error: $_" -ForegroundColor Red
    Write-Host $_.Exception.Message
}
