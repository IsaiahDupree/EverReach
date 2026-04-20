/**
 * Authority OS Webhook Tests
 * Tests HMAC-SHA256 signature verification and blog.generated payload handling
 */

import { describe, test, expect } from '@jest/globals'
import crypto from 'crypto'

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_BASE || 'http://localhost:3000'
const WEBHOOK_SECRET = process.env.AOS_WEBHOOK_SECRET || 'test-secret-for-unit-tests'

function signRequest(body: string, secret = WEBHOOK_SECRET): { signature: string; timestamp: string } {
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const payload = `${timestamp}.${body}`
  const signature = 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex')
  return { signature, timestamp }
}

function buildBlogPayload(overrides: Record<string, unknown> = {}) {
  return {
    event: 'blog.generated',
    workspace_id: '00000000-0000-0000-0000-000000000001',
    topic_node_id: 'test-node-id',
    aos_post_id: '',
    blog: {
      title: 'Professional Relationship Management Guide',
      slug: 'professional-relationship-management-guide',
      meta_description: 'Learn how to manage professional relationships effectively.',
      content: '# Professional Relationship Management\n\nContent here...',
      word_count: 1500,
      quality_score: 75,
      pillar_domain: 'relationship_management',
      node_type: 'pillar',
      primary_keyword: 'professional relationship management',
      secondary_keywords: ['relationship management', 'networking'],
      search_intent: 'informational',
    },
    ...overrides,
  }
}

describe('Authority OS Webhook — signature verification', () => {
  test('rejects missing signature header', async () => {
    const body = JSON.stringify(buildBlogPayload())
    const { timestamp } = signRequest(body)

    const res = await fetch(`${BASE_URL}/api/webhooks/authority-os`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-AOS-Timestamp': timestamp },
      body,
    })

    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Invalid signature')
  })

  test('rejects wrong secret', async () => {
    const body = JSON.stringify(buildBlogPayload())
    const { signature, timestamp } = signRequest(body, 'wrong-secret')

    const res = await fetch(`${BASE_URL}/api/webhooks/authority-os`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AOS-Signature': signature,
        'X-AOS-Timestamp': timestamp,
      },
      body,
    })

    expect(res.status).toBe(401)
  })

  test('rejects stale timestamp (> 5 minutes old)', async () => {
    const body = JSON.stringify(buildBlogPayload())
    const staleTimestamp = (Math.floor(Date.now() / 1000) - 400).toString()
    const payload = `${staleTimestamp}.${body}`
    const signature = 'sha256=' + crypto.createHmac('sha256', WEBHOOK_SECRET).update(payload).digest('hex')

    const res = await fetch(`${BASE_URL}/api/webhooks/authority-os`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AOS-Signature': signature,
        'X-AOS-Timestamp': staleTimestamp,
      },
      body,
    })

    expect(res.status).toBe(401)
  })
})

describe('Authority OS Webhook — payload handling', () => {
  test('accepts valid blog.generated event and returns post_id', async () => {
    const body = JSON.stringify(buildBlogPayload())
    const { signature, timestamp } = signRequest(body)

    const res = await fetch(`${BASE_URL}/api/webhooks/authority-os`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AOS-Signature': signature,
        'X-AOS-Timestamp': timestamp,
      },
      body,
    })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json).toHaveProperty('post_id')
    expect(json.title).toBe('Professional Relationship Management Guide')
  })

  test('ignores unknown event types gracefully', async () => {
    const body = JSON.stringify({ event: 'blog.unknown', data: {} })
    const { signature, timestamp } = signRequest(body)

    const res = await fetch(`${BASE_URL}/api/webhooks/authority-os`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AOS-Signature': signature,
        'X-AOS-Timestamp': timestamp,
      },
      body,
    })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.action).toBe('ignored')
  })

  test('returns 400 on malformed JSON', async () => {
    const body = 'not valid json'
    const { signature, timestamp } = signRequest(body)

    const res = await fetch(`${BASE_URL}/api/webhooks/authority-os`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AOS-Signature': signature,
        'X-AOS-Timestamp': timestamp,
      },
      body,
    })

    expect(res.status).toBe(400)
  })

  test('OPTIONS preflight returns 200', async () => {
    const res = await fetch(`${BASE_URL}/api/webhooks/authority-os`, {
      method: 'OPTIONS',
    })

    // 200 or 204 are both valid for OPTIONS preflight
    expect([200, 204]).toContain(res.status)
  })
})
