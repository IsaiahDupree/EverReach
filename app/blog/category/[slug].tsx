/**
 * Blog Category Page
 * Real landing page per topic, not just a tag dump.
 * SEO: BreadcrumbList + meta tags
 */
import React, { useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Platform, useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { BlogHeader } from '@/components/blog/BlogHeader';
import { BlogFooter } from '@/components/blog/BlogFooter';
import { Breadcrumbs } from '@/components/blog/Breadcrumbs';
import { ArticleCard } from '@/components/blog/ArticleCard';
import { CategoryCard } from '@/components/blog/CategoryCard';
import { CTABlock } from '@/components/blog/CTABlock';
import { blogTheme as t } from '@/lib/blog/theme';
import { setPageMeta } from '@/lib/blog/schema';
import { trackCategoryView } from '@/lib/blog/analytics';
import { CATEGORY_MAP, CATEGORIES, getPostsByCategory } from '@/lib/blog/content';
import { useBlogPosts } from '@/lib/blog/useBlogData';

export default function CategoryPage() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { width } = useWindowDimensions();
  const isDesktop = width > 768;

  const category = slug ? CATEGORY_MAP[slug] : undefined;
  const { posts: allCategoryPosts } = useBlogPosts({ category: slug });
  // Merge with static posts for this category
  const staticPosts = slug ? getPostsByCategory(slug) : [];
  const seenSlugs = new Set(allCategoryPosts.map((p) => p.slug));
  const posts = [...allCategoryPosts, ...staticPosts.filter((p) => !seenSlugs.has(p.slug))];
  const otherCategories = CATEGORIES.filter((c) => c.slug !== slug).slice(0, 4);

  useEffect(() => {
    if (!category) return;
    setPageMeta({
      title: `${category.name} — EverReach Blog`,
      description: category.description,
      url: `https://www.everreach.app/blog/category/${category.slug}`,
    });
    trackCategoryView(category.slug);
  }, [category]);

  if (!category) {
    return (
      <View style={styles.container}>
        <BlogHeader />
        <View style={styles.notFound}>
          <Text style={styles.notFoundTitle}>Category not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <BlogHeader />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

        {/* Category Hero */}
        <View style={[styles.hero, { borderLeftColor: category.color }]}>
          <View style={styles.heroInner}>
            <Breadcrumbs items={[
              { label: 'Home', href: '/' },
              { label: 'Blog', href: '/blog' },
              { label: category.name },
            ]} />
            <Text style={styles.heroTitle}>{category.name}</Text>
            <Text style={styles.heroDesc}>{category.description}</Text>
            <Text style={styles.heroCount}>
              {posts.length} article{posts.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {/* Articles */}
        <View style={styles.section}>
          {posts.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                No articles in this category yet. Check back soon!
              </Text>
            </View>
          ) : (
            <View style={[styles.grid, isDesktop && styles.gridDesktop]}>
              {posts.map((post) => (
                <View key={post.id} style={[styles.gridItem, isDesktop && styles.gridItemDesktop]}>
                  <ArticleCard post={post} />
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Other Topics */}
        <View style={[styles.section, { backgroundColor: t.colors.borderLight }]}>
          <View style={styles.sectionInner}>
            <Text style={styles.sectionTitle}>Explore Other Topics</Text>
            <View style={[styles.grid, isDesktop && styles.gridDesktop]}>
              {otherCategories.map((cat) => (
                <View key={cat.slug} style={[styles.gridItem, isDesktop && styles.gridItemHalf]}>
                  <CategoryCard
                    category={cat}
                    articleCount={getPostsByCategory(cat.slug).length}
                  />
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* CTA */}
        <View style={styles.ctaWrap}>
          <CTABlock variant="end" />
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
  notFound: { alignItems: 'center', padding: 60 },
  notFoundTitle: { fontSize: 20, fontWeight: '600', color: t.colors.heading },

  hero: {
    paddingVertical: 40,
    paddingHorizontal: 24,
    borderLeftWidth: 6,
    backgroundColor: t.colors.surfaceBg,
  },
  heroInner: {
    maxWidth: 740,
    alignSelf: 'center',
    width: '100%',
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: t.colors.heading,
    marginTop: 12,
    marginBottom: 8,
  },
  heroDesc: {
    fontSize: 17,
    color: t.colors.secondary,
    lineHeight: 26,
    marginBottom: 8,
  },
  heroCount: {
    fontSize: 14,
    color: t.colors.muted,
    fontWeight: '500',
  },

  section: {
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  sectionInner: {
    maxWidth: 1100,
    alignSelf: 'center',
    width: '100%',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: t.colors.heading,
    marginBottom: 20,
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
  gridItemHalf: { width: '48%' },
  empty: { alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 16, color: t.colors.secondary },
  ctaWrap: { paddingHorizontal: 24, paddingVertical: 24, maxWidth: 740, alignSelf: 'center', width: '100%' },
});
