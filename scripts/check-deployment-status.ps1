$token = "xqYZOodCZ74DdEQbU8N0fayL"
$projectId = "prj_OEuCagEYCJkpDw5cwcgeAYGZw5bt"

$headers = @{
    "Authorization" = "Bearer $token"
}

Write-Host "`n=== Checking Deployment Status ===" -ForegroundColor Cyan

try {
    # Get recent deployments
    $response = Invoke-RestMethod `
        -Uri "https://api.vercel.com/v6/deployments?projectId=$projectId&limit=3" `
        -Headers $headers `
        -Method Get
    
    Write-Host "`nRecent Deployments:" -ForegroundColor Yellow
    
    foreach ($dep in $response.deployments) {
        $createdAt = [DateTimeOffset]::FromUnixTimeMilliseconds($dep.created).DateTime.ToLocalTime()
        
        Write-Host "`n----------------------------------------" -ForegroundColor Gray
        Write-Host "State: $($dep.state)" -ForegroundColor $(
            switch ($dep.state) {
                "READY" { "Green" }
                "ERROR" { "Red" }
                "BUILDING" { "Yellow" }
                "QUEUED" { "Yellow" }
                default { "White" }
            }
        )
        Write-Host "URL: https://$($dep.url)"
        Write-Host "Branch: $($dep.meta.githubCommitRef)"
        Write-Host "Commit: $($dep.meta.githubCommitSha.Substring(0,7))"
        Write-Host "Created: $createdAt"
        
        if ($dep.state -eq "ERROR" -and $dep.meta.githubCommitRef -eq "feat/evidence-reports") {
            Write-Host "Error Message: Check build logs for details" -ForegroundColor Red
        }
    }
    
    $latest = $response.deployments[0]
    
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "Latest Deployment Summary:" -ForegroundColor Cyan
    Write-Host "Status: $($latest.state)"
    Write-Host "Branch: $($latest.meta.githubCommitRef)"
    
    if ($latest.state -eq "READY") {
        Write-Host "`n✅ Deployment is LIVE!" -ForegroundColor Green
        Write-Host "Visit: https://reports.everreach.app" -ForegroundColor Cyan
    } elseif ($latest.state -eq "ERROR") {
        Write-Host "`n❌ Deployment FAILED" -ForegroundColor Red
        Write-Host "Action needed: Fix Vercel settings (see VERCEL_SETTINGS.md)" -ForegroundColor Yellow
    } elseif ($latest.state -eq "BUILDING" -or $latest.state -eq "QUEUED") {
        Write-Host "`n⏳ Deployment in progress..." -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "`n❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}
