import { apiFetch } from '@/lib/api';

export interface MeResponse {
  id?: string;
  email?: string;
  name?: string;
  org?: { id?: string; name?: string } | null;
  plan?: string | null;
  subscription_status?: 'active' | 'trial' | 'canceled' | 'past_due' | string;
  entitlements?: any;
}

export interface UsageResponse {
  period?: string;
  used?: number;
  limit?: number;
  unit?: 'seconds' | 'minutes' | 'requests' | string;
}

export const AccountRepo = {
  async getMe(): Promise<MeResponse> {
    const res = await apiFetch('/api/v1/me' as any, { method: 'GET', requireAuth: true });
    if (!res.ok) throw new Error(`getMe failed: ${res.status}`);
    return res.json();
  },

  async getUsage(): Promise<UsageResponse> {
    const res = await apiFetch('/api/v1/me/usage' as any, { method: 'GET', requireAuth: true });
    if (!res.ok) throw new Error(`getUsage failed: ${res.status}`);
    return res.json();
  },
};
