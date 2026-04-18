/**
 * CTA Blocks
 * Soft inline, end-of-article, and sidebar CTAs.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import { ArrowRight, Download } from 'lucide-react-native';
import { blogTheme as t } from '@/lib/blog/theme';
import { trackArticleCta, trackAppInstallClick } from '@/lib/blog/analytics';

interface Props {
  variant: 'inline' | 'end' | 'sidebar';
  slug?: string;
}

export function CTABlock({ variant, slug }: Props) {
  const handlePress = () => {
    trackArticleCta(slug || 'unknown', 'get_everreach', variant);
    trackAppInstallClick(`blog_cta_${variant}`);
    router.push('/auth');
  };

  if (variant === 'inline') {
    return (
      <TouchableOpacity style={styles.inline} onPress={handlePress}>
        <Text style={styles.inlineText}>
          EverReach tracks this for you automatically.
        </Text>
        <View style={styles.inlineLink}>
          <Text style={styles.inlineLinkText}>Try it free</Text>
          <ArrowRight size={14} color={t.colors.primary} />
        </View>
      </TouchableOpacity>
    );
  }

  if (variant === 'sidebar') {
    return (
      <View style={styles.sidebar}>
        <Text style={styles.sidebarTitle}>Never lose touch again</Text>
        <Text style={styles.sidebarDesc}>
          EverReach uses AI to help you nurture your most important relationships.
        </Text>
        <TouchableOpacity style={styles.sidebarBtn} onPress={handlePress}>
          <Download size={14} color="#fff" />
          <Text style={styles.sidebarBtnText}>Get EverReach</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // End variant
  return (
    <View style={styles.end}>
      <Text style={styles.endTitle}>Ready to strengthen your relationships?</Text>
      <Text style={styles.endDesc}>
        EverReach gives you a Warmth Score for every relationship, AI-powered message suggestions, and gentle reminders so no one slips through the cracks.
      </Text>
      <TouchableOpacity style={styles.endBtn} onPress={handlePress}>
        <Text style={styles.endBtnText}>Get Started Free</Text>
        <ArrowRight size={16} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  // Inline
  inline: {
    backgroundColor: t.colors.primaryLight,
    borderRadius: t.layout.borderRadius,
    padding: 16,
    marginVertical: 16,
  },
  inlineText: {
    fontSize: t.typography.small,
    color: t.colors.body,
    marginBottom: 6,
  },
  inlineLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inlineLinkText: {
    fontSize: t.typography.small,
    fontWeight: t.typography.semibold,
    color: t.colors.primary,
  },

  // Sidebar
  sidebar: {
    backgroundColor: t.colors.surfaceBg,
    borderRadius: t.layout.cardRadius,
    padding: 20,
    borderWidth: 1,
    borderColor: t.colors.border,
    ...(Platform.OS === 'web' ? { position: 'sticky' as any, top: 300 } : {}),
  },
  sidebarTitle: {
    fontSize: t.typography.h4,
    fontWeight: t.typography.bold,
    color: t.colors.heading,
    marginBottom: 8,
  },
  sidebarDesc: {
    fontSize: t.typography.small,
    color: t.colors.secondary,
    lineHeight: t.typography.small * 1.6,
    marginBottom: 16,
  },
  sidebarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: t.colors.primary,
    paddingVertical: 10,
    borderRadius: 8,
  },
  sidebarBtnText: {
    fontSize: t.typography.small,
    fontWeight: t.typography.semibold,
    color: '#fff',
  },

  // End
  end: {
    backgroundColor: t.colors.heroOverlay,
    borderRadius: t.layout.cardRadius,
    padding: 32,
    alignItems: 'center',
    marginTop: 40,
  },
  endTitle: {
    fontSize: t.typography.h2,
    fontWeight: t.typography.bold,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  endDesc: {
    fontSize: t.typography.body,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    lineHeight: t.typography.body * 1.6,
    marginBottom: 24,
    maxWidth: 500,
  },
  endBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: t.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
  },
  endBtnText: {
    fontSize: 16,
    fontWeight: t.typography.semibold,
    color: '#fff',
  },
});
