/**
 * SkinTypePicker
 *
 * A 2-row × 3-column grid of skin type swatches.
 * Each swatch shows:
 *   - A coloured box representative of the Fitzpatrick skin tone
 *   - Roman numeral (I–VI)
 *   - Brief description of burn tendency
 *
 * Selected swatch has an orange border and soft shadow.
 *
 * Props:
 *   value     Currently selected skin type (1–6)
 *   onChange  Callback when the user taps a different skin type
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FitzpatrickSkinType } from '@/types/models';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SkinTypePickerProps {
  value: number;
  onChange: (type: number) => void;
}

interface SkinTypeDef {
  type: FitzpatrickSkinType;
  numeral: string;
  color: string;
  description: string;
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const SKIN_TYPES: SkinTypeDef[] = [
  {
    type: 1,
    numeral: 'I',
    color: '#FDE8D8',
    description: 'Very Fair\nBurns always',
  },
  {
    type: 2,
    numeral: 'II',
    color: '#F5CBA7',
    description: 'Fair\nBurns easily',
  },
  {
    type: 3,
    numeral: 'III',
    color: '#E8B89A',
    description: 'Medium\nBurns sometimes',
  },
  {
    type: 4,
    numeral: 'IV',
    color: '#C68642',
    description: 'Olive\nBurns rarely',
  },
  {
    type: 5,
    numeral: 'V',
    color: '#8D5524',
    description: 'Brown\nRarely burns',
  },
  {
    type: 6,
    numeral: 'VI',
    color: '#4A2C17',
    description: 'Dark\nAlmost never burns',
  },
];

// ---------------------------------------------------------------------------
// Swatch component
// ---------------------------------------------------------------------------

function Swatch({
  def,
  selected,
  onPress,
}: {
  def: SkinTypeDef;
  selected: boolean;
  onPress: () => void;
}) {
  // Use a contrasting text colour for darker swatches
  const isDark = def.type >= 4;
  const textColor = isDark ? '#FFFFFF' : '#111827';
  const descColor = isDark ? 'rgba(255,255,255,0.8)' : '#6B7280';

  return (
    <TouchableOpacity
      style={[
        styles.swatch,
        { backgroundColor: def.color },
        selected && styles.swatchSelected,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityLabel={`Skin type ${def.numeral} — ${def.description.replace('\n', ', ')}`}
      accessibilityState={{ selected }}
    >
      <Text style={[styles.numeral, { color: textColor }]}>{def.numeral}</Text>
      <Text style={[styles.description, { color: descColor }]} numberOfLines={2}>
        {def.description}
      </Text>

      {selected && <View style={styles.selectedIndicator} />}
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function SkinTypePicker({ value, onChange }: SkinTypePickerProps) {
  return (
    <View style={styles.grid}>
      {SKIN_TYPES.map((def) => (
        <Swatch
          key={def.type}
          def={def}
          selected={value === def.type}
          onPress={() => onChange(def.type)}
        />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  swatch: {
    width: '30%',
    minHeight: 90,
    borderRadius: 12,
    padding: 10,
    justifyContent: 'flex-start',
    borderWidth: 2,
    borderColor: 'transparent',
    // Subtle shadow (iOS)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    // Android
    elevation: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  swatchSelected: {
    borderColor: '#F97316',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  numeral: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  description: {
    fontSize: 11,
    lineHeight: 15,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F97316',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
});
