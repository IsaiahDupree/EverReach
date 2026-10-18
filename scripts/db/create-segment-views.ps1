# Create Segment Views for Campaign Automation

Write-Host "Creating segment views...`n" -ForegroundColor Cyan

$env:PGPASSWORD = "everreach123!@#"

$PSQL = "C:\Program Files\PostgreSQL\16\bin\psql.exe"
$DBHOST = "db.utasetfxiqcrnwyfforx.supabase.co"
$PORT = "5432"
$DATABASE = "postgres"
$USER = "postgres"

# Extract and run only the segment view creation part
Write-Host "Extracting segment views from migration file..." -ForegroundColor Yellow

$SQL = @"
-- ============================================================================
-- SEGMENT VIEWS (Campaign Entry Logic)
-- ============================================================================

-- 1. Onboarding Stuck (24h after signup, <5 contacts)
CREATE OR REPLACE VIEW onboarding_stuck_segment AS
SELECT 
  p.user_id,
  p.email,
  p.full_name,
  p.created_at as signed_up_at
FROM profiles p
WHERE 
  p.created_at < (now() - interval '24 hours')
  AND p.created_at > (now() - interval '72 hours')
  AND NOT EXISTS (
    SELECT 1 FROM contacts c WHERE c.user_id = p.user_id LIMIT 5
  )
  AND NOT EXISTS (
    SELECT 1 FROM deliveries d 
    WHERE d.user_id = p.user_id 
      AND d.campaign_id = 'a1b2c3d4-1111-4444-8888-111111111111'
      AND d.sent_at > (now() - interval '48 hours')
  );

-- 2. Paywall Abandoned (viewed paywall 2h ago, no purchase)
CREATE OR REPLACE VIEW paywall_abandoned_segment AS
SELECT 
  e.user_id,
  p.email,
  p.full_name,
  MAX(e.ts) as last_paywall_view
FROM event_log e
JOIN profiles p ON e.user_id = p.user_id
WHERE 
  e.event_name = 'paywall_viewed'
  AND e.ts > (now() - interval '3 hours')
  AND e.ts < (now() - interval '2 hours')
  AND NOT EXISTS (
    SELECT 1 FROM event_log e2 
    WHERE e2.user_id = e.user_id 
      AND e2.event_name IN ('purchase_started', 'subscription_started')
      AND e2.ts > e.ts
  )
  AND NOT EXISTS (
    SELECT 1 FROM deliveries d 
    WHERE d.user_id = e.user_id 
      AND d.campaign_id = 'b2c3d4e5-2222-4444-8888-222222222222'
      AND d.sent_at > (now() - interval '72 hours')
  )
GROUP BY e.user_id, p.email, p.full_name;

-- 3. Payment Failed (48h after failure, still no success)
CREATE OR REPLACE VIEW payment_failed_segment AS
SELECT 
  e.user_id,
  p.email,
  p.full_name,
  MAX(e.ts) as last_failure
FROM event_log e
JOIN profiles p ON e.user_id = p.user_id
WHERE 
  e.event_name = 'payment_failed'
  AND e.ts > (now() - interval '72 hours')
  AND e.ts < (now() - interval '48 hours')
  AND NOT EXISTS (
    SELECT 1 FROM event_log e2 
    WHERE e2.user_id = e.user_id 
      AND e2.event_name = 'payment_succeeded'
      AND e2.ts > e.ts
  )
  AND NOT EXISTS (
    SELECT 1 FROM deliveries d 
    WHERE d.user_id = e.user_id 
      AND d.campaign_id = 'c3d4e5f6-3333-4444-8888-333333333333'
      AND d.sent_at > (now() - interval '24 hours')
  )
GROUP BY e.user_id, p.email, p.full_name;

-- 4. Inactive 7 Days (no events in 7d, was active before)
CREATE OR REPLACE VIEW inactive_7d_segment AS
SELECT 
  p.user_id,
  p.email,
  p.full_name,
  MAX(e.ts) as last_activity
FROM profiles p
LEFT JOIN event_log e ON p.user_id = e.user_id
WHERE 
  p.created_at < (now() - interval '14 days')
  AND NOT EXISTS (
    SELECT 1 FROM event_log e2 
    WHERE e2.user_id = p.user_id 
      AND e2.ts > (now() - interval '7 days')
  )
  AND EXISTS (
    SELECT 1 FROM event_log e3 
    WHERE e3.user_id = p.user_id 
      AND e3.ts > (now() - interval '30 days')
      LIMIT 10
  )
  AND NOT EXISTS (
    SELECT 1 FROM deliveries d 
    WHERE d.user_id = p.user_id 
      AND d.campaign_id = 'd4e5f6a7-4444-4444-8888-444444444444'
      AND d.sent_at > (now() - interval '168 hours')
  )
GROUP BY p.user_id, p.email, p.full_name;

-- 5. Heavy Users (VIP Nurture - top 5% active users)
CREATE OR REPLACE VIEW heavy_users_segment AS
SELECT 
  e.user_id,
  p.email,
  p.full_name,
  COUNT(*) as event_count
FROM event_log e
JOIN profiles p ON e.user_id = p.user_id
WHERE 
  e.ts > (now() - interval '30 days')
  AND NOT EXISTS (
    SELECT 1 FROM deliveries d 
    WHERE d.user_id = e.user_id 
      AND d.campaign_id = 'e5f6a7b8-5555-4444-8888-555555555555'
      AND d.sent_at > (now() - interval '336 hours')
  )
GROUP BY e.user_id, p.email, p.full_name
HAVING COUNT(*) > (
  SELECT PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY cnt)
  FROM (
    SELECT user_id, COUNT(*) as cnt 
    FROM event_log 
    WHERE ts > (now() - interval '30 days')
    GROUP BY user_id
  ) subq
);
"@

$SQL | & $PSQL -h $DBHOST -p $PORT -U $USER -d $DATABASE

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nSUCCESS - Segment views created!`n" -ForegroundColor Green
    
    Write-Host "Created views:" -ForegroundColor Yellow
    Write-Host "  ✓ onboarding_stuck_segment" -ForegroundColor Green
    Write-Host "  ✓ paywall_abandoned_segment" -ForegroundColor Green
    Write-Host "  ✓ payment_failed_segment" -ForegroundColor Green
    Write-Host "  ✓ inactive_7d_segment" -ForegroundColor Green
    Write-Host "  ✓ heavy_users_segment`n" -ForegroundColor Green
    
    Write-Host "Now run verification again:" -ForegroundColor Cyan
    Write-Host "  Get-Content verify-campaigns.ps1 | powershell -Command -`n" -ForegroundColor White
} else {
    Write-Host "`nFAILED - Exit code: $LASTEXITCODE`n" -ForegroundColor Red
}

$env:PGPASSWORD = ""
