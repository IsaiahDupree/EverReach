/**
 * Sticky Table of Contents
 * Shows article section navigation, highlights active section.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, ScrollView } from 'react-native';
import { List } from 'lucide-react-native';
import { blogTheme as t } from '@/lib/blog/theme';
import { trackTocClick } from '@/lib/blog/analytics';
import type { TocItem } from '@/lib/blog/types';

interface Props {
  items: TocItem[];
  articleSlug: string;
}

export function TableOfContents({ items, articleSlug }: Props) {
  const [activeId, setActiveId] = useState<string>('');

  // Intersection observer for active section tracking (web only)
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const observers: IntersectionObserver[] = [];

    items.forEach((item) => {
      const el = document.getElementById(item.id);
      if (!el) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveId(item.id);
          }
        },
        { rootMargin: '-80px 0px -70% 0px' }
      );
      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [items]);

  const handleClick = (item: TocItem) => {
    trackTocClick(articleSlug, item.id);
    if (Platform.OS === 'web') {
      const el = document.getElementById(item.id);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (!items.length) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <List size={14} color={t.colors.secondary} />
        <Text style={styles.headerText}>In This Article</Text>
      </View>
      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {items.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.item,
              item.level === 3 && styles.itemIndented,
              activeId === item.id && styles.itemActive,
            ]}
            onPress={() => handleClick(item)}
          >
            <Text
              style={[
                styles.itemText,
                activeId === item.id && styles.itemTextActive,
              ]}
              numberOfLines={2}
            >
              {item.text}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: t.colors.surfaceBg,
    borderRadius: t.layout.borderRadius,
    padding: 16,
    borderWidth: 1,
    borderColor: t.colors.border,
    ...(Platform.OS === 'web' ? { position: 'sticky' as any, top: 80 } : {}),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.borderLight,
  },
  headerText: {
    fontSize: t.typography.small,
    fontWeight: t.typography.semibold,
    color: t.colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  list: {
    maxHeight: 400,
  },
  item: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderLeftWidth: 2,
    borderLeftColor: 'transparent',
  },
  itemIndented: {
    marginLeft: 12,
  },
  itemActive: {
    borderLeftColor: t.colors.primary,
    backgroundColor: t.colors.primaryLight,
  },
  itemText: {
    fontSize: 13,
    color: t.colors.secondary,
    lineHeight: 18,
  },
  itemTextActive: {
    color: t.colors.primary,
    fontWeight: t.typography.medium,
  },
});
