import { useCallback, useState, useEffect } from 'react';
import { CacheManager } from '@/lib/cache/CacheManager';

export function useCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = 5 * 60 * 1000 // 5 minutes default
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);

      // Try to get from cache first
      if (!forceRefresh) {
        const cached = await CacheManager.get<T>(key);
        if (cached) {
          setData(cached);
          setLoading(false);
          return;
        }
      }

      // Fetch fresh data
      const fresh = await fetchFn();
      setData(fresh);

      // Cache it
      await CacheManager.set(key, fresh, ttl);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      console.error(`[useCache] Error fetching data for key "${key}":`, error);
    } finally {
      setLoading(false);
    }
  }, [key, fetchFn, ttl]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return {
    data,
    loading,
    error,
    refetch: () => fetch(true),
    clearCache: () => CacheManager.remove(key),
  };
}
