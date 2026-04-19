/**
 * Blog Search Results Page
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Platform, useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Search, ArrowLeft } from 'lucide-react-native';
import { BlogHeader } from '@/components/blog/BlogHeader';
import { BlogFooter } from '@/components/blog/BlogFooter';
import { ArticleCard } from '@/components/blog/ArticleCard';
import { blogTheme as t } from '@/lib/blog/theme';
import { setPageMeta } from '@/lib/blog/schema';
import { trackBlogSearch } from '@/lib/blog/analytics';
import { useBlogSearch } from '@/lib/blog/useBlogData';

export default function BlogSearchPage() {
  const params = useLocalSearchParams<{ q: string }>();
  const { width } = useWindowDimensions();
  const isDesktop = width > 768;
  const [query, setQuery] = useState(params.q || '');

  const results = useBlogSearch(query);

  useEffect(() => {
    if (query.trim()) {
      setPageMeta({
        title: `Search: "${query}" — EverReach Blog`,
        description: `Search results for "${query}" on the EverReach blog.`,
        url: `https://www.everreach.app/blog/search?q=${encodeURIComponent(query)}`,
      });
      trackBlogSearch(query, results.length);
    }
  }, [query, results.length]);

  const handleSearch = () => {
    if (query.trim()) {
      router.setParams({ q: query });
    }
  };

  return (
    <View style={styles.container}>
      <BlogHeader />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

        <View style={styles.searchSection}>
          <View style={styles.searchInner}>
            <TouchableOpacity onPress={() => router.push('/blog')} style={styles.backLink}>
              <ArrowLeft size={16} color={t.colors.primary} />
              <Text style={styles.backText}>Back to Blog</Text>
            </TouchableOpacity>

            <Text style={styles.title}>Search Articles</Text>

            <View style={styles.searchWrap}>
              <Search size={18} color={t.colors.muted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search..."
                placeholderTextColor={t.colors.muted}
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={handleSearch}
                autoFocus
                returnKeyType="search"
              />
            </View>

            {query.trim() ? (
              <Text style={styles.resultCount}>
                {results.length} result{results.length !== 1 ? 's' : ''} for "{query}"
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.resultsSection}>
          <View style={[styles.grid, isDesktop && styles.gridDesktop]}>
            {results.map((post) => (
              <View key={post.id} style={[styles.gridItem, isDesktop && styles.gridItemDesktop]}>
                <ArticleCard post={post} />
              </View>
            ))}
          </View>

          {query.trim() && results.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No results found</Text>
              <Text style={styles.emptyText}>
                Try different keywords or browse our topics.
              </Text>
              <TouchableOpacity
                style={styles.browseBtn}
                onPress={() => router.push('/blog')}
              >
                <Text style={styles.browseBtnText}>Browse All Articles</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <BlogFooter />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: t.colors.pageBg },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },

  searchSection: {
    paddingVertical: 32,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
  },
  searchInner: {
    maxWidth: 640,
    alignSelf: 'center',
    width: '100%',
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 20,
  },
  backText: { fontSize: 14, color: t.colors.primary, fontWeight: '500' },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: t.colors.heading,
    marginBottom: 16,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: t.colors.surfaceBg,
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: t.colors.body,
    paddingVertical: 14,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}),
  },
  resultCount: {
    fontSize: 14,
    color: t.colors.secondary,
    marginTop: 12,
  },

  resultsSection: {
    paddingVertical: 32,
    paddingHorizontal: 24,
    minHeight: 300,
  },
  grid: {
    maxWidth: 1100,
    alignSelf: 'center',
    width: '100%',
    gap: 16,
  },
  gridDesktop: { flexDirection: 'row', flexWrap: 'wrap' },
  gridItem: { width: '100%' },
  gridItemDesktop: { width: '48%' },

  empty: { alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: t.colors.heading, marginBottom: 8 },
  emptyText: { fontSize: 15, color: t.colors.secondary, marginBottom: 20 },
  browseBtn: {
    backgroundColor: t.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  browseBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
