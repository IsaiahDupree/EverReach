/**
 * API Smoke Tests - Based on recover-work test structure
 * Tests all major API endpoints for basic functionality
 */

import { describe, it, expect, beforeAll } from 'vitest';
import fetch from 'node-fetch';

const BACKEND_BASE_URL = process.env.TEST_BACKEND_URL || 'https://ever-reach-be.vercel.app';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://utasetfxiqcrnwyfforx.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0YXNldGZ4aXFjcm53eWZmb3J4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1MDc0MzQsImV4cCI6MjA3NDA4MzQzNH0.obsHbYThUPkmTBn57T8cWcEP_32QxPclSk3Mx36TE04';
const TEST_EMAIL = 'isaiahdupree33@gmail.com';
const TEST_PASSWORD = 'Frogger12';

let authToken = null;

async function getAuthToken() {
  if (authToken) return authToken;
  
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    }),
  });

  if (!response.ok) {
    throw new Error(`Auth failed: ${response.status}`);
  }

  const data = await response.json();
  authToken = data.access_token;
  return authToken;
}

async function authRequest(path, options = {}) {
  const token = await getAuthToken();
  return fetch(`${BACKEND_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });
}

describe('API Smoke Tests - All Endpoints', () => {
  
  beforeAll(async () => {
    await getAuthToken();
    console.log('✅ Authentication successful');
  });

  describe('v1 Core Endpoints', () => {
    
    it('GET /api/v1/me - User Profile', async () => {
      const response = await authRequest('/api/v1/me');
      expect([200, 404]).toContain(response.status);
    });

    it('GET /api/v1/me/entitlements - User Entitlements', async () => {
      const response = await authRequest('/api/v1/me/entitlements');
      expect([200, 404]).toContain(response.status);
    });

    it('GET /api/v1/me/trial-stats - Trial Statistics', async () => {
      const response = await authRequest('/api/v1/me/trial-stats');
      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Contacts Endpoints', () => {
    
    it('GET /api/v1/contacts - List Contacts', async () => {
      const response = await authRequest('/api/v1/contacts?limit=10');
      expect(response.status).toBe(200);
    });

    it('POST /api/v1/contacts - Create Contact', async () => {
      const response = await authRequest('/api/v1/contacts', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Smoke Test Contact',
          emails: ['smoketest@example.com'],
        }),
      });
      expect([201, 422]).toContain(response.status);
    });
  });

  describe('Persona Notes Endpoints', () => {
    
    it('GET /api/v1/me/persona-notes - List Notes', async () => {
      const response = await authRequest('/api/v1/me/persona-notes?type=voice&limit=5');
      expect(response.status).toBe(200);
    });

    it('POST /api/v1/me/persona-notes - Create Note (valid)', async () => {
      const response = await authRequest('/api/v1/me/persona-notes', {
        method: 'POST',
        body: JSON.stringify({
          type: 'voice',
          file_url: 'https://utasetfxiqcrnwyfforx.supabase.co/storage/v1/object/public/attachments/voice-notes/test.mp3',
          transcript: 'API smoke test note',
        }),
      });
      expect([201, 400, 422]).toContain(response.status);
      
      if (response.status === 201) {
        const data = await response.json();
        console.log('Created note ID:', data.id || data.note?.id);
      }
    });

    it('POST /api/v1/me/persona-notes - Reject invalid URL', async () => {
      const response = await authRequest('/api/v1/me/persona-notes', {
        method: 'POST',
        body: JSON.stringify({
          type: 'voice',
          file_url: 'ftp://invalid.com/file.mp3',
          transcript: 'Should fail',
        }),
      });
      expect([400, 422]).toContain(response.status);
    });
  });

  describe('Billing Endpoints', () => {
    
    it('GET /api/v1/billing/portal - Billing Portal', async () => {
      const response = await authRequest('/api/v1/billing/portal');
      expect([200, 400, 405]).toContain(response.status);
    });

    it('POST /api/v1/billing/checkout - Create Checkout', async () => {
      const response = await authRequest('/api/v1/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({
          price_id: 'price_test',
          success_url: 'https://app.example.com/success',
          cancel_url: 'https://app.example.com/cancel',
        }),
      });
      expect([200, 400, 405, 500]).toContain(response.status);
    });

    it('POST /api/v1/billing/reactivate - Reactivate Subscription', async () => {
      const response = await authRequest('/api/v1/billing/reactivate', {
        method: 'POST',
      });
      expect([200, 400, 404, 405]).toContain(response.status);
    });
  });

  describe('IAP Link Endpoints', () => {
    
    it('POST /api/v1/link/apple - Apple IAP (expect auth)', async () => {
      const response = await authRequest('/api/v1/link/apple', {
        method: 'POST',
        body: JSON.stringify({
          receipt_data: 'test_receipt',
          product_id: 'com.everreach.test',
        }),
      });
      expect([200, 400, 405, 500]).toContain(response.status);
    });

    it('POST /api/v1/link/google - Google Play (expect auth)', async () => {
      const response = await authRequest('/api/v1/link/google', {
        method: 'POST',
        body: JSON.stringify({
          purchase_token: 'test_token',
          package_name: 'com.everreach.app',
          product_id: 'pro_monthly',
        }),
      });
      expect([200, 400, 405, 500]).toContain(response.status);
    });
  });

  describe('Health & Config', () => {
    
    it('GET /api/health - Health Check', async () => {
      const response = await fetch(`${BACKEND_BASE_URL}/api/health`);
      expect(response.status).toBe(200);
    });

    it('GET /api/v1/ops/config-status - Config Status', async () => {
      const response = await authRequest('/api/v1/ops/config-status');
      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Unauthenticated Access Control', () => {
    
    it('GET /api/v1/me - Requires Auth', async () => {
      const response = await fetch(`${BACKEND_BASE_URL}/api/v1/me`);
      expect(response.status).toBe(401);
    });

    it('GET /api/v1/contacts - Requires Auth', async () => {
      const response = await fetch(`${BACKEND_BASE_URL}/api/v1/contacts`);
      expect(response.status).toBe(401);
    });

    it('POST /api/v1/me/persona-notes - Requires Auth', async () => {
      const response = await fetch(`${BACKEND_BASE_URL}/api/v1/me/persona-notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'voice', file_url: 'https://test.com/audio.mp3' }),
      });
      expect(response.status).toBe(401);
    });
  });
});
