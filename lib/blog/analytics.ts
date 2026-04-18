/**
 * Blog-specific GA4 + Meta event tracking.
 * Tracks the blog-to-signup funnel.
 */
import { trackGA4Event } from '@/lib/ga4';
import { trackMetaEvent } from '@/lib/metaAppEvents';
import { Platform } from 'react-native';

// Article engagement
export function trackArticleView(slug: string, category: string, author: string) {
  trackGA4Event('article_view', { slug, category, author });
  trackMetaEvent('ViewContent', { content_name: slug, content_category: category });
}

export function trackArticleScroll(slug: string, percent: number) {
  if (percent === 25 || percent === 50 || percent === 75 || percent === 100) {
    trackGA4Event('article_scroll', { slug, scroll_percent: percent });
  }
}

export function trackTocClick(slug: string, sectionId: string) {
  trackGA4Event('toc_click', { slug, section_id: sectionId });
}

// CTAs
export function trackArticleCta(slug: string, ctaType: string, ctaPosition: string) {
  trackGA4Event('article_cta_click', { slug, cta_type: ctaType, cta_position: ctaPosition });
}

export function trackAppInstallClick(source: string) {
  trackGA4Event('everreach_install_click', { source });
  trackMetaEvent('Lead', { content_name: 'app_install', source });
}

// Search
export function trackBlogSearch(query: string, resultCount: number) {
  trackGA4Event('view_search_results', { search_term: query, result_count: resultCount });
}

// Navigation
export function trackCategoryView(categorySlug: string) {
  trackGA4Event('category_view', { category: categorySlug });
}

export function trackRelatedArticleClick(fromSlug: string, toSlug: string) {
  trackGA4Event('related_article_click', { from_slug: fromSlug, to_slug: toSlug });
}

export function trackAuthorCardClick(authorSlug: string) {
  trackGA4Event('author_card_click', { author: authorSlug });
}

// Newsletter
export function trackNewsletterSignup(source: string) {
  trackGA4Event('newsletter_signup', { source });
  trackMetaEvent('Lead', { content_name: 'newsletter', source });
}

// Templates
export function trackTemplateDownload(templateName: string) {
  trackGA4Event('template_download', { template_name: templateName });
}

export function trackCopyTemplate(templateName: string) {
  trackGA4Event('copy_template_click', { template_name: templateName });
}
