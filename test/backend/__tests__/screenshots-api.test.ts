/**
 * Backend Integration Tests: Screenshot Analysis API
 * 
 * Tests all screenshot analysis endpoints:
 * - POST /v1/screenshots (upload with Sharp thumbnail generation)
 * - GET /v1/screenshots/:id (fetch with analysis)
 * - GET /v1/screenshots (list with pagination)
 * - POST /v1/screenshots/:id/analyze (trigger AI analysis)
 * - DELETE /v1/screenshots/:id (delete with storage cleanup)
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

const BASE = process.env.BACKEND_BASE_URL || 'https://ever-reach-be.vercel.app/api';

// Test image (base64 encoded 1x1 PNG)
const TEST_IMAGE_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

let authToken: string;
let testScreenshotId: string;

// ============================================================================
// SETUP & TEARDOWN
// ============================================================================

beforeAll(async () => {
  // Get auth token from environment (set in CI or .env.test)
  authToken = process.env.TEST_AUTH_TOKEN || '';
  
  if (!authToken) {
    throw new Error('TEST_AUTH_TOKEN environment variable not set');
  }
});

afterAll(async () => {
  // Cleanup: Delete test screenshots
  if (testScreenshotId) {
    try {
      await fetch(`${BASE}/v1/screenshots/${testScreenshotId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });
    } catch (err) {
      // Ignore cleanup errors
    }
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function uploadScreenshot(context = 'business_card'): Promise<any> {
  const imageBuffer = Buffer.from(TEST_IMAGE_BASE64, 'base64');
  
  // Create FormData manually
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36);
  const bodyParts: (string | Buffer)[] = [];
  
  // Add file field
  bodyParts.push(`--${boundary}\r\n`);
  bodyParts.push(`Content-Disposition: form-data; name="file"; filename="test.png"\r\n`);
  bodyParts.push(`Content-Type: image/png\r\n\r\n`);
  bodyParts.push(imageBuffer);
  bodyParts.push(`\r\n`);
  
  // Add context field
  bodyParts.push(`--${boundary}\r\n`);
  bodyParts.push(`Content-Disposition: form-data; name="context"\r\n\r\n`);
  bodyParts.push(context);
  bodyParts.push(`\r\n`);
  
  // End boundary
  bodyParts.push(`--${boundary}--\r\n`);
  
  const body = Buffer.concat(bodyParts.map(p => Buffer.isBuffer(p) ? p : Buffer.from(p)));
  
  const res = await fetch(`${BASE}/v1/screenshots`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body,
  });
  
  return await res.json();
}

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// UPLOAD TESTS
// ============================================================================

describe('POST /v1/screenshots', () => {
  it('should upload screenshot with business_card context', async () => {
    const result = await uploadScreenshot('business_card');
    
    expect(result.screenshot_id).toBeDefined();
    expect(result.analysis_id).toBeDefined();
    expect(result.status).toBe('queued');
    expect(result.message).toBeDefined();
    
    // Store for subsequent tests
    testScreenshotId = result.screenshot_id;
  }, 30000);
  
  it('should upload screenshot with email context', async () => {
    const result = await uploadScreenshot('email');
    
    expect(result.screenshot_id).toBeDefined();
    expect(result.status).toBe('queued');
  }, 30000);
  
  it('should upload screenshot with meeting_notes context', async () => {
    const result = await uploadScreenshot('meeting_notes');
    
    expect(result.screenshot_id).toBeDefined();
    expect(result.status).toBe('queued');
  }, 30000);
  
  it('should upload screenshot with social_post context', async () => {
    const result = await uploadScreenshot('social_post');
    
    expect(result.screenshot_id).toBeDefined();
    expect(result.status).toBe('queued');
  }, 30000);
  
  it('should upload screenshot with general context', async () => {
    const result = await uploadScreenshot('general');
    
    expect(result.screenshot_id).toBeDefined();
    expect(result.status).toBe('queued');
  }, 30000);
  
  it('should reject file too large (>10MB)', async () => {
    const largeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB
    
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36);
    const bodyParts: (string | Buffer)[] = [];
    
    bodyParts.push(`--${boundary}\r\n`);
    bodyParts.push(`Content-Disposition: form-data; name="file"; filename="large.png"\r\n`);
    bodyParts.push(`Content-Type: image/png\r\n\r\n`);
    bodyParts.push(largeBuffer);
    bodyParts.push(`\r\n--${boundary}--\r\n`);
    
    const body = Buffer.concat(bodyParts.map(p => Buffer.isBuffer(p) ? p : Buffer.from(p)));
    
    const res = await fetch(`${BASE}/v1/screenshots`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body,
    });
    
    expect(res.status).toBeGreaterThanOrEqual(400);
    const json = await res.json();
    expect(json.error).toBeDefined();
  }, 30000);
  
  it('should reject unsupported file type', async () => {
    const txtBuffer = Buffer.from('Hello world');
    
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36);
    const bodyParts: (string | Buffer)[] = [];
    
    bodyParts.push(`--${boundary}\r\n`);
    bodyParts.push(`Content-Disposition: form-data; name="file"; filename="test.txt"\r\n`);
    bodyParts.push(`Content-Type: text/plain\r\n\r\n`);
    bodyParts.push(txtBuffer);
    bodyParts.push(`\r\n--${boundary}--\r\n`);
    
    const body = Buffer.concat(bodyParts.map(p => Buffer.isBuffer(p) ? p : Buffer.from(p)));
    
    const res = await fetch(`${BASE}/v1/screenshots`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body,
    });
    
    expect(res.status).toBeGreaterThanOrEqual(400);
    const json = await res.json();
    expect(json.error).toBeDefined();
  }, 30000);
  
  it('should require authentication', async () => {
    const imageBuffer = Buffer.from(TEST_IMAGE_BASE64, 'base64');
    
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36);
    const bodyParts: (string | Buffer)[] = [];
    
    bodyParts.push(`--${boundary}\r\n`);
    bodyParts.push(`Content-Disposition: form-data; name="file"; filename="test.png"\r\n`);
    bodyParts.push(`Content-Type: image/png\r\n\r\n`);
    bodyParts.push(imageBuffer);
    bodyParts.push(`\r\n--${boundary}--\r\n`);
    
    const body = Buffer.concat(bodyParts.map(p => Buffer.isBuffer(p) ? p : Buffer.from(p)));
    
    const res = await fetch(`${BASE}/v1/screenshots`, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        // No Authorization header
      },
      body,
    });
    
    expect(res.status).toBe(401);
  }, 30000);
});

// ============================================================================
// GET SCREENSHOT TESTS
// ============================================================================

describe('GET /v1/screenshots/:id', () => {
  it('should get screenshot with analysis (poll until analyzed)', async () => {
    expect(testScreenshotId).toBeDefined();
    
    let screenshot: any = null;
    let attempts = 0;
    const maxAttempts = 30; // 60 seconds max
    
    // Poll for analysis completion
    while (attempts < maxAttempts) {
      const res = await fetch(`${BASE}/v1/screenshots/${testScreenshotId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });
      
      screenshot = await res.json();
      
      if (screenshot.analysis?.status === 'analyzed') {
        break;
      } else if (screenshot.analysis?.status === 'error') {
        throw new Error(`Analysis failed: ${screenshot.analysis.error}`);
      }
      
      attempts++;
      await wait(2000); // Wait 2 seconds
    }
    
    // Validate response structure
    expect(screenshot.id).toBeDefined();
    expect(screenshot.user_id).toBeDefined();
    expect(screenshot.storage_key).toBeDefined();
    expect(screenshot.width).toBeGreaterThan(0);
    expect(screenshot.height).toBeGreaterThan(0);
    expect(screenshot.file_size).toBeGreaterThan(0);
    expect(screenshot.mime_type).toBe('image/png');
    expect(screenshot.created_at).toBeDefined();
    expect(screenshot.image_url).toBeDefined();
    expect(screenshot.image_url).toContain('https://');
    
    // Validate analysis structure
    expect(screenshot.analysis).toBeDefined();
    expect(screenshot.analysis.status).toBe('analyzed');
    expect(screenshot.analysis.entities).toBeDefined();
    expect(screenshot.analysis.insights).toBeDefined();
    
    // Validate entities
    const { entities } = screenshot.analysis;
    expect(Array.isArray(entities.contacts)).toBe(true);
    expect(Array.isArray(entities.dates)).toBe(true);
    expect(Array.isArray(entities.platforms)).toBe(true);
    expect(Array.isArray(entities.handles)).toBe(true);
    expect(Array.isArray(entities.emails)).toBe(true);
    expect(Array.isArray(entities.phones)).toBe(true);
    
    // Validate insights
    const { insights } = screenshot.analysis;
    expect('summary' in insights).toBe(true);
    expect(Array.isArray(insights.action_items)).toBe(true);
    expect('sentiment' in insights).toBe(true);
    expect('category' in insights).toBe(true);
  }, 120000);
  
  it('should return 404 for non-existent screenshot', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    
    const res = await fetch(`${BASE}/v1/screenshots/${fakeId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });
    
    expect(res.status).toBe(404);
  }, 30000);
  
  it('should require authentication', async () => {
    expect(testScreenshotId).toBeDefined();
    
    const res = await fetch(`${BASE}/v1/screenshots/${testScreenshotId}`, {
      method: 'GET',
      // No Authorization header
    });
    
    expect(res.status).toBe(401);
  }, 30000);
});

// ============================================================================
// LIST SCREENSHOTS TESTS
// ============================================================================

describe('GET /v1/screenshots', () => {
  it('should list user screenshots with default pagination', async () => {
    const res = await fetch(`${BASE}/v1/screenshots`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });
    
    expect(res.ok).toBe(true);
    const json = await res.json();
    
    expect(Array.isArray(json.screenshots)).toBe(true);
    expect(typeof json.total).toBe('number');
    expect(typeof json.limit).toBe('number');
    expect(typeof json.offset).toBe('number');
    expect(json.screenshots.length).toBeGreaterThan(0);
    
    // Validate first screenshot
    const first = json.screenshots[0];
    expect(first.id).toBeDefined();
    expect(first.created_at).toBeDefined();
  }, 30000);
  
  it('should respect limit parameter', async () => {
    const res = await fetch(`${BASE}/v1/screenshots?limit=2`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });
    
    expect(res.ok).toBe(true);
    const json = await res.json();
    
    expect(json.screenshots.length).toBeLessThanOrEqual(2);
    expect(json.limit).toBe(2);
  }, 30000);
  
  it('should support pagination with offset', async () => {
    const page1 = await fetch(`${BASE}/v1/screenshots?limit=2&offset=0`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    }).then(r => r.json());
    
    const page2 = await fetch(`${BASE}/v1/screenshots?limit=2&offset=2`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    }).then(r => r.json());
    
    expect(page1.screenshots.length).toBeLessThanOrEqual(2);
    expect(page2.screenshots.length).toBeLessThanOrEqual(2);
    
    if (page1.total > 2) {
      expect(page1.screenshots[0].id).not.toBe(page2.screenshots[0].id);
    }
  }, 30000);
  
  it('should enforce max limit of 100', async () => {
    const res = await fetch(`${BASE}/v1/screenshots?limit=200`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });
    
    expect(res.ok).toBe(true);
    const json = await res.json();
    
    expect(json.limit).toBeLessThanOrEqual(100);
  }, 30000);
  
  it('should require authentication', async () => {
    const res = await fetch(`${BASE}/v1/screenshots`, {
      method: 'GET',
      // No Authorization header
    });
    
    expect(res.status).toBe(401);
  }, 30000);
});

// ============================================================================
// TRIGGER ANALYSIS TESTS
// ============================================================================

describe('POST /v1/screenshots/:id/analyze', () => {
  it('should trigger manual analysis', async () => {
    expect(testScreenshotId).toBeDefined();
    
    const res = await fetch(`${BASE}/v1/screenshots/${testScreenshotId}/analyze`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ context: 'general' }),
    });
    
    expect(res.ok).toBe(true);
    const json = await res.json();
    
    expect(json.screenshot_id).toBe(testScreenshotId);
    expect(json.status).toBe('analyzed');
    expect(json.analysis).toBeDefined();
    expect(typeof json.processing_time_ms).toBe('number');
  }, 60000);
  
  it('should return 404 for non-existent screenshot', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    
    const res = await fetch(`${BASE}/v1/screenshots/${fakeId}/analyze`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ context: 'general' }),
    });
    
    expect(res.status).toBe(404);
  }, 30000);
  
  it('should require authentication', async () => {
    expect(testScreenshotId).toBeDefined();
    
    const res = await fetch(`${BASE}/v1/screenshots/${testScreenshotId}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ context: 'general' }),
    });
    
    expect(res.status).toBe(401);
  }, 30000);
});

// ============================================================================
// DELETE TESTS
// ============================================================================

describe('DELETE /v1/screenshots/:id', () => {
  it('should delete screenshot and cleanup storage', async () => {
    expect(testScreenshotId).toBeDefined();
    
    const res = await fetch(`${BASE}/v1/screenshots/${testScreenshotId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });
    
    expect(res.ok).toBe(true);
    const json = await res.json();
    
    expect(json.success).toBe(true);
    expect(json.message).toBeDefined();
    
    // Verify deletion
    const getRes = await fetch(`${BASE}/v1/screenshots/${testScreenshotId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });
    
    expect(getRes.status).toBe(404);
    
    // Clear for cleanup
    testScreenshotId = '';
  }, 30000);
  
  it('should return 404 for non-existent screenshot', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    
    const res = await fetch(`${BASE}/v1/screenshots/${fakeId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });
    
    expect(res.status).toBe(404);
  }, 30000);
  
  it('should require authentication', async () => {
    const res = await fetch(`${BASE}/v1/screenshots/some-id`, {
      method: 'DELETE',
      // No Authorization header
    });
    
    expect(res.status).toBe(401);
  }, 30000);
});
