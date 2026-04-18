/**
 * JSON-LD Structured Data Generators
 * For SEO/AEO/GEO — injected into <head> on web.
 */
import { Platform } from 'react-native';
import type { BlogPost, BlogCategory, BlogAuthor, FaqItem, GlossaryTerm } from './types';

const SITE_URL = 'https://www.everreach.app';
const ORG_NAME = 'EverReach';
const ORG_LOGO = `${SITE_URL}/logo-1024.png`;

function inject(jsonLd: object, id?: string) {
  if (Platform.OS !== 'web') return;
  const scriptId = id || 'ld-json-primary';
  let el = document.getElementById(scriptId) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement('script');
    el.id = scriptId;
    el.type = 'application/ld+json';
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(jsonLd);
}

/** Organization schema — used on homepage/blog home */
export function injectOrganizationSchema() {
  inject({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: ORG_NAME,
    url: SITE_URL,
    logo: ORG_LOGO,
    sameAs: [],
    description: 'AI-powered relationship management app that helps you nurture friendships and professional connections.',
  }, 'ld-org');
}

/** WebSite schema with SearchAction */
export function injectWebSiteSchema() {
  inject({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: `${ORG_NAME} Blog`,
    url: `${SITE_URL}/blog`,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/blog/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  }, 'ld-website');
}

/** BlogPosting schema for article pages */
export function injectArticleSchema(post: BlogPost) {
  inject({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    image: post.hero_image_url || OG_IMAGE_DEFAULT,
    author: {
      '@type': 'Person',
      name: post.author.name,
      url: `${SITE_URL}/blog/authors/${post.author.slug}`,
    },
    publisher: {
      '@type': 'Organization',
      name: ORG_NAME,
      logo: { '@type': 'ImageObject', url: ORG_LOGO },
    },
    datePublished: post.published_at,
    dateModified: post.updated_at || post.published_at,
    mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
    wordCount: Math.round(post.reading_time_minutes * 250),
    articleSection: post.category.name,
    keywords: post.tags.join(', '),
  }, 'ld-article');
}

/** BreadcrumbList schema */
export function injectBreadcrumbSchema(items: { name: string; url: string }[]) {
  inject({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  }, 'ld-breadcrumb');
}

/** FAQ schema for article FAQ sections */
export function injectFaqSchema(faqs: FaqItem[]) {
  if (!faqs.length) return;
  inject({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }, 'ld-faq');
}

/** ProfilePage schema for author pages */
export function injectAuthorSchema(author: BlogAuthor) {
  inject({
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: {
      '@type': 'Person',
      name: author.name,
      description: author.bio,
      image: author.avatar_url,
      jobTitle: author.role,
      url: `${SITE_URL}/blog/authors/${author.slug}`,
    },
  }, 'ld-author');
}

const OG_IMAGE_DEFAULT = `${SITE_URL}/og-blog.png`;

/** Set page meta tags (title, description, OG, Twitter) */
export function setPageMeta(opts: {
  title: string;
  description: string;
  url: string;
  image?: string;
  type?: string;
}) {
  if (Platform.OS !== 'web') return;

  document.title = opts.title;

  const setMeta = (attr: string, key: string, content: string) => {
    let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, key);
      document.head.appendChild(el);
    }
    el.content = content;
  };

  setMeta('name', 'description', opts.description);
  setMeta('property', 'og:title', opts.title);
  setMeta('property', 'og:description', opts.description);
  setMeta('property', 'og:url', opts.url);
  setMeta('property', 'og:type', opts.type || 'website');
  setMeta('property', 'og:image', opts.image || OG_IMAGE_DEFAULT);
  setMeta('name', 'twitter:card', 'summary_large_image');
  setMeta('name', 'twitter:title', opts.title);
  setMeta('name', 'twitter:description', opts.description);
  setMeta('name', 'twitter:image', opts.image || OG_IMAGE_DEFAULT);
}
