# Warmth Modes Implementation Summary

**Multi-Cadence Warmth Decay System - Complete**

---

## Overview

The warmth modes feature allows users to customize how quickly relationship scores decay based on contact frequency expectations. Each contact can be assigned one of three modes (slow, medium, fast), with scores recalculating in real-time when the mode changes.

---

## Features Implemented

### 1. Backend API Endpoints

#### GET `/api/v1/warmth/modes`
Returns all available warmth modes with decay constants.

**Response:**
```json
{
  "modes": [
    {
      "mode": "slow",
      "lambda": 0.040132,
      "halfLifeDays": 17.3,
      "daysToReachout": 29.9,
      "description": "~30 days between touches"
    },
    {
      "mode": "medium",
      "lambda": 0.085998,
      "halfLifeDays": 8.1,
      "daysToReachout": 13.9,
      "description": "~14 days between touches"
    },
    {
      "mode": "fast",
      "lambda": 0.171996,
      "halfLifeDays": 4.0,
      "daysToReachout": 7.0,
      "description": "~7 days between touches"
    }
  ],
  "default": "medium"
}
```

#### GET `/api/v1/contacts/:id/warmth/mode`
Returns the current warmth mode and score for a contact.

**Response:**
```json
{
  "contact_id": "uuid",
  "current_mode": "medium",
  "current_score": 65,
  "current_band": "warm",
  "last_interaction_at": "2025-10-20T10:00:00Z"
}
```

#### PATCH `/api/v1/contacts/:id/warmth/mode`
Changes the warmth mode and recalculates the score immediately.

**Request:**
```json
{
  "mode": "fast"
}
```

**Response:**
```json
{
  "contact_id": "uuid",
  "mode_before": "medium",
  "mode_after": "fast",
  "score_before": 65,
  "score_after": 25,
  "band_after": "cool",
  "changed_at": "2025-11-02T14:00:00Z"
}
```

---

### 2. Exponential Decay Formula

The backend uses this formula to calculate warmth scores:

```
W(t) = Wmin + (W0 - Wmin) * e^(-λ * Δt)

Where:
- W(t) = Warmth score at time t
- W0 = 100 (initial score after interaction)
- Wmin = 0 (minimum score)
- λ = Decay constant (varies by mode)
- Δt = Days since last interaction
```

**Decay Constants:**
- **Slow**: λ = 0.040132 (half-life ~17 days)
- **Medium**: λ = 0.085998 (half-life ~8 days)
- **Fast**: λ = 0.171996 (half-life ~4 days)
- **Test**: λ = 2.407946 (half-life ~7 hours, for testing)

---

### 3. Frontend Components

#### `WarmthModeSelector` Component
Location: `/components/WarmthModeSelector.tsx`

A React Native component that displays three mode buttons (Slow, Medium, Fast) with icons and descriptions.

**Features:**
- Visual feedback with icons (Clock, Wind, Zap)
- Color-coded active state
- Loading indicator during mode change
- Alert showing score change
- Auto-updates WarmthProvider cache

**Props:**
```typescript
interface WarmthModeSelectorProps {
  contactId: string;
  contactName?: string;
  currentMode?: 'slow' | 'medium' | 'fast';
  currentScore?: number;
  onModeChange?: (mode: WarmthMode, newScore: number) => void;
}
```

---

### 4. Integration Points

#### Contact Detail Screen
Location: `/app/contact/[id].tsx`

The WarmthModeSelector is integrated directly below the warmth score indicator on the contact detail screen.

**Implementation:**
```typescript
<WarmthModeSelector
  contactId={contact.id}
  contactName={contact.display_name}
  currentMode={(contact as any).warmth_mode || 'medium'}
  currentScore={warmth.score}
  onModeChange={(mode, newScore) => {
    refetchAll();
    screenAnalytics.track('warmth_mode_changed', {
      contactId: contact.id,
      newMode: mode,
      scoreChange: newScore - warmth.score,
    });
  }}
/>
```

---

### 5. Data Model Updates

#### Person Type (`storage/types.ts`)
```typescript
export type Person = {
  // ... existing fields
  warmth?: number;
  warmth_mode?: 'slow' | 'medium' | 'fast' | 'test';
  // ... rest of fields
};
```

#### Database Schema
Run the migration: `/docs/WARMTH_MODES_MIGRATION.sql`

```sql
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS warmth_mode TEXT DEFAULT 'medium' 
CHECK (warmth_mode IN ('slow', 'medium', 'fast', 'test'));

CREATE INDEX IF NOT EXISTS idx_contacts_warmth_mode ON contacts(warmth_mode);
```

---

## User Experience Flow

1. **User opens contact detail page**
   - Sees current warmth score and mode
   - Mode selector shows three options

2. **User taps a different mode**
   - Component shows loading state
   - Backend recalculates score using new decay formula
   - WarmthProvider cache updates immediately
   - Alert shows before/after score
   - Contact data refreshes

3. **Real-time mode switching example**
   ```
   Contact: Jane Doe
   Last interaction: 10 days ago
   
   Mode: Slow → Score: 75 (decays slowly)
   Mode: Medium → Score: 55 (decays moderately)
   Mode: Fast → Score: 25 (decays quickly)
   
   User switches: Slow → Fast
   Result: Score instantly drops from 75 → 25
   Future: Continues to decay at fast rate
   ```

---

## Analytics Events

The following events are tracked:

- `warmth_mode_changed`: When user changes a contact's mode
  - `contactId`: Contact UUID
  - `newMode`: Selected mode (slow/medium/fast)
  - `scoreChange`: Difference in score

---

## Testing Checklist

- [ ] Run database migration on Supabase
- [ ] Deploy backend changes to Vercel
- [ ] Test GET `/api/v1/warmth/modes` endpoint
- [ ] Test GET `/api/v1/contacts/:id/warmth/mode` endpoint
- [ ] Test PATCH `/api/v1/contacts/:id/warmth/mode` endpoint
- [ ] Verify mode selector renders on contact detail
- [ ] Test switching between all three modes
- [ ] Verify score recalculates correctly
- [ ] Verify WarmthProvider cache updates
- [ ] Test with contacts having different last_interaction_at dates
- [ ] Verify analytics events fire correctly

---

## Files Created/Modified

### Created:
- `backend-vercel/app/api/v1/warmth/modes/route.ts`
- `backend-vercel/app/api/v1/contacts/[id]/warmth/mode/route.ts`
- `components/WarmthModeSelector.tsx`
- `docs/WARMTH_MODES_MIGRATION.sql`
- `docs/WARMTH_MODES_IMPLEMENTATION.md` (this file)

### Modified:
- `storage/types.ts` - Added `warmth_mode` field to Person type
- `app/contact/[id].tsx` - Integrated WarmthModeSelector component

---

## Next Steps

### Optional Enhancements:

1. **Bulk Mode Change**
   - Allow changing mode for multiple contacts at once
   - Useful for setting all clients to "fast" mode

2. **Mode History**
   - Track when modes change
   - Endpoint: GET `/api/v1/contacts/:id/warmth/mode-history`

3. **Smart Defaults**
   - Suggest mode based on contact tags/role
   - VIP/client → fast, colleague → medium, casual → slow

4. **Next Reachout Estimate**
   - Calculate when contact will need attention
   - Display countdown: "Needs attention in 3 days"

5. **Mode Insights**
   - Dashboard showing distribution of modes
   - "You have 15 contacts in fast mode"

---

## Architecture Notes

### Centralized Warmth Source
The implementation follows the principle of a single source of truth:

- **Backend** calculates and stores warmth scores
- **WarmthProvider** caches scores for display
- **Mode changes** trigger immediate recalculation
- **Real-time updates** via Supabase subscriptions keep UI in sync

### Performance Considerations

- Mode switching is instant (single API call)
- Score calculation is O(1) using exponential formula
- No batch recomputation needed
- Index on `warmth_mode` column for efficient filtering

---

## Known Limitations

1. **Test mode** (`~12 hours`) should only be used in development
2. Mode changes don't retroactively affect warmth history
3. Current implementation doesn't track mode change history (optional enhancement)

---

## Support & Documentation

- API Reference: `/backend-vercel/openapi/openapi.json`
- Component Docs: See component file headers
- Database Schema: `/docs/WARMTH_MODES_MIGRATION.sql`

---

**Implementation Date**: November 2, 2025  
**Status**: ✅ Complete and ready for testing
