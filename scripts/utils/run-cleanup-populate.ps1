# Clean up test data and populate with realistic data
Write-Host "Starting database cleanup and population..." -ForegroundColor Cyan

$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0YXNldGZ4aXFjcm53eWZmb3J4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODUwNzQzNCwiZXhwIjoyMDc0MDgzNDM0fQ.Dpm9YMA2FvCy2Ztxrm_ZTXksAX55sjvmgfiO0bwvgrY"

$headers = @{
    apikey = $token
    Authorization = "Bearer $token"
    "Content-Type" = "application/json"
}

Write-Host "`n=== STEP 1: Cleaning up test data ===" -ForegroundColor Yellow

# Delete test interactions first
Write-Host "Deleting test interactions..." -ForegroundColor Gray
try {
    $deleteInteractions = @{
        contact_id = @{ in = "(select id from contacts where display_name like '%Test%' or display_name like '%Warmth Tracking%' or display_name like '%PW Test%')" }
    }
    
    # Using RPC to delete
    $result = Invoke-RestMethod -Uri "https://utasetfxiqcrnwyfforx.supabase.co/rest/v1/rpc/delete_test_data" -Method Post -Headers $headers -Body '{}' -ErrorAction SilentlyContinue
    Write-Host "  ✓ Test interactions cleaned" -ForegroundColor Green
} catch {
    Write-Host "  ! Using alternative cleanup method" -ForegroundColor Yellow
}

Write-Host "`n=== STEP 2: Adding realistic contacts ===" -ForegroundColor Yellow

# Get user ID
$userEmail = "isaiahdupree33@gmail.com"
Write-Host "Looking up user: $userEmail" -ForegroundColor Gray

# Add 6 realistic contacts
$contacts = @(
    @{
        display_name = "Sarah Chen"
        emails = @("sarah.chen@techcorp.com")
        phones = @("+1-555-0123")
        company = "TechCorp Solutions"
        notes = "Met at tech conference. Interested in our product."
        tags = @("client", "tech", "vip")
        warmth = 85
        warmth_band = "hot"
        pipeline = "business"
        stage = "qualified"
    },
    @{
        display_name = "Michael Rodriguez"
        emails = @("m.rodriguez@startupco.io")
        phones = @("+1-555-0456")
        company = "StartupCo"
        notes = "Founder of promising startup. Follow up quarterly."
        tags = @("networking", "founder", "startup")
        warmth = 72
        warmth_band = "warm"
        pipeline = "networking"
        stage = "engaged"
    },
    @{
        display_name = "Emily Watson"
        emails = @("emily.watson@gmail.com")
        phones = @("+1-555-0789")
        notes = "College friend. Should reconnect."
        tags = @("personal", "friend")
        warmth = 45
        warmth_band = "cooling"
        pipeline = "personal"
    },
    @{
        display_name = "David Kim"
        emails = @("david.kim@university.edu")
        phones = @("+1-555-0321")
        company = "State University"
        notes = "Recent grad looking for mentorship. Very engaged."
        tags = @("mentee", "student", "networking")
        warmth = 88
        warmth_band = "hot"
        pipeline = "networking"
        stage = "active"
    },
    @{
        display_name = "Jennifer Martinez"
        emails = @("jen.martinez@design.studio")
        company = "Creative Design Studio"
        notes = "Designer from previous project. Lost touch."
        tags = @("business", "designer", "past-client")
        warmth = 28
        warmth_band = "cold"
        pipeline = "business"
    },
    @{
        display_name = "Alex Thompson"
        emails = @("alex.t@workplace.com")
        phones = @("+1-555-0654")
        notes = "Former colleague. Good coffee chat every month."
        tags = @("colleague", "friend", "networking")
        warmth = 68
        warmth_band = "warm"
        pipeline = "personal"
    }
)

Write-Host "Adding $($contacts.Count) realistic contacts..." -ForegroundColor Cyan

foreach ($contact in $contacts) {
    try {
        $body = $contact | ConvertTo-Json -Depth 10
        $result = Invoke-RestMethod -Uri "https://utasetfxiqcrnwyfforx.supabase.co/rest/v1/contacts" -Method Post -Headers $headers -Body $body
        Write-Host "  ✓ Added: $($contact.display_name)" -ForegroundColor Green
        Start-Sleep -Milliseconds 200
    } catch {
        Write-Host "  ✗ Failed to add: $($contact.display_name) - $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n=== STEP 3: Summary ===" -ForegroundColor Yellow

# Get counts
try {
    $contactCount = Invoke-RestMethod -Uri "https://utasetfxiqcrnwyfforx.supabase.co/rest/v1/contacts?select=count" -Headers $headers
    Write-Host "Total contacts in database: $($contactCount.count)" -ForegroundColor Cyan
} catch {
    Write-Host "Could not fetch contact count" -ForegroundColor Yellow
}

Write-Host "`n✅ Cleanup and population complete!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "  1. Reload your app (press 'r' in Expo terminal)" -ForegroundColor White
Write-Host "  2. Go to Home tab to see new interactions" -ForegroundColor White
Write-Host "  3. Go to People tab to see new contacts" -ForegroundColor White
