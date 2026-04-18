/**
 * Category Topic Card
 * Used on blog home for topic cluster navigation.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { blogTheme as t } from '@/lib/blog/theme';
import type { BlogCategory } from '@/lib/blog/types';
import { trackCategoryView } from '@/lib/blog/analytics';

interface Props {
  category: BlogCategory;
  articleCount?: number;
}

export function CategoryCard({ category, articleCount }: Props) {
  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: category.color }]}
      onPress={() => {
        trackCategoryView(category.slug);
        router.push(`/blog/category/${category.slug}`);
      }}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <Text style={styles.name}>{category.name}</Text>
        <Text style={styles.desc} numberOfLines={2}>{category.description}</Text>
        {articleCount !== undefined && (
          <Text style={styles.count}>{articleCount} article{articleCount !== 1 ? 's' : ''}</Text>
        )}
      </View>
      <ChevronRight size={16} color={t.colors.muted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.cardBg,
    borderRadius: t.layout.borderRadius,
    padding: 16,
    borderWidth: 1,
    borderColor: t.colors.border,
    borderLeftWidth: 4,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  content: { flex: 1, marginRight: 8 },
  name: {
    fontSize: t.typography.h4,
    fontWeight: t.typography.semibold,
    color: t.colors.heading,
    marginBottom: 4,
  },
  desc: {
    fontSize: t.typography.small,
    color: t.colors.secondary,
    lineHeight: t.typography.small * 1.5,
  },
  count: {
    fontSize: t.typography.caption,
    color: t.colors.muted,
    marginTop: 6,
  },
});
