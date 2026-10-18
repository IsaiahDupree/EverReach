'use client';
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { TONE_LABELS, type Tone } from '@/lib/tone';

interface ToneChipsProps {
  value: Tone;
  onChange: (t: Tone) => void;
}

export function ToneChips({ value, onChange }: ToneChipsProps) {
  const tones: Tone[] = ['casual','professional','warm','direct'];
  
  return (
    <View style={styles.container}>
      {tones.map(t=>(
        <TouchableOpacity 
          key={t}
          onPress={()=>onChange(t)}
          style={[
            styles.chip,
            value === t && styles.chipSelected
          ]}
        >
          <Text style={[
            styles.chipText,
            value === t && styles.chipTextSelected
          ]}>
            {TONE_LABELS[t]}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  chipSelected: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  chipText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
});