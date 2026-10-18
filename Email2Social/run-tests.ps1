# PowerShell script to run tests with .env file loaded

Write-Host "Loading environment variables from .env file..." -ForegroundColor Cyan

# Read .env file
Get-Content .env | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith("#")) {
        $parts = $line.Split("=", 2)
        if ($parts.Length -eq 2) {
            $key = $parts[0].Trim()
            $value = $parts[1].Trim()
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
            Write-Host "  ✓ Set $key" -ForegroundColor Green
        }
    }
}

Write-Host "`n============================================================" -ForegroundColor Yellow
Write-Host "RUNNING SOCIAL LINKS SEARCH API TESTS" -ForegroundColor Yellow
Write-Host "============================================================`n" -ForegroundColor Yellow

node test-social-links-search.mjs

Write-Host "`n============================================================" -ForegroundColor Yellow
Write-Host "RUNNING PERPLEXITY AI API TESTS" -ForegroundColor Yellow
Write-Host "============================================================`n" -ForegroundColor Yellow

node test-perplexity.mjs

Write-Host "`n✅ All tests completed!" -ForegroundColor Green
