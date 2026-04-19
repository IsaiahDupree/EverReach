/**
 * Blog Data Hook
 *
 * Fetches blog posts from the tRPC API (Authority OS → Supabase).
 * Falls back to static seed content if the API is unavailable.
 * Merges both sources so static content is always available while
 * API-delivered posts appear as they arrive.
 */
import { trpc } from '@/lib/trpc';
import { POSTS, POST_MAP, CATEGORIES, CATEGORY_MAP, getFeaturedPosts, getPostsByCategory, searchPosts } from './content';
import type { BlogPost, BlogCategory } from './types';

/** Convert an API row (from er_blog_posts) to a BlogPost shape */
function apiToPost(row: any): BlogPost {
  const categorySlug = row.category || 'general';
  const category: BlogCategory = CATEGORY_MAP[categorySlug] || {
    slug: categorySlug,
    name: categorySlug.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
    description: '',
    color: '#7C3AED',
    icon: 'BookOpen',
  };

  return {
    id: row.id,
    slug: row.slug || row.id,
    title: row.title,
    excerpt: row.excerpt || '',
    content_html: row.content_html || '',
    answer_summary: row.answer_summary || row.excerpt || '',
    category,
    tags: row.tags || [],
    author: {
      name: row.author || 'EverReach Team',
      slug: row.author_slug || 'everreach-team',
      bio: row.author_bio || '',
      role: 'Author',
    },
    published_at: row.published_at,
    updated_at: row.updated_at || row.published_at,
    reading_time_minutes: row.reading_time_minutes || 5,
    hero_image_url: row.hero_image_url,
    featured: row.featured || false,
    toc: [], // TOC is generated client-side from content_html
    faq: [],
  };
}

/** List all posts — API + static fallback merged */
export function useBlogPosts(opts?: { category?: string; tag?: string; limit?: number }) {
  const apiQuery = trpc.blog.list.useQuery(
    {
      limit: opts?.limit || 50,
      offset: 0,
      category: opts?.category,
      tag: opts?.tag,
    },
    {
      retry: false,
      staleTime: 5 * 60 * 1000,
      // Don't throw on error — we have fallback content
    }
  );

  // Get static posts (optionally filtered)
  let staticPosts = [...POSTS];
  if (opts?.category) {
    staticPosts = staticPosts.filter((p) => p.category.slug === opts.category);
  }
  if (opts?.tag) {
    staticPosts = staticPosts.filter((p) => p.tags.includes(opts.tag!));
  }

  // Convert API posts
  const apiPosts: BlogPost[] = (apiQuery.data?.posts || []).map(apiToPost);

  // Merge: API posts first (they're from Authority OS), then static (seed content)
  // Deduplicate by slug
  const seenSlugs = new Set<string>();
  const merged: BlogPost[] = [];

  for (const post of apiPosts) {
    if (!seenSlugs.has(post.slug)) {
      seenSlugs.add(post.slug);
      merged.push(post);
    }
  }
  for (const post of staticPosts) {
    if (!seenSlugs.has(post.slug)) {
      seenSlugs.add(post.slug);
      merged.push(post);
    }
  }

  // Sort by published_at descending
  merged.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());

  return {
    posts: merged,
    apiPosts,
    isLoading: apiQuery.isLoading,
    isApiAvailable: !apiQuery.error,
    refetch: apiQuery.refetch,
    total: (apiQuery.data?.total || 0) + staticPosts.length,
  };
}

/** Get a single post by slug — API first, static fallback */
export function useBlogPost(slug: string | undefined) {
  const apiQuery = trpc.blog.getBySlug.useQuery(
    { slug: slug! },
    {
      enabled: !!slug,
      retry: false,
      staleTime: 5 * 60 * 1000,
    }
  );

  // Check static content
  const staticPost = slug ? POST_MAP[slug] : undefined;

  // API post takes priority over static
  const post = apiQuery.data ? apiToPost(apiQuery.data) : staticPost;

  return {
    post,
    isLoading: apiQuery.isLoading && !staticPost,
    isFromApi: !!apiQuery.data,
    error: apiQuery.error && !staticPost ? apiQuery.error : null,
  };
}

/** Get featured posts */
export function useFeaturedPosts() {
  const { posts } = useBlogPosts();
  return posts.filter((p) => p.featured).slice(0, 3);
}

/** Search posts */
export function useBlogSearch(query: string) {
  // Client-side search across both API and static content
  const { posts } = useBlogPosts();

  if (!query.trim()) return [];

  const q = query.toLowerCase();
  return posts.filter(
    (p) =>
      p.title.toLowerCase().includes(q) ||
      p.excerpt.toLowerCase().includes(q) ||
      p.tags.some((t) => t.includes(q)) ||
      p.category.name.toLowerCase().includes(q)
  );
}
