import { publicProcedure, router } from '../server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

function supa() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export const blogRouter = router({
  /** List published blog posts with pagination */
  list: publicProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(20),
      offset: z.number().min(0).default(0),
      tag: z.string().optional(),
      category: z.string().optional(),
      featured: z.boolean().optional(),
    }))
    .query(async ({ input }) => {
      let query = supa()
        .from('er_blog_posts')
        .select('*', { count: 'exact' })
        .order('published_at', { ascending: false })
        .range(input.offset, input.offset + input.limit - 1);

      if (input.tag) query = query.contains('tags', [input.tag]);
      if (input.category) query = query.eq('category', input.category);
      if (input.featured !== undefined) query = query.eq('featured', input.featured);

      const { data, count, error } = await query;
      if (error) throw new Error(`Failed to fetch blog posts: ${error.message}`);

      return {
        posts: data || [],
        total: count || 0,
        limit: input.limit,
        offset: input.offset,
      };
    }),

  /** Get a single blog post by UUID */
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const { data, error } = await supa()
        .from('er_blog_posts')
        .select('*')
        .eq('id', input.id)
        .single();

      if (error || !data) throw new Error('Blog post not found');
      return data;
    }),

  /** Get a single blog post by slug */
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const { data, error } = await supa()
        .from('er_blog_posts')
        .select('*')
        .eq('slug', input.slug)
        .single();

      if (error || !data) throw new Error('Blog post not found');
      return data;
    }),

  /** List blog categories (derived from posts) */
  categories: publicProcedure
    .query(async () => {
      const { data, error } = await supa()
        .from('er_blog_posts')
        .select('category, tags');

      if (error) throw new Error(`Failed to fetch categories: ${error.message}`);

      const catCounts: Record<string, number> = {};
      const tagCounts: Record<string, number> = {};

      data?.forEach((post) => {
        if (post.category) {
          catCounts[post.category] = (catCounts[post.category] || 0) + 1;
        }
        post.tags?.forEach((tag: string) => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      });

      return {
        categories: Object.entries(catCounts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count),
        tags: Object.entries(tagCounts)
          .map(([tag, count]) => ({ tag, count }))
          .sort((a, b) => b.count - a.count),
      };
    }),

  /** Request new blog content from Authority OS */
  request: publicProcedure
    .input(z.object({
      topic: z.string().min(3).max(500),
      keywords: z.array(z.string()).optional(),
      tone: z.string().optional(),
      word_count_target: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const aosApiKey = process.env.AOS_API_KEY;
      const aosApiUrl = process.env.AOS_API_URL;

      if (!aosApiKey || !aosApiUrl) {
        throw new Error('Authority OS integration not configured');
      }

      // Forward request to Authority OS
      const aosResponse = await fetch(`${aosApiUrl}/api/integrations/blog/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${aosApiKey}`,
        },
        body: JSON.stringify({
          topic: input.topic,
          keywords: input.keywords || [],
          tone: input.tone || 'professional',
          word_count_target: input.word_count_target || 1500,
        }),
      });

      if (!aosResponse.ok) {
        const err = await aosResponse.json().catch(() => ({}));
        throw new Error(`Authority OS request failed: ${(err as any).error || aosResponse.statusText}`);
      }

      const aosData = await aosResponse.json() as any;

      // Record the request locally
      const { data, error } = await supa()
        .from('er_blog_requests')
        .insert({
          topic: input.topic,
          keywords: input.keywords || [],
          tone: input.tone || 'professional',
          word_count_target: input.word_count_target || 1500,
          status: 'queued',
          aos_request_id: aosData.request_id,
        })
        .select()
        .single();

      if (error) throw new Error(`Failed to record request: ${error.message}`);

      return {
        id: data.id,
        status: 'queued',
        aos_request_id: aosData.request_id,
        estimated_delivery: aosData.estimated_delivery,
      };
    }),
});
