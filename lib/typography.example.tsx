/**
 * Typography Utility - Usage Examples
 * 
 * This file demonstrates how to use the typography utility across your components.
 * Copy these patterns to maintain consistent typography throughout the app.
 */

import React from 'react';
import { View, Text } from 'react-native';
import { typography, createTextStyle, withFontWeight, withColor, combineTextStyles } from './typography';
import { useTheme } from '@/providers/ThemeProvider';

// ============================================================================
// Example 1: Basic Usage with Typography Presets
// ============================================================================

export function BasicTypographyExample() {
  return (
    <View>
      {/* Headings */}
      <Text style={typography.h1}>Page Title (H1)</Text>
      <Text style={typography.h2}>Section Title (H2)</Text>
      <Text style={typography.h3}>Subsection Title (H3)</Text>
      
      {/* Body text */}
      <Text style={typography.body}>
        This is regular body text with comfortable line height for reading.
      </Text>
      <Text style={typography.bodyLarge}>Larger body text for emphasis.</Text>
      <Text style={typography.bodySmall}>Smaller body text for less important content.</Text>
      
      {/* Labels and captions */}
      <Text style={typography.label}>Section Label</Text>
      <Text style={typography.caption}>Caption or helper text</Text>
      <Text style={typography.captionBold}>Bold caption text</Text>
    </View>
  );
}

// ============================================================================
// Example 2: Combining Typography with Theme Colors
// ============================================================================

export function ThemedTypographyExample() {
  const { theme } = useTheme();
  
  return (
    <View>
      {/* Using typography with theme colors */}
      <Text style={[typography.h2, { color: theme.colors.text }]}>
        Themed Heading
      </Text>
      
      <Text style={[typography.body, { color: theme.colors.textSecondary }]}>
        Secondary text that respects dark/light theme
      </Text>
      
      {/* Using withColor helper */}
      <Text style={withColor(typography.h3, theme.colors.primary)}>
        Primary Color Heading
      </Text>
    </View>
  );
}

// ============================================================================
// Example 3: Custom Typography Styles
// ============================================================================

export function CustomTypographyExample() {
  const { theme } = useTheme();
  
  // Create custom text style
  const customStyle = createTextStyle(20, 'bold', 'relaxed');
  
  // Modify existing preset
  const boldBody = withFontWeight(typography.body, 'bold');
  
  // Combine multiple styles
  const primaryBoldHeading = combineTextStyles(
    typography.h3,
    { color: theme.colors.primary },
    { marginBottom: 16 }
  );
  
  return (
    <View>
      <Text style={customStyle}>Custom 20px bold text</Text>
      <Text style={boldBody}>Bold body text</Text>
      <Text style={primaryBoldHeading}>Combined styles</Text>
    </View>
  );
}

// ============================================================================
// Example 4: Button Text Styles
// ============================================================================

export function ButtonTypographyExample() {
  const { theme } = useTheme();
  
  return (
    <View>
      <Text style={[typography.button, { color: '#FFF' }]}>
        Standard Button
      </Text>
      
      <Text style={[typography.buttonSmall, { color: theme.colors.textSecondary }]}>
        Small Button
      </Text>
      
      <Text style={[typography.buttonLarge, { color: theme.colors.primary }]}>
        Large Button
      </Text>
    </View>
  );
}

// ============================================================================
// Example 5: Form Labels and Inputs
// ============================================================================

export function FormTypographyExample() {
  const { theme } = useTheme();
  
  return (
    <View>
      {/* Form field label */}
      <Text style={[typography.label, { color: theme.colors.textSecondary, marginBottom: 8 }]}>
        Email Address
      </Text>
      
      {/* Input placeholder or helper text */}
      <Text style={[typography.caption, { color: theme.colors.textTertiary, marginTop: 4 }]}>
        We'll never share your email
      </Text>
      
      {/* Error message */}
      <Text style={[typography.bodySmall, { color: theme.colors.error, marginTop: 4 }]}>
        Please enter a valid email address
      </Text>
    </View>
  );
}

// ============================================================================
// Example 6: List Items with Mixed Typography
// ============================================================================

export function ListItemTypographyExample() {
  const { theme } = useTheme();
  
  return (
    <View>
      {/* List item title */}
      <Text style={[typography.h5, { color: theme.colors.text }]}>
        Contact Name
      </Text>
      
      {/* List item subtitle */}
      <Text style={[typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 4 }]}>
        Last contacted 3 days ago
      </Text>
      
      {/* List item metadata */}
      <Text style={[typography.caption, { color: theme.colors.textTertiary, marginTop: 8 }]}>
        Company • Title
      </Text>
    </View>
  );
}

// ============================================================================
// Example 7: Card Typography
// ============================================================================

export function CardTypographyExample() {
  const { theme } = useTheme();
  
  return (
    <View style={{ backgroundColor: theme.colors.surface, padding: 16, borderRadius: 12 }}>
      {/* Card title */}
      <Text style={[typography.h4, { color: theme.colors.text, marginBottom: 8 }]}>
        Card Title
      </Text>
      
      {/* Card body */}
      <Text style={[typography.body, { color: theme.colors.textSecondary, marginBottom: 12 }]}>
        This is the main content of the card with comfortable reading line height.
      </Text>
      
      {/* Card footer */}
      <Text style={[typography.caption, { color: theme.colors.textTertiary }]}>
        Updated 2 hours ago
      </Text>
    </View>
  );
}

// ============================================================================
// Quick Reference
// ============================================================================

/*
AVAILABLE PRESETS:
- typography.h1, h2, h3, h4, h5, h6 (headings)
- typography.body, bodyLarge, bodySmall (body text)
- typography.label (uppercase labels)
- typography.caption, captionBold (small text)
- typography.button, buttonSmall, buttonLarge (button text)
- typography.link (underlined links)
- typography.code (monospace code)

HELPER FUNCTIONS:
- createTextStyle(size, weight, lineHeight)
- withFontWeight(style, weight)
- withLineHeight(style, multiplier)
- withLetterSpacing(style, spacing)
- withColor(style, color)
- combineTextStyles(...styles)

FONT WEIGHTS:
'thin', 'extraLight', 'light', 'regular', 'medium', 'semiBold', 'bold', 'extraBold', 'black'

LINE HEIGHTS:
'tight' (1.2), 'normal' (1.4), 'relaxed' (1.6)

FONT SIZES:
xs: 11, sm: 12, base: 14, md: 16, lg: 18, xl: 20, xxl: 24, xxxl: 28
*/
