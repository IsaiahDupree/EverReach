/**
 * Contact Selection API Tests
 * 
 * Tests the new preview and confirm endpoints for contact import selection
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import {
  initializeTestContext,
  getTestContext,
  cleanupTestData,
  makeAuthenticatedRequest,
} from '../setup-v1-tests';

beforeAll(async () => {
  await initializeTestContext();
  console.log('✅ Contact Selection tests initialized');
});

afterAll(async () => {
  const context = getTestContext();
  // Clean up test data
  await cleanupTestData('contact_import_jobs', { user_id: context.userId });
  await cleanupTestData('import_preview_contacts', {});
  console.log('🧹 Contact Selection tests cleaned up');
});

describe('Contact Selection Flow', () => {
  let testJobId: string;

  test('should create an import job', async () => {
    const response = await makeAuthenticatedRequest('/v1/contacts/import/google/start', {
      method: 'POST',
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    
    expect(data.job_id).toBeDefined();
    expect(data.provider).toBe('google');
    testJobId = data.job_id;
    
    console.log('✅ Created test import job:', testJobId);
  });

  test('GET /v1/contacts/import/jobs/{id}/preview should return 400 when job not in contacts_fetched status', async () => {
    const response = await makeAuthenticatedRequest(`/v1/contacts/import/jobs/${testJobId}/preview`, {
      method: 'GET',
    });

    // Job is still in 'authenticating' status, so should return 400
    expect(response.status).toBe(400);
    const data = await response.json();
    
    expect(data.error).toContain('not ready for preview');
    console.log('✅ Preview correctly rejects non-fetched jobs');
  });

  test('POST /v1/contacts/import/jobs/{id}/confirm should return 400 when job not in contacts_fetched status', async () => {
    const response = await makeAuthenticatedRequest(`/v1/contacts/import/jobs/${testJobId}/confirm`, {
      method: 'POST',
      body: JSON.stringify({ import_all: true }),
    });

    // Job is still in 'authenticating' status, so should return 400
    expect(response.status).toBe(400);
    const data = await response.json();
    
    expect(data.error).toContain('not ready for import');
    console.log('✅ Confirm correctly rejects non-fetched jobs');
  });

  test('POST /v1/contacts/import/jobs/{id}/confirm should validate request body', async () => {
    const response = await makeAuthenticatedRequest(`/v1/contacts/import/jobs/${testJobId}/confirm`, {
      method: 'POST',
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    
    expect(data.error).toBeDefined();
    console.log('✅ Confirm endpoint validates request body');
  });

  test('GET /v1/contacts/import/jobs/{id}/preview should return 404 for non-existent job', async () => {
    const fakeJobId = '00000000-0000-0000-0000-000000000000';
    const response = await makeAuthenticatedRequest(`/v1/contacts/import/jobs/${fakeJobId}/preview`, {
      method: 'GET',
    });

    expect(response.status).toBe(404);
    console.log('✅ Preview returns 404 for non-existent jobs');
  });

  test('POST /v1/contacts/import/jobs/{id}/confirm should return 404 for non-existent job', async () => {
    const fakeJobId = '00000000-0000-0000-0000-000000000000';
    const response = await makeAuthenticatedRequest(`/v1/contacts/import/jobs/${fakeJobId}/confirm`, {
      method: 'POST',
      body: JSON.stringify({ import_all: true }),
    });

    expect(response.status).toBe(404);
    console.log('✅ Confirm returns 404 for non-existent jobs');
  });
});

describe('OPTIONS Handlers', () => {
  test('OPTIONS /v1/contacts/import/jobs/{id}/preview should return CORS headers', async () => {
    const jobId = 'test-job-id';
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'https://ever-reach-be.vercel.app'}/api/v1/contacts/import/jobs/${jobId}/preview`,
      {
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://example.com',
        },
      }
    );

    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeDefined();
    console.log('✅ Preview OPTIONS has CORS headers');
  });

  test('OPTIONS /v1/contacts/import/jobs/{id}/confirm should return CORS headers', async () => {
    const jobId = 'test-job-id';
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'https://ever-reach-be.vercel.app'}/api/v1/contacts/import/jobs/${jobId}/confirm`,
      {
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://example.com',
        },
      }
    );

    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeDefined();
    console.log('✅ Confirm OPTIONS has CORS headers');
  });
});
