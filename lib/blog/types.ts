/**
 * Blog Type Definitions
 * Shared across all blog pages and components.
 */

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content_html: string;
  answer_summary: string; // 2-4 sentence direct answer for AEO
  category: BlogCategory;
  tags: string[];
  author: BlogAuthor;
  published_at: string;
  updated_at: string;
  reading_time_minutes: number;
  hero_image_url?: string;
  featured: boolean;
  toc: TocItem[];
  faq?: FaqItem[];
  related_slugs?: string[];
}

export interface BlogAuthor {
  name: string;
  slug: string;
  bio: string;
  avatar_url?: string;
  role: string;
  links?: { label: string; url: string }[];
}

export interface BlogCategory {
  slug: string;
  name: string;
  description: string;
  color: string; // hex accent color
  icon: string; // lucide icon name
  article_count?: number;
}

export interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface GlossaryTerm {
  term: string;
  slug: string;
  definition: string;
  related_terms?: string[];
  related_articles?: string[];
}

export interface BlogSearchResult {
  posts: BlogPost[];
  total: number;
  query: string;
}
