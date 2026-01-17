# Frontend Implementation Guide: Warmth Mode Switching Fix

## 🎯 Overview

This guide covers fixing the warmth mode switching redundancy issues in the mobile app.

**Problem:** 3 identical API calls are made when changing warmth mode  
**Impact:** Wasted requests, poor UX, potential race conditions  
**Priority:** 🟡 MEDIUM  
**Estimated Effort:** 1-2 hours

---

## 🐛 Current Issue

### The Problem

When user changes warmth mode, the app makes **3 identical API calls**:

```
User taps "Fast" mode
  ↓
POST /warmth/mode {"mode": "fast"}  ← Call #1
  ↓
State updates → Re-render
  ↓
POST /warmth/mode {"mode": "fast"}  ← Call #2 (DUPLICATE!)
  ↓
Re-render again
  ↓
POST /warmth/mode {"mode": "fast"}  ← Call #3 (DUPLICATE!)
```

Additionally, after each `/warmth/mode` call, there's a redundant `PATCH /contacts/:id` call.

### Logs Evidence

```javascript
🌐 URL: https://ever-reach-be.vercel.app/api/v1/contacts/6d115bd9.../warmth/mode
📦 Body: {"mode":"fast"}
// ... 10 seconds later ...
🌐 URL: https://ever-reach-be.vercel.app/api/v1/contacts/6d115bd9.../warmth/mode
📦 Body: {"mode":"fast"}  // DUPLICATE!
// ... 10 seconds later ...
🌐 URL: https://ever-reach-be.vercel.app/api/v1/contacts/6d115bd9.../warmth/mode
📦 Body: {"mode":"fast"}  // DUPLICATE!
```

---

## ✅ Backend Changes (Already Fixed)

The backend now returns early when switching to the same mode:

**Response when mode unchanged:**
```json
{
  "contact_id": "...",
  "mode_before": "fast",
  "mode_after": "fast",
  "score_before": 38,
  "score_after": 38,
  "message": "Already in fast mode. No change needed."
}
```

This prevents unnecessary database updates, but **doesn't solve the frontend redundancy**.

---

## 🔧 Frontend Fixes Required

### Fix #1: Add Loading State Guard (CRITICAL)

**File:** Contact detail screen or warmth mode selector component

**Problem:** Multiple rapid calls due to re-renders

**Solution:**

```typescript
// Before (causes duplicates):
const handleModeChange = async (newMode: WarmthMode) => {
  await updateWarmthMode(contact.id, newMode);
  // State updates → re-render → calls handleModeChange again!
};

// After (prevents duplicates):
const [isUpdatingMode, setIsUpdatingMode] = useState(false);

const handleModeChange = async (newMode: WarmthMode) => {
  // Early return if already updating
  if (isUpdatingMode) return;
  
  setIsUpdatingMode(true);
  try {
    const result = await updateWarmthMode(contact.id, newMode);
    
    // Update local state with result
    setContact(prev => ({
      ...prev,
      warmth_mode: result.mode_after,
      warmth: result.score_after,
      warmth_band: result.band_after
    }));
  } catch (error) {
    console.error('Failed to update warmth mode:', error);
    Alert.alert('Error', 'Failed to update warmth mode');
  } finally {
    setIsUpdatingMode(false);
  }
};
```

**Why This Works:**
- `isUpdatingMode` prevents concurrent calls
- State is only updated once after successful API response
- Error handling prevents stuck loading state

---

### Fix #2: Remove Redundant Contact Update

**File:** Contact update logic (likely in repository or API client)

**Problem:** After calling `/warmth/mode`, the app also calls `PATCH /contacts/:id` with the same `warmth_mode` value.

**Current Code (Redundant):**
```typescript
// Step 1: Update warmth mode via dedicated endpoint
await updateWarmthMode(contactId, mode); // ✅ Good

// Step 2: Update entire contact (includes warmth_mode)
await updateContact(contactId, {
  display_name: contact.name,
  emails: contact.emails,
  // ... other fields
  warmth_mode: mode  // ❌ REDUNDANT! Backend already updated this
});
```

**Fixed Code (Efficient):**
```typescript
// Only call warmth mode endpoint
const result = await updateWarmthMode(contactId, mode);

// Update local state from response (no second API call needed)
setContact(prev => ({
  ...prev,
  warmth_mode: result.mode_after,
  warmth: result.score_after,
  warmth_band: result.band_after
}));
```

**Why This Works:**
- `/warmth/mode` endpoint already updates the database
- Response includes all updated values
- No need for second PATCH call

---

### Fix #3: Check Mode Before Calling API

**File:** Warmth mode selector component

**Problem:** Calling API even when mode hasn't changed

**Solution:**

```typescript
const handleModeChange = async (newMode: WarmthMode) => {
  // Early return if mode unchanged
  if (contact.warmth_mode === newMode) {
    console.log('Mode unchanged, skipping API call');
    return;
  }
  
  if (isUpdatingMode) return;
  
  setIsUpdatingMode(true);
  try {
    const result = await updateWarmthMode(contact.id, newMode);
    setContact(prev => ({
      ...prev,
      warmth_mode: result.mode_after,
      warmth: result.score_after,
      warmth_band: result.band_after
    }));
  } finally {
    setIsUpdatingMode(false);
  }
};
```

---

### Fix #4: Debounce Mode Changes (Optional)

**File:** Warmth mode selector component

**Use Case:** If user rapidly taps different modes

**Solution:**

```typescript
import { useMemo, useCallback } from 'react';
import { debounce } from 'lodash';

const debouncedUpdateMode = useMemo(
  () => debounce(async (contactId: string, mode: WarmthMode) => {
    const result = await updateWarmthMode(contactId, mode);
    return result;
  }, 500),
  []
);

const handleModeChange = useCallback((newMode: WarmthMode) => {
  // Update UI immediately (optimistic)
  setLocalMode(newMode);
  
  // Debounced API call
  debouncedUpdateMode(contact.id, newMode)
    .then(result => {
      // Update with server response
      setContact(prev => ({
        ...prev,
        warmth_mode: result.mode_after,
        warmth: result.score_after
      }));
    })
    .catch(error => {
      // Rollback on error
      setLocalMode(contact.warmth_mode);
      Alert.alert('Error', 'Failed to update mode');
    });
}, [contact.id, contact.warmth_mode]);
```

---

## 📝 Complete Implementation Example

### Option A: Simple Fix (Recommended for MVP)

```typescript
// components/WarmthModeSelector.tsx
import { useState } from 'react';
import { View, Pressable, Text, ActivityIndicator } from 'react-native';

type WarmthMode = 'slow' | 'medium' | 'fast';

interface Props {
  contactId: string;
  currentMode: WarmthMode;
  onModeChanged?: (mode: WarmthMode) => void;
}

export function WarmthModeSelector({ contactId, currentMode, onModeChanged }: Props) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedMode, setSelectedMode] = useState(currentMode);

  const modes: WarmthMode[] = ['slow', 'medium', 'fast'];
  const modeLabels = {
    slow: 'Slow (30 days)',
    medium: 'Medium (14 days)',
    fast: 'Fast (7 days)'
  };

  const handleModePress = async (newMode: WarmthMode) => {
    // Prevent duplicate calls
    if (isUpdating) return;
    
    // Skip if unchanged
    if (newMode === selectedMode) return;

    setIsUpdating(true);
    try {
      // Call API
      const response = await fetch(
        `https://ever-reach-be.vercel.app/api/v1/contacts/${contactId}/warmth/mode`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ mode: newMode })
        }
      );

      if (!response.ok) throw new Error('Failed to update mode');

      const result = await response.json();
      
      // Update local state
      setSelectedMode(result.mode_after);
      
      // Notify parent
      onModeChanged?.(result.mode_after);

    } catch (error) {
      console.error('Failed to update warmth mode:', error);
      Alert.alert('Error', 'Failed to update warmth mode');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Warmth Decay Mode</Text>
      
      {isUpdating && (
        <ActivityIndicator size="small" color="#7c3aed" />
      )}

      <View style={styles.modesContainer}>
        {modes.map(mode => (
          <Pressable
            key={mode}
            style={[
              styles.modeButton,
              selectedMode === mode && styles.modeButtonActive,
              isUpdating && styles.modeButtonDisabled
            ]}
            onPress={() => handleModePress(mode)}
            disabled={isUpdating}
          >
            <Text
              style={[
                styles.modeButtonText,
                selectedMode === mode && styles.modeButtonTextActive
              ]}
            >
              {modeLabels[mode]}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#374151',
  },
  modesContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  modeButtonActive: {
    borderColor: '#7c3aed',
    backgroundColor: '#f5f3ff',
  },
  modeButtonDisabled: {
    opacity: 0.5,
  },
  modeButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
  },
  modeButtonTextActive: {
    color: '#7c3aed',
    fontWeight: '600',
  },
});
```

---

### Option B: With Optimistic Updates

```typescript
export function WarmthModeSelector({ contactId, currentMode, onModeChanged }: Props) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedMode, setSelectedMode] = useState(currentMode);
  const [previousMode, setPreviousMode] = useState(currentMode);

  const handleModePress = async (newMode: WarmthMode) => {
    if (isUpdating || newMode === selectedMode) return;

    // Optimistic update
    setPreviousMode(selectedMode);
    setSelectedMode(newMode);
    setIsUpdating(true);

    try {
      const response = await fetch(
        `https://ever-reach-be.vercel.app/api/v1/contacts/${contactId}/warmth/mode`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ mode: newMode })
        }
      );

      if (!response.ok) throw new Error('Failed to update mode');

      const result = await response.json();
      
      // Confirm with server response
      setSelectedMode(result.mode_after);
      onModeChanged?.(result.mode_after);

    } catch (error) {
      console.error('Failed to update warmth mode:', error);
      
      // Rollback on error
      setSelectedMode(previousMode);
      
      Alert.alert(
        'Error',
        'Failed to update warmth mode. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    // ... same JSX as Option A
  );
}
```

---

## 🧪 Testing Checklist

### Before Fix
- [ ] Open contact detail screen
- [ ] Tap warmth mode selector
- [ ] Observe network tab: 3 identical calls made
- [ ] Contact PATCH also called with same data

### After Fix
- [ ] Open contact detail screen
- [ ] Tap warmth mode selector (different mode)
- [ ] **Only 1 API call** to `/warmth/mode`
- [ ] No redundant PATCH to `/contacts/:id`
- [ ] Loading indicator shows during update
- [ ] UI updates correctly after successful response
- [ ] Error handling works (test with airplane mode)
- [ ] Tapping same mode again does nothing (no API call)
- [ ] Rapidly tapping modes doesn't cause duplicates

### Edge Cases
- [ ] Test with slow network (loading state works)
- [ ] Test switching modes rapidly (debouncing works)
- [ ] Test error recovery (rollback works)
- [ ] Test with multiple contacts (no state leaks)

---

## 📊 Performance Impact

### Before Fix
- **API Calls:** 3 × mode change
- **Network Time:** ~3 seconds total (3 × 1s)
- **Database Writes:** 3 × unnecessary updates
- **User Experience:** Slow, loading states flicker

### After Fix
- **API Calls:** 1 × mode change ✅
- **Network Time:** ~1 second ✅
- **Database Writes:** 1 × necessary update ✅
- **User Experience:** Fast, smooth ✅

**Improvement:** 66% reduction in API calls, 3x faster

---

## 🎨 UI/UX Improvements

### Loading State

```typescript
{isUpdating && (
  <View style={styles.loadingOverlay}>
    <ActivityIndicator size="small" color="#7c3aed" />
    <Text style={styles.loadingText}>Updating mode...</Text>
  </View>
)}
```

### Success Feedback

```typescript
// After successful update
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

// Optional: Show toast
Toast.show({
  type: 'success',
  text1: 'Warmth mode updated',
  text2: `Switched to ${result.mode_after} mode`
});
```

### Error Feedback

```typescript
// After error
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

Alert.alert(
  'Update Failed',
  'Could not update warmth mode. Please check your connection and try again.',
  [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Retry', onPress: () => handleModePress(newMode) }
  ]
);
```

---

## 🔍 Debugging Tips

### Check Current Implementation

1. **Find the warmth mode selector:**
   ```bash
   # Search for mode selector component
   grep -r "warmth.*mode" app/
   grep -r "WarmthMode" app/
   ```

2. **Find API call location:**
   ```bash
   # Search for warmth mode API calls
   grep -r "/warmth/mode" app/
   grep -r "updateWarmthMode" app/
   ```

3. **Check for contact update calls:**
   ```bash
   # Look for PATCH /contacts calls
   grep -r "PATCH.*contacts" app/
   grep -r "updateContact" app/
   ```

### Add Logging

```typescript
const handleModePress = async (newMode: WarmthMode) => {
  console.log('[WarmthMode] Button pressed:', newMode);
  console.log('[WarmthMode] Current mode:', selectedMode);
  console.log('[WarmthMode] Is updating:', isUpdating);
  
  if (isUpdating) {
    console.log('[WarmthMode] Skipping - already updating');
    return;
  }
  
  if (newMode === selectedMode) {
    console.log('[WarmthMode] Skipping - mode unchanged');
    return;
  }

  console.log('[WarmthMode] Starting API call...');
  setIsUpdating(true);
  
  // ... rest of implementation
};
```

---

## 📚 Related Files

**Files to Modify:**
- Contact detail screen (where warmth mode selector is displayed)
- Warmth mode selector component (if separate)
- Contact repository/API client (remove redundant PATCH)
- Possibly: Contact context/provider (update state management)

**Files to Reference:**
- `backend-vercel/app/api/v1/contacts/[id]/warmth/mode/route.ts` (API contract)
- `WARMTH_MODE_SWITCHING_ISSUES.md` (detailed issue analysis)

---

## 🚀 Deployment Checklist

- [ ] Implement loading state guard
- [ ] Remove redundant contact PATCH
- [ ] Add mode unchanged check
- [ ] Test all user flows
- [ ] Test error scenarios
- [ ] Add logging for debugging
- [ ] Update UI with loading indicators
- [ ] Add haptic feedback
- [ ] Deploy to TestFlight/Internal Testing
- [ ] Monitor API logs for duplicate calls
- [ ] Verify no duplicates in production
- [ ] Update app store submission

---

## 💡 Future Improvements

### 1. Real-time Warmth Score Updates

Currently, warmth scores can get stale. Consider:

```typescript
// Subscribe to warmth score changes
useEffect(() => {
  const subscription = supabase
    .channel(`contact:${contactId}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'contacts',
      filter: `id=eq.${contactId}`
    }, (payload) => {
      setContact(prev => ({
        ...prev,
        warmth: payload.new.warmth,
        warmth_band: payload.new.warmth_band
      }));
    })
    .subscribe();

  return () => subscription.unsubscribe();
}, [contactId]);
```

### 2. Mode Description Tooltips

Add explanations for each mode:

```typescript
const modeDescriptions = {
  slow: 'Warmth decays slowly over ~30 days. Good for distant connections.',
  medium: 'Balanced decay over ~14 days. Default for most contacts.',
  fast: 'Quick decay over ~7 days. Best for high-touch relationships.'
};
```

### 3. Warmth Score Freshness Indicator

Show when score was last updated:

```typescript
<Text style={styles.freshness}>
  Updated {timeAgo(contact.warmth_cached_at)}
</Text>
```

---

**Priority:** 🟡 MEDIUM  
**Estimated Time:** 1-2 hours  
**Impact:** 66% reduction in API calls  
**Dependencies:** Backend fix deployed (commit e59bd04)
