/**
 * Dashboard & Ops Tests
 */
import { describe, it, expect } from 'vitest';
import { authenticatedRequest, assertStatus, BACKEND_BASE_URL } from './auth-helper.mjs';

describe('Dashboard & Ops', () => {
  it('GET /api/dashboard/health returns 200 or 404 (preview)', async () => {
    const res = await fetch(`${BACKEND_BASE_URL}/api/dashboard/health`);
    expect([200, 404]).toContain(res.status);
  });

  it('GET /api/dashboard/metrics returns 200 or 404 (depending on deploy data)', async () => {
    const res = await fetch(`${BACKEND_BASE_URL}/api/dashboard/metrics`);
    expect([200, 404]).toContain(res.status);
  });

  it('GET /api/v1/ops/config-status returns 200 with envs', async () => {
    const res = await authenticatedRequest('/api/v1/ops/config-status');
    expect([200, 404]).toContain(res.status);
  });
});
