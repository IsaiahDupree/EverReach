$token = "xqYZOodCZ74DdEQbU8N0fayL"

$headers = @{
    "Authorization" = "Bearer $token"
}

Write-Host "`n=== Fetching Latest Backend Build Logs ===" -ForegroundColor Cyan

try {
    # Get latest deployment from feat/dev-dashboard
    $deployments = Invoke-RestMethod -Uri "https://api.vercel.com/v6/deployments?projectId=prj_QmaX0Q41OWo4konrSFNWoSoNCRHp&limit=10" `
        -Headers $headers `
        -Method Get

    $latestDev = $deployments.deployments | Where-Object { $_.meta.githubCommitRef -eq 'feat/dev-dashboard' } | Select-Object -First 1

    if ($latestDev) {
        Write-Host "Deployment ID: $($latestDev.uid)" -ForegroundColor Yellow
        Write-Host "State: $($latestDev.state)" -ForegroundColor $(if($latestDev.state -eq 'ERROR'){'Red'}else{'Yellow'})
        Write-Host "Branch: $($latestDev.meta.githubCommitRef)" -ForegroundColor Cyan
        
        Write-Host "`nFetching build logs...`n" -ForegroundColor Cyan

        # Get build events
        $events = Invoke-RestMethod -Uri "https://api.vercel.com/v3/deployments/$($latestDev.uid)/events" `
            -Headers $headers `
            -Method Get

        Write-Host "=== Build Output ===" -ForegroundColor Green
        foreach ($event in $events) {
            if ($event.type -eq 'stdout' -or $event.type -eq 'stderr' -or $event.type -eq 'command') {
                $timestamp = [DateTimeOffset]::FromUnixTimeMilliseconds($event.created).ToString("HH:mm:ss.fff")
                Write-Host "[$timestamp] $($event.payload.text)"
            }
        }
    } else {
        Write-Host "No deployment found for feat/dev-dashboard branch" -ForegroundColor Yellow
    }

} catch {
    Write-Host "`n❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    }
}
