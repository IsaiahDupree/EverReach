# Theme Architecture Guide

## Overview

EverReach uses a **centralized theme system** that supports light/dark modes with high-contrast variants. All screens should use theme tokens instead of hardcoded colors.

## Current Status

✅ **Working:**
- `ThemeProvider` with light/dark/auto modes
- High-contrast variants
- Design tokens (colors, spacing, typography, shadows)
- System preference detection

❌ **Needs Improvement:**
- Many screens still use hardcoded colors
- Inconsistent styling across pages
- Manual theme handling in each component

## Architecture

### 1. Theme Provider
Location: `providers/ThemeProvider.tsx`

```typescript
import { useTheme } from '@/providers/ThemeProvider';

const { theme, toggleTheme, isDark } = useTheme();
```

### 2. Design Tokens
Location: `constants/design-tokens.ts`

**Available tokens:**
- `lightColors` / `darkColors` - Color palettes
- `spacing` - Consistent spacing scale
- `borderRadius` - Border radius values
- `typography` - Font sizes, weights, line heights
- `shadows` - Shadow presets

### 3. Themed Styles (NEW)
Location: `constants/themedStyles.ts`

**Reusable style generator:**
```typescript
import { createCommonStyles, getIconColor } from '@/constants/themedStyles';

function MyScreen() {
  const { theme } = useTheme();
  const common = createCommonStyles(theme);
  
  return (
    <View style={common.container}>
      <Text style={common.title}>Hello World</Text>
      <TouchableOpacity style={common.primaryButton}>
        <Text style={common.primaryButtonText}>Click Me</Text>
      </TouchableOpacity>
    </View>
  );
}
```

## Migration Guide

### ❌ Before (Hardcoded)

```typescript
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', // ❌ Hardcoded
  },
  title: {
    fontSize: 28,
    color: '#111827', // ❌ Hardcoded
  },
  button: {
    backgroundColor: '#007AFF', // ❌ Hardcoded
  },
});
```

### ✅ After (Themed)

```typescript
// Option 1: Use common styles
const { theme } = useTheme();
const common = createCommonStyles(theme);

return <View style={common.container}>...</View>;

// Option 2: Create custom themed styles
const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background, // ✅ Themed
  },
  title: {
    fontSize: theme.typography.fontSizes.xxxl, // ✅ Themed
    color: theme.colors.text, // ✅ Themed
  },
  button: {
    backgroundColor: theme.colors.primary, // ✅ Themed
  },
});

// Usage
const { theme } = useTheme();
const styles = useMemo(() => createStyles(theme), [theme]);
```

### Icon Colors

```typescript
// ❌ Before
<Mail size={20} color="#6B7280" />

// ✅ After
const iconColor = getIconColor(theme, 'secondary');
<Mail size={20} color={iconColor} />
```

## Common Patterns

### 1. Screen Container

```typescript
function MyScreen() {
  const { theme } = useTheme();
  const common = createCommonStyles(theme);
  
  return (
    <SafeAreaView style={common.safeContainer}>
      <ScrollView contentContainerStyle={common.scrollContent}>
        {/* Content */}
      </ScrollView>
    </SafeAreaView>
  );
}
```

### 2. Form Inputs

```typescript
const common = createCommonStyles(theme);
const iconColor = getIconColor(theme, 'secondary');

<View style={common.inputWrapper}>
  <Mail size={20} color={iconColor} style={common.inputIcon} />
  <TextInput
    style={common.input}
    placeholderTextColor={theme.colors.textTertiary}
  />
</View>
```

### 3. Buttons

```typescript
// Primary button
<TouchableOpacity style={common.primaryButton}>
  <Text style={common.primaryButtonText}>Submit</Text>
</TouchableOpacity>

// Secondary button
<TouchableOpacity style={common.secondaryButton}>
  <Text style={common.secondaryButtonText}>Cancel</Text>
</TouchableOpacity>

// Text button
<TouchableOpacity style={common.textButton}>
  <Text style={common.textButtonText}>Forgot Password?</Text>
</TouchableOpacity>
```

### 4. Error/Success States

```typescript
{error && (
  <View style={common.errorBox}>
    <AlertCircle size={18} color={theme.colors.error} />
    <Text style={common.errorText}>{error}</Text>
  </View>
)}

{success && (
  <View style={common.successBox}>
    <CheckCircle size={18} color={theme.colors.success} />
    <Text style={common.successText}>{success}</Text>
  </View>
)}
```

### 5. Modals

```typescript
<Modal visible={visible} transparent animationType="fade">
  <View style={common.modalOverlay}>
    <View style={common.modalContent}>
      <Text style={common.modalTitle}>Title</Text>
      <Text style={common.modalMessage}>Message</Text>
      {/* Actions */}
    </View>
  </View>
</Modal>
```

## Available Common Styles

### Containers
- `container` - Basic full screen container
- `safeContainer` - SafeArea-aware container
- `centerContainer` - Centered content
- `scrollContent` - ScrollView content padding

### Cards & Surfaces
- `card` - Primary card
- `cardSecondary` - Secondary/subtle card

### Text
- `title` - Large heading
- `subtitle` - Medium heading
- `body` - Body text
- `caption` - Small text
- `label` - Form labels

### Buttons
- `primaryButton` / `primaryButtonText`
- `secondaryButton` / `secondaryButtonText`
- `textButton` / `textButtonText`
- `disabledButton`

### Forms
- `inputWrapper` - Input container
- `input` - Text input
- `inputIcon` - Icon in input

### Feedback
- `errorBox` / `errorText`
- `successBox` / `successText`
- `loadingContainer` / `loadingText`

### Other
- `divider` - Simple divider
- `dividerWithText` - Divider with label
- `modalOverlay` / `modalContent` / `modalTitle` / `modalMessage`
- `listItem` / `listItemTitle` / `listItemSubtitle`
- `badge` / `badgeText`

## Theme Toggle

Add a theme toggle in settings:

```typescript
import { useTheme } from '@/providers/ThemeProvider';

function SettingsScreen() {
  const { theme, themeMode, toggleTheme } = useTheme();
  
  return (
    <TouchableOpacity onPress={toggleTheme}>
      <Text>Theme: {themeMode}</Text>
      <Text>Current: {theme.isDark ? 'Dark' : 'Light'}</Text>
    </TouchableOpacity>
  );
}
```

## Migration Priority

1. **High Priority** (User-facing screens):
   - ✅ sign-in.tsx
   - ✅ _layout.tsx (headers)
   - home.tsx
   - contact/[id].tsx
   - (tabs)/ screens

2. **Medium Priority**:
   - Modal screens
   - Settings screens
   - Form screens

3. **Low Priority**:
   - Test/debug screens
   - Admin screens

## Testing Themes

To test themes in development:
1. Toggle theme in app settings
2. Check both light and dark modes
3. Test high-contrast mode for accessibility
4. Verify all colors adapt properly

## Color Reference

### Light Theme Colors
- Background: `#FFFFFF`
- Text: `#000000` → `#8E8E93` (tertiary)
- Primary: `#007AFF`
- Surface: `#FFFFFF` → `#F2F2F7` (tertiary)
- Border: `#C6C6C8` → `#E5E5EA` (light)

### Dark Theme Colors
- Background: `#000000`
- Text: `#FFFFFF` → `#8E8E93` (tertiary)
- Primary: `#0A84FF`
- Surface: `#1C1C1E` → `#3A3A3C` (tertiary)
- Border: `#38383A` → `#48484A` (light)

## Best Practices

1. ✅ **Always use theme tokens** - Never hardcode colors
2. ✅ **Use common styles** - Leverage `createCommonStyles()` when possible
3. ✅ **Memoize custom styles** - Use `useMemo()` for custom themed styles
4. ✅ **Test both themes** - Always check light and dark modes
5. ✅ **Use semantic colors** - Use `text`, `textSecondary`, not `#000` or `#FFF`
6. ✅ **Consistent spacing** - Use `theme.spacing` values
7. ✅ **Consistent typography** - Use `theme.typography` values

## Next Steps

1. **Refactor sign-in page** to use themed styles
2. **Update all hardcoded colors** in existing screens
3. **Add theme toggle** in settings
4. **Document custom themed components**
5. **Create theme testing checklist**
