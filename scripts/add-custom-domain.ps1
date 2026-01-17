param(
    [string]$Domain = "reports.everreach.app",
    [string]$ProjectId = "prj_OEuCagEYCJkpDw5cwcgeAYGZw5bt",
    [string]$Token = "xqYZOodCZ74DdEQbU8N0fayL"
)

$headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

Write-Host "`n=== Adding Custom Domain to Vercel Project ===" -ForegroundColor Cyan
Write-Host "Domain: $Domain" -ForegroundColor Yellow
Write-Host "Project: $ProjectId" -ForegroundColor Yellow

try {
    # Add the domain
    $body = @{
        name = $Domain
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "https://api.vercel.com/v10/projects/$ProjectId/domains" `
        -Headers $headers `
        -Method Post `
        -Body $body

    Write-Host "`n✅ Domain added successfully!" -ForegroundColor Green
    Write-Host "`nDomain Configuration:" -ForegroundColor Cyan
    Write-Host "  Domain: $($response.name)" -ForegroundColor White
    Write-Host "  Verified: $($response.verified)" -ForegroundColor White
    
    if ($response.verification) {
        Write-Host "`nDNS Configuration Required:" -ForegroundColor Yellow
        foreach ($record in $response.verification) {
            Write-Host "  Type: $($record.type)" -ForegroundColor White
            Write-Host "  Name: $($record.domain)" -ForegroundColor White
            Write-Host "  Value: $($record.value)" -ForegroundColor White
            Write-Host ""
        }
    }

} catch {
    $errorMessage = $_.Exception.Message
    Write-Host "`n❌ Error adding domain: $errorMessage" -ForegroundColor Red
    
    if ($_.ErrorDetails.Message) {
        $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "Error Details: $($errorDetails.error.message)" -ForegroundColor Red
    }
}
