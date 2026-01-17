$ErrorActionPreference = "Stop"

Write-Host "Getting test JWT..." -ForegroundColor Cyan
Write-Host ""

$body = @{
    email = "isaiahdupree33@gmail.com"
    password = "frogger12"
} | ConvertTo-Json

$headers = @{
    "Content-Type" = "application/json"
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0YXNldGZ4aXFjcm53eWZmb3J4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjk5NzQ5NTEsImV4cCI6MjA0NTU1MDk1MX0.wOKCt_EvHDLr5wIYjKbZGgSqJhQdGhIWNe0Yt_Qvl-s"
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
