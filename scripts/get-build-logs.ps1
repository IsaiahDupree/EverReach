$token = "xqYZOodCZ74DdEQbU8N0fayL"
$projectId = "prj_OEuCagEYCJkpDw5cwcgeAYGZw5bt"

$headers = @{
    "Authorization" = "Bearer $token"
}

Write-Host "`n=== Fetching Latest Deployment Logs ===" -ForegroundColor Cyan

try {
    # Get latest deployment
    $deployments = Invoke-RestMethod `
        -Uri "https://api.vercel.com/v6/deployments?projectId=$projectId&limit=1" `
        -Headers $headers `
        -Method Get
    
    $latestDep = $deployments.deployments[0]
    $depId = $latestDep.uid
    
    Write-Host "Deployment ID: $depId" -ForegroundColor Yellow
    Write-Host "State: $($latestDep.state)" -ForegroundColor $(if ($latestDep.state -eq "ERROR") { "Red" } else { "Yellow" })
    Write-Host "Branch: $($latestDep.meta.githubCommitRef)" -ForegroundColor Yellow
    
    # Get build logs
    Write-Host "`nFetching build logs..." -ForegroundColor Yellow
    
    $logs = Invoke-RestMethod `
        -Uri "https://api.vercel.com/v2/deployments/$depId/events" `
        -Headers $headers `
        -Method Get
    
    Write-Host "`n=== Build Output ===" -ForegroundColor Cyan
    
    foreach ($event in $logs) {
        if ($event.type -eq "stdout" -or $event.type -eq "stderr") {
            $timestamp = [DateTimeOffset]::FromUnixTimeMilliseconds($event.created).DateTime.ToString("HH:mm:ss")
            $color = if ($event.type -eq "stderr" -or $event.payload.text -match "error|Error|ERROR|failed|Failed") { "Red" } else { "White" }
            Write-Host "[$timestamp] $($event.payload.text)" -ForegroundColor $color
        }
    }
    
} catch {
    Write-Host "`n❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    }
}
