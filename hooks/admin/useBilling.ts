/**
 * Billing Hook
 * Fetches user's subscription and usage data
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { Linking } from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://ever-reach-be.vercel.app';

interface Subscription {
  plan: 'free' | 'pro' | 'team';
  name: string;
  price: number;
  billing_period: string | null;
  status: string;
  features: string[];
  limits: {
    contacts: number;
    ai_messages: number;
    screenshots: number;
    team_members: number;
  };
  next_billing_date: string | null;
  can_upgrade: boolean;
  can_manage: boolean;
}

interface Usage {
  contacts: number;
  ai_messages: number;
  screenshots: number;
  team_members: number;
  period_start: string;
  period_end: string;
}

export function useBilling() {
  const { session } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      setIsLoading(false);
      return;
    }

    fetchBillingData();
  }, [session]);

  const fetchBillingData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const headers = {
        'Authorization': `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json',
      };

      // Fetch subscription
      const subResponse = await fetch(`${API_URL}/api/v1/billing/subscription`, { headers });
      if (!subResponse.ok) throw new Error('Failed to fetch subscription');
      const subData = await subResponse.json();
      setSubscription(subData.subscription);

      // Fetch usage
      const usageResponse = await fetch(`${API_URL}/api/v1/billing/usage`, { headers });
      if (!usageResponse.ok) throw new Error('Failed to fetch usage');
      const usageData = await usageResponse.json();
      setUsage(usageData.usage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const openCustomerPortal = async () => {
    try {
      const response = await fetch(`${API_URL}/api/v1/billing/portal`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to open portal');

      const { url } = await response.json();
      await Linking.openURL(url);
    } catch (err) {
      console.error('Failed to open customer portal:', err);
      throw err;
    }
  };

  const getUsagePercentage = (current: number, limit: number): number => {
    if (limit === -1) return 0; // Unlimited
    if (limit === 0) return 100;
    return Math.min((current / limit) * 100, 100);
  };

  return {
    subscription,
    usage,
    isLoading,
    error,
    refetch: fetchBillingData,
    openCustomerPortal,
    getUsagePercentage,
  };
}
