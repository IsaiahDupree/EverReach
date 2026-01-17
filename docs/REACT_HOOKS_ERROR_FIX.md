# React Hooks Error Fix

**Date:** November 1, 2025  
**Error:** "Rendered fewer hooks than expected. This may be caused by an accidental early return statement."

---

## Problem

The ContactContext screen had an early return statement that violated React's **Rules of Hooks**:

```typescript
export default function ContactContextScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { people, getWarmthStatus, getWarmthScore } = usePeople();
  // ... more hooks ...
  
  // ❌ WRONG: Early return BEFORE all hooks are called
  if (!person) {
    return <ErrorView />;
  }
  
  // More hooks here would violate Rules of Hooks
  const warmthStatus = getWarmthStatus(person.id);
  // ...
}
```

### React Rules of Hooks

React requires that:
1. **Hooks must be called in the same order** on every render
2. **Hooks cannot be called conditionally** (after early returns, in if statements, etc.)
3. **All hooks must always execute** - no early returns before all hooks are called

The early return on line 331 caused hooks to be skipped on subsequent renders, violating rule #1.

---

## Solution

**Move the early return to AFTER all hooks have been called:**

```typescript
export default function ContactContextScreen() {
  // ✅ Call ALL hooks first
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { people, getWarmthStatus, getWarmthScore } = usePeople();
  const { getByPerson } = useInteractions();
  const queryClient = useQueryClient();
  const { theme } = useAppSettings();
  const { isPaid } = useSubscription();
  const { voiceNotes: allVoiceNotes } = useVoiceNotes();
  const screenAnalytics = useAnalytics('ContactContext');
  
  // All useState hooks
  const [activeTab, setActiveTab] = useState<TabType>('notes');
  const [textNotes, setTextNotes] = useState<TextNote[]>([]);
  // ... all other state ...
  
  // All useEffect hooks
  useEffect(() => { /* ... */ }, [screenWidth]);
  useEffect(() => { /* ... */ }, [requestedTabParam, screenWidth]);
  useEffect(() => { /* ... */ }, [bundleQuery.data]);
  // ... all other effects ...
  
  // All useCallback hooks
  const loadTextNotes = useCallback(async () => { /* ... */ }, [id]);
  const loadInteractions = useCallback(async () => { /* ... */ }, [id, getByPerson]);
  // ... all other callbacks ...
  
  // Other hooks
  const bundleQuery = useContactBundle(typeof id === 'string' ? id : '');
  useFocusEffect(useCallback(() => { /* ... */ }, [id]));
  
  // Derived values with safe fallbacks
  const person = people.find(p => p.id === id);
  const warmthStatus = person ? getWarmthStatus(person.id) : 'cold';
  const warmthScore = person ? getWarmthScore(person.id) : 0;
  const personTheme = person?.theme;
  const themeKey = (personTheme && PipelineThemes.includes(personTheme)) ? personTheme : 'networking';
  const themeColors = ThemeColors[themeKey];
  const personName = person?.fullName || person?.name || 'Unknown';
  const personInitial = person?.fullName?.charAt(0).toUpperCase() || person?.name?.charAt(0).toUpperCase() || '?';
  const personPhone = person?.phones?.[0] || '';
  
  // ✅ NOW check for error state AFTER all hooks
  if (!person) {
    return (
      <AuthGate requireAuth>
        <ContactBundleProvider contactId={typeof id === 'string' ? id : ''}>
          <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Contact not found</Text>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Text style={styles.backButtonText}>Go Back</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </ContactBundleProvider>
      </AuthGate>
    );
  }
  
  // ✅ Normal render with person guaranteed to be defined
  return (
    <AuthGate requireAuth>
      {/* ... normal content ... */}
    </AuthGate>
  );
}
```

---

## Key Changes

### 1. Removed Early Return (Line 331)
**Before:**
```typescript
if (!person) {
  return <ErrorView />;  // ❌ Early return
}
const warmthStatus = getWarmthStatus(person.id);  // Would be skipped!
```

**After:**
```typescript
const warmthStatus = person ? getWarmthStatus(person.id) : 'cold';  // ✅ Safe fallback
const warmthScore = person ? getWarmthScore(person.id) : 0;
```

### 2. Added Safe Fallbacks for Derived Values
```typescript
// Use optional chaining and fallbacks
const personTheme = person?.theme;
const themeKey = (personTheme && PipelineThemes.includes(personTheme)) ? personTheme : 'networking';
const personName = person?.fullName || person?.name || 'Unknown';
const personInitial = person?.fullName?.charAt(0).toUpperCase() || person?.name?.charAt(0).toUpperCase() || '?';
const personPhone = person?.phones?.[0] || '';
```

### 3. Moved Error State Check to End (After Line 1517)
```typescript
// Show error state if person not found
if (!person) {
  return <ErrorView />;
}

// After this point, person is guaranteed to be defined
return <NormalView />;
```

---

## Why This Works

### Hooks Execution Order
**Before (WRONG):**
```
Render 1: Hook1 → Hook2 → Hook3 → [person exists] → Hook4 → Hook5
Render 2: Hook1 → Hook2 → Hook3 → [person missing] → RETURN → Hook4 and Hook5 SKIPPED ❌
```

**After (CORRECT):**
```
Render 1: Hook1 → Hook2 → Hook3 → Hook4 → Hook5 → [person exists] → Render
Render 2: Hook1 → Hook2 → Hook3 → Hook4 → Hook5 → [person missing] → Error View ✅
```

All hooks execute every time, in the same order!

---

## Testing

### Verify Fix Works
1. Navigate to Contact Context page with valid contact → should work
2. Navigate to Contact Context page with invalid ID → should show error
3. Check console - **no more "Rendered fewer hooks" error** ✅
4. Check that contact info displays correctly
5. Verify all tabs work (Details, History, Notes, Activity, Insights)

### Edge Cases
- Contact loads slowly (person is undefined initially, then loads) ✅
- Contact ID changes while on page ✅
- User navigates back before contact loads ✅

---

## File Changed

- **`app/contact-context/[id].tsx`**
  - Lines 331-341: Added safe fallbacks for person data
  - Lines 1517-1534: Moved error state check to after all hooks

---

## Summary

**Root Cause:** Early return before all hooks were called  
**Solution:** Move early return to after all hooks  
**Result:** Hooks always execute in same order, React is happy! ✅

The error "Rendered fewer hooks than expected" is now **permanently fixed**.
