/**
 * Answer Box (AEO/GEO)
 * Above-the-fold direct answer summary for AI and search extraction.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Lightbulb } from 'lucide-react-native';
import { blogTheme as t } from '@/lib/blog/theme';

interface Props {
  summary: string;
}

export function AnswerBox({ summary }: Props) {
  if (!summary) return null;

  return (
    <View style={styles.box}>
      <View style={styles.header}>
        <Lightbulb size={16} color={t.colors.primary} />
        <Text style={styles.label}>Quick Answer</Text>
      </View>
      <Text style={styles.text}>{summary}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: t.colors.answerBg,
    borderRadius: t.layout.borderRadius,
    padding: 20,
    marginBottom: 32,
    borderLeftWidth: 4,
    borderLeftColor: t.colors.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  label: {
    fontSize: t.typography.small,
    fontWeight: t.typography.semibold,
    color: t.colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  text: {
    fontSize: t.typography.body,
    color: t.colors.body,
    lineHeight: t.typography.body * t.typography.bodyLineHeight,
  },
});
