import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch } from '@/lib/api';
import analytics from '@/lib/analytics';

export type Provider = 'custom' | 'revenuecat' | 'superwall';

export interface LivePaywallConfig {
  platform: 'ios' | 'android' | 'web';
  paywall_id: string;
  provider: Provider;
  configuration?: Record<string, any>;
  updated_at: string;
}

interface CachedValue<T> {
  ts: number;
  value: T;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min default

function platformKey(): LivePaywallConfig['platform'] {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return 'web';
}

export function useLivePaywall() {
  const platform = platformKey();
  const [config, setConfig] = useState<LivePaywallConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const lastFetchedRef = useRef<number>(0);

  const storageKey = `live_paywall_config:${platform}`;

  const loadFromCache = async (): Promise<LivePaywallConfig | null> => {
    try {
      const raw = await AsyncStorage.getItem(storageKey);
      if (!raw) return null;
      const cached: CachedValue<LivePaywallConfig> = JSON.parse(raw);
      // Return if fresh
      if (Date.now() - cached.ts < CACHE_TTL_MS) {
        return cached.value;
      }
      return cached.value; // return stale to render something while we refresh
    } catch {
      return null;
    }
  };

  const saveToCache = async (value: LivePaywallConfig) => {
    try {
      const payload: CachedValue<LivePaywallConfig> = { ts: Date.now(), value };
      await AsyncStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {}
  };

  const fetchRemote = async (opts: { silent?: boolean } = {}) => {
    if (!opts.silent) setLoading(true);
    setError(null);
    try {
      // Use apiFetch so auth header is handled and base url is inferred
      // Updated to use paywall-live endpoint which returns provider configuration
      const res = await apiFetch(`/api/v1/config/paywall-live?platform=${platform}`, {
        method: 'GET',
        requireAuth: true,
      });
      if (res.status === 404) {
        // No live config — fall back to custom
        const fallback: LivePaywallConfig = {
          platform,
          provider: 'custom',
          paywall_id: 'everreach_basic_paywall',
          configuration: {},
          updated_at: new Date().toISOString(),
        };
        setConfig(fallback);
        await saveToCache(fallback);
        lastFetchedRef.current = Date.now();
        // analytics: fallback due to not configured
        analytics.track('paywall_provider_fallback', {
          reason: 'not_configured',
          platform,
          provider: fallback.provider,
          paywall_id: fallback.paywall_id,
        });
        return;
      }
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = (await res.json()) as LivePaywallConfig;
      setConfig(data);
      await saveToCache(data);
      lastFetchedRef.current = Date.now();
      // analytics: resolved
      analytics.track('remote_paywall_resolved', {
        platform,
        provider: data.provider,
        paywall_id: data.paywall_id,
        updated_at: data.updated_at,
      });
    } catch (e: any) {
      // On error, prefer cached value; else fallback
      if (!config) {
        const cached = await loadFromCache();
        if (cached) {
          setConfig(cached);
        } else {
          setConfig({
            platform,
            provider: 'custom',
            paywall_id: 'everreach_basic_paywall',
            configuration: {},
            updated_at: new Date().toISOString(),
          });
        }
      }
      setError(e?.message || 'fetch error');
      // analytics: failed
      analytics.track('remote_paywall_failed', {
        platform,
        error: e?.message || 'fetch error',
      });
    } finally {
      if (!opts.silent) setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      const cached = await loadFromCache();
      if (mounted && cached) {
        setConfig(cached);
        setLoading(false);
      }
      await fetchRemote({ silent: !!cached });
    })();
    return () => {
      mounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        const age = Date.now() - lastFetchedRef.current;
        if (age > CACHE_TTL_MS) {
          fetchRemote({ silent: true });
        }
      }
    });
    return () => sub.remove();
  }, []);

  // Dev override: allow query param to force provider on web
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    try {
      const sp = new URLSearchParams(window.location.search);
      const override = sp.get('paywallProvider');
      if (override === 'custom' || override === 'revenuecat' || override === 'superwall') {
        setConfig((prev) => prev ? { ...prev, provider: override as Provider } : prev);
      }
    } catch {}
  }, []);

  // Dev override for native: AsyncStorage flag
  useEffect(() => {
    if (Platform.OS === 'web') return;
    (async () => {
      try {
        const override = await AsyncStorage.getItem('dev:paywallProvider');
        if (override === 'custom' || override === 'revenuecat' || override === 'superwall') {
          setConfig((prev) => prev ? { ...prev, provider: override as Provider } : prev);
        }
      } catch {}
    })();
  }, []);

  return { config, loading, error, refetch: () => fetchRemote({ silent: false }) };
}
