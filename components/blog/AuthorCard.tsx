/**
 * Author Bio Card
 * Shown at bottom of articles.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { User } from 'lucide-react-native';
import { blogTheme as t } from '@/lib/blog/theme';
import type { BlogAuthor } from '@/lib/blog/types';

interface Props {
  author: BlogAuthor;
}

export function AuthorCard({ author }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <User size={24} color={t.colors.primary} />
      </View>
      <View style={styles.content}>
        <Text style={styles.name}>{author.name}</Text>
        <Text style={styles.role}>{author.role}</Text>
        <Text style={styles.bio}>{author.bio}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: t.colors.borderLight,
    borderRadius: t.layout.cardRadius,
    padding: 20,
    gap: 16,
    marginTop: 32,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: t.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1 },
  name: {
    fontSize: t.typography.h4,
    fontWeight: t.typography.semibold,
    color: t.colors.heading,
  },
  role: {
    fontSize: t.typography.caption,
    color: t.colors.muted,
    marginBottom: 6,
  },
  bio: {
    fontSize: t.typography.small,
    color: t.colors.secondary,
    lineHeight: t.typography.small * 1.6,
  },
});
