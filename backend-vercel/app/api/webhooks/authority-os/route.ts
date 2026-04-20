import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

const jsonHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-AOS-Signature, X-AOS-Timestamp',
}

function verifySignature(secret: string, signature: string, timestamp: number, body: string): boolean {
  const maxAge = 300 // 5 minutes
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - timestamp) > maxAge) return false

  const payload = `${timestamp}.${body}`
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  const sig = signature.startsWith('sha256=') ? signature.slice(7) : signature

  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  } catch {
    return false
  }
}

// POST: Receive blog post from Authority OS
async function handler(request: Request) {
  console.log('[AOS Webhook] Received webhook:', request.method)

  const webhookSecret = process.env.AOS_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('[AOS Webhook] AOS_WEBHOOK_SECRET not configured')
    return new Response(
      JSON.stringify({ error: 'Webhook not configured' }),
      { status: 500, headers: jsonHeaders }
    )
  }

  const body = await request.text()
  const signature = request.headers.get('x-aos-signature') || ''
  const timestamp = parseInt(request.headers.get('x-aos-timestamp') || '0')

  if (!verifySignature(webhookSecret, signature, timestamp, body)) {
    console.error('[AOS Webhook] Signature verification failed')
    return new Response(
      JSON.stringify({ error: 'Invalid signature' }),
      { status: 401, headers: jsonHeaders }
    )
  }

  try {
    const payload = JSON.parse(body)

    // AOS sends 'blog.generated' with blog data under payload.blog
    if (payload.event === 'blog.generated') {
      const blog = payload.blog
      const aosPostId: string = payload.aos_post_id || ''

      // Map pillar_domain to a readable category
      const categoryMap: Record<string, string> = {
        relationship_management: 'relationship-management',
        networking_connections: 'networking',
        ai_relationship_tools: 'ai-tools',
        productivity_professionals: 'productivity',
        contact_organization: 'contact-management',
      }
      const category = categoryMap[blog.pillar_domain] || 'general'

      // Estimate reading time (avg 200 wpm)
      const readingTimeMinutes = Math.max(1, Math.round((blog.word_count || 1500) / 200))

      const record = {
        aos_post_id: aosPostId || null,
        title: blog.title,
        slug: blog.slug,
        content_html: blog.content || '',
        excerpt: blog.meta_description || '',
        tags: blog.secondary_keywords || [],
        category,
        reading_time_minutes: readingTimeMinutes,
        published_at: new Date().toISOString(),
        received_at: new Date().toISOString(),
      }

      // Upsert to avoid duplicates (only conflict on non-null aos_post_id)
      const { data: saved, error } = aosPostId
        ? await supabaseAdmin
            .from('er_blog_posts')
            .upsert(record, { onConflict: 'aos_post_id' })
            .select('id')
            .single()
        : await supabaseAdmin
            .from('er_blog_posts')
            .insert(record)
            .select('id')
            .single()

      if (error) {
        console.error('[AOS Webhook] Failed to store blog post:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to store post' }),
          { status: 500, headers: jsonHeaders }
        )
      }

      console.log('[AOS Webhook] Blog post stored:', blog.title, '→ id:', saved?.id)
      return new Response(
        JSON.stringify({ ok: true, post_id: saved?.id ?? '', title: blog.title }),
        { status: 200, headers: jsonHeaders }
      )
    }

    return new Response(
      JSON.stringify({ ok: true, event: payload.event, action: 'ignored' }),
      { status: 200, headers: jsonHeaders }
    )
  } catch (error) {
    console.error('[AOS Webhook] Parse error:', error)
    return new Response(
      JSON.stringify({ error: 'Invalid payload' }),
      { status: 400, headers: jsonHeaders }
    )
  }
}

async function optionsHandler() {
  return new Response(null, { status: 200, headers: jsonHeaders })
}

export { handler as POST, optionsHandler as OPTIONS }
