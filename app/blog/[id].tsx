/**
 * Blog Article Page — Full AEO/GEO/SEO Template
 *
 * Header → Breadcrumbs → Article Hero → Answer Box → TOC + Body → Author → Related → CTA → Footer
 * Schema: BlogPosting + BreadcrumbList + FAQ (if present)
 */
import React, { useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Platform, useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Clock, Calendar, ArrowLeft, ArrowRight } from 'lucide-react-native';
import { BlogHeader } from '@/components/blog/BlogHeader';
import { BlogFooter } from '@/components/blog/BlogFooter';
import { Breadcrumbs } from '@/components/blog/Breadcrumbs';
import { AnswerBox } from '@/components/blog/AnswerBox';
import { TableOfContents } from '@/components/blog/TableOfContents';
import { AuthorCard } from '@/components/blog/AuthorCard';
import { ArticleCard } from '@/components/blog/ArticleCard';
import { CTABlock } from '@/components/blog/CTABlock';
import { blogTheme as t } from '@/lib/blog/theme';
import { setPageMeta, injectArticleSchema, injectFaqSchema } from '@/lib/blog/schema';
import { trackArticleView, trackRelatedArticleClick } from '@/lib/blog/analytics';
import { POST_MAP, POSTS } from '@/lib/blog/content';
import type { BlogPost } from '@/lib/blog/types';

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
}

export default function BlogArticlePage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const isDesktop = width > 900;

  // Look up post from static content
  const post: BlogPost | undefined = id ? POST_MAP[id] : undefined;

  // SEO + Schema + Analytics
  useEffect(() => {
    if (!post) return;

    setPageMeta({
      title: `${post.title} | EverReach Blog`,
      description: post.excerpt,
      url: `https://www.everreach.app/blog/${post.slug}`,
      type: 'article',
      image: post.hero_image_url,
    });

    injectArticleSchema(post);
    if (post.faq?.length) injectFaqSchema(post.faq);

    trackArticleView(post.slug, post.category.slug, post.author.name);
  }, [post]);

  // 404
  if (!post) {
    return (
      <View style={styles.container}>
        <BlogHeader />
        <View style={styles.notFound}>
          <Text style={styles.notFoundTitle}>Article not found</Text>
          <Text style={styles.notFoundSub}>
            The article you're looking for doesn't exist or has been moved.
          </Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.push('/blog')}>
            <ArrowLeft size={16} color={t.colors.primary} />
            <Text style={styles.backBtnText}>Back to Blog</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Related posts (same category, excluding current)
  const related = POSTS
    .filter((p) => p.category.slug === post.category.slug && p.id !== post.id)
    .slice(0, 3);

  return (
    <View style={styles.container}>
      <BlogHeader />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

        {/* ── Article Header ────────────────────── */}
        <View style={styles.articleHeader}>
          <View style={styles.articleHeaderInner}>
            {/* Breadcrumbs */}
            <Breadcrumbs items={[
              { label: 'Home', href: '/' },
              { label: 'Blog', href: '/blog' },
              { label: post.category.name, href: `/blog/category/${post.category.slug}` },
              { label: post.title },
            ]} />

            {/* Category */}
            <TouchableOpacity
              style={[styles.categoryBadge, { backgroundColor: post.category.color + '15' }]}
              onPress={() => router.push(`/blog/category/${post.category.slug}`)}
            >
              <Text style={[styles.categoryText, { color: post.category.color }]}>
                {post.category.name}
              </Text>
            </TouchableOpacity>

            {/* Title */}
            <Text style={styles.articleTitle}>{post.title}</Text>

            {/* Value promise */}
            <Text style={styles.articleExcerpt}>{post.excerpt}</Text>

            {/* Meta */}
            <View style={styles.articleMeta}>
              <Text style={styles.metaAuthor}>{post.author.name}</Text>
              <Text style={styles.metaDot}>·</Text>
              <View style={styles.metaItem}>
                <Calendar size={14} color={t.colors.muted} />
                <Text style={styles.metaText}>
                  {post.updated_at !== post.published_at
                    ? `Updated ${formatDate(post.updated_at)}`
                    : formatDate(post.published_at)}
                </Text>
              </View>
              <Text style={styles.metaDot}>·</Text>
              <View style={styles.metaItem}>
                <Clock size={14} color={t.colors.muted} />
                <Text style={styles.metaText}>{post.reading_time_minutes} min read</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Article Body ──────────────────────── */}
        <View style={[styles.bodySection, isDesktop && styles.bodySectionDesktop]}>

          {/* Left sidebar — TOC (desktop only) */}
          {isDesktop && (
            <View style={styles.sidebar}>
              <TableOfContents items={post.toc} articleSlug={post.slug} />
              <View style={{ marginTop: 24 }}>
                <CTABlock variant="sidebar" slug={post.slug} />
              </View>
            </View>
          )}

          {/* Main content */}
          <View style={[styles.mainContent, isDesktop && styles.mainContentDesktop]}>
            {/* Answer Box */}
            <AnswerBox summary={post.answer_summary} />

            {/* Mobile TOC */}
            {!isDesktop && post.toc.length > 0 && (
              <View style={styles.mobileToc}>
                <TableOfContents items={post.toc} articleSlug={post.slug} />
              </View>
            )}

            {/* Article HTML content */}
            {Platform.OS === 'web' ? (
              <div
                className="blog-article-content"
                style={{
                  color: t.colors.body,
                  fontSize: t.typography.body,
                  lineHeight: `${t.typography.body * t.typography.bodyLineHeight}px`,
                  maxWidth: t.layout.maxContentWidth,
                }}
                dangerouslySetInnerHTML={{ __html: post.content_html }}
              />
            ) : (
              <Text style={styles.bodyFallback}>
                {post.content_html.replace(/<[^>]*>/g, '')}
              </Text>
            )}

            {/* FAQ Section */}
            {post.faq && post.faq.length > 0 && (
              <View style={styles.faqSection}>
                <Text style={styles.faqTitle}>Frequently Asked Questions</Text>
                {post.faq.map((item, i) => (
                  <View key={i} style={styles.faqItem}>
                    <Text style={styles.faqQuestion}>{item.question}</Text>
                    <Text style={styles.faqAnswer}>{item.answer}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Author Card */}
            <AuthorCard author={post.author} />

            {/* End CTA */}
            <CTABlock variant="end" slug={post.slug} />
          </View>
        </View>

        {/* ── Related Articles ──────────────────── */}
        {related.length > 0 && (
          <View style={styles.relatedSection}>
            <Text style={styles.relatedTitle}>Related Articles</Text>
            <View style={[styles.relatedGrid, isDesktop && styles.relatedGridDesktop]}>
              {related.map((rp) => (
                <View
                  key={rp.id}
                  style={[styles.relatedItem, isDesktop && styles.relatedItemDesktop]}
                >
                  <ArticleCard post={rp} variant="compact" />
                </View>
              ))}
            </View>
          </View>
        )}

        <BlogFooter />
      </ScrollView>

      {/* Web-only: inject article styles */}
      {Platform.OS === 'web' && (
        <style
          dangerouslySetInnerHTML={{
            __html: `
              .blog-article-content h2 {
                font-size: 24px;
                font-weight: 700;
                color: ${t.colors.heading};
                margin-top: 40px;
                margin-bottom: 16px;
                line-height: 1.3;
                scroll-margin-top: 80px;
              }
              .blog-article-content h3 {
                font-size: 20px;
                font-weight: 600;
                color: ${t.colors.heading};
                margin-top: 28px;
                margin-bottom: 12px;
                line-height: 1.3;
                scroll-margin-top: 80px;
              }
              .blog-article-content p {
                margin-bottom: 16px;
              }
              .blog-article-content ul, .blog-article-content ol {
                margin-bottom: 16px;
                padding-left: 24px;
              }
              .blog-article-content li {
                margin-bottom: 8px;
                line-height: 1.7;
              }
              .blog-article-content strong {
                font-weight: 600;
                color: ${t.colors.heading};
              }
              .blog-article-content blockquote {
                border-left: 3px solid ${t.colors.primary};
                background: ${t.colors.primaryLight};
                margin: 16px 0;
                padding: 16px 20px;
                border-radius: 0 8px 8px 0;
                font-style: italic;
              }
              .blog-article-content table {
                width: 100%;
                border-collapse: collapse;
                margin: 16px 0;
                font-size: 15px;
              }
              .blog-article-content th {
                background: ${t.colors.borderLight};
                padding: 10px 14px;
                text-align: left;
                font-weight: 600;
                color: ${t.colors.heading};
                border-bottom: 2px solid ${t.colors.border};
              }
              .blog-article-content td {
                padding: 10px 14px;
                border-bottom: 1px solid ${t.colors.border};
              }
              .blog-article-content a {
                color: ${t.colors.primary};
                text-decoration: underline;
              }
            `,
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: t.colors.pageBg },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },

  // 404
  notFound: { alignItems: 'center', padding: 60 },
  notFoundTitle: { fontSize: 24, fontWeight: '700', color: t.colors.heading, marginBottom: 8 },
  notFoundSub: { fontSize: 16, color: t.colors.secondary, marginBottom: 24 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backBtnText: { fontSize: 15, color: t.colors.primary, fontWeight: '600' },

  // Article header
  articleHeader: {
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  articleHeaderInner: {
    maxWidth: t.layout.maxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: t.layout.tagRadius,
    marginBottom: 16,
    marginTop: 8,
  },
  categoryText: {
    fontSize: t.typography.tag,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  articleTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: t.colors.heading,
    lineHeight: 44,
    marginBottom: 12,
  },
  articleExcerpt: {
    fontSize: 18,
    color: t.colors.secondary,
    lineHeight: 28,
    marginBottom: 20,
  },
  articleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: t.colors.heading,
  },
  metaDot: { fontSize: 14, color: t.colors.muted },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 14,
    color: t.colors.secondary,
  },

  // Body
  bodySection: {
    paddingHorizontal: 24,
    paddingVertical: 40,
    maxWidth: 1100,
    alignSelf: 'center',
    width: '100%',
  },
  bodySectionDesktop: {
    flexDirection: 'row',
    gap: 40,
  },
  sidebar: {
    width: 260,
    flexShrink: 0,
  },
  mainContent: {
    flex: 1,
    maxWidth: t.layout.maxContentWidth,
  },
  mainContentDesktop: {
    flex: 1,
  },
  mobileToc: {
    marginBottom: 24,
  },
  bodyFallback: {
    fontSize: 16,
    color: t.colors.body,
    lineHeight: 28,
  },

  // FAQ
  faqSection: {
    marginTop: 40,
    paddingTop: 32,
    borderTopWidth: 1,
    borderTopColor: t.colors.border,
  },
  faqTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: t.colors.heading,
    marginBottom: 20,
  },
  faqItem: {
    marginBottom: 20,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: t.colors.heading,
    marginBottom: 6,
  },
  faqAnswer: {
    fontSize: 15,
    color: t.colors.body,
    lineHeight: 24,
  },

  // Related
  relatedSection: {
    paddingVertical: 48,
    paddingHorizontal: 24,
    backgroundColor: t.colors.borderLight,
  },
  relatedTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: t.colors.heading,
    marginBottom: 20,
    maxWidth: 1100,
    alignSelf: 'center',
    width: '100%',
  },
  relatedGrid: {
    maxWidth: 1100,
    alignSelf: 'center',
    width: '100%',
    gap: 16,
  },
  relatedGridDesktop: {
    flexDirection: 'row',
  },
  relatedItem: { width: '100%' },
  relatedItemDesktop: { flex: 1 },
});
