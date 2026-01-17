# Remove all errored/failed Vercel deployments
# Usage: .\remove-errored-deployments.ps1

Write-Host "🔍 Fetching deployments..." -ForegroundColor Cyan
Write-Host ""

try {
    # Get all deployments as JSON
    $output = vercel ls --json | ConvertFrom-Json
    
    if (-not $output.deployments -or $output.deployments.Count -eq 0) {
        Write-Host "✅ No deployments found." -ForegroundColor Green
        exit 0
    }

    # Filter for errored/failed deployments
    $erroredDeployments = $output.deployments | Where-Object {
        $_.state -eq 'ERROR' -or 
        $_.state -eq 'CANCELED' -or
        $_.readyState -eq 'ERROR' -or
        $_.readyState -eq 'CANCELED'
    }

    if (-not $erroredDeployments -or $erroredDeployments.Count -eq 0) {
        Write-Host "✅ No errored deployments found!" -ForegroundColor Green
        exit 0
    }

    Write-Host "❌ Found $($erroredDeployments.Count) errored deployment(s):" -ForegroundColor Red
    Write-Host ""

    $i = 1
    foreach ($d in $erroredDeployments) {
        Write-Host "$i. $($d.url)"
        Write-Host "   State: $($d.state ?? $d.readyState)"
        $created = [DateTimeOffset]::FromUnixTimeMilliseconds($d.created).LocalDateTime
        Write-Host "   Created: $($created.ToString())"
        Write-Host ""
        $i++
    }

    Write-Host "🗑️  Removing errored deployments..." -ForegroundColor Yellow
    Write-Host ""

    $removed = 0
    $failed = 0

    foreach ($deployment in $erroredDeployments) {
        try {
            Write-Host "Removing: $($deployment.url)" -ForegroundColor Yellow
            vercel rm $deployment.url --yes 2>&1 | Out-Null
            $removed++
            Write-Host "✅ Removed" -ForegroundColor Green
            Write-Host ""
        } catch {
            $failed++
            Write-Host "❌ Failed to remove: $_" -ForegroundColor Red
            Write-Host ""
        }
    }

    Write-Host ""
    Write-Host "📊 Summary:" -ForegroundColor Cyan
    Write-Host "   ✅ Removed: $removed" -ForegroundColor Green
    Write-Host "   ❌ Failed: $failed" -ForegroundColor Red
    Write-Host "   📦 Total: $($erroredDeployments.Count)" -ForegroundColor Yellow

} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Make sure you are logged in to Vercel:" -ForegroundColor Yellow
    Write-Host "  vercel login"
    exit 1
}
