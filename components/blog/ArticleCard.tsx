/**
 * Blog Article Card
 * Used on blog home, category pages, search results.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import { Clock, ArrowRight } from 'lucide-react-native';
import { blogTheme as t } from '@/lib/blog/theme';
import type { BlogPost } from '@/lib/blog/types';

interface Props {
  post: BlogPost;
  variant?: 'default' | 'featured' | 'compact';
}

export function ArticleCard({ post, variant = 'default' }: Props) {
  const isFeatured = variant === 'featured';
  const isCompact = variant === 'compact';

  return (
    <TouchableOpacity
      style={[styles.card, isFeatured && styles.featuredCard, isCompact && styles.compactCard]}
      onPress={() => router.push(`/blog/${post.slug}`)}
      activeOpacity={0.7}
    >
      {/* Category badge */}
      <View style={[styles.categoryBadge, { backgroundColor: post.category.color + '15' }]}>
        <Text style={[styles.categoryText, { color: post.category.color }]}>
          {post.category.name}
        </Text>
      </View>

      {/* Title */}
      <Text style={[styles.title, isFeatured && styles.featuredTitle]} numberOfLines={isCompact ? 2 : 3}>
        {post.title}
      </Text>

      {/* Excerpt */}
      {!isCompact && (
        <Text style={styles.excerpt} numberOfLines={isFeatured ? 3 : 2}>
          {post.excerpt}
        </Text>
      )}

      {/* Meta row */}
      <View style={styles.meta}>
        <View style={styles.metaLeft}>
          <Text style={styles.authorText}>{post.author.name}</Text>
          <Text style={styles.metaDot}>·</Text>
          <View style={styles.readTime}>
            <Clock size={12} color={t.colors.muted} />
            <Text style={styles.readTimeText}>{post.reading_time_minutes} min</Text>
          </View>
        </View>
        <ArrowRight size={14} color={t.colors.primary} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: t.colors.cardBg,
    borderRadius: t.layout.cardRadius,
    padding: 20,
    borderWidth: 1,
    borderColor: t.colors.border,
    ...(Platform.OS === 'web' ? {
      cursor: 'pointer' as any,
      transition: 'box-shadow 0.2s, transform 0.2s' as any,
    } : {}),
  },
  featuredCard: {
    borderColor: t.colors.primaryLight,
    borderWidth: 2,
  },
  compactCard: {
    padding: 16,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: t.layout.tagRadius,
    marginBottom: 10,
  },
  categoryText: {
    fontSize: t.typography.tag,
    fontWeight: t.typography.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: t.typography.h3,
    fontWeight: t.typography.bold,
    color: t.colors.heading,
    lineHeight: t.typography.h3 * t.typography.headingLineHeight,
    marginBottom: 8,
  },
  featuredTitle: {
    fontSize: t.typography.h2,
    lineHeight: t.typography.h2 * t.typography.headingLineHeight,
  },
  excerpt: {
    fontSize: t.typography.small,
    color: t.colors.secondary,
    lineHeight: t.typography.small * t.typography.bodyLineHeight,
    marginBottom: 12,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  authorText: {
    fontSize: t.typography.caption,
    fontWeight: t.typography.medium,
    color: t.colors.secondary,
  },
  metaDot: {
    fontSize: t.typography.caption,
    color: t.colors.muted,
  },
  readTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  readTimeText: {
    fontSize: t.typography.caption,
    color: t.colors.muted,
  },
});
