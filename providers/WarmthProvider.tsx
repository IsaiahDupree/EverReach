import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { apiFetch } from '@/lib/api';
import { getWarmthManager, type WarmthMode, type WarmthSummary } from '@/lib/warmth-manager';

// Warmth band definitions with colors
export const WARMTH_BANDS = {
  hot: { min: 70, max: 100, color: '#EF4444', bgColor: '#FEE2E2', label: 'HOT' },
  warm: { min: 50, max: 69, color: '#F59E0B', bgColor: '#FEF3C7', label: 'WARM' },
  cool: { min: 30, max: 49, color: '#3B82F6', bgColor: '#DBEAFE', label: 'COOL' },
  cold: { min: 0, max: 29, color: '#6B7280', bgColor: '#F3F4F6', label: 'COLD' },
} as const;

export type WarmthBand = 'hot' | 'warm' | 'cool' | 'cold';

export interface WarmthData {
  contactId: string;
  score: number;
  band: WarmthBand;
  color: string;
  bgColor: string;
  label: string;
  lastTouchAt: string | null;
  lastUpdated: Date;
  lastRefreshed?: Date;
  refreshSource?: string;
}

interface RefreshOptions {
  force?: boolean;
  source?: string;
  ttlHours?: number;
}

interface WarmthContextValue {
  warmthMap: Map<string, WarmthData>;
  getWarmth: (contactId: string) => WarmthData;
  setWarmth: (contactId: string, score: number, lastTouchAt?: string | null, source?: string) => void;

  // Legacy methods (kept for backward compatibility)
  refreshWarmth: (contactId: string) => Promise<void>;
  refreshAllWarmth: (contacts: Array<{ id: string; warmth?: number; last_touch_at?: string | null }>) => Promise<void>;
  bulkFetchWarmth: (contactIds: string[], forceRefresh?: boolean) => Promise<void>;

  // NEW: Centralized update methods
  refreshSingle: (contactId: string, options?: RefreshOptions) => Promise<WarmthData>;
  refreshBulk: (contactIds: string[], options?: RefreshOptions) => Promise<void>;
  refreshTop: (limit?: number, options?: RefreshOptions) => Promise<void>;
  refreshRecent: (limit?: number, options?: RefreshOptions) => Promise<void>;

  // NEW: Loading state tracking
  isRefreshing: (contactId?: string) => boolean;
  lastRefreshTime: (contactId: string) => Date | null;

  // NEW: Batch operations
  batchUpdate: (updates: Array<{ contactId: string, score: number, lastTouchAt?: string | null }>) => void;

  // Existing methods
  getSummary: () => Promise<WarmthSummary | null>;
  switchMode: (contactId: string, mode: WarmthMode) => Promise<boolean>;
  invalidateCache: (contactIds?: string[]) => void;
  isLoading: boolean;
}

const WarmthContext = createContext<WarmthContextValue | undefined>(undefined);

// Helper: Calculate warmth band from score
function calculateBand(score: number): WarmthBand {
  if (score >= WARMTH_BANDS.hot.min) return 'hot';
  if (score >= WARMTH_BANDS.warm.min) return 'warm';
  if (score >= WARMTH_BANDS.cool.min) return 'cool';
  return 'cold';
}

// Helper: Get warmth colors for a band
function getBandData(band: WarmthBand) {
  return WARMTH_BANDS[band];
}

// Helper: Create WarmthData from score
function createWarmthData(contactId: string, score: number, lastTouchAt?: string | null, source?: string): WarmthData {
  const band = calculateBand(score);
  const bandData = getBandData(band);

  return {
    contactId,
    score,
    band,
    color: bandData.color,
    bgColor: bandData.bgColor,
    label: bandData.label,
    lastTouchAt: lastTouchAt || null,
    lastUpdated: new Date(),
    lastRefreshed: source ? new Date() : undefined,
    refreshSource: source,
  };
}

export function WarmthProvider({ children }: { children: React.ReactNode }) {
  const [warmthMap, setWarmthMap] = useState<Map<string, WarmthData>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [refreshingContacts, setRefreshingContacts] = useState<Set<string>>(new Set());
  const pendingRefreshes = React.useRef<Map<string, Promise<any>>>(new Map());

  // Get warmth data for a contact (with fallback)
  const getWarmth = useCallback((contactId: string): WarmthData => {
    const cached = warmthMap.get(contactId);
    if (cached) {
      return cached;
    }

    // Default fallback for unknown contacts
    return createWarmthData(contactId, 50); // Default to "warm"
  }, [warmthMap]);

  // Set/update warmth data for a contact
  const setWarmth = useCallback((contactId: string, score: number, lastTouchAt?: string | null, source?: string) => {
    setWarmthMap(prev => {
      const newMap = new Map(prev);
      newMap.set(contactId, createWarmthData(contactId, score, lastTouchAt, source));
      return newMap;
    });
  }, []);

  // Refresh warmth for a single contact from backend
  const refreshWarmth = useCallback(async (contactId: string) => {
    try {
      console.log('[WarmthProvider] Refreshing warmth for contact:', contactId);

      // Trigger recompute on backend
      const recomputeResponse = await apiFetch(
        `/api/v1/contacts/${contactId}/warmth/recompute`,
        {
          method: 'POST',
          requireAuth: true,
        }
      );

      if (!recomputeResponse.ok) {
        console.warn('[WarmthProvider] Warmth recompute failed:', recomputeResponse.status);
        return;
      }

      const body = await recomputeResponse.json();
      console.log('[WarmthProvider] Warmth recomputed:', body);

      // Endpoint returns { contact: { id, warmth, warmth_band, warmth_updated_at } }
      const updated = body?.contact || body;
      if (updated && typeof updated.warmth === 'number') {
        setWarmth(contactId, updated.warmth, updated.warmth_updated_at || undefined);
      }
    } catch (error) {
      console.error('[WarmthProvider] Error refreshing warmth:', error);
    }
  }, [setWarmth]);

  // Refresh warmth for all contacts (bulk sync)
  const refreshAllWarmth = useCallback(async (contacts: Array<{ id: string; warmth?: number; last_touch_at?: string | null }>) => {
    setIsLoading(true);
    try {
      console.log('[WarmthProvider] Refreshing warmth for all contacts:', contacts.length);

      // Update cache with current contact data
      const newMap = new Map<string, WarmthData>();

      contacts.forEach(contact => {
        const score = contact.warmth ?? 50; // Default to 50 if not set
        newMap.set(contact.id, createWarmthData(contact.id, score, contact.last_touch_at));
      });

      setWarmthMap(newMap);
      console.log('[WarmthProvider] Warmth cache updated for', newMap.size, 'contacts');
    } catch (error) {
      console.error('[WarmthProvider] Error refreshing all warmth:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Bulk fetch warmth using WarmthManager (with smart caching)
  const bulkFetchWarmth = useCallback(async (contactIds: string[], forceRefresh = false) => {
    if (contactIds.length === 0) return;

    setIsLoading(true);
    try {
      console.log('[WarmthProvider] Bulk fetching warmth for', contactIds.length, 'contacts');

      const manager = getWarmthManager();
      const results = await manager.getBulkWarmth(contactIds, forceRefresh);

      // Update cache with results
      setWarmthMap(prev => {
        const newMap = new Map(prev);
        results.forEach((warmthScore, contactId) => {
          newMap.set(contactId, createWarmthData(
            contactId,
            warmthScore.score,
            warmthScore.lastInteractionAt
          ));
        });
        return newMap;
      });

      console.log('[WarmthProvider] Bulk fetch complete:', results.size, 'contacts updated');
    } catch (error) {
      console.error('[WarmthProvider] Bulk fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get warmth summary statistics
  const getSummary = useCallback(async (): Promise<WarmthSummary | null> => {
    try {
      const manager = getWarmthManager();
      return await manager.getSummary();
    } catch (error) {
      console.error('[WarmthProvider] Summary fetch error:', error);
      return null;
    }
  }, []);

  // Switch warmth mode for a contact
  const switchMode = useCallback(async (contactId: string, mode: WarmthMode): Promise<boolean> => {
    try {
      console.log('[WarmthProvider] Switching mode for', contactId, 'to', mode);

      const manager = getWarmthManager();
      const result = await manager.switchMode(contactId, mode);

      if (result) {
        // Update cache with new score
        setWarmth(contactId, result.scoreAfter);
        console.log('[WarmthProvider] Mode switched:', result);
        return true;
      }

      return false;
    } catch (error) {
      console.error('[WarmthProvider] Mode switch error:', error);
      return false;
    }
  }, [setWarmth]);

  // Invalidate cache
  const invalidateCache = useCallback((contactIds?: string[]) => {
    const manager = getWarmthManager();
    manager.invalidateCache(contactIds);

    if (contactIds) {
      // Remove from local cache too
      setWarmthMap(prev => {
        const newMap = new Map(prev);
        contactIds.forEach(id => newMap.delete(id));
        return newMap;
      });
    } else {
      // Clear all
      setWarmthMap(new Map());
    }

    console.log('[WarmthProvider] Cache invalidated:', contactIds?.length || 'all');
  }, []);

  // ========================================
  // NEW: Centralized Update Methods
  // ========================================

  // Helper to get caller information for debugging
  const getCallerInfo = (): string => {
    try {
      const stack = new Error().stack;
      const callerLine = stack?.split('\n')[3]; // Skip getCallerInfo, refreshSingle, and Error
      const match = callerLine?.match(/at\s+(\w+)/);
      return match?.[1] || 'unknown';
    } catch {
      return 'unknown';
    }
  };

  // Check if contact is currently refreshing
  const isRefreshing = useCallback((contactId?: string): boolean => {
    if (contactId) {
      return refreshingContacts.has(contactId);
    }
    // Check if ANY contact is refreshing
    return refreshingContacts.size > 0;
  }, [refreshingContacts]);

  // Get last refresh time for a contact
  const lastRefreshTime = useCallback((contactId: string): Date | null => {
    const warmthData = warmthMap.get(contactId);
    return warmthData?.lastRefreshed || null;
  }, [warmthMap]);

  // Check if refresh is needed based on TTL
  const shouldRefresh = useCallback((contactId: string, options: RefreshOptions): boolean => {
    if (options.force) return true;

    const lastRefresh = lastRefreshTime(contactId);
    if (!lastRefresh) return true;

    const ttlHours = options.ttlHours || 6; // Default 6 hours from backend
    const ttlMs = ttlHours * 60 * 60 * 1000;
    const staleTreshold = Date.now() - ttlMs;

    return lastRefresh.getTime() < staleTreshold;
  }, [lastRefreshTime]);

  // NEW: Refresh single contact (with deduplication and TTL)
  const refreshSingle = useCallback(async (contactId: string, options: RefreshOptions = {}): Promise<WarmthData> => {
    const source = options.source || getCallerInfo();
    const logPrefix = `[WarmthProvider] refreshSingle(${contactId})`;

    console.log(`${logPrefix} called by ${source}, force=${options.force}`);

    // Check for existing pending refresh to prevent duplicates
    const existingPromise = pendingRefreshes.current.get(contactId);
    if (existingPromise) {
      console.log(`${logPrefix} deduplicating - returning existing promise`);
      return existingPromise;
    }

    // Check TTL if not forced
    if (!shouldRefresh(contactId, options)) {
      const lastRefresh = lastRefreshTime(contactId);
      const ageMinutes = Math.round((Date.now() - (lastRefresh?.getTime() || 0)) / 1000 / 60);
      console.log(`${logPrefix} skipping (TTL): refreshed ${ageMinutes}min ago`);
      return getWarmth(contactId);
    }

    // Mark as refreshing
    setRefreshingContacts(prev => new Set(prev).add(contactId));

    const refreshPromise = (async () => {
      try {
        console.log(`${logPrefix} executing refresh...`);

        // Build URL with force parameter
        const url = `/api/v1/contacts/${contactId}/warmth/recompute${options.force ? '?force=1' : ''}`;

        const response = await apiFetch(url, {
          method: 'POST',
          requireAuth: true,
        });

        if (!response.ok) {
          console.warn(`${logPrefix} failed:`, response.status);
          throw new Error(`Warmth refresh failed: ${response.status}`);
        }

        const body = await response.json();
        console.log(`${logPrefix} success:`, body);

        // Update local state
        const updated = body?.contact || body;
        if (updated && typeof updated.warmth === 'number') {
          setWarmth(contactId, updated.warmth, updated.warmth_updated_at, source);
          return getWarmth(contactId);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (error) {
        console.error(`${logPrefix} error:`, error);
        // Return current cached data on error
        return getWarmth(contactId);
      } finally {
        // Cleanup
        setRefreshingContacts(prev => {
          const newSet = new Set(prev);
          newSet.delete(contactId);
          return newSet;
        });
        pendingRefreshes.current.delete(contactId);
      }
    })();

    // Store the promise to prevent duplicates
    pendingRefreshes.current.set(contactId, refreshPromise);

    return refreshPromise;
  }, [getCallerInfo, shouldRefresh, lastRefreshTime, getWarmth, setWarmth]);

  interface RefreshOptions {
    force?: boolean;
    source?: string;
    ttlHours?: number;
    silent?: boolean;
  }

  // NEW: Refresh multiple contacts (batched with deduplication)
  const refreshBulk = useCallback(async (contactIds: string[], options: RefreshOptions = {}): Promise<void> => {
    if (contactIds.length === 0) return;

    const source = options.source || getCallerInfo();
    const logPrefix = `[WarmthProvider] refreshBulk`;

    console.log(`${logPrefix}(${contactIds.length} contacts) called by ${source}`);

    // Filter out contacts that don't need refreshing (unless forced)
    const contactsToRefresh = options.force
      ? contactIds
      : contactIds.filter(id => shouldRefresh(id, options));

    console.log(`${logPrefix} after TTL check: ${contactsToRefresh.length}/${contactIds.length} need refresh`);

    if (contactsToRefresh.length === 0) {
      console.log(`${logPrefix} no contacts need refresh`);
      return;
    }

    // Use backend bulk endpoint for efficiency
    try {
      if (!options.silent) setIsLoading(true);

      const url = `/api/v1/warmth/recompute${options.force ? '?force=1' : ''}`;
      const response = await apiFetch(url, {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({ contact_ids: contactsToRefresh }),
      });

      if (!response.ok) {
        console.warn(`${logPrefix} failed:`, response.status);
        return;
      }

      const results = await response.json();
      console.log(`${logPrefix} success:`, results);

      // Update local state for all contacts (backend should return updated data)
      // For now, trigger individual refreshes to get updated scores
      await Promise.allSettled(
        contactsToRefresh.map(id => refreshSingle(id, { ...options, source: `bulk-${source}` }))
      );

    } catch (error) {
      console.error(`${logPrefix} error:`, error);
    } finally {
      if (!options.silent) setIsLoading(false);
    }
  }, [getCallerInfo, shouldRefresh, refreshSingle]);

  // NEW: Refresh top contacts by warmth (for _layout.tsx daily refresh)
  const refreshTop = useCallback(async (limit = 60, options: RefreshOptions = {}): Promise<void> => {
    const source = options.source || 'refreshTop';
    const logPrefix = `[WarmthProvider] refreshTop`;

    console.log(`${logPrefix}(${limit}) called`);

    try {
      // Fetch top contacts by warmth
      const listResponse = await apiFetch(`/api/v1/contacts?limit=${limit}&sort=warmth.desc`, { requireAuth: true });

      if (!listResponse.ok) {
        console.warn(`${logPrefix} contacts list failed:`, listResponse.status);
        return;
      }

      const data = await listResponse.json();
      const contacts = Array.isArray(data?.items) ? data.items : [];
      const contactIds = contacts.map((c: any) => c?.id).filter(Boolean);

      console.log(`${logPrefix} fetched ${contactIds.length} top contacts`);

      if (contactIds.length > 0) {
        await refreshBulk(contactIds, { ...options, source });
      }

    } catch (error) {
      console.error(`${logPrefix} error:`, error);
    }
  }, [refreshBulk]);

  // NEW: Refresh recent contacts (for _layout.tsx startup refresh)
  const refreshRecent = useCallback(async (limit = 30, options: RefreshOptions = {}): Promise<void> => {
    const source = options.source || 'refreshRecent';
    const logPrefix = `[WarmthProvider] refreshRecent`;

    console.log(`${logPrefix}(${limit}) called`);

    try {
      // Fetch recent contacts by updated_at
      const listResponse = await apiFetch(`/api/v1/contacts?limit=${limit}&sort=updated_at.desc`, { requireAuth: true });

      if (!listResponse.ok) {
        console.warn(`${logPrefix} contacts list failed:`, listResponse.status);
        return;
      }

      const data = await listResponse.json();
      const contacts = Array.isArray(data?.items) ? data.items : [];
      const contactIds = contacts.map((c: any) => c?.id).filter(Boolean);

      console.log(`${logPrefix} fetched ${contactIds.length} recent contacts`);

      if (contactIds.length > 0) {
        await refreshBulk(contactIds, { ...options, source });
      }

    } catch (error) {
      console.error(`${logPrefix} error:`, error);
    }
  }, [refreshBulk]);

  // NEW: Batch update warmth scores (efficient local updates)
  const batchUpdate = useCallback((updates: Array<{ contactId: string, score: number, lastTouchAt?: string | null }>): void => {
    console.log('[WarmthProvider] batchUpdate:', updates.length, 'contacts');

    setWarmthMap(prev => {
      const newMap = new Map(prev);
      updates.forEach(update => {
        newMap.set(update.contactId, createWarmthData(
          update.contactId,
          update.score,
          update.lastTouchAt,
          'batchUpdate'
        ));
      });
      return newMap;
    });
  }, []);

  const value = useMemo(() => ({
    // Core state
    warmthMap,
    getWarmth,
    setWarmth,
    isLoading,

    // Legacy methods (backward compatibility)
    refreshWarmth,
    refreshAllWarmth,
    bulkFetchWarmth,

    // NEW: Centralized update methods  
    refreshSingle,
    refreshBulk,
    refreshTop,
    refreshRecent,

    // NEW: Loading state tracking
    isRefreshing,
    lastRefreshTime,

    // NEW: Batch operations
    batchUpdate,

    // Other methods
    getSummary,
    switchMode,
    invalidateCache,
  }), [
    // Core state
    warmthMap, getWarmth, setWarmth, isLoading,
    // Legacy methods
    refreshWarmth, refreshAllWarmth, bulkFetchWarmth,
    // New methods
    refreshSingle, refreshBulk, refreshTop, refreshRecent,
    isRefreshing, lastRefreshTime, batchUpdate,
    // Other methods  
    getSummary, switchMode, invalidateCache
  ]);

  return (
    <WarmthContext.Provider value={value}>
      {children}
    </WarmthContext.Provider>
  );
}

// Hook to access warmth context
export function useWarmth() {
  const context = useContext(WarmthContext);
  if (!context) {
    throw new Error('useWarmth must be used within WarmthProvider');
  }
  return context;
}

// Export utilities and types
export { calculateBand, getBandData, createWarmthData };
export type { RefreshOptions };
