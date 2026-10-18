# Get JWT Token for Testing
# Creates a test user and gets their JWT token

param(
    [string]$Email = "isaiahdupree33@gmail.com",
    [string]$Password = "frogger12"
)

$supabaseUrl = "https://bvhqolnytimehzpwdiqd.supabase.co"
$supabaseAnonKey = $env:SUPABASE_ANON_KEY

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Getting Test JWT Token" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

Write-Host "`n📧 Email: $Email" -ForegroundColor Gray
Write-Host "🔑 Password: $Password" -ForegroundColor Gray

# Try to sign up
Write-Host "`n🔐 Attempting to create test user..." -ForegroundColor Cyan

try {
    $signupBody = @{
        email = $Email
        password = $Password
    } | ConvertTo-Json

    $signupResponse = Invoke-RestMethod `
        -Uri "$supabaseUrl/auth/v1/signup" `
        -Method POST `
        -Headers @{
            "apikey" = $supabaseAnonKey
            "Content-Type" = "application/json"
        } `
        -Body $signupBody `
        -ErrorAction Stop

    if ($signupResponse.access_token) {
        Write-Host "✅ User created successfully!" -ForegroundColor Green
        $token = $signupResponse.access_token
        $userId = $signupResponse.user.id
    } else {
        throw "No access token in signup response"
    }
} catch {
    Write-Host "⚠️  Signup failed (user might exist), trying login..." -ForegroundColor Yellow
    
    # Try to login
    try {
        $loginBody = @{
            email = $Email
            password = $Password
        } | ConvertTo-Json

        $loginResponse = Invoke-RestMethod `
            -Uri "$supabaseUrl/auth/v1/token?grant_type=password" `
            -Method POST `
            -Headers @{
                "apikey" = $supabaseAnonKey
                "Content-Type" = "application/json"
            } `
            -Body $loginBody `
            -ErrorAction Stop

        $token = $loginResponse.access_token
        $userId = $loginResponse.user.id
        Write-Host "✅ Logged in successfully!" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to login: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "`n💡 You can manually get a token from Supabase Dashboard:" -ForegroundColor Cyan
        Write-Host "   1. Go to: https://supabase.com/dashboard/project/utasetfxiqcrnwyfforx/auth/users" -ForegroundColor Gray
        Write-Host "   2. Create a test user" -ForegroundColor Gray
        Write-Host "   3. Use the JWT token" -ForegroundColor Gray
        exit 1
    }
}

Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  SUCCESS!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

Write-Host "`n👤 User ID: $userId" -ForegroundColor Gray
Write-Host "`n🎫 JWT Token (copy this):" -ForegroundColor Cyan
Write-Host $token -ForegroundColor Yellow

Write-Host "`n📋 To test endpoints with this token, run:" -ForegroundColor Cyan
Write-Host ".\test-all-endpoints.ps1 -JwtToken '$token'" -ForegroundColor Gray

Write-Host "`n💾 Saving token to test-token.txt..." -ForegroundColor Gray
$token | Out-File "test-token.txt" -NoNewline
Write-Host "✅ Token saved!" -ForegroundColor Green

Write-Host "`n🧪 Quick test - Get current user:" -ForegroundColor Cyan
try {
    $meResponse = Invoke-RestMethod `
        -Uri "https://ever-reach-be.vercel.app/api/v1/me" `
        -Headers @{
            "Authorization" = "Bearer $token"
        }
    
    Write-Host "✅ API is working! User data:" -ForegroundColor Green
    $meResponse | ConvertTo-Json -Depth 3
} catch {
    Write-Host "⚠️  Could not fetch user data: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""
