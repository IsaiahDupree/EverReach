# 🚀 Final Improvements - Execution Plan

## Phase 1: AI Agent Improvements ✅

### Voice Note API - Understanding
**Current Signature:**
```typescript
POST /api/v1/agent/voice-note/process
{
  "note_id": "uuid",           // Required - ID of existing persona note
  "extract_contacts": true,     // Optional - default true
  "extract_actions": true,      // Optional - default true
  "categorize": true,           // Optional - default true
  "suggest_tags": true          // Optional - default true
}
```

**Why it changed:** The API now processes existing `persona_notes` rather than accepting raw transcripts. This is better design because:
1. Notes are stored first, then processed
2. Processing results are saved to the note
3. Supports reprocessing
4. Better audit trail

**To test:** Need to create a persona note first, then process it.

### Action Suggestions API - Understanding
**Current Signature:**
```typescript
POST /api/v1/agent/suggest/actions
{
  "context": "dashboard" | "contact_view" | "goals",  // Required
  "contact_id": "uuid",                                // Optional
  "focus": "engagement" | "networking" | "follow_ups" | "all",  // Optional
  "limit": 5                                           // Optional (1-10)
}
```

**Valid contexts:** `dashboard`, `contact_view`, `goals`
**Valid focus:** `engagement`, `networking`, `follow_ups`, `all`

## Phase 2: Custom Fields Fix

### Check if custom_field_defs table exists

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'custom_field_defs';
```

### If missing, create it

```sql
CREATE TABLE IF NOT EXISTS custom_field_defs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('contact', 'interaction', 'deal')),
  field_name TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'number', 'date', 'boolean', 'select', 'multiselect')),
  options JSONB,
  required BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, entity_type, field_name)
);

CREATE INDEX idx_custom_field_defs_org ON custom_field_defs(org_id);
CREATE INDEX idx_custom_field_defs_entity ON custom_field_defs(entity_type);

-- RLS policies
ALTER TABLE custom_field_defs ENABLE ROW LEVEL SECURITY;

CREATE POLICY custom_field_defs_select ON custom_field_defs
  FOR SELECT USING (org_id IN (SELECT id FROM orgs WHERE id = org_id));

CREATE POLICY custom_field_defs_insert ON custom_field_defs
  FOR INSERT WITH CHECK (org_id IN (SELECT id FROM orgs WHERE id = org_id));

CREATE POLICY custom_field_defs_update ON custom_field_defs
  FOR UPDATE USING (org_id IN (SELECT id FROM orgs WHERE id = org_id));

CREATE POLICY custom_field_defs_delete ON custom_field_defs
  FOR DELETE USING (org_id IN (SELECT id FROM orgs WHERE id = org_id));
```

## Phase 3: Add Test Contacts

### Create test contact with interactions

```sql
-- Get your user ID and org ID first
SELECT id, email FROM auth.users LIMIT 1;
SELECT id, name FROM orgs LIMIT 1;

-- Create test contact
INSERT INTO contacts (
  org_id,
  user_id,
  display_name,
  emails,
  phones,
  tags,
  warmth,
  warmth_band,
  last_interaction_at,
  metadata
) VALUES (
  'YOUR_ORG_ID',
  'YOUR_USER_ID',
  'Ada Lovelace',
  ARRAY['ada@example.com'],
  ARRAY['+15555551234'],
  ARRAY['vip', 'engineer', 'historical'],
  72,
  'warm',
  NOW() - INTERVAL '8 days',
  '{"birthday": "1815-12-10", "city": "London", "specialty": "Analytical Engine"}'::jsonb
) RETURNING id;

-- Create interactions for the contact
INSERT INTO interactions (
  org_id,
  user_id,
  contact_id,
  channel,
  direction,
  summary,
  sentiment,
  occurred_at
) VALUES 
  ('YOUR_ORG_ID', 'YOUR_USER_ID', 'CONTACT_ID', 'email', 'outbound', 'Checked in about project progress', 'positive', NOW() - INTERVAL '8 days'),
  ('YOUR_ORG_ID', 'YOUR_USER_ID', 'CONTACT_ID', 'call', 'inbound', 'Discussed upcoming conference', 'positive', NOW() - INTERVAL '15 days'),
  ('YOUR_ORG_ID', 'YOUR_USER_ID', 'CONTACT_ID', 'dm', 'outbound', 'Shared interesting article', 'neutral', NOW() - INTERVAL '22 days');
```

## Phase 4: Stripe Testing

### Test 1: Checkout Flow

```powershell
# Get JWT token
$token = Get-Content test-token.txt

# Create checkout session
$checkoutResponse = Invoke-RestMethod `
  -Uri "https://ever-reach-be.vercel.app/api/billing/checkout" `
  -Method POST `
  -Headers @{"Authorization" = "Bearer $token"}

# Open checkout URL in browser
Start-Process $checkoutResponse.url

# Use test card: 4242 4242 4242 4242
# Any future date, any CVC, any ZIP
```

### Test 2: Webhook Verification

Check Vercel logs for webhook events:
```bash
vercel logs --follow
```

Look for:
- `customer.subscription.created`
- `invoice.payment_succeeded`

### Test 3: Customer Portal

```powershell
# After successful checkout, test portal
$portalResponse = Invoke-RestMethod `
  -Uri "https://ever-reach-be.vercel.app/api/billing/portal" `
  -Method POST `
  -Headers @{"Authorization" = "Bearer $token"}

Start-Process $portalResponse.url
```

## Phase 5: Run Final Tests

```powershell
# Run all Public API tests
npm run test:public-api

# Run specific suites
npm run test:public-api-auth      # Should be 100%
npm run test:public-api-webhooks  # Should be 91%+
npm run test:public-api-rate-limit # Should be 71%+

# Test context bundle with real contact
$contactId = "CONTACT_ID_FROM_ABOVE"
$token = Get-Content test-token.txt

Invoke-RestMethod `
  -Uri "https://ever-reach-be.vercel.app/api/v1/contacts/$contactId/context-bundle?interactions=20" `
  -Headers @{"Authorization" = "Bearer $token"}
```

## Expected Results

### AI Agent
- ✅ Voice note processing works (with note_id)
- ✅ Action suggestions work (with correct context)
- ✅ Chat continues to work
- ✅ All tools available

### Custom Fields
- ✅ Table created
- ✅ RLS policies active
- ✅ GET /api/v1/custom-fields works

### Test Contacts
- ✅ Contact created with rich data
- ✅ Interactions added
- ✅ Context bundle returns full data

### Stripe
- ✅ Checkout creates session
- ✅ Test payment succeeds
- ✅ Webhook received
- ✅ Customer portal accessible

### Tests
- ✅ 100+ tests passing (target: 90+)
- ✅ Auth: 100%
- ✅ Webhooks: 91%+
- ✅ Rate limiting: 71%+
- ✅ Context bundle: Working with real data

## Quick Execution Checklist

- [ ] Fix custom fields table
- [ ] Create test contact
- [ ] Test voice note with persona note
- [ ] Test action suggestions with correct context
- [ ] Test Stripe checkout
- [ ] Verify Stripe webhook
- [ ] Test customer portal
- [ ] Run final test suite
- [ ] Document results

---

**Estimated Time:** 2.5 hours total
- AI Agent: 30 min
- Custom Fields: 15 min
- Test Contacts: 15 min
- Stripe: 30 min
- Final Tests: 1 hour
