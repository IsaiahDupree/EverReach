const BASE = process.env.BACKEND_BASE_URL || 'https://ever-reach-be.vercel.app';

describe('Backend: health', () => {
  it('GET /api/health returns healthy JSON', async () => {
    const res = await fetch(`${BASE}/api/health`, { method: 'GET' });
    expect(res.ok).toBe(true);
    const json = await res.json();
    expect(json.status).toBe('healthy');
    expect(typeof json.uptime).toBe('number');
    expect(json.services).toBeTruthy();
  }, 20000);
});
