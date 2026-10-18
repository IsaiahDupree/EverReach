# Navigation Architecture

**Date**: October 25, 2025  
**Purpose**: Document navigation structure to avoid nested tab issues

---

## 🎯 Problem Solved

**Issue**: Navigating from tab screens to modals created nested navigation stacks that caused:
- Confusing back button behavior
- "(tabs)" text showing in headers
- Hard-to-debug navigation flows
- Poor user experience

**Solution**: Flat navigation architecture with clear separation between regular screens and modals.

---

## 📐 Architecture Overview

### **Root Level Structure**
```
app/
├── _layout.tsx           # Root navigator
├── (tabs)/               # Bottom tab navigator
│   ├── index.tsx         # Dashboard
│   ├── people.tsx        # People list
│   ├── settings.tsx      # Settings
│   └── ...
├── contact/[id].tsx      # Regular screen (pushed)
├── goal-picker.tsx       # Modal (presented over everything)
├── message-results.tsx   # Modal (presented over everything)
└── ...
```

### **Navigation Hierarchy**

```
Root Stack Navigator
  │
  ├─ (tabs) - Bottom Tab Navigator
  │    ├─ Dashboard
  │    ├─ People
  │    └─ Settings
  │
  ├─ Regular Screens (push)
  │    ├─ contact/[id]
  │    ├─ warmth-settings
  │    └─ personal-notes
  │
  └─ Modal Screens (present)
       ├─ goal-picker
       ├─ message-results
       ├─ add-contact
       └─ voice-note
```

---

## 🔄 Navigation Patterns

### **1. Tab Navigation (Bottom Tabs)**
```tsx
// From one tab to another
router.push('/(tabs)/people');
```

### **2. Regular Screen Navigation (Push)**
```tsx
// From tab to detail screen
router.push(`/contact/${contactId}`);

// From detail to another regular screen
router.push('/warmth-settings');
```

### **3. Modal Navigation (Present)**
```tsx
// From ANY screen to modal (including tabs and detail screens)
router.push(`/goal-picker?personId=${personId}&channel=sms`);

// From modal back
router.back(); // or router.dismiss()
```

---

## ✅ Modal Configuration

All modal screens in `app/_layout.tsx` are configured with:

```tsx
<Stack.Screen 
  name="goal-picker" 
  options={{ 
    presentation: "fullScreenModal",  // Full screen modal (root-level)
    headerShown: true,                // Show header with close button
    title: "Pick Goal",               // Header title
    animation: "slide_from_bottom",   // Slide up animation
    gestureEnabled: true,             // Can swipe down to dismiss
    gestureDirection: "vertical"      // Vertical swipe gesture
  }} 
/>
```

**Key: `presentation: "fullScreenModal"`** ensures the modal is presented at the root level, not nested within the current navigation stack.

### **Why This Works:**
- ✅ **Flat hierarchy** - Modals are at root level, not nested in tabs
- ✅ **Clear UX** - Users see modal slide up from bottom
- ✅ **Easy dismissal** - Swipe down or tap close button
- ✅ **No navigation confusion** - Modal is temporary, doesn't affect tab state

---

## 🚫 Anti-Patterns (What NOT to Do)

### **❌ DON'T: Nest modals inside tabs**
```tsx
// Bad - creates nested navigation
(tabs)/
  └── people/
      └── [id]/
          └── goal-picker/  // ❌ Nested too deep
```

### **❌ DON'T: Use router.push() for all navigation**
```tsx
// Bad - everything in same stack
router.push('/screen1');
router.push('/screen2');
router.push('/screen3');
// Creates: screen1 > screen2 > screen3 (hard to navigate back)
```

### **✅ DO: Use modals for temporary flows**
```tsx
// Good - modal is independent
Contact Detail Screen → (modal) Goal Picker → (modal) Message Results
// When dismissed, returns to Contact Detail
```

---

## 📱 User Experience Flow

### **Example: Crafting a Message**

```
1. User is in People tab
   └── Taps contact

2. Opens Contact Detail screen (pushed)
   └── Taps "Craft" button

3. Goal Picker modal slides up (presented as modal)
   ├── Slides up from bottom
   ├── Overlays entire app (including tabs)
   └── Can swipe down to dismiss

4. User picks goal → Message Results modal (presented as modal)
   ├── Replaces Goal Picker
   └── Can swipe down or tap close

5. User finishes → Back to Contact Detail
   └── Tab state preserved
   └── No weird nested navigation
```

---

## 🛠️ Implementation Checklist

When adding new screens:

### **Regular Screen**
- [ ] Add to `app/` directory
- [ ] Configure in `_layout.tsx` with `headerShown: true`
- [ ] Navigate with `router.push()`

### **Modal Screen**
- [ ] Add to `app/` directory
- [ ] Configure in `_layout.tsx` with:
  - [ ] `presentation: "modal"`
  - [ ] `animation: "slide_from_bottom"`
  - [ ] `gestureEnabled: true`
  - [ ] `gestureDirection: "vertical"`
- [ ] Navigate with `router.push()` (works because of modal config)
- [ ] Add close button in header or UI

---

## 🔍 Debugging Navigation Issues

### **Symptoms of Nested Navigation:**
- "(tabs)" text showing in back buttons
- Multiple back presses needed to return
- Tab state getting lost
- Header titles not updating correctly

### **Fixes:**
1. Check if screen should be modal
2. Verify modal configuration in `_layout.tsx`
3. Ensure `headerBackTitle: ''` is set in screen options
4. Use `router.back()` or `router.dismiss()` for modals

---

## 📚 Further Reading

- [Expo Router Modals](https://docs.expo.dev/router/advanced/modals/)
- [React Navigation Stack](https://reactnavigation.org/docs/stack-navigator/)
- [Navigation Best Practices](https://reactnavigation.org/docs/navigation-best-practices/)

---

**Last Updated**: October 25, 2025  
**Status**: Implemented ✅
