/**
 * Blog Sticky Header
 * Logo | Blog | Topics | Search | Get EverReach
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, TextInput } from 'react-native';
import { router } from 'expo-router';
import { Search, X, Menu } from 'lucide-react-native';
import { blogTheme as t } from '@/lib/blog/theme';
import { trackBlogSearch, trackAppInstallClick } from '@/lib/blog/analytics';

interface Props {
  showSearch?: boolean;
  onSearchSubmit?: (query: string) => void;
}

export function BlogHeader({ showSearch, onSearchSubmit }: Props) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = () => {
    if (searchQuery.trim()) {
      trackBlogSearch(searchQuery, 0);
      if (onSearchSubmit) {
        onSearchSubmit(searchQuery);
      } else {
        router.push(`/blog/search?q=${encodeURIComponent(searchQuery)}`);
      }
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <View style={styles.header}>
      <View style={styles.headerInner}>
        {/* Logo */}
        <TouchableOpacity onPress={() => router.push('/')} style={styles.logoWrap}>
          <Text style={styles.logo}>EverReach</Text>
        </TouchableOpacity>

        {/* Nav links - desktop */}
        <View style={styles.nav}>
          <TouchableOpacity onPress={() => router.push('/blog')} style={styles.navItem}>
            <Text style={styles.navText}>Blog</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/blog/category/personal-crm')} style={styles.navItem}>
            <Text style={styles.navText}>Topics</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setSearchOpen(!searchOpen)}
            style={styles.searchBtn}
          >
            {searchOpen ? (
              <X size={18} color={t.colors.secondary} />
            ) : (
              <Search size={18} color={t.colors.secondary} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.ctaBtn}
            onPress={() => {
              trackAppInstallClick('blog_header');
              router.push('/auth');
            }}
          >
            <Text style={styles.ctaText}>Get EverReach</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search bar (expandable) */}
      {searchOpen && (
        <View style={styles.searchBar}>
          <Search size={16} color={t.colors.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search articles..."
            placeholderTextColor={t.colors.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            autoFocus
            returnKeyType="search"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: t.colors.surfaceBg,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
    ...(Platform.OS === 'web' ? { position: 'sticky' as any, top: 0, zIndex: 100 } : {}),
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    maxWidth: t.layout.maxPageWidth,
    alignSelf: 'center',
    width: '100%',
  },
  logoWrap: { padding: 4 },
  logo: {
    fontSize: 20,
    fontWeight: '700',
    color: t.colors.primary,
    letterSpacing: -0.5,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  navItem: { padding: 4 },
  navText: {
    fontSize: 14,
    fontWeight: '500',
    color: t.colors.body,
  },
  searchBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: t.colors.borderLight,
  },
  ctaBtn: {
    backgroundColor: t.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  ctaText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 12,
    maxWidth: t.layout.maxPageWidth,
    alignSelf: 'center',
    width: '100%',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: t.colors.body,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: t.colors.borderLight,
    borderRadius: 8,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}),
  },
});
