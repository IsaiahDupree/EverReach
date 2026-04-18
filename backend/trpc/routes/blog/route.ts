import { z } from 'zod'
import { publicProcedure } from '../../server'
import { supabaseAdmin } from '../../../lib/supabase'

/**
 * List blog posts with pagination
 */
export const listBlogPostsProcedure = publicProcedure
  .input(z.object({
    limit: z.number().min(1).max(50).default(20),
    offset: z.number().min(0).default(0),
    tag: z.string().optional(),
  }))
  .query(async ({ input }) => {
    let query = supabaseAdmin
      .from('er_blog_posts')
      .select('*', { count: 'exact' })
      .order('published_at', { ascending: false })
      .range(input.offset, input.offset + input.limit - 1)

    if (input.tag) {
      query = query.contains('tags', [input.tag])
    }

    const { data, count, error } = await query

    if (error) throw new Error(`Failed to fetch blog posts: ${error.message}`)

    return {
      posts: data || [],
      total: count || 0,
      limit: input.limit,
      offset: input.offset,
    }
  })

/**
 * Get a single blog post by ID
 */
export const getBlogPostProcedure = publicProcedure
  .input(z.object({ id: z.string().uuid() }))
  .query(async ({ input }) => {
    const { data, error } = await supabaseAdmin
      .from('er_blog_posts')
      .select('*')
      .eq('id', input.id)
      .single()

    if (error || !data) throw new Error('Blog post not found')
    return data
  })

/**
 * Request new blog content from Authority OS
 */
export const requestBlogPostProcedure = publicProcedure
  .input(z.object({
    topic: z.string().min(3).max(500),
    keywords: z.array(z.string()).optional(),
    tone: z.string().optional(),
    word_count_target: z.number().optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    const aosApiKey = process.env.AOS_API_KEY
    const aosApiUrl = process.env.AOS_API_URL

    if (!aosApiKey || !aosApiUrl) {
      throw new Error('Authority OS integration not configured')
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
    })

    if (!aosResponse.ok) {
      const err = await aosResponse.json().catch(() => ({}))
      throw new Error(`Authority OS request failed: ${err.error || aosResponse.statusText}`)
    }

    const aosData = await aosResponse.json()

    // Record the request locally
    const { data, error } = await supabaseAdmin
      .from('er_blog_requests')
      .insert({
        user_id: ctx.user?.id || null,
        topic: input.topic,
        status: 'queued',
        aos_request_id: aosData.request_id,
      })
      .select()
      .single()

    if (error) throw new Error(`Failed to record request: ${error.message}`)

    return {
      id: data.id,
      status: 'queued',
      aos_request_id: aosData.request_id,
      estimated_delivery: aosData.estimated_delivery,
    }
  })

/**
 * List blog categories (derived from tags)
 */
export const listBlogCategoriesProcedure = publicProcedure
  .query(async () => {
    const { data, error } = await supabaseAdmin
      .from('er_blog_posts')
      .select('tags')

    if (error) throw new Error(`Failed to fetch categories: ${error.message}`)

    const tagCounts: Record<string, number> = {}
    data?.forEach(post => {
      post.tags?.forEach((tag: string) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1
      })
    })

    return Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
  })
