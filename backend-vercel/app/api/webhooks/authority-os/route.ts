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

    if (payload.event === 'blog.published') {
      const post = payload.data

      // Upsert to avoid duplicates
      const { error } = await supabaseAdmin
        .from('er_blog_posts')
        .upsert(
          {
            aos_post_id: post.id,
            title: post.title,
            slug: post.slug,
            content_html: post.content_html,
            excerpt: post.excerpt,
            tags: post.tags || [],
            author: post.author || 'Authority OS',
            published_at: post.published_at,
            received_at: new Date().toISOString(),
          },
          { onConflict: 'aos_post_id' }
        )

      if (error) {
        console.error('[AOS Webhook] Failed to store blog post:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to store post' }),
          { status: 500, headers: jsonHeaders }
        )
      }

      // Update any matching blog request
      if (post.id) {
        await supabaseAdmin
          .from('er_blog_requests')
          .update({ status: 'fulfilled' })
          .eq('aos_request_id', post.id)
          .eq('status', 'queued')
      }

      console.log('[AOS Webhook] Blog post stored:', post.title)
      return new Response(
        JSON.stringify({ ok: true, title: post.title }),
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
