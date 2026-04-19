/**
 * Blog Home — Relationship Intelligence Knowledge Hub
 *
 * Hero + Search → Featured Articles → Topic Clusters → Latest → Footer
 * SEO: Organization + WebSite schema, OG tags, meta description
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Platform, useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { Search, ArrowRight } from 'lucide-react-native';
import { BlogHeader } from '@/components/blog/BlogHeader';
import { ArticleCard } from '@/components/blog/ArticleCard';
import { CategoryCard } from '@/components/blog/CategoryCard';
import { BlogFooter } from '@/components/blog/BlogFooter';
import { blogTheme as t } from '@/lib/blog/theme';
import { setPageMeta, injectOrganizationSchema, injectWebSiteSchema } from '@/lib/blog/schema';
import { trackBlogSearch, trackAppInstallClick } from '@/lib/blog/analytics';
import { CATEGORIES, getPostsByCategory } from '@/lib/blog/content';
import { useBlogPosts } from '@/lib/blog/useBlogData';

export default function BlogHome() {
  const { width } = useWindowDimensions();
  const isDesktop = width > 768;
  const [searchQuery, setSearchQuery] = useState('');

  // SEO + Schema
  useEffect(() => {
    setPageMeta({
      title: 'EverReach Blog — Relationship Intelligence for Real Life',
      description: 'Expert articles on personal CRM, friendship maintenance, networking, and staying connected with the people who matter most.',
      url: 'https://www.everreach.app/blog',
    });
    injectOrganizationSchema();
    injectWebSiteSchema();
  }, []);

  const { posts: allPosts } = useBlogPosts();
  const featured = allPosts.filter((p) => p.featured).slice(0, 3);
  const latest = [...allPosts].sort((a, b) =>
    new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
  );

  const handleSearch = () => {
    if (searchQuery.trim()) {
      trackBlogSearch(searchQuery, 0);
      router.push(`/blog/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <View style={styles.container}>
      <BlogHeader />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

        {/* ── Hero Section ─────────────────────────── */}
        <View style={styles.hero}>
          <View style={styles.heroInner}>
            <Text style={styles.heroLabel}>THE EVERREACH BLOG</Text>
            <Text style={[styles.heroTitle, isDesktop && { fontSize: 44 }]}>
              Build better relationships{'\n'}with systems that actually stick
            </Text>
            <Text style={styles.heroSub}>
              Practical guides on personal CRM, friendship maintenance, and authentic networking — designed for humans, optimized for action.
            </Text>

            {/* Search */}
            <View style={styles.searchWrap}>
              <Search size={18} color={t.colors.muted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search articles (e.g. &quot;follow up templates&quot;)"
                placeholderTextColor={t.colors.muted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
              />
              <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
                <Text style={styles.searchBtnText}>Search</Text>
              </TouchableOpacity>
            </View>

            {/* Quick links */}
            <View style={styles.quickLinks}>
              <Text style={styles.quickLabel}>Popular:</Text>
              {['Why friendships fade', 'Personal CRM guide', 'Follow-up templates'].map((q) => (
                <TouchableOpacity
                  key={q}
                  onPress={() => {
                    const post = POSTS.find((p) => p.title.toLowerCase().includes(q.toLowerCase().split(' ')[0]));
                    if (post) router.push(`/blog/${post.slug}`);
                  }}
                >
                  <Text style={styles.quickLink}>{q}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* ── Featured Articles ────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured</Text>
            <Text style={styles.sectionSub}>Our most impactful guides</Text>
          </View>
          <View style={[styles.grid, isDesktop && styles.gridDesktop]}>
            {featured.slice(0, 3).map((post) => (
              <View key={post.id} style={[styles.gridItem, isDesktop && styles.gridItemDesktop]}>
                <ArticleCard post={post} variant="featured" />
              </View>
            ))}
          </View>
        </View>

        {/* ── Topic Clusters ──────────────────────── */}
        <View style={[styles.section, { backgroundColor: t.colors.borderLight }]}>
          <View style={styles.sectionInner}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Explore by Topic</Text>
              <Text style={styles.sectionSub}>Deep dives organized by what you need</Text>
            </View>
            <View style={[styles.grid, isDesktop && styles.gridDesktop]}>
              {CATEGORIES.map((cat) => (
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

        {/* ── Latest Articles ─────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Latest Articles</Text>
          </View>
          <View style={[styles.grid, isDesktop && styles.gridDesktop]}>
            {latest.map((post) => (
              <View key={post.id} style={[styles.gridItem, isDesktop && styles.gridItemDesktop]}>
                <ArticleCard post={post} />
              </View>
            ))}
          </View>
        </View>

        {/* ── CTA Section ─────────────────────────── */}
        <View style={styles.ctaSection}>
          <Text style={styles.ctaTitle}>Ready to never lose touch again?</Text>
          <Text style={styles.ctaSub}>
            EverReach tracks your relationships, suggests when to reach out, and helps you write the perfect message.
          </Text>
          <TouchableOpacity
            style={styles.ctaBtn}
            onPress={() => {
              trackAppInstallClick('blog_home_cta');
              router.push('/auth');
            }}
          >
            <Text style={styles.ctaBtnText}>Get Started Free</Text>
            <ArrowRight size={16} color="#fff" />
          </TouchableOpacity>
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

  // Hero
  hero: {
    backgroundColor: t.colors.heroOverlay,
    paddingVertical: 64,
    paddingHorizontal: 24,
  },
  heroInner: {
    maxWidth: 720,
    alignSelf: 'center',
    width: '100%',
    alignItems: 'center',
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: t.colors.accent,
    letterSpacing: 2,
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 34,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 42,
    marginBottom: 16,
  },
  heroSub: {
    fontSize: 17,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 32,
    maxWidth: 560,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingLeft: 16,
    width: '100%',
    maxWidth: 560,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: t.colors.body,
    paddingVertical: 14,
    paddingHorizontal: 10,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}),
  },
  searchBtn: {
    backgroundColor: t.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  searchBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  quickLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  quickLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
  },
  quickLink: {
    fontSize: 13,
    color: t.colors.accent,
    textDecorationLine: 'underline',
  },

  // Sections
  section: {
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  sectionInner: {
    maxWidth: 1100,
    alignSelf: 'center',
    width: '100%',
  },
  sectionHeader: {
    maxWidth: 1100,
    alignSelf: 'center',
    width: '100%',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: t.colors.heading,
    marginBottom: 4,
  },
  sectionSub: {
    fontSize: 15,
    color: t.colors.secondary,
  },
  grid: {
    maxWidth: 1100,
    alignSelf: 'center',
    width: '100%',
    gap: 16,
  },
  gridDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridItem: {
    width: '100%',
  },
  gridItemDesktop: {
    width: '31.5%',
  },
  gridItemHalf: {
    width: '48%',
  },

  // CTA
  ctaSection: {
    backgroundColor: t.colors.heroOverlay,
    paddingVertical: 56,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  ctaSub: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 480,
    marginBottom: 28,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: t.colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 10,
  },
  ctaBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
