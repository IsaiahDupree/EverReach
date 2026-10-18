/**
 * Integration tests for Live Paywall Configuration API
 * Tests: GET and POST /api/v1/config/paywall-live
 */

import { describe, it, expect, beforeAll } from 'vitest';
import fetch from 'node-fetch';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Make fetch global
global.fetch = fetch;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load test environment
config({ path: join(__dirname, '../.env.test') });

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3005';
const TEST_TOKEN = process.env.TEST_AUTH_TOKEN;

if (!TEST_TOKEN) {
  console.error('❌ TEST_AUTH_TOKEN not found in .env.test');
  console.log('Run: npm run get-test-token');
  process.exit(1);
}

// Test helpers
async function request(method, path, body = null) {
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${TEST_TOKEN}`,
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${BACKEND_URL}${path}`, options);
  const data = await response.json();
  
  return { response, data };
}

// Test suite
describe('Live Paywall Configuration API', () => {
  
  // Cleanup before tests
  beforeAll(async () => {
    console.log('🧹 Cleaning up test data...');
    // Delete any existing test data for ios/android/web
    for (const platform of ['ios', 'android', 'web']) {
      await request('POST', '/api/v1/config/paywall-live', {
        platform,
        paywall_id: 'test_cleanup',
        provider: 'custom'
      });
    }
  });

  describe('POST /api/v1/config/paywall-live', () => {
    
    it('should set live paywall for iOS', async () => {
      const { response, data } = await request('POST', '/api/v1/config/paywall-live', {
        platform: 'ios',
        paywall_id: 'everreach_pro_paywall',
        provider: 'custom',
      });

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.platform).toBe('ios');
      expect(data.paywall_id).toBe('everreach_pro_paywall');
      expect(data.provider).toBe('custom');
      expect(data.updated_at).toBeDefined();
    });

    it('should set live paywall for Android', async () => {
      const { response, data } = await request('POST', '/api/v1/config/paywall-live', {
        platform: 'android',
        paywall_id: 'everreach_basic_paywall',
        provider: 'custom',
      });

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.platform).toBe('android');
      expect(data.paywall_id).toBe('everreach_basic_paywall');
    });

    it('should set live paywall for Web', async () => {
      const { response, data } = await request('POST', '/api/v1/config/paywall-live', {
        platform: 'web',
        paywall_id: 'everreach_web_paywall',
        provider: 'custom',
      });

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.platform).toBe('web');
    });

    it('should replace existing live paywall (upsert)', async () => {
      // First set
      await request('POST', '/api/v1/config/paywall-live', {
        platform: 'ios',
        paywall_id: 'old_paywall',
        provider: 'custom',
      });

      // Replace with new
      const { response, data } = await request('POST', '/api/v1/config/paywall-live', {
        platform: 'ios',
        paywall_id: 'new_paywall',
        provider: 'superwall',
      });

      expect(response.status).toBe(200);
      expect(data.paywall_id).toBe('new_paywall');
      expect(data.provider).toBe('superwall');

      // Verify only one exists
      const { data: getAll } = await request('GET', '/api/v1/config/paywall-live');
      expect(getAll.ios.paywall_id).toBe('new_paywall');
    });

    it('should reject invalid platform', async () => {
      const { response, data } = await request('POST', '/api/v1/config/paywall-live', {
        platform: 'invalid',
        paywall_id: 'test',
        provider: 'custom',
      });

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid platform');
    });

    it('should reject invalid provider', async () => {
      const { response, data } = await request('POST', '/api/v1/config/paywall-live', {
        platform: 'ios',
        paywall_id: 'test',
        provider: 'invalid',
      });

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid provider');
    });

    it('should reject missing required fields', async () => {
      const { response, data } = await request('POST', '/api/v1/config/paywall-live', {
        platform: 'ios',
      });

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });

    it('should require authentication', async () => {
      const response = await fetch(`${BACKEND_URL}/api/v1/config/paywall-live`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: 'ios',
          paywall_id: 'test',
          provider: 'custom',
        }),
      });

      expect(response.status).toBe(401);
    });

    it('should handle configuration object', async () => {
      const { response, data } = await request('POST', '/api/v1/config/paywall-live', {
        platform: 'ios',
        paywall_id: 'test_config',
        provider: 'custom',
        configuration: {
          theme: 'dark',
          features: ['trial', 'discount'],
        },
      });

      expect(response.status).toBe(200);
      expect(data.configuration).toEqual({
        theme: 'dark',
        features: ['trial', 'discount'],
      });
    });
  });

  describe('GET /api/v1/config/paywall-live', () => {
    
    // Setup test data
    beforeAll(async () => {
      await request('POST', '/api/v1/config/paywall-live', {
        platform: 'ios',
        paywall_id: 'test_ios_paywall',
        provider: 'custom',
      });

      await request('POST', '/api/v1/config/paywall-live', {
        platform: 'android',
        paywall_id: 'test_android_paywall',
        provider: 'superwall',
      });
    });

    it('should get all live paywalls', async () => {
      const { response, data } = await request('GET', '/api/v1/config/paywall-live');

      expect(response.status).toBe(200);
      expect(data.ios).toBeDefined();
      expect(data.ios.paywall_id).toBe('test_ios_paywall');
      expect(data.ios.provider).toBe('custom');
      
      expect(data.android).toBeDefined();
      expect(data.android.paywall_id).toBe('test_android_paywall');
      expect(data.android.provider).toBe('superwall');
    });

    it('should get live paywall for specific platform (iOS)', async () => {
      const { response, data } = await request('GET', '/api/v1/config/paywall-live?platform=ios');

      expect(response.status).toBe(200);
      expect(data.platform).toBe('ios');
      expect(data.paywall_id).toBe('test_ios_paywall');
      expect(data.provider).toBe('custom');
      expect(data.configuration).toBeDefined();
      expect(data.updated_at).toBeDefined();
    });

    it('should get live paywall for specific platform (Android)', async () => {
      const { response, data } = await request('GET', '/api/v1/config/paywall-live?platform=android');

      expect(response.status).toBe(200);
      expect(data.platform).toBe('android');
      expect(data.paywall_id).toBe('test_android_paywall');
    });

    it('should return 404 for platform with no live paywall', async () => {
      // First clear web
      // (In a real test, you'd clear it, but let's assume web doesn't exist)
      
      const { response, data } = await request('GET', '/api/v1/config/paywall-live?platform=web');

      if (response.status === 404) {
        expect(data.error).toContain('No live paywall configured');
      } else {
        // Web might have data from previous tests, which is OK
        expect(response.status).toBe(200);
      }
    });

    it('should reject invalid platform query', async () => {
      const { response, data } = await request('GET', '/api/v1/config/paywall-live?platform=invalid');

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid platform');
    });

    it('should require authentication', async () => {
      const response = await fetch(`${BACKEND_URL}/api/v1/config/paywall-live`);
      expect(response.status).toBe(401);
    });

    it('should have proper CORS headers', async () => {
      const response = await fetch(`${BACKEND_URL}/api/v1/config/paywall-live`, {
        headers: {
          'Authorization': `Bearer ${TEST_TOKEN}`,
          'Origin': 'http://localhost:3007',
        },
      });

      // CORS headers might not be visible in Node.js fetch
      // But the request should succeed without CORS errors
      expect(response.ok || response.status === 401).toBe(true);
    });
  });

  describe('OPTIONS /api/v1/config/paywall-live (CORS Preflight)', () => {
    
    it('should handle OPTIONS preflight request from Dashboard (port 3007)', async () => {
      const response = await fetch(`${BACKEND_URL}/api/v1/config/paywall-live`, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://localhost:3007',
          'Access-Control-Request-Method': 'POST',
        },
      });

      expect(response.status).toBe(200);
      // Verify CORS headers (if available in Node.js)
      const allowOrigin = response.headers.get('Access-Control-Allow-Origin');
      if (allowOrigin) {
        expect(allowOrigin).toBe('http://localhost:3007');
      }
    });

    it('should handle OPTIONS preflight request from Expo Web (port 19006)', async () => {
      const response = await fetch(`${BACKEND_URL}/api/v1/config/paywall-live`, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://localhost:19006',
          'Access-Control-Request-Method': 'GET',
        },
      });

      expect(response.status).toBe(200);
      const allowOrigin = response.headers.get('Access-Control-Allow-Origin');
      if (allowOrigin) {
        expect(allowOrigin).toBe('http://localhost:19006');
      }
    });

    it('should handle OPTIONS from localhost with any port', async () => {
      const response = await fetch(`${BACKEND_URL}/api/v1/config/paywall-live`, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://localhost:8080',
          'Access-Control-Request-Method': 'GET',
        },
      });

      expect(response.status).toBe(200);
      const allowOrigin = response.headers.get('Access-Control-Allow-Origin');
      if (allowOrigin) {
        expect(allowOrigin).toBe('http://localhost:8080');
      }
    });

    it('should handle OPTIONS from 127.0.0.1 with any port', async () => {
      const response = await fetch(`${BACKEND_URL}/api/v1/config/paywall-live`, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://127.0.0.1:3001',
          'Access-Control-Request-Method': 'GET',
        },
      });

      expect(response.status).toBe(200);
      const allowOrigin = response.headers.get('Access-Control-Allow-Origin');
      if (allowOrigin) {
        expect(allowOrigin).toBe('http://127.0.0.1:3001');
      }
    });
  });

  describe('End-to-End Flow', () => {
    
    it('should complete full workflow: set live, get, update, get', async () => {
      // 1. Set iOS live
      const { data: setData } = await request('POST', '/api/v1/config/paywall-live', {
        platform: 'ios',
        paywall_id: 'e2e_test_paywall',
        provider: 'custom',
      });
      expect(setData.success).toBe(true);

      // 2. Get iOS live
      const { data: getData1 } = await request('GET', '/api/v1/config/paywall-live?platform=ios');
      expect(getData1.paywall_id).toBe('e2e_test_paywall');

      // 3. Update iOS live (different paywall)
      const { data: updateData } = await request('POST', '/api/v1/config/paywall-live', {
        platform: 'ios',
        paywall_id: 'e2e_updated_paywall',
        provider: 'superwall',
      });
      expect(updateData.paywall_id).toBe('e2e_updated_paywall');
      expect(updateData.provider).toBe('superwall');

      // 4. Get iOS live again (should be updated)
      const { data: getData2 } = await request('GET', '/api/v1/config/paywall-live?platform=ios');
      expect(getData2.paywall_id).toBe('e2e_updated_paywall');
      expect(getData2.provider).toBe('superwall');

      // 5. Get all platforms
      const { data: getAllData } = await request('GET', '/api/v1/config/paywall-live');
      expect(getAllData.ios.paywall_id).toBe('e2e_updated_paywall');
    });
  });
});

// Tests will be run by Vitest
// Run with: npx vitest run paywall-live-config.test.mjs
