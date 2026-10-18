$ErrorActionPreference = "Stop"

Write-Host "Getting test JWT..." -ForegroundColor Cyan
Write-Host ""

$body = @{
    email = "isaiahdupree33@gmail.com"
    password = "frogger12"
} | ConvertTo-Json

$headers = @{
    "Content-Type" = "application/json"
    "apikey" = $env:SUPABASE_ANON_KEY
}

try {
    $response = Invoke-RestMethod -Uri "https://utasetfxiqcrnwyfforx.supabase.co/auth/v1/token?grant_type=password" -Method Post -Headers $headers -Body $body
    
    $jwt = $response.access_token
    
    Write-Host "✅ JWT obtained!" -ForegroundColor Green
    Write-Host ""
    Write-Host "JWT:" -ForegroundColor Yellow
    Write-Host $jwt
    Write-Host ""
    Write-Host "To run smoke tests:" -ForegroundColor Cyan
    Write-Host "`$env:TEST_JWT = `"$jwt`"" -ForegroundColor Gray
    Write-Host "node test/profile-smoke.mjs" -ForegroundColor Gray
    Write-Host ""
    
    # Save to file for convenience
    $jwt | Out-File -FilePath "test-jwt.txt" -NoNewline
    Write-Host "✅ JWT saved to test-jwt.txt" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Failed to get JWT" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
