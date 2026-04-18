/**
 * Breadcrumb Navigation
 * For SEO (BreadcrumbList schema) and user orientation.
 */
import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { blogTheme as t } from '@/lib/blog/theme';
import { injectBreadcrumbSchema } from '@/lib/blog/schema';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface Props {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: Props) {
  useEffect(() => {
    injectBreadcrumbSchema(
      items.map((item) => ({
        name: item.label,
        url: item.href
          ? `https://www.everreach.app${item.href}`
          : 'https://www.everreach.app',
      }))
    );
  }, [items]);

  return (
    <View style={styles.container}>
      {items.map((item, i) => (
        <View key={i} style={styles.itemWrap}>
          {i > 0 && <ChevronRight size={12} color={t.colors.muted} style={styles.sep} />}
          {item.href && i < items.length - 1 ? (
            <TouchableOpacity onPress={() => router.push(item.href!)}>
              <Text style={styles.link}>{item.label}</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.current}>{item.label}</Text>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingVertical: 8,
  },
  itemWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sep: { marginHorizontal: 6 },
  link: {
    fontSize: t.typography.caption,
    color: t.colors.primary,
    fontWeight: t.typography.medium,
  },
  current: {
    fontSize: t.typography.caption,
    color: t.colors.muted,
  },
});
