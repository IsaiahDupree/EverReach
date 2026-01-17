/**
 * CORS Headers Tests
 * 
 * Verifies that all API endpoints return proper CORS headers
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import { initializeTestContext } from '../setup-v1-tests';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://ever-reach-be.vercel.app';

beforeAll(async () => {
  await initializeTestContext();
  console.log('✅ CORS Headers tests initialized');
});

describe('CORS Headers - Telemetry Endpoints', () => {
  test('OPTIONS /api/telemetry/prompt-first should return CORS headers', async () => {
    const response = await fetch(`${BASE_URL}/api/telemetry/prompt-first`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://example.com',
      },
    });

    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeDefined();
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    
    console.log('✅ Telemetry prompt-first OPTIONS has CORS headers');
  });

  test('POST /api/telemetry/prompt-first 401 should include CORS headers', async () => {
    const response = await fetch(`${BASE_URL}/api/telemetry/prompt-first`, {
      method: 'POST',
      headers: {
        'Origin': 'https://example.com',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(401);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeDefined();
    
    console.log('✅ Telemetry 401 response has CORS headers');
  });
});

describe('CORS Headers - Screenshots Endpoint', () => {
  test('OPTIONS /api/v1/screenshots should return CORS headers', async () => {
    const response = await fetch(`${BASE_URL}/api/v1/screenshots`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://example.com',
      },
    });

    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeDefined();
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
    
    console.log('✅ Screenshots OPTIONS has CORS headers');
  });

  test('POST /api/v1/screenshots 401 should include CORS headers', async () => {
    const response = await fetch(`${BASE_URL}/api/v1/screenshots`, {
      method: 'POST',
      headers: {
        'Origin': 'https://example.com',
        'Content-Type': 'multipart/form-data',
      },
    });

    expect(response.status).toBe(401);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeDefined();
    
    console.log('✅ Screenshots POST 401 has CORS headers');
  });

  test('GET /api/v1/screenshots 401 should include CORS headers', async () => {
    const response = await fetch(`${BASE_URL}/api/v1/screenshots`, {
      method: 'GET',
      headers: {
        'Origin': 'https://example.com',
      },
    });

    expect(response.status).toBe(401);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeDefined();
    
    console.log('✅ Screenshots GET 401 has CORS headers');
  });
});

describe('CORS Headers - Contact Import Endpoints', () => {
  test('OPTIONS /api/v1/contacts/import/health should return CORS headers', async () => {
    const response = await fetch(`${BASE_URL}/api/v1/contacts/import/health`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://example.com',
      },
    });

    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeDefined();
    
    console.log('✅ Import health OPTIONS has CORS headers');
  });
});
