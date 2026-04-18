import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl?: number;
}

export class CacheManager {
  private static readonly PREFIX = '@everreach_cache:';

  static async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl,
      };
      await AsyncStorage.setItem(
        this.PREFIX + key,
        JSON.stringify(entry)
      );
    } catch (error) {
      console.error(`[CacheManager] Error setting cache for key "${key}":`, error);
    }
  }

  static async get<T>(key: string): Promise<T | null> {
    try {
      const item = await AsyncStorage.getItem(this.PREFIX + key);
      if (!item) return null;

      const entry: CacheEntry<T> = JSON.parse(item);

      // Check if cache has expired
      if (entry.ttl) {
        const age = Date.now() - entry.timestamp;
        if (age > entry.ttl) {
          // Cache expired, delete it
          await this.remove(key);
          return null;
        }
      }

      return entry.data;
    } catch (error) {
      console.error(`[CacheManager] Error getting cache for key "${key}":`, error);
      return null;
    }
  }

  static async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.PREFIX + key);
    } catch (error) {
      console.error(`[CacheManager] Error removing cache for key "${key}":`, error);
    }
  }

  static async clear(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(k => k.startsWith(this.PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.error('[CacheManager] Error clearing cache:', error);
    }
  }

  static async invalidate(pattern: string): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const keysToRemove = allKeys.filter(
        k => k.startsWith(this.PREFIX) && k.includes(pattern)
      );
      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
      }
    } catch (error) {
      console.error(`[CacheManager] Error invalidating cache pattern "${pattern}":`, error);
    }
  }
}
