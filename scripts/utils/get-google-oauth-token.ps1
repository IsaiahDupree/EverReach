# Helper script to get Google OAuth tokens for testing
# This automates the OAuth flow to get a refresh token

param(
    [string]$Email = "isaiahdupree33@gmail.com"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Google OAuth Token Helper" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Load environment variables
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
    Write-Host "✅ Loaded .env file" -ForegroundColor Green
} else {
    Write-Host "❌ .env file not found" -ForegroundColor Red
    exit 1
}

$clientId = $env:GOOGLE_CLIENT_ID
$clientSecret = $env:GOOGLE_CLIENT_SECRET
$redirectUri = $env:GOOGLE_REDIRECT_URI

if (-not $clientId) {
    Write-Host "❌ GOOGLE_CLIENT_ID not found in .env" -ForegroundColor Red
    Write-Host ""
    Write-Host "Add these to your .env file:" -ForegroundColor Yellow
    Write-Host "GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com" -ForegroundColor White
    Write-Host "GOOGLE_CLIENT_SECRET=your-client-secret" -ForegroundColor White
    Write-Host "GOOGLE_REDIRECT_URI=http://localhost:3000/api/v1/contacts/import/google/callback" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "  Client ID: $($clientId.Substring(0, [Math]::Min(30, $clientId.Length)))..." -ForegroundColor White
Write-Host "  Email: $Email" -ForegroundColor White
Write-Host ""

# Step 1: Generate authorization URL
$scope = [System.Web.HttpUtility]::UrlEncode("https://www.googleapis.com/auth/contacts.readonly")
$redirectEncoded = [System.Web.HttpUtility]::UrlEncode($redirectUri)

$authUrl = "https://accounts.google.com/o/oauth2/v2/auth?" +
    "client_id=$clientId&" +
    "redirect_uri=$redirectEncoded&" +
    "response_type=code&" +
    "scope=$scope&" +
    "access_type=offline&" +
    "prompt=consent&" +
    "login_hint=$Email"

Write-Host "🔑 Step 1: Authorization Required" -ForegroundColor Yellow
Write-Host ""
Write-Host "Opening authorization URL in your browser..." -ForegroundColor White
Write-Host ""
Write-Host "If browser doesn't open, copy this URL:" -ForegroundColor Yellow
Write-Host $authUrl -ForegroundColor Cyan
Write-Host ""

# Open browser
Start-Process $authUrl

Write-Host "After authorizing:" -ForegroundColor Yellow
Write-Host "1. You'll be redirected to a localhost URL (it will fail - that's OK)" -ForegroundColor White
Write-Host "2. Copy the ENTIRE URL from your browser" -ForegroundColor White
Write-Host "3. Paste it below" -ForegroundColor White
Write-Host ""

# Wait for user to paste the callback URL
$callbackUrl = Read-Host "Paste the callback URL here"

# Extract the code from URL
if ($callbackUrl -match '[?&]code=([^&]+)') {
    $code = $matches[1]
    Write-Host ""
    Write-Host "✅ Authorization code extracted" -ForegroundColor Green
    Write-Host ""
    
    # Step 2: Exchange code for tokens
    Write-Host "🔄 Step 2: Exchanging code for tokens..." -ForegroundColor Yellow
    Write-Host ""
    
    $body = @{
        client_id = $clientId
        client_secret = $clientSecret
        redirect_uri = $redirectUri
        code = $code
        grant_type = 'authorization_code'
    }
    
    try {
        $response = Invoke-RestMethod -Uri 'https://oauth2.googleapis.com/token' -Method POST -Body $body -ContentType 'application/x-www-form-urlencoded'
        
        Write-Host "✅ Tokens obtained successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "  Add these to your .env file:" -ForegroundColor Cyan
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "GOOGLE_REFRESH_TOKEN=$($response.refresh_token)" -ForegroundColor Green
        Write-Host ""
        Write-Host "Note: You only need the refresh_token" -ForegroundColor Yellow
        Write-Host "      The access_token expires in 1 hour" -ForegroundColor Yellow
        Write-Host ""
        
        # Optionally append to .env
        Write-Host "Would you like to automatically add this to your .env file? (y/N)" -ForegroundColor Yellow
        $answer = Read-Host
        
        if ($answer -eq 'y' -or $answer -eq 'Y') {
            # Check if GOOGLE_REFRESH_TOKEN already exists
            $envContent = Get-Content ".env"
            if ($envContent -match 'GOOGLE_REFRESH_TOKEN=') {
                Write-Host ""
                Write-Host "⚠️  GOOGLE_REFRESH_TOKEN already exists in .env" -ForegroundColor Yellow
                Write-Host "    Updating value..." -ForegroundColor White
                $envContent = $envContent -replace 'GOOGLE_REFRESH_TOKEN=.*', "GOOGLE_REFRESH_TOKEN=$($response.refresh_token)"
                Set-Content ".env" $envContent
            } else {
                Write-Host ""
                Write-Host "Adding GOOGLE_REFRESH_TOKEN to .env..." -ForegroundColor White
                Add-Content ".env" "`nGOOGLE_REFRESH_TOKEN=$($response.refresh_token)"
            }
            Write-Host "✅ Updated .env file" -ForegroundColor Green
        }
        
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "🎉 Setup Complete!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "You can now run:" -ForegroundColor Yellow
        Write-Host "  node test-google-contacts-import.mjs" -ForegroundColor White
        Write-Host ""
        
    } catch {
        Write-Host "❌ Failed to exchange code for tokens" -ForegroundColor Red
        Write-Host ""
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
        Write-Host "Common issues:" -ForegroundColor Yellow
        Write-Host "  - Code expired (they expire in 10 minutes)" -ForegroundColor White
        Write-Host "  - Wrong client_id or client_secret in .env" -ForegroundColor White
        Write-Host "  - Redirect URI mismatch in Google Console" -ForegroundColor White
        Write-Host ""
        exit 1
    }
    
} else {
    Write-Host ""
    Write-Host "❌ Could not find 'code' parameter in URL" -ForegroundColor Red
    Write-Host ""
    Write-Host "Make sure you copied the ENTIRE URL from the browser address bar" -ForegroundColor Yellow
    Write-Host "It should look like:" -ForegroundColor White
    Write-Host "  http://localhost:3000/api/v1/contacts/import/google/callback?code=4/0AY0e-g7..." -ForegroundColor Cyan
    Write-Host ""
    exit 1
}
