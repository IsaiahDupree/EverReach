/**
 * Blog Footer
 * Consistent footer across all blog pages.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { router } from 'expo-router';
import { blogTheme as t } from '@/lib/blog/theme';

export function BlogFooter() {
  return (
    <View style={styles.footer}>
      <View style={styles.inner}>
        {/* Brand */}
        <View style={styles.brand}>
          <Text style={styles.logo}>EverReach</Text>
          <Text style={styles.tagline}>
            AI-powered relationship management.{'\n'}
            Never lose touch with the people who matter.
          </Text>
        </View>

        {/* Links */}
        <View style={styles.linksRow}>
          <View style={styles.linkCol}>
            <Text style={styles.linkHeader}>Product</Text>
            <TouchableOpacity onPress={() => router.push('/')}>
              <Text style={styles.linkText}>Home</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/auth')}>
              <Text style={styles.linkText}>Sign Up</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.linkCol}>
            <Text style={styles.linkHeader}>Blog</Text>
            <TouchableOpacity onPress={() => router.push('/blog')}>
              <Text style={styles.linkText}>Articles</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/blog/category/personal-crm')}>
              <Text style={styles.linkText}>Personal CRM</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/blog/category/friendships')}>
              <Text style={styles.linkText}>Friendships</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.linkCol}>
            <Text style={styles.linkHeader}>Legal</Text>
            <TouchableOpacity onPress={() => router.push('/terms')}>
              <Text style={styles.linkText}>Terms of Service</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/privacy-policy')}>
              <Text style={styles.linkText}>Privacy Policy</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => Linking.openURL('mailto:support@everreach.app')}>
              <Text style={styles.linkText}>Contact</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Copyright */}
      <View style={styles.copyright}>
        <Text style={styles.copyrightText}>
          © {new Date().getFullYear()} EverReach. All rights reserved.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    backgroundColor: '#1A1A2E',
    paddingTop: 48,
  },
  inner: {
    maxWidth: 1000,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: 24,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 40,
    paddingBottom: 40,
  },
  brand: { flex: 1, minWidth: 200 },
  logo: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 22,
  },
  linksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 40,
  },
  linkCol: { gap: 8, minWidth: 120 },
  linkHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  linkText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.55)',
  },
  copyright: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 20,
    alignItems: 'center',
  },
  copyrightText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
  },
});
