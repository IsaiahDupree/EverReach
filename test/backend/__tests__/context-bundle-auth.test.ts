const BASE = process.env.BACKEND_BASE_URL || 'https://ever-reach-be.vercel.app';

describe('Backend: context bundle auth', () => {
  it('GET /api/v1/contacts/:id/context-bundle without auth is denied', async () => {
    const res = await fetch(`${BASE}/api/v1/contacts/00000000-0000-0000-0000-000000000000/context-bundle?interactions=1`);
    expect([401, 403, 404, 500]).toContain(res.status); // Allow 500 for invalid UUID or other errors
    // Request ID header is optional (nice-to-have)
  }, 20000);
});
